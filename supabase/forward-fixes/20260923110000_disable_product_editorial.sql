begin;
update public.product_editorial_policy set enabled=false;
revoke execute on function public.claim_product_editorial(text[]),public.complete_product_editorial(uuid,uuid,uuid,integer) from service_role;
revoke execute on function public.advance_product_run(uuid,uuid,integer,text,jsonb,jsonb,text) from service_role;
-- Preserve receipts, history, owner reads and deletion. Revoke a promotion or
-- workflow release as well when already delivered content must be withdrawn.
commit;
