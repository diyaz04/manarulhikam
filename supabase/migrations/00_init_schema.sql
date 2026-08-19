-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabel Lembaga
CREATE TABLE public.lembaga (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama VARCHAR NOT NULL,
    kode VARCHAR UNIQUE NOT NULL, -- YAYASAN, TK, SMP, SMA, PONTREN
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert Data Awal Lembaga
INSERT INTO public.lembaga (nama, kode) VALUES
('Yayasan Manarul Hikam Tampian', 'YAYASAN'),
('TK Manarul Hikam', 'TK'),
('SMP Manarul Hikam', 'SMP'),
('SMA Manarul Hikam', 'SMA'),
('Pondok Pesantren Manarul Hikam', 'PONTREN');

-- 2. Tabel Users (Profil)
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR NOT NULL,
    phone_number VARCHAR,
    avatar_url VARCHAR, -- URL Cloudinary
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabel User Roles
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    lembaga_id UUID NOT NULL REFERENCES public.lembaga(id) ON DELETE CASCADE,
    role VARCHAR NOT NULL, -- SUPER_ADMIN, ADMIN, GURU, BENDAHARA, SISWA
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, lembaga_id, role)
);

-- 4. Tabel Profil Yayasan
CREATE TABLE public.site_profile (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama_yayasan VARCHAR NOT NULL,
    deskripsi TEXT,
    logo_url VARCHAR, -- URL Cloudinary
    alamat TEXT,
    kontak VARCHAR,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Tabel Berita
CREATE TABLE public.berita (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    judul VARCHAR NOT NULL,
    slug VARCHAR UNIQUE NOT NULL,
    konten TEXT NOT NULL,
    foto_url VARCHAR, -- URL Cloudinary
    penulis_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    lembaga_id UUID NOT NULL REFERENCES public.lembaga(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Tabel Agenda Kegiatan
CREATE TABLE public.agenda_kegiatan (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama_kegiatan VARCHAR NOT NULL,
    deskripsi TEXT,
    lokasi VARCHAR,
    tanggal_mulai TIMESTAMP WITH TIME ZONE NOT NULL,
    tanggal_selesai TIMESTAMP WITH TIME ZONE,
    lembaga_id UUID NOT NULL REFERENCES public.lembaga(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Tabel Fasilitas
CREATE TABLE public.fasilitas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama_fasilitas VARCHAR NOT NULL,
    deskripsi TEXT,
    foto_url VARCHAR, -- URL Cloudinary
    lembaga_id UUID NOT NULL REFERENCES public.lembaga(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- ========================================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ========================================================================================

ALTER TABLE public.lembaga ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.berita ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda_kegiatan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fasilitas ENABLE ROW LEVEL SECURITY;

-- Helper Function: Check if user has specific role in a lembaga
CREATE OR REPLACE FUNCTION public.has_role(user_id UUID, check_lembaga_id UUID, check_role VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_roles.user_id = has_role.user_id
          AND user_roles.lembaga_id = check_lembaga_id
          AND user_roles.role = check_role
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper Function: Check if user is any kind of ADMIN (SUPER_ADMIN or ADMIN) in a lembaga
CREATE OR REPLACE FUNCTION public.is_admin_of_lembaga(user_id UUID, check_lembaga_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_roles.user_id = is_admin_of_lembaga.user_id
          AND user_roles.lembaga_id = check_lembaga_id
          AND user_roles.role IN ('SUPER_ADMIN', 'ADMIN')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================================================================
-- POLICIES: LEMBAGA
-- ========================================================================================
-- Anyone can read lembaga
CREATE POLICY "Public read access for lembaga" ON public.lembaga FOR SELECT USING (true);

-- ========================================================================================
-- POLICIES: USERS
-- ========================================================================================
-- Users can read all users (or restrict this later if needed)
CREATE POLICY "Public read access for users" ON public.users FOR SELECT USING (true);
-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- ========================================================================================
-- POLICIES: USER_ROLES
-- ========================================================================================
CREATE POLICY "Public read access for user_roles" ON public.user_roles FOR SELECT USING (true);
-- Only SUPER_ADMIN can insert/update roles (for now)
-- You can adjust this so ADMIN of a lembaga can add GURU etc.

-- ========================================================================================
-- POLICIES: SITE_PROFILE
-- ========================================================================================
CREATE POLICY "Public read access for site_profile" ON public.site_profile FOR SELECT USING (true);

-- ========================================================================================
-- POLICIES: BERITA, AGENDA, FASILITAS
-- ========================================================================================
-- Public Read
CREATE POLICY "Public read access for berita" ON public.berita FOR SELECT USING (true);
CREATE POLICY "Public read access for agenda_kegiatan" ON public.agenda_kegiatan FOR SELECT USING (true);
CREATE POLICY "Public read access for fasilitas" ON public.fasilitas FOR SELECT USING (true);

-- Admin Insert/Update/Delete (based on lembaga_id)
CREATE POLICY "Admin can insert berita" ON public.berita FOR INSERT WITH CHECK (is_admin_of_lembaga(auth.uid(), lembaga_id));
CREATE POLICY "Admin can update berita" ON public.berita FOR UPDATE USING (is_admin_of_lembaga(auth.uid(), lembaga_id));
CREATE POLICY "Admin can delete berita" ON public.berita FOR DELETE USING (is_admin_of_lembaga(auth.uid(), lembaga_id));

CREATE POLICY "Admin can insert agenda" ON public.agenda_kegiatan FOR INSERT WITH CHECK (is_admin_of_lembaga(auth.uid(), lembaga_id));
CREATE POLICY "Admin can update agenda" ON public.agenda_kegiatan FOR UPDATE USING (is_admin_of_lembaga(auth.uid(), lembaga_id));
CREATE POLICY "Admin can delete agenda" ON public.agenda_kegiatan FOR DELETE USING (is_admin_of_lembaga(auth.uid(), lembaga_id));

CREATE POLICY "Admin can insert fasilitas" ON public.fasilitas FOR INSERT WITH CHECK (is_admin_of_lembaga(auth.uid(), lembaga_id));
CREATE POLICY "Admin can update fasilitas" ON public.fasilitas FOR UPDATE USING (is_admin_of_lembaga(auth.uid(), lembaga_id));
CREATE POLICY "Admin can delete fasilitas" ON public.fasilitas FOR DELETE USING (is_admin_of_lembaga(auth.uid(), lembaga_id));
