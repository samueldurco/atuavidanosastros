begin;
update public.product_continuity_policy set enabled=false where singleton;
revoke all on function public.read_product_continuity_selection(uuid[]) from public,anon,authenticated,service_role;
-- Owner management/revocation/deletion are retained. No stored context or provider exists.
commit;
