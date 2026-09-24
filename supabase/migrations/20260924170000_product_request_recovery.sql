-- Read-only recovery after an uncertain request response. No input or release bypass.
create function public.recover_product_request(p_request_key uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare owner_id uuid := auth.uid(); result jsonb;
begin
  if owner_id is null then raise exception 'auth_required' using errcode='42501'; end if;
  if p_request_key is null then raise exception 'invalid_request_key' using errcode='22023'; end if;
  if not exists (select 1 from public.profiles where id=owner_id and deleted_at is null) then
    return null;
  end if;
  select jsonb_build_object(
    'runId',r.id,'productId',r.product_id,
    'libraryItemId',(select l.id from public.library_items l
      where l.user_id=owner_id and l.item_type='PRODUCT_RUN' and l.source_id=r.id::text
        and l.archived_at is null order by l.created_at,l.id limit 1)
  ) into result from public.product_runs r
    where r.user_id=owner_id and r.request_key=p_request_key;
  return result;
end $$;
revoke all on function public.recover_product_request(uuid) from public,anon,service_role;
grant execute on function public.recover_product_request(uuid) to authenticated;
