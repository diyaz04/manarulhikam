-- ========================================================================================
-- MIGRATION: 07_smp_academic_payroll.sql
-- PURPOSE: Refaktor Siswa Ganda, Absensi Guru (Kamera), Otomasi Payroll & Alumni
-- ========================================================================================

-- 1. Refaktor Tabel Students (Menghapus UNIQUE global NISN, mengganti menjadi per-lembaga)
ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_nisn_key;
ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_lembaga_nisn_key;
DROP INDEX IF EXISTS students_lembaga_nisn_key CASCADE;
ALTER TABLE public.students ADD CONSTRAINT students_lembaga_nisn_key UNIQUE (lembaga_id, nisn);

-- Menambahkan opsi ALUMNI ke dalam status siswa
ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_status_check;
ALTER TABLE public.students ADD CONSTRAINT students_status_check CHECK (status IN ('AKTIF', 'LULUS', 'KELUAR', 'ALUMNI'));

-- Tambahkan NIK opsional jika dibutuhkan
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS nik VARCHAR;

-- 2. Tambah rate_per_jam ke tabel teachers
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS rate_per_jam NUMERIC DEFAULT 0;

-- 3. Tabel Agenda Mengajar (Absensi Guru via Kamera)
CREATE TABLE IF NOT EXISTS public.agenda_mengajar (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lembaga_id UUID NOT NULL REFERENCES public.lembaga(id) ON DELETE CASCADE,
    guru_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    jadwal_id UUID NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    materi TEXT NOT NULL,
    foto_url VARCHAR NOT NULL, -- Wajib diisi dari tangkapan live kamera
    status VARCHAR NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'VERIFIED', 'REJECTED')),
    diverifikasi_oleh UUID REFERENCES public.users(id) ON DELETE SET NULL,
    tanggal_verifikasi TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(jadwal_id, tanggal) -- Tidak boleh absen 2 kali di jadwal & tanggal yang sama
);

