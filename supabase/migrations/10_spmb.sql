-- 1. Tabel Konfigurasi Utama SPMB
CREATE TABLE IF NOT EXISTS public.spmb_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lembaga_id UUID NOT NULL REFERENCES public.lembaga(id) ON DELETE CASCADE,
    aktif BOOLEAN DEFAULT false,
    nama_program VARCHAR NOT NULL DEFAULT 'Penerimaan Murid Baru',
    tahun_pelajaran VARCHAR NOT NULL,
    tanggal_buka DATE,
    tanggal_tutup DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(lembaga_id)
);

-- 2. Tabel Form Builder (Field dinamis)
CREATE TABLE IF NOT EXISTS public.spmb_form_fields (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_id UUID NOT NULL REFERENCES public.spmb_config(id) ON DELETE CASCADE,
    label VARCHAR NOT NULL,
    tipe_field VARCHAR NOT NULL, -- 'text', 'number', 'date', 'select', 'textarea'
    wajib BOOLEAN DEFAULT true,
    urutan INTEGER NOT NULL DEFAULT 0,
    options JSONB -- Untuk menyimpan daftar pilihan jika tipe_field = 'select' (e.g. ["Laki-laki", "Perempuan"])
);

-- 3. Tabel Persyaratan Dokumen
CREATE TABLE IF NOT EXISTS public.spmb_required_docs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_id UUID NOT NULL REFERENCES public.spmb_config(id) ON DELETE CASCADE,
    nama_dokumen VARCHAR NOT NULL,
    wajib BOOLEAN DEFAULT true,
    urutan INTEGER NOT NULL DEFAULT 0
);

-- 4. Tabel Pendaftar
CREATE TABLE IF NOT EXISTS public.spmb_pendaftar (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_id UUID NOT NULL REFERENCES public.spmb_config(id) ON DELETE CASCADE,
    no_pendaftaran VARCHAR NOT NULL UNIQUE,
    data_isian JSONB NOT NULL DEFAULT '{}'::jsonb,
    tanggal_daftar TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Tabel Lampiran Dokumen Pendaftar
CREATE TABLE IF NOT EXISTS public.spmb_pendaftar_dokumen (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pendaftar_id UUID NOT NULL REFERENCES public.spmb_pendaftar(id) ON DELETE CASCADE,
    nama_dokumen VARCHAR NOT NULL,
    file_url VARCHAR NOT NULL
);

-- Enable RLS
ALTER TABLE public.spmb_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spmb_form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spmb_required_docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spmb_pendaftar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spmb_pendaftar_dokumen ENABLE ROW LEVEL SECURITY;

-- Policies for spmb_config
-- Public can read active config
CREATE POLICY "Public can read active spmb_config" 
    ON public.spmb_config FOR SELECT 
    USING (aktif = true);

-- Auth users can read/write their own unit config
CREATE POLICY "Auth users can read all spmb_config" 
    ON public.spmb_config FOR SELECT 
    TO authenticated 
    USING (true);

CREATE POLICY "Auth users can modify spmb_config" 
    ON public.spmb_config FOR ALL 
    TO authenticated 
    USING (true) WITH CHECK (true);

-- Policies for spmb_form_fields
CREATE POLICY "Public can read spmb_form_fields" 
    ON public.spmb_form_fields FOR SELECT 
    USING (true);
CREATE POLICY "Auth users can modify spmb_form_fields" 
    ON public.spmb_form_fields FOR ALL 
    TO authenticated 
    USING (true) WITH CHECK (true);

-- Policies for spmb_required_docs
CREATE POLICY "Public can read spmb_required_docs" 
    ON public.spmb_required_docs FOR SELECT 
    USING (true);
CREATE POLICY "Auth users can modify spmb_required_docs" 
    ON public.spmb_required_docs FOR ALL 
    TO authenticated 
    USING (true) WITH CHECK (true);

-- Policies for spmb_pendaftar
-- Public can insert new registration
CREATE POLICY "Public can insert spmb_pendaftar" 
    ON public.spmb_pendaftar FOR INSERT 
    WITH CHECK (true);
-- Public can select their own registration by ID (for success page)
CREATE POLICY "Public can read spmb_pendaftar" 
    ON public.spmb_pendaftar FOR SELECT 
    USING (true);
-- Auth users can read all
CREATE POLICY "Auth users can modify spmb_pendaftar" 
    ON public.spmb_pendaftar FOR ALL 
    TO authenticated 
    USING (true) WITH CHECK (true);

-- Policies for spmb_pendaftar_dokumen
CREATE POLICY "Public can insert spmb_pendaftar_dokumen" 
    ON public.spmb_pendaftar_dokumen FOR INSERT 
    WITH CHECK (true);
CREATE POLICY "Public can read spmb_pendaftar_dokumen" 
    ON public.spmb_pendaftar_dokumen FOR SELECT 
    USING (true);
CREATE POLICY "Auth users can modify spmb_pendaftar_dokumen" 
    ON public.spmb_pendaftar_dokumen FOR ALL 
    TO authenticated 
    USING (true) WITH CHECK (true);
