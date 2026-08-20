CREATE TABLE IF NOT EXISTS public.absensi_kedatangan_guru (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lembaga_id UUID NOT NULL REFERENCES public.lembaga(id) ON DELETE CASCADE,
    guru_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    waktu_absen TIME NOT NULL DEFAULT CURRENT_TIME,
    status VARCHAR NOT NULL CHECK (status IN ('HADIR', 'IZIN', 'SAKIT')),
    keterangan TEXT,
    foto_url VARCHAR,
    status_verifikasi VARCHAR NOT NULL DEFAULT 'PENDING' CHECK (status_verifikasi IN ('PENDING', 'VERIFIED', 'REJECTED')),
    diverifikasi_oleh UUID REFERENCES public.users(id) ON DELETE SET NULL,
    waktu_verifikasi TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(guru_id, tanggal)
);

-- RLS Policies
ALTER TABLE public.absensi_kedatangan_guru ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for users based on lembaga_id"
    ON public.absensi_kedatangan_guru FOR SELECT
    USING (lembaga_id IN (
        SELECT lembaga_id FROM users_roles WHERE user_id = auth.uid()
    ));

CREATE POLICY "Enable insert for teachers"
    ON public.absensi_kedatangan_guru FOR INSERT
    WITH CHECK (
        guru_id IN (SELECT id FROM teachers WHERE user_id = auth.uid())
    );

CREATE POLICY "Enable update for admins"
    ON public.absensi_kedatangan_guru FOR UPDATE
    USING (
        lembaga_id IN (SELECT lembaga_id FROM users_roles WHERE user_id = auth.uid() AND role IN ('ADMIN', 'YAYASAN', 'UNIT'))
    );
