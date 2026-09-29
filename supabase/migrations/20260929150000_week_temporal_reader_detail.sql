begin;
-- Released owner-only Week 1.2 detail. Keep the original publication and entitlement gates.
-- The raw calculation data, natal input, coordinates and context never enter this view.
create or replace function public.read_product_run(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare current_run public.product_runs; definition public.workflow_releases; released boolean; has_access boolean;
begin
  if auth.uid() is null then raise exception 'auth_required' using errcode='42501'; end if;
  select * into current_run from public.product_runs where id=p_id and user_id=auth.uid();
  if not found then return null; end if;
  select * into definition from public.workflow_releases where product_id=current_run.product_id;
  has_access := definition.access_policy='free' or exists (
    select 1 from public.entitlements where user_id=auth.uid() and product_id=current_run.product_id
      and state='ACTIVE' and (starts_at is null or starts_at<=now()) and (ends_at is null or ends_at>now())
  );
  released := coalesce(current_run.state='READY' and definition.enabled
    and current_run.contract_version=definition.contract_version
    and (definition.engine_approved or (definition.kind in ('tarot','dream') and current_run.calculation->>'status'='recorded'))
    and public.product_editorial_delivery_allowed(current_run.id)
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
        from jsonb_array_elements(current_run.calculation->'facts') fact),'limits',current_run.calculation->'limits',
      'temporal',case when current_run.product_id='week-reading'
        and current_run.calculation->>'version'='atv-week-reading-calculation/1.2.0'
        and jsonb_typeof(current_run.calculation->'data'->'events')='array'
        and jsonb_typeof(current_run.calculation->'data'->'windows')='array'
        and jsonb_array_length(current_run.calculation->'data'->'events')<=4096
        and jsonb_array_length(current_run.calculation->'data'->'windows')<=2048
      then jsonb_build_object(
        'version',current_run.calculation->'version',
        'eventCount',jsonb_array_length(current_run.calculation->'data'->'events'),
        'windowCount',jsonb_array_length(current_run.calculation->'data'->'windows'),
        'events',(select coalesce(jsonb_agg(jsonb_build_object(
          'id',item->'id','transitBody',item->'transitBody','natalBody',item->'natalBody',
          'aspect',item->'aspect','threshold',item->'threshold','mode',item->'mode',
          'from',item->'from','to',item->'to','phaseDirection',item->'phaseDirection') order by ordinal),'[]'::jsonb)
          from jsonb_array_elements(current_run.calculation->'data'->'events') with ordinality as event(item,ordinal)
          where ordinal<=24),
        'windows',(select coalesce(jsonb_agg(jsonb_build_object(
          'transitBody',item->'transitBody','natalBody',item->'natalBody','aspect',item->'aspect',
          'from',item->'from','to',item->'to','startClipped',item->'startClipped','endClipped',item->'endClipped') order by ordinal),'[]'::jsonb)
          from jsonb_array_elements(current_run.calculation->'data'->'windows') with ordinality as candidate(item,ordinal)
          where ordinal<=12)
      ) else null end) else null end,
    'cartography',case when released then public.product_cartography_projection(current_run.product_id,current_run.calculation) else null end,
    'editorial',case when released then jsonb_build_object('version',current_run.editorial->'version',
      'title',current_run.editorial->'title','promotionId',current_run.editorial->'promotionId','reviewDigest',current_run.editorial->'reviewDigest',
      'sections',(select jsonb_agg(jsonb_build_object('title',section->'title','text',section->'text','evidence',section->'evidence'))
        from jsonb_array_elements(current_run.editorial->'sections') section),'limits',current_run.editorial->'limits') else null end
  );
end $$;
commit;
