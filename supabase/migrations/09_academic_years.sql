-- ========================================================================================
-- MIGRATION: 09_academic_years.sql
-- PURPOSE: Manajemen Tahun Ajaran, Hari Libur, dan merombak Jam Pelajaran per Hari
-- ========================================================================================

-- 1. Buat Tabel academic_years
CREATE TABLE IF NOT EXISTS public.academic_years (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lembaga_id UUID NOT NULL REFERENCES public.lembaga(id) ON DELETE CASCADE,
    nama VARCHAR NOT NULL, -- e.g., "2026/2027 Semester Ganjil"
    is_active BOOLEAN NOT NULL DEFAULT false,
    tanggal_mulai DATE NOT NULL,
    tanggal_selesai DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Pastikan hanya ada 1 tahun ajaran aktif per lembaga
CREATE UNIQUE INDEX academic_years_active_idx ON public.academic_years(lembaga_id) WHERE is_active = true;

-- RLS untuk academic_years
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Academic Years" ON public.academic_years;
CREATE POLICY "Public Read Academic Years" ON public.academic_years FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin CRUD Academic Years" ON public.academic_years;
CREATE POLICY "Admin CRUD Academic Years" ON public.academic_years FOR ALL USING (public.is_admin_of_lembaga(auth.uid(), lembaga_id));


-- 2. Buat Tabel holidays (Hari Libur)
CREATE TABLE IF NOT EXISTS public.holidays (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
    nama VARCHAR NOT NULL, -- e.g., "Libur Lebaran"
    tanggal_mulai DATE NOT NULL,
    tanggal_selesai DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS untuk holidays
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Holidays" ON public.holidays;
CREATE POLICY "Public Read Holidays" ON public.holidays FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin CRUD Holidays" ON public.holidays;
CREATE POLICY "Admin CRUD Holidays" ON public.holidays FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.academic_years 
        WHERE academic_years.id = holidays.academic_year_id 
        AND public.is_admin_of_lembaga(auth.uid(), academic_years.lembaga_id)
    )
);


-- 3. Modifikasi jam_pelajaran
-- Karena ini merubah skema secara fundamental, kita hapus isi tabel lama (jika ada) untuk mencegah konflik
TRUNCATE TABLE public.jam_pelajaran CASCADE;

ALTER TABLE public.jam_pelajaran DROP CONSTRAINT IF EXISTS jam_pelajaran_lembaga_id_jam_ke_key;

ALTER TABLE public.jam_pelajaran ADD COLUMN academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE CASCADE;
ALTER TABLE public.jam_pelajaran ALTER COLUMN academic_year_id SET NOT NULL;

ALTER TABLE public.jam_pelajaran ADD COLUMN hari VARCHAR NOT NULL;

-- Hapus lembaga_id karena academic_year_id sudah cukup (bisa di-trace ke lembaga_id)
-- Namun biarkan saja lembaga_id untuk mempermudah query/RLS
ALTER TABLE public.jam_pelajaran ADD UNIQUE(academic_year_id, hari, jam_ke);

-- Update RLS jam_pelajaran (jika bergantung ke lembaga_id, biarkan saja)


-- 4. Modifikasi schedules
-- Jadwal juga harus di-reset karena akan terikat ke tahun ajaran
TRUNCATE TABLE public.schedules CASCADE;

ALTER TABLE public.schedules ADD COLUMN academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE CASCADE;
ALTER TABLE public.schedules ALTER COLUMN academic_year_id SET NOT NULL;
