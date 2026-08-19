-- ========================================================================================
-- SCRIPT: 02_set_admin_yayasan.sql
-- PURPOSE: Memberikan akses SUPER_ADMIN Yayasan ke email tertentu
-- CARA PENGGUNAAN: Jalankan script ini di SQL Editor Supabase Anda.
-- PASTIKAN: Email ini sudah terdaftar / mendaftar sebelumnya di menu Authentication Supabase.
-- ========================================================================================

DO $$
DECLARE
    target_user_id UUID;
    yayasan_lembaga_id UUID;
BEGIN
    -- 1. Cari ID User berdasarkan email di tabel sistem (auth.users)
    SELECT id INTO target_user_id 
    FROM auth.users 
    WHERE email = 'adminyayasanmanarulhikam@gmail.com';

    -- 2. Cari ID Lembaga Yayasan
    SELECT id INTO yayasan_lembaga_id 
    FROM public.lembaga 
    WHERE kode = 'YAYASAN'
    LIMIT 1;

    -- Validasi apakah user ditemukan di auth.users
    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'User dengan email tersebut belum terdaftar di Supabase Authentication!';
    END IF;

    -- Validasi apakah lembaga Yayasan ditemukan
    IF yayasan_lembaga_id IS NULL THEN
        RAISE EXCEPTION 'Data lembaga Yayasan tidak ditemukan di tabel lembaga!';
    END IF;

    -- 3. Pastikan user juga terdaftar di tabel profil kita (public.users)
    -- Jika user dibuat via Dashboard Supabase, mereka hanya ada di auth.users, tapi belum ada di public.users.
    INSERT INTO public.users (id, full_name)
    VALUES (target_user_id, 'Admin Yayasan')
    ON CONFLICT (id) DO NOTHING;

    -- 4. Masukkan hak akses ke tabel user_roles (Gunakan ON CONFLICT jika sudah ada)
    -- Catatan: Karena kita tidak set constraint UNIQUE(user_id, lembaga_id) di awal,
    -- kita hapus dulu role yayasan untuk user ini jika ada, baru insert yang baru.
    DELETE FROM public.user_roles 
    WHERE user_id = target_user_id AND lembaga_id = yayasan_lembaga_id;

    INSERT INTO public.user_roles (user_id, lembaga_id, role)
    VALUES (target_user_id, yayasan_lembaga_id, 'SUPER_ADMIN');

    RAISE NOTICE 'Akses SUPER_ADMIN Yayasan berhasil diberikan!';
END $$;
