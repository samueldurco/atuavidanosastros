begin;
-- Retain records and existing exact-key recovery/cancellation paths.
revoke all on function public.list_product_email_requests(uuid) from public, anon, authenticated, service_role;
commit;
