-- Containment only: preserve runs, history and existing owner readers.
revoke all on function public.recover_product_request(uuid) from public,anon,authenticated,service_role;
