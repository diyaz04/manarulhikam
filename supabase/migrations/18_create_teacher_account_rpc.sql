-- Migration 18: RPC untuk membuat akun guru tanpa menimpa sesi admin (bypass Supabase signUp auto-login)
CREATE OR REPLACE FUNCTION public.create_teacher_account(
  new_email TEXT,
  new_password TEXT,
  new_full_name TEXT,
  target_lembaga_id UUID
) RETURNS UUID AS $$
DECLARE
  new_user_id UUID;
BEGIN
  -- 1. Pastikan yang mengeksekusi adalah ADMIN dari lembaga tersebut
  IF NOT public.is_admin_of_lembaga(auth.uid(), target_lembaga_id) THEN
    RAISE EXCEPTION 'Akses ditolak: Anda bukan admin untuk unit ini.';
  END IF;

  -- 2. Cek apakah email sudah terdaftar
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = new_email) THEN
    RAISE EXCEPTION 'Email sudah terdaftar. Silakan gunakan email lain.';
  END IF;

  -- 3. Generate UUID baru
  new_user_id := gen_random_uuid();

  -- 4. Insert ke auth.users
  INSERT INTO auth.users (
    id, 
    instance_id, 
    role, 
    aud, 
    email, 
    encrypted_password, 
    email_confirmed_at, 
    raw_app_meta_data, 
    raw_user_meta_data, 
    created_at, 
    updated_at
  ) VALUES (
    new_user_id, 
    '00000000-0000-0000-0000-000000000000', 
    'authenticated', 
    'authenticated', 
    new_email, 
    crypt(new_password, gen_salt('bf')), 
    now(), 
    '{"provider":"email","providers":["email"]}', 
    jsonb_build_object('full_name', new_full_name, 'role', 'GURU'), 
    now(), 
    now()
  );
  
  -- 5. Insert ke auth.identities agar bisa login via email
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    new_user_id,
    jsonb_build_object('sub', new_user_id, 'email', new_email, 'email_verified', true),
    'email',
    now(),
    now(),
    now()
  );

  -- 6. Insert ke public.users
  INSERT INTO public.users (id, full_name) 
  VALUES (new_user_id, new_full_name)
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

  -- 7. Insert ke public.user_roles
  INSERT INTO public.user_roles (user_id, lembaga_id, role)
  VALUES (new_user_id, target_lembaga_id, 'GURU');

  RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
