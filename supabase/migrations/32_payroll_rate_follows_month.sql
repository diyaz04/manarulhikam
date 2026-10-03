-- ========================================================================================
-- MIGRATION 32: Honor mengikuti tarif terakhir selama masih di bulan yang sama
--
-- Aturan:
--  * Total honor guru per bulan = total JP terverifikasi bulan itu x tarif per JP.
--  * Jika admin mengubah tarif di tengah bulan, SELURUH honor bulan berjalan dihitung ulang
--    dengan tarif baru (tidak ada nilai harian yang "terkunci").
--  * Bulan yang sudah lewat tidak ikut berubah: tarif yang dipakai disimpan di payroll_guru.rate_per_jam.
--  * Baris payroll berstatus 'SUDAH DIBAYARKAN' tidak dihitung ulang.
--  * Jurnal kas honor menjadi SATU transaksi per guru per bulan (bukan per sesi) dan ikut diperbarui.
-- ========================================================================================

ALTER TABLE public.payroll_guru ADD COLUMN IF NOT EXISTS rate_per_jam NUMERIC;
ALTER TABLE public.payroll_guru ADD COLUMN IF NOT EXISTS transaksi_id UUID REFERENCES public.transaksi_keuangan(id) ON DELETE SET NULL;

-- ----------------------------------------------------------------------------------------
-- 1. Sinkronkan jurnal kas (1 transaksi DEBIT per baris payroll)
-- ----------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_payroll_jurnal(p_payroll_id UUID)
RETURNS VOID AS $$
DECLARE
    r RECORD;
    v_kategori_id UUID;
    v_keterangan TEXT;
    v_tid UUID;
BEGIN
    SELECT pg.*, t.nama AS guru_nama INTO r
    FROM public.payroll_guru pg
    JOIN public.teachers t ON t.id = pg.guru_id
    WHERE pg.id = p_payroll_id;

    IF NOT FOUND THEN RETURN; END IF;

    v_keterangan := 'Honor mengajar ' || lpad(r.bulan::TEXT, 2, '0') || '/' || r.tahun || ' - ' || r.guru_nama
                    || ' (' || r.total_jam_terverifikasi || ' JP x Rp ' || COALESCE(r.rate_per_jam, 0) || ')';

    -- Honor 0: tidak ada jurnal (kolom jumlah wajib > 0)
    IF COALESCE(r.total_honor, 0) <= 0 THEN
        IF r.transaksi_id IS NOT NULL THEN
            DELETE FROM public.transaksi_keuangan WHERE id = r.transaksi_id;
        END IF;
        RETURN;
    END IF;

    IF r.transaksi_id IS NOT NULL THEN
        UPDATE public.transaksi_keuangan
        SET jumlah = r.total_honor, keterangan = v_keterangan
        WHERE id = r.transaksi_id;
        IF FOUND THEN RETURN; END IF;
    END IF;

    SELECT id INTO v_kategori_id FROM public.kategori_transaksi
    WHERE lembaga_id = r.lembaga_id AND nama = 'Honor Mengajar Guru' LIMIT 1;

    IF v_kategori_id IS NULL THEN
        INSERT INTO public.kategori_transaksi (lembaga_id, nama, jenis_default)
        VALUES (r.lembaga_id, 'Honor Mengajar Guru', 'DEBIT')
        RETURNING id INTO v_kategori_id;
    END IF;

    INSERT INTO public.transaksi_keuangan (lembaga_id, kategori_id, jenis, jumlah, tanggal, keterangan)
    VALUES (r.lembaga_id, v_kategori_id, 'DEBIT', r.total_honor,
            (now() AT TIME ZONE 'Asia/Jakarta')::DATE, v_keterangan)
    RETURNING id INTO v_tid;

    UPDATE public.payroll_guru SET transaksi_id = v_tid WHERE id = p_payroll_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------------------
