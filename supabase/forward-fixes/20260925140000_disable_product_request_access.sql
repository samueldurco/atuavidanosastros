begin;
-- Disable intake eligibility without changing delivery, recovery or history.
revoke execute on function public.read_product_request_access(text) from public,anon,authenticated,service_role;
commit;
