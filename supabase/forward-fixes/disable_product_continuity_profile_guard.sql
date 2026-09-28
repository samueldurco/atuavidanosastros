begin;
-- Fail closed; never remove the profile guard to recover availability.
update public.product_continuity_policy set enabled=false where singleton;
revoke all on function public.save_product_continuity_item(uuid,uuid,integer,text,jsonb) from public,anon,authenticated,service_role;
revoke all on function public.read_product_continuity_selection(uuid[]) from public,anon,authenticated,service_role;
-- Keep management/read, revoke and delete. No DROP, data erasure or automatic re-enable.
commit;
