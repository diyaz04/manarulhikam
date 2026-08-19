-- Migration: Agenda Rules
-- Tambah status kehadiran guru dan konfigurasi toleransi

-- 1. Tambah kolom status kehadiran di agenda mengajar
ALTER TABLE public.agenda_mengajar ADD COLUMN IF NOT EXISTS status_kehadiran_guru VARCHAR NOT NULL DEFAULT 'TEPAT_WAKTU' CHECK (status_kehadiran_guru IN ('TEPAT_WAKTU', 'TERLAMBAT', 'IZIN', 'SAKIT', 'ALFA', 'IZIN_DINAS'));

-- 2. Buat tabel konfigurasi agenda (jika belum ada)
CREATE TABLE IF NOT EXISTS public.agenda_configs (
    lembaga_id UUID PRIMARY KEY REFERENCES public.lembaga(id) ON DELETE CASCADE,
    toleransi_menit INTEGER NOT NULL DEFAULT 30,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.agenda_configs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read agenda_configs" ON public.agenda_configs;
CREATE POLICY "Public can read agenda_configs" ON public.agenda_configs FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin can manage agenda_configs" ON public.agenda_configs;
CREATE POLICY "Admin can manage agenda_configs" ON public.agenda_configs FOR ALL USING (public.is_admin_of_lembaga(auth.uid(), lembaga_id));
