-- Create payroll_rates table
CREATE TABLE IF NOT EXISTS public.payroll_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lembaga_id UUID NOT NULL REFERENCES public.lembaga(id) ON DELETE CASCADE,
    nama_rate VARCHAR NOT NULL,
    rate_per_jam NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for payroll_rates
ALTER TABLE public.payroll_rates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Payroll Rates" ON public.payroll_rates;
CREATE POLICY "Public Read Payroll Rates" ON public.payroll_rates FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin CRUD Payroll Rates" ON public.payroll_rates;
CREATE POLICY "Admin CRUD Payroll Rates" ON public.payroll_rates FOR ALL USING (public.is_admin_of_lembaga(auth.uid(), lembaga_id));

-- Add payroll_rate_id to teachers
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS payroll_rate_id UUID REFERENCES public.payroll_rates(id) ON DELETE SET NULL;

-- Migrate existing payroll_config to payroll_rates
DO $$
DECLARE
    rec RECORD;
    v_rate_id UUID;
BEGIN
    FOR rec IN SELECT * FROM public.payroll_config LOOP
        -- Create a default rate for each lembaga based on their existing global rate
        INSERT INTO public.payroll_rates (lembaga_id, nama_rate, rate_per_jam)
        VALUES (rec.lembaga_id, 'Rate Utama', rec.rate_per_jam)
        RETURNING id INTO v_rate_id;

        -- Assign this rate to all existing teachers in that lembaga
        UPDATE public.teachers 
        SET payroll_rate_id = v_rate_id 
        WHERE lembaga_id = rec.lembaga_id AND payroll_rate_id IS NULL;
    END LOOP;
END;
$$;

-- Update trigger handle_agenda_verified
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
    IF (TG_OP = 'UPDATE' AND NEW.status = 'VERIFIED' AND OLD.status = 'PENDING') OR 
       (TG_OP = 'INSERT' AND NEW.status = 'VERIFIED') THEN
        
        -- 1. Ambil rate_per_jam dari tabel payroll_rates spesifik untuk guru tersebut
        SELECT pr.rate_per_jam INTO v_global_rate 
        FROM public.teachers t
        LEFT JOIN public.payroll_rates pr ON t.payroll_rate_id = pr.id
        WHERE t.id = NEW.guru_id;
        
        IF v_global_rate IS NULL THEN v_global_rate := 0; END IF;
        
        -- 2. Ambil Jam Ke (JP) dari schedules
        SELECT jam_ke_mulai, jam_ke_selesai INTO v_jp_mulai, v_jp_selesai FROM public.schedules WHERE id = NEW.jadwal_id;
        
        -- Hitung total Jam Pelajaran (JP)
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
