-- Containment if the purchase-backed entitlement gate cannot be trusted in production.
-- Existing purchases, entitlements, runs and diary entries remain intact.
revoke execute on function public.request_product_run(text,uuid,jsonb,uuid),
  public.read_product_request_access(text),
  public.save_dream_atlas_entry(uuid,uuid,integer,date,text,jsonb,jsonb,boolean)
  from authenticated;
