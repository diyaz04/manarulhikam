-- ========================================================================================
-- SCRIPT: 24_seed_admin_majlis.sql
-- PURPOSE: Membuat akun Admin Majlis Ta'lim dan langsung memberikan hak akses.
-- CARA PENGGUNAAN: Jalankan script ini di SQL Editor Supabase Anda.
-- ========================================================================================

DO $$$
DECLARE
    id_majlis UUID := gen_random_uuid();
    lembaga_id_majlis UUID;
BEGIN
    -- 1. Ambil ID Lembaga yang sudah ada di database
    SELECT id INTO lembaga_id_majlis FROM public.lembaga WHERE kode = 'MAJLIS' LIMIT 1;

    -- Validasi keberadaan lembaga
    IF lembaga_id_majlis IS NULL THEN
        RAISE EXCEPTION 'Lembaga MAJLIS belum ada. Pastikan sudah diinsert.';
    END IF;

    -- 2. CREATE USERS DI AUTHENTICATION SUPABASE
    -- (Otomatis membuat user dengan password default: manarulhikam123)
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'adminmajlistaklimmanarulhikam@gmail.com') THEN
        INSERT INTO auth.users (id, instance_id, role, aud, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
        VALUES (id_majlis, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'adminmajlistaklimmanarulhikam@gmail.com', crypt('manarulhikam123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Admin Majlis"}', now(), now());
    ELSE
        SELECT id INTO id_majlis FROM auth.users WHERE email = 'adminmajlistaklimmanarulhikam@gmail.com';
    END IF;

    -- 3. SINKRONISASI KE TABEL PUBLIC.USERS
    INSERT INTO public.users (id, full_name) VALUES 
        (id_majlis, 'Admin Majlis Ta''lim')
    ON CONFLICT (id) DO NOTHING;

    -- 4. BERIKAN HAK AKSES SEBAGAI ADMIN LEMBAGA DI TABEL USER_ROLES
    -- Hapus akses lama (jika ada script di-run ulang)
    DELETE FROM public.user_roles WHERE user_id = id_majlis;

    -- Insert akses baru
    INSERT INTO public.user_roles (user_id, lembaga_id, role) VALUES
        (id_majlis, lembaga_id_majlis, 'ADMIN');

    RAISE NOTICE 'Akun Admin Majlis berhasil dibuat dan diberikan hak akses!';
END $$$;
