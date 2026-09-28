begin;
update public.product_continuity_policy set enabled=false where singleton;
revoke all on function public.save_product_continuity_item(uuid,uuid,integer,text,jsonb) from public,anon,authenticated,service_role;
-- Preserve private inspection, consent revocation and deletion. Grant branch checks policy.
-- No destructive rollback: owner-curated notes remain available for deletion.
commit;
