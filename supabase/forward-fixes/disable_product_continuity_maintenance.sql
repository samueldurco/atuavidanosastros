begin;
-- Stop service maintenance and new selections; preserve owner inspection, erasure and revocation.
update public.product_continuity_policy set enabled=false;
revoke all on function public.purge_expired_product_continuity_access() from public,anon,authenticated,service_role;
revoke all on function public.read_product_continuity_selection(uuid[]) from public,anon,authenticated,service_role;
revoke all on function public.product_continuity_selection_snapshot(uuid[]) from public,anon,authenticated,service_role;
commit;
