begin;
-- Preserve all receipts and owner recovery/cancellation; no dispatch exists.
update public.product_email_policy set enabled=false where singleton;
revoke all on function public.request_product_email(uuid,jsonb) from public,anon,authenticated,service_role;
commit;
