-- ========================================================================================
-- MIGRATION: 04_portal_public_and_rekening.sql
-- PURPOSE: Menambahkan tabel Rekening, kolom NIK untuk siswa, dan melonggarkan akses Portal Siswa
-- ========================================================================================

-- 1. Tambah Kolom NIK di tabel Students
ALTER TABLE public.students ADD COLUMN nik VARCHAR UNIQUE;

-- 2. Buat tabel Rekening Yayasan
CREATE TABLE public.rekening_yayasan (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama_bank VARCHAR NOT NULL,
    no_rekening VARCHAR NOT NULL,
    atas_nama VARCHAR NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.rekening_yayasan ENABLE ROW LEVEL SECURITY;

-- Policy untuk Rekening:
-- Admin Yayasan bisa CRUD
CREATE POLICY "Yayasan admin can manage rekening" ON public.rekening_yayasan FOR ALL USING (is_admin_yayasan(auth.uid()));
-- Publik (anon) bisa SELECT (karena akan ditampilkan di Portal Pembayaran)
CREATE POLICY "Public can view rekening" ON public.rekening_yayasan FOR SELECT TO public USING (true);


-- 3. Melonggarkan RLS untuk Portal Publik
-- Supaya orangtua bisa mengecek tagihan tanpa login, kita berikan akses SELECT ke publik
-- Namun untuk keamanan data, di UI pencarian WAJIB membutuhkan NIK/NISN yang presisi.

-- Students: Publik bisa membaca data siswa (untuk keperluan pencarian via NIK/NISN)
CREATE POLICY "Public can view students" ON public.students FOR SELECT TO public USING (true);

-- Bills: Publik bisa melihat tagihan (selama tahu student_id dari pencarian sebelumnya)
CREATE POLICY "Public can view bills" ON public.bills FOR SELECT TO public USING (true);

-- Payments: Publik bisa melihat riwayat pembayaran & melakukan insert
CREATE POLICY "Public can view payments" ON public.payments FOR SELECT TO public USING (true);
CREATE POLICY "Public can insert payments" ON public.payments FOR INSERT TO public WITH CHECK (true);
