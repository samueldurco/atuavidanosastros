-- Fail closed without restoring direct access to raw inputs/unpublished snapshots. Deletion remains available.
revoke execute on function public.read_product_run(uuid) from authenticated;
