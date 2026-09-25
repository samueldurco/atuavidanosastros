begin;
-- Stop new requests without deleting snapshots, receipts, Library or read-only recovery.
revoke all on function public.request_natal_product_run(uuid,jsonb) from public, anon, authenticated, service_role;
commit;
