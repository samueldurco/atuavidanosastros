begin;
update public.product_continuity_policy set enabled=false;
revoke all on function public.read_product_continuity_selection(uuid[]) from public,anon,authenticated,service_role;
revoke all on function public.product_continuity_selection_snapshot(uuid[]) from public,anon,authenticated,service_role;
-- Retain owner inspection/deletion, expiry maintenance and all existing revocation controls.
commit;
