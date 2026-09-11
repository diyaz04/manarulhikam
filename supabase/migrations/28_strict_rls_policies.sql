-- Migration 28: Strict RLS Policies

-- 1. USERS
DROP POLICY IF EXISTS "Public read access for users" ON public.users;
CREATE POLICY "Strict Read Users" ON public.users FOR SELECT USING (
    id = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('ADMIN', 'SUPER_ADMIN'))
);

-- 2. USER_ROLES
DROP POLICY IF EXISTS "Public read access for user_roles" ON public.user_roles;
CREATE POLICY "Strict Read User Roles" ON public.user_roles FOR SELECT USING (
    user_id = auth.uid() OR 
    public.is_admin_of_lembaga(auth.uid(), lembaga_id)
);

-- 3. TEACHERS
DROP POLICY IF EXISTS "Public Read Teachers" ON public.teachers;
CREATE POLICY "Strict Read Teachers" ON public.teachers FOR SELECT USING (
    user_id = auth.uid() OR 
    public.is_admin_of_lembaga(auth.uid(), lembaga_id)
);

-- 4. STUDENTS
DROP POLICY IF EXISTS "Public can view students" ON public.students;
CREATE POLICY "Admin Read Students" ON public.students FOR SELECT USING (
    public.is_admin_of_lembaga(auth.uid(), lembaga_id)
);
CREATE POLICY "Guru Read Students" ON public.students FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'GURU' AND ur.lembaga_id = students.lembaga_id)
);

-- 5. SCHEDULES
DROP POLICY IF EXISTS "Public Read Schedules" ON public.schedules;
CREATE POLICY "Strict Read Schedules" ON public.schedules FOR SELECT USING (
    teacher_id IN (SELECT id FROM public.teachers WHERE user_id = auth.uid()) OR
    public.is_admin_of_lembaga(auth.uid(), lembaga_id)
);

-- 6. AGENDA MENGAJAR
DROP POLICY IF EXISTS "Public Read Agenda" ON public.agenda_mengajar;
CREATE POLICY "Strict Read Agenda" ON public.agenda_mengajar FOR SELECT USING (
    guru_id IN (SELECT id FROM public.teachers WHERE user_id = auth.uid()) OR
    public.is_admin_of_lembaga(auth.uid(), lembaga_id)
);

-- 7. ABSENSI SISWA
DROP POLICY IF EXISTS "Public Read Absensi" ON public.absensi_siswa;
CREATE POLICY "Strict Read Absensi Siswa" ON public.absensi_siswa FOR SELECT USING (
    agenda_id IN (
        SELECT id FROM public.agenda_mengajar WHERE guru_id IN (SELECT id FROM public.teachers WHERE user_id = auth.uid())
        UNION
        SELECT id FROM public.agenda_mengajar WHERE public.is_admin_of_lembaga(auth.uid(), lembaga_id)
    )
);

-- 8. SECURE PUBLIC PORTAL (BILLS & PAYMENTS)
DROP POLICY IF EXISTS "Public can view bills" ON public.bills;
DROP POLICY IF EXISTS "Public can view payments" ON public.payments;

CREATE OR REPLACE FUNCTION public.get_portal_student(search_query TEXT)
RETURNS JSON AS $$
DECLARE
  student_record RECORD;
  bills_data JSON;
  payments_data JSON;
BEGIN
  SELECT s.id, s.nama, s.nisn, s.nik, l.nama AS lembaga_nama 
  INTO student_record
  FROM public.students s
  JOIN public.lembaga l ON s.lembaga_id = l.id
  WHERE s.nisn = search_query OR s.nik = search_query
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(json_agg(b), '[]'::json) INTO bills_data
  FROM (
    SELECT id, jenis_tagihan_final, nominal, nominal_terbayar, status, created_at
    FROM public.bills
    WHERE student_id = student_record.id
    ORDER BY created_at ASC
  ) b;

  SELECT COALESCE(json_agg(p), '[]'::json) INTO payments_data
  FROM (
    SELECT p.id, p.nominal_dibayar, p.status, p.tanggal_bayar, p.catatan, p.bukti_transfer_url, b.jenis_tagihan_final
    FROM public.payments p
    JOIN public.bills b ON p.bill_id = b.id
    WHERE b.student_id = student_record.id
    ORDER BY p.tanggal_bayar DESC
  ) p;

  RETURN json_build_object(
    'student', row_to_json(student_record),
    'bills', bills_data,
    'payments', payments_data
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. ALUMNI
DROP POLICY IF EXISTS "Public Read Alumni" ON public.alumni;
CREATE POLICY "Strict Read Alumni" ON public.alumni FOR SELECT USING (
    user_id = auth.uid() OR
    public.is_admin_of_lembaga(auth.uid(), lembaga_id)
);

-- 10. SPMB PENDAFTAR
DROP POLICY IF EXISTS "Auth users can read all" ON public.spmb_pendaftar;
CREATE POLICY "Strict Read SPMB Pendaftar" ON public.spmb_pendaftar FOR SELECT USING (
    user_id = auth.uid() OR
    public.is_admin_of_lembaga(auth.uid(), lembaga_id)
);
