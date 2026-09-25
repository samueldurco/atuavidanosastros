begin;
-- Revoke this bridge only; keep existing snapshots, receipts, history and recovery.
revoke all on function public.request_date_product_run(uuid,jsonb) from public, anon, authenticated, service_role;
commit;
