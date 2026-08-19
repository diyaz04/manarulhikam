-- ========================================================================================
-- MIGRATION: 08_academic_payroll_revisions.sql
-- PURPOSE: Refisi kolom jadwal menjadi Jam Ke- (integer), konfigurasi rate global payroll
-- ========================================================================================

-- 1. Buat Tabel Konfigurasi Payroll Global per Lembaga
CREATE TABLE IF NOT EXISTS public.payroll_config (
    lembaga_id UUID PRIMARY KEY REFERENCES public.lembaga(id) ON DELETE CASCADE,
    rate_per_jam NUMERIC NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for payroll_config
ALTER TABLE public.payroll_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin CRUD Payroll Config" ON public.payroll_config;
CREATE POLICY "Admin CRUD Payroll Config" ON public.payroll_config FOR ALL USING (public.is_admin_of_lembaga(auth.uid(), lembaga_id));

-- 2. Buat Tabel Jam Pelajaran (Mapping Jam ke-1, Jam ke-2 ke Jam Nyata)
CREATE TABLE IF NOT EXISTS public.jam_pelajaran (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lembaga_id UUID NOT NULL REFERENCES public.lembaga(id) ON DELETE CASCADE,
    jam_ke INTEGER NOT NULL,
    waktu_mulai TIME NOT NULL,
    waktu_selesai TIME NOT NULL,
    UNIQUE(lembaga_id, jam_ke)
);

-- RLS for jam_pelajaran
ALTER TABLE public.jam_pelajaran ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Jam Pelajaran" ON public.jam_pelajaran;
CREATE POLICY "Public Read Jam Pelajaran" ON public.jam_pelajaran FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin CRUD Jam Pelajaran" ON public.jam_pelajaran;
CREATE POLICY "Admin CRUD Jam Pelajaran" ON public.jam_pelajaran FOR ALL USING (public.is_admin_of_lembaga(auth.uid(), lembaga_id));

-- 3. Hapus kolom jam_mulai dan jam_selesai tipe TIME di schedules, ganti ke INTEGER jam_ke_mulai dan jam_ke_selesai
ALTER TABLE public.schedules DROP COLUMN IF EXISTS jam_mulai;
ALTER TABLE public.schedules DROP COLUMN IF EXISTS jam_selesai;

ALTER TABLE public.schedules ADD COLUMN IF NOT EXISTS jam_ke_mulai INTEGER NOT NULL DEFAULT 1;
ALTER TABLE public.schedules ADD COLUMN IF NOT EXISTS jam_ke_selesai INTEGER NOT NULL DEFAULT 1;

-- 4. Hapus kolom rate_per_jam di teachers karena besaran honor sama per lembaga (dari tabel payroll_config)
ALTER TABLE public.teachers DROP COLUMN IF EXISTS rate_per_jam;

-- ========================================================================================
-- REVISI TRIGGER OTOMATIS PAYROLL
-- ========================================================================================

CREATE OR REPLACE FUNCTION public.handle_agenda_verified()
RETURNS TRIGGER AS $$
DECLARE
    v_global_rate NUMERIC;
    v_jp_mulai INTEGER;
    v_jp_selesai INTEGER;
    v_total_jp INTEGER;
    v_honor_sesi NUMERIC;
    v_bulan INTEGER;
    v_tahun INTEGER;
    v_kategori_honor_id UUID;
BEGIN
    IF NEW.status = 'VERIFIED' AND OLD.status = 'PENDING' THEN
        
        -- 1. Ambil rate_per_jam global dari payroll_config
        SELECT rate_per_jam INTO v_global_rate FROM public.payroll_config WHERE lembaga_id = NEW.lembaga_id;
        IF v_global_rate IS NULL THEN v_global_rate := 0; END IF;
        
        -- 2. Ambil Jam Ke (JP) dari schedules
        SELECT jam_ke_mulai, jam_ke_selesai INTO v_jp_mulai, v_jp_selesai FROM public.schedules WHERE id = NEW.jadwal_id;
        
        -- Hitung total Jam Pelajaran (JP). Misal Jam ke-1 s/d Jam ke-3 => (3 - 1) + 1 = 3 JP.
        v_total_jp := (v_jp_selesai - v_jp_mulai) + 1;
        IF v_total_jp < 0 THEN v_total_jp := 0; END IF;
        
        -- 3. Hitung Honor
        v_honor_sesi := v_total_jp * v_global_rate;
        
        -- 4. Catat/Update ke payroll_guru bulan tersebut
        v_bulan := EXTRACT(MONTH FROM NEW.tanggal);
        v_tahun := EXTRACT(YEAR FROM NEW.tanggal);
        
        INSERT INTO public.payroll_guru (lembaga_id, guru_id, bulan, tahun, total_jam_terverifikasi, total_honor)
        VALUES (NEW.lembaga_id, NEW.guru_id, v_bulan, v_tahun, v_total_jp, v_honor_sesi)
        ON CONFLICT (guru_id, bulan, tahun) 
        DO UPDATE SET 
            total_jam_terverifikasi = public.payroll_guru.total_jam_terverifikasi + EXCLUDED.total_jam_terverifikasi,
            total_honor = public.payroll_guru.total_honor + EXCLUDED.total_honor,
            updated_at = NOW();
            
        -- 5. Catat transaksi keuangan (Otomatis Debit Kas)
        SELECT id INTO v_kategori_honor_id FROM public.kategori_transaksi 
        WHERE lembaga_id = NEW.lembaga_id AND nama = 'Honor Mengajar Guru' LIMIT 1;
        
        IF v_kategori_honor_id IS NULL THEN
            INSERT INTO public.kategori_transaksi (lembaga_id, nama, jenis_default)
            VALUES (NEW.lembaga_id, 'Honor Mengajar Guru', 'DEBIT')
            RETURNING id INTO v_kategori_honor_id;
        END IF;
        
        IF v_honor_sesi > 0 THEN
            INSERT INTO public.transaksi_keuangan (lembaga_id, kategori_id, jenis, jumlah, tanggal, keterangan, created_by)
            VALUES (NEW.lembaga_id, v_kategori_honor_id, 'DEBIT', v_honor_sesi, NEW.tanggal_verifikasi::DATE, 
                    'Pembayaran honor otomatis (' || v_total_jp || ' JP) - Sesi ' || NEW.tanggal, NEW.diverifikasi_oleh);
        END IF;
        
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
