-- ========================================================================================
-- MIGRATION: 05_unit_academic.sql
-- PURPOSE: Membuat tabel Data Guru dan Jadwal untuk kebutuhan Unit Lembaga beserta RLS
-- ========================================================================================

-- A. Tabel Data Guru / Ustadz
CREATE TABLE IF NOT EXISTS public.teachers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lembaga_id UUID NOT NULL REFERENCES public.lembaga(id) ON DELETE CASCADE,
    user_id UUID UNIQUE REFERENCES public.users(id) ON DELETE SET NULL, -- Opsional, jika nanti guru butuh login
    nama VARCHAR NOT NULL,
    nip VARCHAR,
    jabatan VARCHAR NOT NULL DEFAULT 'Guru',
    status VARCHAR NOT NULL DEFAULT 'AKTIF' CHECK (status IN ('AKTIF', 'NON-AKTIF')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- B. Tabel Jadwal & Agenda Guru
CREATE TABLE IF NOT EXISTS public.schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lembaga_id UUID NOT NULL REFERENCES public.lembaga(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    hari VARCHAR NOT NULL, -- Senin, Selasa, dst.
    jam_mulai TIME NOT NULL,
    jam_selesai TIME NOT NULL,
    mata_pelajaran VARCHAR NOT NULL,
    kelas VARCHAR NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ========================================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Memastikan isolasi data: Admin unit hanya bisa akses data dari unitnya sendiri
-- ========================================================================================

ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;

-- Policy untuk teachers
CREATE POLICY "Public Read Teachers" ON public.teachers FOR SELECT USING (true);
CREATE POLICY "Admin CRUD Teachers" ON public.teachers FOR ALL
USING (public.is_admin_of_lembaga(auth.uid(), lembaga_id))
WITH CHECK (public.is_admin_of_lembaga(auth.uid(), lembaga_id));

-- Policy untuk schedules
CREATE POLICY "Public Read Schedules" ON public.schedules FOR SELECT USING (true);
CREATE POLICY "Admin CRUD Schedules" ON public.schedules FOR ALL
USING (public.is_admin_of_lembaga(auth.uid(), lembaga_id))
WITH CHECK (public.is_admin_of_lembaga(auth.uid(), lembaga_id));
