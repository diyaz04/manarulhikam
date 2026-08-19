-- Migration 14: RLS Policies untuk memungkinkan Admin membuat akun Guru
-- Memperbaiki masalah dimana guru yang dibuat tidak mendapatkan role karena RLS

-- 1. Policy agar Admin bisa insert dan update tabel users (untuk mendaftarkan user baru)
CREATE POLICY "Admin can insert users" ON public.users 
FOR INSERT WITH CHECK (
  is_admin_of_lembaga(auth.uid(), (SELECT id FROM public.lembaga WHERE kode = 'SMP' LIMIT 1))
);

CREATE POLICY "Admin can update users" ON public.users 
FOR UPDATE USING (
  is_admin_of_lembaga(auth.uid(), (SELECT id FROM public.lembaga WHERE kode = 'SMP' LIMIT 1))
);

-- 2. Policy agar Admin bisa insert tabel user_roles (untuk memberi role GURU)
CREATE POLICY "Admin can insert user_roles" ON public.user_roles
FOR INSERT WITH CHECK (
  is_admin_of_lembaga(auth.uid(), lembaga_id)
);

CREATE POLICY "Admin can delete user_roles" ON public.user_roles
FOR DELETE USING (
  is_admin_of_lembaga(auth.uid(), lembaga_id)
);
