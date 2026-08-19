-- ========================================================================================
-- MIGRATION: 03_finance_and_billing.sql
-- PURPOSE: Membuat tabel dan struktur sistem keuangan terpadu dan tagihan siswa
-- ========================================================================================

-- A. Modul Keuangan Umum
CREATE TABLE public.kategori_transaksi (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lembaga_id UUID NOT NULL REFERENCES public.lembaga(id) ON DELETE CASCADE,
    nama VARCHAR NOT NULL,
    jenis_default VARCHAR NOT NULL CHECK (jenis_default IN ('DEBIT', 'KREDIT')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.transaksi_keuangan (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lembaga_id UUID NOT NULL REFERENCES public.lembaga(id) ON DELETE CASCADE,
    kategori_id UUID NOT NULL REFERENCES public.kategori_transaksi(id) ON DELETE RESTRICT,
    jenis VARCHAR NOT NULL CHECK (jenis IN ('DEBIT', 'KREDIT')), -- KREDIT = Uang Masuk, DEBIT = Uang Keluar
    jumlah NUMERIC NOT NULL CHECK (jumlah > 0),
    tanggal DATE NOT NULL,
    keterangan TEXT,
    bukti_url VARCHAR, -- URL Cloudinary
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

-- B. Master Data Siswa
CREATE TABLE public.students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lembaga_id UUID NOT NULL REFERENCES public.lembaga(id) ON DELETE RESTRICT,
    user_id UUID UNIQUE REFERENCES public.users(id) ON DELETE CASCADE, -- Link ke tabel user (login siswa)
    nisn VARCHAR UNIQUE NOT NULL,
    nama VARCHAR NOT NULL,
    kelas VARCHAR NOT NULL,
    angkatan INTEGER NOT NULL,
    status VARCHAR NOT NULL DEFAULT 'AKTIF' CHECK (status IN ('AKTIF', 'LULUS', 'KELUAR')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- C. Modul Tagihan Siswa (Billing)
CREATE TABLE public.billing_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lembaga_id UUID NOT NULL REFERENCES public.lembaga(id) ON DELETE CASCADE,
    jenis_tagihan VARCHAR NOT NULL, -- e.g. "SPP", "Uang Pangkal", "Uang Gedung"
    nominal NUMERIC NOT NULL CHECK (nominal > 0),
    tipe_periode VARCHAR NOT NULL CHECK (tipe_periode IN ('BULANAN', 'TAHUNAN', 'SEKALI')),
    keterangan TEXT,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.student_billing_overrides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    billing_template_id UUID NOT NULL REFERENCES public.billing_templates(id) ON DELETE CASCADE,
    tipe VARCHAR NOT NULL CHECK (tipe IN ('GRATIS', 'KERINGANAN')),
    nominal_override NUMERIC, -- NULL jika GRATIS, ada nilai jika KERINGANAN
    alasan VARCHAR NOT NULL, -- e.g. "Yatim Piatu", "Anak Guru", "Prestasi"
    start_date DATE, -- NULL = berlaku selamanya (atau sejak daftar)
    end_date DATE, -- NULL = tidak ada kadaluarsa
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(student_id, billing_template_id)
);

CREATE TABLE public.bills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    jenis_tagihan_final VARCHAR NOT NULL, -- e.g. "SPP (Agustus 2026)"
    nominal NUMERIC NOT NULL CHECK (nominal >= 0),
    nominal_terbayar NUMERIC NOT NULL DEFAULT 0,
    status VARCHAR NOT NULL DEFAULT 'UNPAID' CHECK (status IN ('UNPAID', 'PARTIAL', 'PAID')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(student_id, jenis_tagihan_final) -- Anti-duplikat
);

CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_id UUID NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
    nominal_dibayar NUMERIC NOT NULL CHECK (nominal_dibayar > 0),
    status VARCHAR NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    tanggal_bayar TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    catatan TEXT,
    bukti_transfer_url VARCHAR, -- URL Cloudinary
    verified_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ========================================================================================
-- RLS POLICIES
-- ========================================================================================
-- Enable RLS
ALTER TABLE public.kategori_transaksi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaksi_keuangan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_billing_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Kategori & Transaksi Keuangan: 
-- Hanya Admin/Bendahara Yayasan yang bisa akses semua (YAYASAN).
-- Untuk lembaga lain tidak punya akses.
CREATE POLICY "Yayasan admin can manage kategori" ON public.kategori_transaksi FOR ALL USING (is_admin_yayasan(auth.uid()));
CREATE POLICY "Yayasan admin can manage transaksi" ON public.transaksi_keuangan FOR ALL USING (is_admin_yayasan(auth.uid()));

-- Master Siswa:
-- Admin Yayasan bisa manage semua.
-- Admin Lembaga bisa lihat/manage siswa di lembaganya.
-- Siswa bisa melihat datanya sendiri.
CREATE POLICY "Yayasan admin can manage students" ON public.students FOR ALL USING (is_admin_yayasan(auth.uid()));
CREATE POLICY "Lembaga admin can manage their students" ON public.students FOR ALL USING (is_admin_of_lembaga(auth.uid(), lembaga_id));
CREATE POLICY "Siswa can view own data" ON public.students FOR SELECT USING (user_id = auth.uid());

-- Billing Templates & Overrides:
-- Hanya Admin Yayasan yang bisa kelola
CREATE POLICY "Yayasan admin can manage billing templates" ON public.billing_templates FOR ALL USING (is_admin_yayasan(auth.uid()));
CREATE POLICY "Yayasan admin can manage billing overrides" ON public.student_billing_overrides FOR ALL USING (is_admin_yayasan(auth.uid()));

-- Bills (Tagihan):
-- Admin Yayasan bisa manage semua.
-- Admin Lembaga bisa lihat bills siswa lembaganya.
-- Siswa hanya bisa lihat tagihannya sendiri.
CREATE POLICY "Yayasan admin can manage bills" ON public.bills FOR ALL USING (is_admin_yayasan(auth.uid()));
CREATE POLICY "Lembaga admin can view bills" ON public.bills FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.students s 
        WHERE s.id = public.bills.student_id AND is_admin_of_lembaga(auth.uid(), s.lembaga_id)
    )
);
CREATE POLICY "Siswa can view own bills" ON public.bills FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.students s 
        WHERE s.id = public.bills.student_id AND s.user_id = auth.uid()
    )
);

-- Payments (Pembayaran):
-- Admin Yayasan bisa manage semua (approve/reject).
-- Siswa bisa insert (bayar) dan select payment-nya sendiri.
CREATE POLICY "Yayasan admin can manage payments" ON public.payments FOR ALL USING (is_admin_yayasan(auth.uid()));
CREATE POLICY "Siswa can insert own payments" ON public.payments FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.bills b
        JOIN public.students s ON b.student_id = s.id
        WHERE b.id = public.payments.bill_id AND s.user_id = auth.uid()
    )
);
CREATE POLICY "Siswa can view own payments" ON public.payments FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.bills b
        JOIN public.students s ON b.student_id = s.id
        WHERE b.id = public.payments.bill_id AND s.user_id = auth.uid()
    )
);
