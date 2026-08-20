ALTER TABLE public.absensi_kedatangan_guru
ADD COLUMN IF NOT EXISTS tugas_keterangan TEXT,
ADD COLUMN IF NOT EXISTS tugas_file_url VARCHAR;