-- 2. Agenda terverifikasi: tambah JP, hitung honor bulan itu dengan tarif berlaku
-- ----------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_agenda_verified()
RETURNS TRIGGER AS $$
DECLARE
    v_rate NUMERIC;
    v_jp_mulai INTEGER;
    v_jp_selesai INTEGER;
    v_total_jp INTEGER;
    v_bulan INTEGER;
    v_tahun INTEGER;
    v_today DATE := (now() AT TIME ZONE 'Asia/Jakarta')::DATE;
    v_is_current BOOLEAN;
    v_existing_rate NUMERIC;
    v_payroll_id UUID;
BEGIN
    IF (TG_OP = 'UPDATE' AND NEW.status = 'VERIFIED' AND OLD.status = 'PENDING') OR
       (TG_OP = 'INSERT' AND NEW.status = 'VERIFIED') THEN

        v_bulan := EXTRACT(MONTH FROM NEW.tanggal);
        v_tahun := EXTRACT(YEAR FROM NEW.tanggal);
        v_is_current := (v_bulan = EXTRACT(MONTH FROM v_today) AND v_tahun = EXTRACT(YEAR FROM v_today));

        -- Tarif saat ini milik guru tersebut
        SELECT pr.rate_per_jam INTO v_rate
        FROM public.teachers t
        LEFT JOIN public.payroll_rates pr ON t.payroll_rate_id = pr.id
        WHERE t.id = NEW.guru_id;

        -- Bulan yang sudah lewat: pakai tarif yang sudah tersimpan di bulan itu (jangan ikut tarif terbaru)
        IF NOT v_is_current THEN
            SELECT rate_per_jam INTO v_existing_rate FROM public.payroll_guru
            WHERE guru_id = NEW.guru_id AND bulan = v_bulan AND tahun = v_tahun;
            IF v_existing_rate IS NOT NULL THEN v_rate := v_existing_rate; END IF;
        END IF;

        v_rate := COALESCE(v_rate, 0);

        SELECT jam_ke_mulai, jam_ke_selesai INTO v_jp_mulai, v_jp_selesai FROM public.schedules WHERE id = NEW.jadwal_id;
        v_total_jp := (v_jp_selesai - v_jp_mulai) + 1;
        IF v_total_jp < 0 THEN v_total_jp := 0; END IF;

        INSERT INTO public.payroll_guru (lembaga_id, guru_id, bulan, tahun, total_jam_terverifikasi, rate_per_jam, total_honor)
        VALUES (NEW.lembaga_id, NEW.guru_id, v_bulan, v_tahun, v_total_jp, v_rate, v_total_jp * v_rate)
        ON CONFLICT (guru_id, bulan, tahun)
        DO UPDATE SET
            total_jam_terverifikasi = public.payroll_guru.total_jam_terverifikasi + EXCLUDED.total_jam_terverifikasi,
            rate_per_jam = EXCLUDED.rate_per_jam,
            total_honor = (public.payroll_guru.total_jam_terverifikasi + EXCLUDED.total_jam_terverifikasi) * EXCLUDED.rate_per_jam,
            updated_at = NOW()
        RETURNING id INTO v_payroll_id;

        PERFORM public.sync_payroll_jurnal(v_payroll_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_agenda_verified ON public.agenda_mengajar;
CREATE TRIGGER trigger_agenda_verified
AFTER INSERT OR UPDATE OF status ON public.agenda_mengajar
FOR EACH ROW
EXECUTE FUNCTION public.handle_agenda_verified();

-- ----------------------------------------------------------------------------------------
-- 3. Tarif diubah admin: hitung ulang seluruh honor BULAN BERJALAN untuk guru pemakai tarif itu
-- ----------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_payroll_rate_changed()
RETURNS TRIGGER AS $$
DECLARE
    v_today DATE := (now() AT TIME ZONE 'Asia/Jakarta')::DATE;
    r RECORD;
BEGIN
    IF NEW.rate_per_jam IS DISTINCT FROM OLD.rate_per_jam THEN
        FOR r IN
            UPDATE public.payroll_guru pg
            SET rate_per_jam = NEW.rate_per_jam,
                total_honor = pg.total_jam_terverifikasi * NEW.rate_per_jam,
                updated_at = NOW()
            FROM public.teachers t
            WHERE t.id = pg.guru_id
              AND t.payroll_rate_id = NEW.id
              AND pg.bulan = EXTRACT(MONTH FROM v_today)
              AND pg.tahun = EXTRACT(YEAR FROM v_today)
              AND pg.status = 'BELUM DIBAYARKAN'
            RETURNING pg.id
        LOOP
            PERFORM public.sync_payroll_jurnal(r.id);
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_payroll_rate_changed ON public.payroll_rates;
CREATE TRIGGER trigger_payroll_rate_changed
AFTER UPDATE OF rate_per_jam ON public.payroll_rates
FOR EACH ROW
EXECUTE FUNCTION public.handle_payroll_rate_changed();

-- ----------------------------------------------------------------------------------------
-- 4. Guru dipindah ke tipe tarif lain di tengah bulan: honor bulan berjalan ikut tarif baru
-- ----------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_teacher_rate_changed()
RETURNS TRIGGER AS $$
DECLARE
    v_today DATE := (now() AT TIME ZONE 'Asia/Jakarta')::DATE;
    v_rate NUMERIC;
    v_payroll_id UUID;
BEGIN
    IF NEW.payroll_rate_id IS NOT NULL AND NEW.payroll_rate_id IS DISTINCT FROM OLD.payroll_rate_id THEN
        SELECT rate_per_jam INTO v_rate FROM public.payroll_rates WHERE id = NEW.payroll_rate_id;

        UPDATE public.payroll_guru pg
        SET rate_per_jam = v_rate,
            total_honor = pg.total_jam_terverifikasi * v_rate,
            updated_at = NOW()
        WHERE pg.guru_id = NEW.id
          AND pg.bulan = EXTRACT(MONTH FROM v_today)
          AND pg.tahun = EXTRACT(YEAR FROM v_today)
          AND pg.status = 'BELUM DIBAYARKAN'
        RETURNING pg.id INTO v_payroll_id;

        IF v_payroll_id IS NOT NULL THEN
            PERFORM public.sync_payroll_jurnal(v_payroll_id);
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_teacher_rate_changed ON public.teachers;
CREATE TRIGGER trigger_teacher_rate_changed
AFTER UPDATE OF payroll_rate_id ON public.teachers
FOR EACH ROW
EXECUTE FUNCTION public.handle_teacher_rate_changed();

-- ----------------------------------------------------------------------------------------
-- 5. Migrasi data BULAN BERJALAN ke aturan baru
--    - jurnal honor otomatis per-sesi bulan berjalan diganti 1 jurnal per guru
--    - honor dihitung ulang dengan tarif guru saat ini
--    Bulan-bulan sebelumnya TIDAK disentuh.
-- ----------------------------------------------------------------------------------------
DO $$
DECLARE
    v_today DATE := (now() AT TIME ZONE 'Asia/Jakarta')::DATE;
    r RECORD;
BEGIN
    DELETE FROM public.transaksi_keuangan
    WHERE keterangan LIKE 'Pembayaran honor otomatis%'
      AND substring(keterangan FROM 'Sesi (\d{4}-\d{2}-\d{2})') IS NOT NULL
      AND to_date(substring(keterangan FROM 'Sesi (\d{4}-\d{2}-\d{2})'), 'YYYY-MM-DD') >= date_trunc('month', v_today)::DATE;

    FOR r IN
        UPDATE public.payroll_guru pg
        SET rate_per_jam = COALESCE(pr.rate_per_jam, 0),
            total_honor = pg.total_jam_terverifikasi * COALESCE(pr.rate_per_jam, 0),
            updated_at = NOW()
        FROM public.teachers t
        LEFT JOIN public.payroll_rates pr ON pr.id = t.payroll_rate_id
        WHERE t.id = pg.guru_id
          AND pg.bulan = EXTRACT(MONTH FROM v_today)
          AND pg.tahun = EXTRACT(YEAR FROM v_today)
          AND pg.status = 'BELUM DIBAYARKAN'
        RETURNING pg.id
    LOOP
        PERFORM public.sync_payroll_jurnal(r.id);
    END LOOP;
END;
$$;
