-- Non-destructive emergency stop. Preserves stored bytes and existing owner deletion cascades.
begin;
update public.product_artifact_policy set enabled=false where singleton;
revoke execute on function public.persist_product_artifact(uuid,uuid,integer,text,text,integer,text,text,text) from service_role;
revoke execute on function public.list_product_artifacts(uuid),public.read_product_artifact(uuid,uuid) from authenticated;
commit;
