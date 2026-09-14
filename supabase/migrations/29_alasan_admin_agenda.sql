-- Tambah kolom alasan_admin untuk mencatat alasan jika admin yang mengisikan agenda
ALTER TABLE public.agenda_mengajar ADD COLUMN IF NOT EXISTS alasan_admin TEXT;

-- Perbarui trigger untuk menangani INSERT agenda dengan status langsung VERIFIED (oleh Admin)
-- Sehingga gaji juga otomatis dihitung.
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
    -- Tangani UPDATE (Pending -> Verified) ATAU INSERT (Langsung Verified)
    IF (TG_OP = 'UPDATE' AND NEW.status = 'VERIFIED' AND OLD.status = 'PENDING') OR 
       (TG_OP = 'INSERT' AND NEW.status = 'VERIFIED') THEN
        
        -- 1. Ambil rate_per_jam global dari payroll_config
        SELECT rate_per_jam INTO v_global_rate FROM public.payroll_config WHERE lembaga_id = NEW.lembaga_id;
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

-- Pastikan trigger berjalan saat INSERT juga
DROP TRIGGER IF EXISTS trigger_agenda_verified ON public.agenda_mengajar;
CREATE TRIGGER trigger_agenda_verified
AFTER INSERT OR UPDATE OF status ON public.agenda_mengajar
FOR EACH ROW
EXECUTE FUNCTION public.handle_agenda_verified();
