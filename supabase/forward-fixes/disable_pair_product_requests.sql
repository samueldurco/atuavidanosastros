begin;
-- Disable only new bridge calls. Keep private receipts, history and read-only recovery.
revoke all on function public.request_pair_product_run(uuid,jsonb) from public, anon, authenticated, service_role;
commit;
