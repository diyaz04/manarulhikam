-- Migration 13: Fungsi RPC untuk menghapus user dari auth.users
-- Dipanggil via supabase.rpc('delete_auth_user', { target_user_id: '...' })
-- SECURITY DEFINER agar fungsi ini bisa akses schema auth walaupun dipanggil dari client

CREATE OR REPLACE FUNCTION public.delete_auth_user(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

-- Berikan akses ke authenticated users (admin) untuk memanggil fungsi ini
GRANT EXECUTE ON FUNCTION public.delete_auth_user(UUID) TO authenticated;
