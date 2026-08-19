-- ========================================================================================
-- SCRIPT: 06_seed_admin_units.sql
-- PURPOSE: Membuat akun Admin Lembaga dan langsung memberikan hak akses.
-- CARA PENGGUNAAN: Jalankan script ini di SQL Editor Supabase Anda.
-- ========================================================================================

DO $$
DECLARE
    -- Variabel UUID untuk menampung ID masing-masing user yang baru dibuat
    id_tk UUID := gen_random_uuid();
    id_smp UUID := gen_random_uuid();
    id_sma UUID := gen_random_uuid();
    id_pontren UUID := gen_random_uuid();

    -- Variabel untuk menampung ID Lembaga dari tabel lembaga
    lembaga_id_tk UUID;
    lembaga_id_smp UUID;
    lembaga_id_sma UUID;
    lembaga_id_pontren UUID;
BEGIN
    -- 1. Ambil ID Lembaga yang sudah ada di database
    SELECT id INTO lembaga_id_tk FROM public.lembaga WHERE kode = 'TK' LIMIT 1;
    SELECT id INTO lembaga_id_smp FROM public.lembaga WHERE kode = 'SMP' LIMIT 1;
    SELECT id INTO lembaga_id_sma FROM public.lembaga WHERE kode = 'SMA' LIMIT 1;
    SELECT id INTO lembaga_id_pontren FROM public.lembaga WHERE kode = 'PONTREN' LIMIT 1;

    -- Validasi keberadaan lembaga (agar script tidak error jika data tidak ada)
    IF lembaga_id_tk IS NULL OR lembaga_id_smp IS NULL OR lembaga_id_sma IS NULL OR lembaga_id_pontren IS NULL THEN
        RAISE EXCEPTION 'Ada data Lembaga yang belum terbuat di tabel lembaga. Pastikan script inisialisasi sudah dijalankan.';
    END IF;

    -- ====================================================================================
    -- 2. CREATE USERS DI AUTHENTICATION SUPABASE
    -- (Otomatis membuat user dengan password default: manarulhikam123)
    -- ====================================================================================

    -- ADMIN TK
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admintkmanarulhikam@gmail.com') THEN
        INSERT INTO auth.users (id, instance_id, role, aud, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
        VALUES (id_tk, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admintkmanarulhikam@gmail.com', crypt('manarulhikam123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Admin TK"}', now(), now());
    ELSE
        SELECT id INTO id_tk FROM auth.users WHERE email = 'admintkmanarulhikam@gmail.com';
    END IF;

    -- ADMIN SMP
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'adminsmpmanarulhikam@gmail.com') THEN
        INSERT INTO auth.users (id, instance_id, role, aud, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
        VALUES (id_smp, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'adminsmpmanarulhikam@gmail.com', crypt('manarulhikam123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Admin SMP"}', now(), now());
    ELSE
        SELECT id INTO id_smp FROM auth.users WHERE email = 'adminsmpmanarulhikam@gmail.com';
    END IF;

    -- ADMIN SMA
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'adminsmamanarulhikam@gmail.com') THEN
        INSERT INTO auth.users (id, instance_id, role, aud, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
        VALUES (id_sma, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'adminsmamanarulhikam@gmail.com', crypt('manarulhikam123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Admin SMA"}', now(), now());
    ELSE
        SELECT id INTO id_sma FROM auth.users WHERE email = 'adminsmamanarulhikam@gmail.com';
    END IF;

    -- ADMIN PESANTREN
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'adminpesantrenmanarulhikam@gmail.com') THEN
        INSERT INTO auth.users (id, instance_id, role, aud, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
        VALUES (id_pontren, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'adminpesantrenmanarulhikam@gmail.com', crypt('manarulhikam123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Admin Pesantren"}', now(), now());
    ELSE
        SELECT id INTO id_pontren FROM auth.users WHERE email = 'adminpesantrenmanarulhikam@gmail.com';
    END IF;

    -- ====================================================================================
    -- 3. SINKRONISASI KE TABEL PUBLIC.USERS
    -- ====================================================================================
    INSERT INTO public.users (id, full_name) VALUES 
        (id_tk, 'Admin TK'),
        (id_smp, 'Admin SMP'),
        (id_sma, 'Admin SMA'),
        (id_pontren, 'Admin Pesantren')
    ON CONFLICT (id) DO NOTHING;

    -- ====================================================================================
    -- 4. BERIKAN HAK AKSES SEBAGAI ADMIN LEMBAGA DI TABEL USER_ROLES
    -- ====================================================================================
    -- Hapus akses lama (jika ada script di-run ulang)
    DELETE FROM public.user_roles WHERE user_id IN (id_tk, id_smp, id_sma, id_pontren);

    -- Insert akses baru
    INSERT INTO public.user_roles (user_id, lembaga_id, role) VALUES
        (id_tk, lembaga_id_tk, 'ADMIN'),
        (id_smp, lembaga_id_smp, 'ADMIN'),
        (id_sma, lembaga_id_sma, 'ADMIN'),
        (id_pontren, lembaga_id_pontren, 'ADMIN');

    RAISE NOTICE '4 Akun Admin Unit berhasil dibuat dan diberikan hak akses!';
END $$;
