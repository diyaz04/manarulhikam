-- 1. Tabel Keputusan Absensi Harian
CREATE TABLE IF NOT EXISTS public.absensi_harian_siswa (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    tanggal DATE NOT NULL,
    status VARCHAR NOT NULL CHECK (status IN ('HADIR', 'IZIN', 'SAKIT', 'ALFA')),
    decided_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(student_id, tanggal)
);

ALTER TABLE public.absensi_harian_siswa ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access for absensi_harian_siswa" ON public.absensi_harian_siswa FOR SELECT USING (true);
CREATE POLICY "Admin can insert absensi_harian" ON public.absensi_harian_siswa FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin can update absensi_harian" ON public.absensi_harian_siswa FOR UPDATE USING (true);
CREATE POLICY "Admin can delete absensi_harian" ON public.absensi_harian_siswa FOR DELETE USING (true);

-- 2. Kolom Wali Kelas
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS wali_kelas_dari VARCHAR;
