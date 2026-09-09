-- Emergency stop without destroying input, results, events or Library references.
-- Existing reads remain authorized by RLS. Reactivation requires a new reviewed release.
begin;
update public.workflow_releases set enabled=false;
revoke execute on function public.request_product_run(text,uuid,jsonb,uuid) from authenticated;
revoke execute on function public.advance_product_run(uuid,uuid,integer,text,jsonb,jsonb,text) from service_role;
commit;
