-- ========================================================================================
-- MIGRATION: 01_add_landing_page_fields.sql
-- PURPOSE: Menambahkan kolom-kolom baru ke site_profile dan lembaga untuk keperluan CMS Landing Page
-- ========================================================================================

-- 1. Tambah kolom ke site_profile (Yayasan)
ALTER TABLE public.site_profile
ADD COLUMN IF NOT EXISTS hero_title VARCHAR,
ADD COLUMN IF NOT EXISTS hero_subtitle TEXT,
ADD COLUMN IF NOT EXISTS hero_image_url VARCHAR,
ADD COLUMN IF NOT EXISTS ketua_nama VARCHAR,
ADD COLUMN IF NOT EXISTS ketua_foto_url VARCHAR,
ADD COLUMN IF NOT EXISTS visi TEXT,
ADD COLUMN IF NOT EXISTS misi TEXT,
ADD COLUMN IF NOT EXISTS sejarah TEXT,
ADD COLUMN IF NOT EXISTS email VARCHAR,
ADD COLUMN IF NOT EXISTS facebook_url VARCHAR,
ADD COLUMN IF NOT EXISTS instagram_url VARCHAR,
ADD COLUMN IF NOT EXISTS youtube_url VARCHAR;

-- 2. Tambah kolom ke lembaga (Unit Sekolah/Pesantren)
ALTER TABLE public.lembaga
ADD COLUMN IF NOT EXISTS deskripsi TEXT,
ADD COLUMN IF NOT EXISTS gambar_url VARCHAR,
ADD COLUMN IF NOT EXISTS logo_url VARCHAR,
ADD COLUMN IF NOT EXISTS slug VARCHAR;

-- ========================================================================================
-- UPDATE POLICIES FOR site_profile
-- ========================================================================================
-- Kita butuh kebijakan UPDATE untuk site_profile, di mana hanya SUPER_ADMIN / ADMIN Yayasan yang bisa merubahnya.
-- Karena site_profile tidak memiliki lembaga_id (karena ini milik yayasan), kita asumsikan lembaga dengan kode 'YAYASAN'
-- adalah yang mengontrolnya.

-- Buat helper khusus untuk mengecek apakah user adalah admin Yayasan
CREATE OR REPLACE FUNCTION public.is_admin_yayasan(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.lembaga l ON ur.lembaga_id = l.id
        WHERE ur.user_id = is_admin_yayasan.user_id
          AND l.kode = 'YAYASAN'
          AND ur.role IN ('SUPER_ADMIN', 'ADMIN')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policy untuk Update site_profile
CREATE POLICY "Admin Yayasan can update site_profile" 
ON public.site_profile 
FOR UPDATE 
USING (is_admin_yayasan(auth.uid()));

-- ========================================================================================
-- UPDATE POLICIES FOR lembaga
-- ========================================================================================
-- Admin Yayasan bisa merubah semua lembaga, atau Admin Lembaga spesifik bisa merubah lembaganya sendiri.
CREATE POLICY "Admin can update their own lembaga" 
ON public.lembaga 
FOR UPDATE 
USING (is_admin_of_lembaga(auth.uid(), id));

-- (Opsional) Insert initial data for site_profile if empty
INSERT INTO public.site_profile (nama_yayasan, hero_title, hero_subtitle, kontak, alamat, email)
SELECT 
    'Yayasan Manarul Hikam', 
    'Selamat Datang di Yayasan Manarul Hikam', 
    'Membangun generasi berilmu, berakhlak mulia, dan berdaya saing global berlandaskan nilai-nilai Islam.',
    '0812-3456-7890',
    'Jl. Tampian No. 123, Kabupaten Terpadu, Indonesia',
    'info@manarulhikam.sch.id'
WHERE NOT EXISTS (SELECT 1 FROM public.site_profile);
