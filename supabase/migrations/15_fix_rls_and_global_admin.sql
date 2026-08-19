-- Migration 15: Fix RLS for Users and allow YAYASAN Admin to manage everything
-- 1. Modify the helper function so SUPER_ADMIN (Yayasan) can manage all lembagas
CREATE OR REPLACE FUNCTION public.is_admin_of_lembaga(user_id UUID, check_lembaga_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_roles.user_id = is_admin_of_lembaga.user_id
          AND (
            -- User is admin of THIS specific lembaga
            (user_roles.lembaga_id = check_lembaga_id AND user_roles.role IN ('SUPER_ADMIN', 'ADMIN'))
            OR 
            -- User is SUPER_ADMIN of YAYASAN (has global access)
            (user_roles.role = 'SUPER_ADMIN' AND EXISTS (
                SELECT 1 FROM public.lembaga l WHERE l.id = user_roles.lembaga_id AND l.kode = 'YAYASAN'
            ))
          )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop the restrictive user policies from migration 14 if they exist
DROP POLICY IF EXISTS "Admin can insert users" ON public.users;
DROP POLICY IF EXISTS "Admin can update users" ON public.users;

-- 3. Replace with simpler, safe policies: Any admin can create a user profile
CREATE POLICY "Admin can insert users" ON public.users 
FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('SUPER_ADMIN', 'ADMIN'))
);

CREATE POLICY "Admin can update users" ON public.users 
FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('SUPER_ADMIN', 'ADMIN'))
);
