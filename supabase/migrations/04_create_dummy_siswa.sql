-- ========================================================================================
-- SCRIPT: 04_create_dummy_siswa.sql
-- PURPOSE: Membuat akun siswa dummy untuk mengetes Portal Siswa (/portal/siswa)
-- CARA PENGGUNAAN: 
-- 1. Buat user baru di menu Authentication Supabase dengan email: siswa@tes.com (password bebas).
-- 2. Jalankan script ini di SQL Editor.
-- ========================================================================================

DO $$
DECLARE
    target_user_id UUID;
    smp_lembaga_id UUID;
BEGIN
    -- 1. Cari ID User berdasarkan email (Pastikan user sudah dibuat di Auth)
    SELECT id INTO target_user_id 
    FROM auth.users 
    WHERE email = 'siswa@tes.com';

    -- 2. Cari ID Lembaga SMP
    SELECT id INTO smp_lembaga_id 
    FROM public.lembaga 
    WHERE kode = 'SMP'
    LIMIT 1;

    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'User dengan email siswa@tes.com belum terdaftar di Authentication!';
    END IF;

    -- Pastikan user ada di public.users
    INSERT INTO public.users (id, full_name)
    VALUES (target_user_id, 'Budi Siswa Dummy')
    ON CONFLICT (id) DO NOTHING;

    -- Berikan role SISWA ke user tersebut
    DELETE FROM public.user_roles WHERE user_id = target_user_id;
    INSERT INTO public.user_roles (user_id, lembaga_id, role)
    VALUES (target_user_id, smp_lembaga_id, 'SISWA');

    -- Masukkan ke master data students
    INSERT INTO public.students (lembaga_id, user_id, nisn, nama, kelas, angkatan, status)
    VALUES (smp_lembaga_id, target_user_id, '1234567890', 'Budi Siswa Dummy', '7A', 2026, 'AKTIF')
    ON CONFLICT (user_id) DO NOTHING;

    RAISE NOTICE 'Akun Siswa Dummy berhasil disiapkan!';
END $$;
