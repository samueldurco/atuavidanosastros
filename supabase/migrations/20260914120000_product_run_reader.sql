-- Owner-only, minimized delivery projection. A revoked approval also closes old delivery URLs.
create function public.read_product_run(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  current_run public.product_runs;
  definition public.workflow_releases;
  released boolean;
  has_access boolean;
begin
  if auth.uid() is null then raise exception 'auth_required' using errcode='42501'; end if;
  select * into current_run from public.product_runs where id=p_id and user_id=auth.uid();
  if not found then return null; end if;
  select * into definition from public.workflow_releases where product_id=current_run.product_id;
  has_access := definition.access_policy='free' or exists (
    select 1 from public.entitlements where user_id=auth.uid() and product_id=current_run.product_id
      and state='ACTIVE' and (starts_at is null or starts_at<=now()) and (ends_at is null or ends_at>now())
  );
  -- Existing owned readings remain readable after entitlement expiry, unless a safety gate is revoked.
  released := coalesce(current_run.state='READY' and definition.enabled
    and current_run.contract_version=definition.contract_version
    and (definition.engine_approved or (definition.kind in ('tarot','dream') and current_run.calculation->>'status'='recorded'))
    and exists (select 1 from public.editorial_promotions where id=current_run.editorial->>'promotionId'
      and product_id=current_run.product_id and contract_version=current_run.contract_version and revoked_at is null),false);
  return jsonb_build_object(
    'id',current_run.id,'productId',current_run.product_id,'state',current_run.state,
    'revision',current_run.revision,'parentId',current_run.parent_id,
    'createdAt',current_run.created_at,'updatedAt',current_run.updated_at,'released',released,
    'canReprocess',definition.enabled and has_access and current_run.state in ('READY','FAILED','CANCELLED','AWAITING_EDITORIAL'),
    'libraryItemId',(select id from public.library_items where user_id=auth.uid() and item_type='PRODUCT_RUN'
      and source_id=current_run.id::text and archived_at is null limit 1),
    'history',(select coalesce(jsonb_agg(jsonb_build_object('revision',revision,'state',state,'at',occurred_at) order by revision),'[]'::jsonb)
      from public.product_run_events where run_id=current_run.id and user_id=auth.uid()),
    'calculation',case when released then jsonb_build_object('version',current_run.calculation->'version',
      'facts',(select jsonb_agg(jsonb_build_object('id',fact->'id','kind',fact->'kind','display',fact->'display','source',fact->'source'))
        from jsonb_array_elements(current_run.calculation->'facts') fact),'limits',current_run.calculation->'limits') else null end,
    'editorial',case when released then jsonb_build_object('version',current_run.editorial->'version',
      'title',current_run.editorial->'title','promotionId',current_run.editorial->'promotionId','reviewDigest',current_run.editorial->'reviewDigest',
      'sections',(select jsonb_agg(jsonb_build_object('title',section->'title','text',section->'text','evidence',section->'evidence'))
        from jsonb_array_elements(current_run.editorial->'sections') section),'limits',current_run.editorial->'limits') else null end
  );
end $$;
revoke all on function public.read_product_run(uuid) from public,anon,service_role;
grant execute on function public.read_product_run(uuid) to authenticated;
-- Do not allow the browser to bypass delivery gates by selecting unpublished snapshots or raw inputs.
revoke select on public.product_runs from authenticated;
