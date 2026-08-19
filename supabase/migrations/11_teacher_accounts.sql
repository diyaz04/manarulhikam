-- Migration: Tambah kolom akun guru untuk SMP
-- Kolom email, user_id (link ke auth), dan akses (array hak fitur)

ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS email VARCHAR;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS akses TEXT[] DEFAULT ARRAY['ABSENSI', 'JADWAL'];
