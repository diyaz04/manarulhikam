-- Besaran honor per JP boleh nominal bebas (mis. 2500, 8500), tidak harus kelipatan 1000.
ALTER TABLE public.payroll_rates DROP CONSTRAINT IF EXISTS payroll_rates_rate_multiple_of_1000;
