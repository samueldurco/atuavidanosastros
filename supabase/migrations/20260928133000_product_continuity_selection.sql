begin;

-- A single statement snapshot; not a durable authorization to send content later.
create function public.read_product_continuity_selection(p_item_ids uuid[])
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=auth.uid(); consent public.product_continuity_consents;
  item_id uuid; item public.product_continuity_items; current_run public.product_runs;
  items jsonb:='[]'; sources jsonb:='[]'; revisions jsonb:='[]'; seen uuid[]:='{}';
  sections jsonb; facts jsonb; title text; max_section integer;
begin
  if actor is null then raise exception 'auth_required' using errcode='42501'; end if;
  if not coalesce((select enabled from public.product_continuity_policy where singleton),false) then
    return jsonb_build_object('status','blocked','code','disabled');
  end if;
  if not exists(select 1 from public.profiles where id=actor and deleted_at is null) then
    return jsonb_build_object('status','blocked','code','source_unavailable');
  end if;
  if p_item_ids is null or cardinality(p_item_ids) not between 1 and 12 or array_ndims(p_item_ids)<>1
    or exists(select 1 from unnest(p_item_ids) x where x is null)
    or (select count(distinct x) from unnest(p_item_ids) x)<>cardinality(p_item_ids) then
    return jsonb_build_object('status','blocked','code','invalid_selection');
  end if;
  select * into consent from public.product_continuity_consents where user_id=actor;
  if not found or consent.state<>'granted' then return jsonb_build_object('status','blocked','code','consent_required'); end if;
  foreach item_id in array p_item_ids loop
    select * into item from public.product_continuity_items where id=item_id and user_id=actor and relevance='relevant';
    if not found then return jsonb_build_object('status','blocked','code','item_unavailable'); end if;
    if not exists(select 1 from public.product_continuity_scopes where user_id=actor and run_id=item.run_id) then
      return jsonb_build_object('status','blocked','code','consent_required');
    end if;
    if not coalesce((public.read_product_run(item.run_id)->>'released')::boolean,false) then
      return jsonb_build_object('status','blocked','code','source_unavailable');
    end if;
    select * into current_run from public.product_runs where id=item.run_id and user_id=actor;
    items:=items||jsonb_build_array(jsonb_build_object('version','atv-continuity/1.0.0','id',item.id,
      'ownerId',actor,'runId',item.run_id,'productId',current_run.product_id,'relevance',item.relevance,'selection',item.selection));
    revisions:=revisions||jsonb_build_array(jsonb_build_object('itemId',item.id,'revision',item.revision));
    if not item.run_id=any(seen) then
      seen:=array_append(seen,item.run_id);
      -- Only selected title/sections/facts. Placeholders preserve explicit section indexes.
      select case when exists(select 1 from public.product_continuity_items i where i.id=any(p_item_ids)
        and i.user_id=actor and i.run_id=item.run_id and i.selection->>'kind'='result')
        then current_run.editorial->>'title' else '' end into title;
      select max((i.selection->>'sectionIndex')::integer) into max_section from public.product_continuity_items i
        where i.id=any(p_item_ids) and i.user_id=actor and i.run_id=item.run_id and i.selection->>'kind'='hypothesis';
      if max_section is not null and max_section not between 0 and 63 then
        return jsonb_build_object('status','blocked','code','item_unavailable');
      end if;
      select coalesce(jsonb_agg(jsonb_build_object('title','','text',case when exists(
        select 1 from public.product_continuity_items i where i.id=any(p_item_ids) and i.user_id=actor and i.run_id=item.run_id
          and i.selection->>'kind'='hypothesis' and (i.selection->>'sectionIndex')::integer=n)
        then current_run.editorial->'sections'->n->>'text' else '' end,'evidence','[]'::jsonb) order by n),'[]'::jsonb)
        into sections from generate_series(0,max_section) n;
      select coalesce(jsonb_agg(jsonb_build_object('id',f->'id','kind',f->'kind','display',f->'display','source','')),'[]'::jsonb)
        into facts from jsonb_array_elements(current_run.calculation->'facts') f where exists(
          select 1 from public.product_continuity_items i where i.id=any(p_item_ids) and i.user_id=actor and i.run_id=item.run_id
            and i.selection->>'kind'='cycle' and i.selection->>'factId'=f->>'id');
      sources:=sources||jsonb_build_array(jsonb_build_object('ownerId',actor,'available',true,'run',jsonb_build_object(
        'id',current_run.id,'productId',current_run.product_id,'state',current_run.state,'revision',current_run.revision,
        'calculation',jsonb_build_object('kind',current_run.calculation->'kind','status',current_run.calculation->'status',
          'facts',facts,'limits',current_run.calculation->'limits'),
        'editorial',jsonb_build_object('title',title,'sections',sections,'limits',current_run.editorial->'limits'))));
    end if;
  end loop;
  return jsonb_build_object('status','selected','version','atv-continuity-selection/1','ownerId',actor,
    'consent',jsonb_build_object('version','atv-continuity-consent/1','ownerId',actor,'purpose','reading-context',
      'state','granted','runIds',to_jsonb(seen)),
    'consentRevision',consent.revision,'itemRevisions',revisions,'items',items,'sources',sources);
end $$;
revoke all on function public.read_product_continuity_selection(uuid[]) from public,anon,authenticated,service_role;
grant execute on function public.read_product_continuity_selection(uuid[]) to authenticated;
commit;