-- 4. Tabel Absensi Siswa (Dikaitkan ke Agenda Guru)
CREATE TABLE IF NOT EXISTS public.absensi_siswa (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agenda_id UUID NOT NULL REFERENCES public.agenda_mengajar(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    status VARCHAR NOT NULL DEFAULT 'HADIR' CHECK (status IN ('HADIR', 'IZIN', 'SAKIT', 'ALFA')),
    keterangan VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(agenda_id, student_id) -- 1 siswa hanya di-absen 1 kali per agenda
);

-- 5. Tabel Payroll Guru
CREATE TABLE IF NOT EXISTS public.payroll_guru (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lembaga_id UUID NOT NULL REFERENCES public.lembaga(id) ON DELETE CASCADE,
    guru_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    bulan INTEGER NOT NULL CHECK (bulan BETWEEN 1 AND 12),
    tahun INTEGER NOT NULL,
    total_jam_terverifikasi NUMERIC DEFAULT 0,
    total_honor NUMERIC DEFAULT 0,
    status VARCHAR NOT NULL DEFAULT 'BELUM DIBAYARKAN' CHECK (status IN ('BELUM DIBAYARKAN', 'SUDAH DIBAYARKAN')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(guru_id, bulan, tahun) -- 1 rekapan payroll per guru per bulan
);

-- 6. Tabel Alumni
CREATE TABLE IF NOT EXISTS public.alumni (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lembaga_id UUID NOT NULL REFERENCES public.lembaga(id) ON DELETE CASCADE,
    student_id UUID UNIQUE REFERENCES public.students(id) ON DELETE SET NULL,
    nama VARCHAR NOT NULL,
    nisn VARCHAR,
    tahun_lulus INTEGER NOT NULL,
    pekerjaan_kuliah VARCHAR,
    kontak VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ========================================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ========================================================================================

ALTER TABLE public.agenda_mengajar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.absensi_siswa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_guru ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumni ENABLE ROW LEVEL SECURITY;

-- Agenda Mengajar: Public bisa create (karena form guru bisa diakses guru), Admin bisa verifikasi
DROP POLICY IF EXISTS "Public Read Agenda" ON public.agenda_mengajar;
CREATE POLICY "Public Read Agenda" ON public.agenda_mengajar FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Insert Agenda" ON public.agenda_mengajar;
CREATE POLICY "Public Insert Agenda" ON public.agenda_mengajar FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admin Update Agenda" ON public.agenda_mengajar;
CREATE POLICY "Admin Update Agenda" ON public.agenda_mengajar FOR UPDATE USING (public.is_admin_of_lembaga(auth.uid(), lembaga_id));

DROP POLICY IF EXISTS "Admin Delete Agenda" ON public.agenda_mengajar;
CREATE POLICY "Admin Delete Agenda" ON public.agenda_mengajar FOR DELETE USING (public.is_admin_of_lembaga(auth.uid(), lembaga_id));

-- Absensi Siswa: Public bisa create (mengikuti agenda), Admin bisa CRUD
DROP POLICY IF EXISTS "Public Read Absensi" ON public.absensi_siswa;
CREATE POLICY "Public Read Absensi" ON public.absensi_siswa FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Insert Absensi" ON public.absensi_siswa;
CREATE POLICY "Public Insert Absensi" ON public.absensi_siswa FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admin Update Absensi" ON public.absensi_siswa;
CREATE POLICY "Admin Update Absensi" ON public.absensi_siswa FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.agenda_mengajar WHERE id = absensi_siswa.agenda_id AND public.is_admin_of_lembaga(auth.uid(), lembaga_id))
);

-- Payroll Guru: Admin only
DROP POLICY IF EXISTS "Admin CRUD Payroll" ON public.payroll_guru;
CREATE POLICY "Admin CRUD Payroll" ON public.payroll_guru FOR ALL USING (public.is_admin_of_lembaga(auth.uid(), lembaga_id));

-- Alumni: Public Read, Admin CRUD
DROP POLICY IF EXISTS "Public Read Alumni" ON public.alumni;
CREATE POLICY "Public Read Alumni" ON public.alumni FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin CRUD Alumni" ON public.alumni;
CREATE POLICY "Admin CRUD Alumni" ON public.alumni FOR ALL USING (public.is_admin_of_lembaga(auth.uid(), lembaga_id));

-- ========================================================================================
-- DATABASE TRIGGERS UNTUK OTOMATISASI
-- ========================================================================================

-- A. Trigger: Menyalin Siswa ke Alumni otomatis saat status berubah menjadi ALUMNI
CREATE OR REPLACE FUNCTION public.handle_student_alumni()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'ALUMNI' AND (OLD.status IS NULL OR OLD.status != 'ALUMNI') THEN
        INSERT INTO public.alumni (lembaga_id, student_id, nama, nisn, tahun_lulus)
        VALUES (NEW.lembaga_id, NEW.id, NEW.nama, NEW.nisn, EXTRACT(YEAR FROM CURRENT_DATE))
        ON CONFLICT (student_id) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_student_to_alumni ON public.students;
CREATE TRIGGER trigger_student_to_alumni
AFTER UPDATE OF status ON public.students
FOR EACH ROW
EXECUTE FUNCTION public.handle_student_alumni();


-- B. Trigger: Menghitung Payroll & Transaksi Keuangan otomatis saat Agenda di-VERIFIED
CREATE OR REPLACE FUNCTION public.handle_agenda_verified()
RETURNS TRIGGER AS $$
DECLARE
    v_guru_rate NUMERIC;
    v_durasi_jam NUMERIC;
    v_honor_sesi NUMERIC;
    v_jam_mulai TIME;
    v_jam_selesai TIME;
    v_bulan INTEGER;
    v_tahun INTEGER;
    v_kategori_honor_id UUID;
BEGIN
    IF NEW.status = 'VERIFIED' AND OLD.status = 'PENDING' THEN
        
        -- 1. Ambil rate_per_jam guru
        SELECT rate_per_jam INTO v_guru_rate FROM public.teachers WHERE id = NEW.guru_id;
        
        -- 2. Hitung durasi jam dari schedules (dalam bentuk interval, lalu dikonversi ke desimal jam)
        SELECT jam_mulai, jam_selesai INTO v_jam_mulai, v_jam_selesai FROM public.schedules WHERE id = NEW.jadwal_id;
        
        -- Anggap durasi hitungannya adalah total menit dibagi 60 (misal 1.5 jam)
        -- COALESCE mencegah error jika jam kosong
        v_durasi_jam := EXTRACT(EPOCH FROM (v_jam_selesai - v_jam_mulai)) / 3600;
        IF v_durasi_jam < 0 THEN v_durasi_jam := 0; END IF;
        
        -- 3. Hitung Honor
        v_honor_sesi := v_durasi_jam * COALESCE(v_guru_rate, 0);
        
        -- 4. Catat/Update ke payroll_guru bulan tersebut
        v_bulan := EXTRACT(MONTH FROM NEW.tanggal);
        v_tahun := EXTRACT(YEAR FROM NEW.tanggal);
        
        INSERT INTO public.payroll_guru (lembaga_id, guru_id, bulan, tahun, total_jam_terverifikasi, total_honor)
        VALUES (NEW.lembaga_id, NEW.guru_id, v_bulan, v_tahun, v_durasi_jam, v_honor_sesi)
        ON CONFLICT (guru_id, bulan, tahun) 
        DO UPDATE SET 
            total_jam_terverifikasi = public.payroll_guru.total_jam_terverifikasi + EXCLUDED.total_jam_terverifikasi,
            total_honor = public.payroll_guru.total_honor + EXCLUDED.total_honor,
            updated_at = NOW();
            
        -- 5. Catat transaksi keuangan (Otomatis Debit Kas)
        -- Cek apakah Kategori Transaksi "Honor Guru" sudah ada untuk lembaga ini
        SELECT id INTO v_kategori_honor_id FROM public.kategori_transaksi 
        WHERE lembaga_id = NEW.lembaga_id AND nama = 'Honor Mengajar Guru' LIMIT 1;
        
        -- Jika belum ada, buatkan kategori otomatis
        IF v_kategori_honor_id IS NULL THEN
            INSERT INTO public.kategori_transaksi (lembaga_id, nama, jenis_default)
            VALUES (NEW.lembaga_id, 'Honor Mengajar Guru', 'DEBIT')
            RETURNING id INTO v_kategori_honor_id;
        END IF;
        
        -- Insert ke transaksi keuangan
        IF v_honor_sesi > 0 THEN
            INSERT INTO public.transaksi_keuangan (lembaga_id, kategori_id, jenis, jumlah, tanggal, keterangan, created_by)
            VALUES (NEW.lembaga_id, v_kategori_honor_id, 'DEBIT', v_honor_sesi, NEW.tanggal_verifikasi::DATE, 
                    'Pembayaran honor otomatis - Sesi ' || NEW.tanggal, NEW.diverifikasi_oleh);
        END IF;
        
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_agenda_verified ON public.agenda_mengajar;
CREATE TRIGGER trigger_agenda_verified
AFTER UPDATE OF status ON public.agenda_mengajar
FOR EACH ROW
EXECUTE FUNCTION public.handle_agenda_verified();
