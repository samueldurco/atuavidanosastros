begin;
revoke all on function public.reconcile_p06_payment(uuid,text,jsonb) from public, anon, authenticated, service_role;
revoke all on public.p06_physical_orders, public.p06_physical_receipts from public, anon, authenticated, service_role;
-- Preserve all receipts and financial evidence. Re-enabling requires a reviewed migration.
commit;
