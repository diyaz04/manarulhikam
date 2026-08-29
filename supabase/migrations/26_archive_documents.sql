-- Kategori Arsip Dokumen
CREATE TABLE archive_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lembaga_id uuid REFERENCES lembaga(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Dokumen Arsip
CREATE TABLE archive_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES archive_categories(id) ON DELETE CASCADE,
  title text NOT NULL,
  drive_link text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Mengaktifkan Row Level Security (RLS)
ALTER TABLE archive_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE archive_documents ENABLE ROW LEVEL SECURITY;

-- Memberikan akses ke pengguna yang sudah login
CREATE POLICY "Allow all authenticated users to read archive_categories" 
  ON archive_categories FOR SELECT USING (auth.role() = 'authenticated');
  
CREATE POLICY "Allow all authenticated users to read archive_documents" 
  ON archive_documents FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all authenticated users to all archive_categories" 
  ON archive_categories FOR ALL USING (auth.role() = 'authenticated');
  
CREATE POLICY "Allow all authenticated users to all archive_documents" 
  ON archive_documents FOR ALL USING (auth.role() = 'authenticated');
