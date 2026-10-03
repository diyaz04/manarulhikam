-- Besaran honor per JP harus kelipatan Rp 1.000.
ALTER TABLE public.payroll_rates DROP CONSTRAINT IF EXISTS payroll_rates_rate_multiple_of_1000;
ALTER TABLE public.payroll_rates
    ADD CONSTRAINT payroll_rates_rate_multiple_of_1000
    CHECK (rate_per_jam >= 0 AND rate_per_jam % 1000 = 0);
