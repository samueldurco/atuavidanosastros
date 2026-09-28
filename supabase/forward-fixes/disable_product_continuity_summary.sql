-- Apply explicitly if the summary must be withdrawn. No data or management RPC is removed.
begin;
revoke all on function public.read_product_continuity_summary() from public,anon,authenticated,service_role;
commit;
-- Re-enable only after separate validation/authorization:
-- grant execute on function public.read_product_continuity_summary() to authenticated;
