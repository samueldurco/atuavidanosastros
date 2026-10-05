begin;

-- Expand the private owner projection with the declared period boundary.
-- Existing read/delete access remains available when release is disabled.
create or replace function public.read_dream_atlas_entries(p_run_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=auth.uid(); period_start text;
begin
  if actor is null then raise exception 'auth_required' using errcode='42501'; end if;
  select input#>>'{dreamAtlas,startDate}' into period_start
    from public.product_runs where id=p_run_id and user_id=actor and product_id='dream-atlas';
  if not found then raise exception 'atlas_run_unavailable' using errcode='42501'; end if;
  return jsonb_build_object(
    'startDate',period_start,
    'entries',(select coalesce(jsonb_agg(jsonb_build_object(
      'version','atv-dream-atlas-entry/1','id',e.id,'runId',e.run_id,
      'dreamDate',e.dream_date,'narrative',e.narrative,
      'emotions',e.emotions,'associations',e.associations,
      'includeInSynthesis',e.include_in_synthesis,'revision',e.revision,
      'createdAt',e.created_at,'updatedAt',e.updated_at) order by e.dream_date,e.created_at,e.id),'[]'::jsonb)
      from public.dream_atlas_entries e where e.user_id=actor and e.run_id=p_run_id));
end $$;

commit;
