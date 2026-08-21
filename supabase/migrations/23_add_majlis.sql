-- Insert Majlis Ta'lim if it does not exist
INSERT INTO public.lembaga (nama, kode)
SELECT 'Majlis Ta''lim Manarul Hikam', 'MAJLIS'
WHERE NOT EXISTS (
    SELECT 1 FROM public.lembaga WHERE kode = 'MAJLIS'
);
