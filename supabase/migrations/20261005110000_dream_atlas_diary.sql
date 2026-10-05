begin;

-- Expand-only private diary. Deleting the parent run cascades to its entries.
-- A disabled workflow release prevents new writes, including direct RPC calls.
create table public.dream_atlas_entries (
  id uuid primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  run_id uuid not null,
  dream_date date not null,
  narrative text not null,
  emotions jsonb not null,
  associations jsonb not null,
  include_in_synthesis boolean not null,
  revision integer not null check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key(run_id,user_id) references public.product_runs(id,user_id) on delete cascade
);
create index dream_atlas_entries_run_date on public.dream_atlas_entries(user_id,run_id,dream_date,id);
alter table public.dream_atlas_entries enable row level security;
revoke all on public.dream_atlas_entries from public,anon,authenticated,service_role;

create function public.read_dream_atlas_entries(p_run_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=auth.uid();
begin
  if actor is null then raise exception 'auth_required' using errcode='42501'; end if;
  if not exists(select 1 from public.product_runs where id=p_run_id and user_id=actor and product_id='dream-atlas') then
    raise exception 'atlas_run_unavailable' using errcode='42501';
  end if;
  return (select coalesce(jsonb_agg(jsonb_build_object(
    'version','atv-dream-atlas-entry/1','id',e.id,'runId',e.run_id,
    'dreamDate',e.dream_date,'narrative',e.narrative,
    'emotions',e.emotions,'associations',e.associations,
    'includeInSynthesis',e.include_in_synthesis,'revision',e.revision,
    'createdAt',e.created_at,'updatedAt',e.updated_at) order by e.dream_date,e.created_at,e.id),'[]'::jsonb)
    from public.dream_atlas_entries e where e.user_id=actor and e.run_id=p_run_id);
end $$;

create function public.save_dream_atlas_entry(
  p_run_id uuid,p_entry_id uuid,p_expected_revision integer,p_dream_date date,
  p_narrative text,p_emotions jsonb,p_associations jsonb,p_include_in_synthesis boolean)
returns integer language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); current_run public.product_runs; definition public.workflow_releases;
  existing public.dream_atlas_entries; start_raw text; start_date date;
begin
  if actor is null then raise exception 'auth_required' using errcode='42501'; end if;
  if p_run_id is null or p_entry_id is null or p_expected_revision is null or
    p_expected_revision<0 or p_expected_revision>=2147483647 or p_dream_date is null or
    p_include_in_synthesis is null or p_narrative is null or
    not public.product_continuity_text_valid(p_narrative,6000) or
    p_emotions is null or jsonb_typeof(p_emotions)<>'array' or
    p_associations is null or jsonb_typeof(p_associations)<>'array' then
    raise exception 'invalid_atlas_entry' using errcode='22023';
  end if;
  if jsonb_array_length(p_emotions)>8 or jsonb_array_length(p_associations)>8 or
    exists(select 1 from jsonb_array_elements(p_emotions) as v(value)
      where jsonb_typeof(v.value)<>'string' or
        not public.product_continuity_text_valid(v.value#>>'{}',80)) or
    exists(select 1 from jsonb_array_elements(p_associations) as v(value)
      where jsonb_typeof(v.value)<>'string' or
        not public.product_continuity_text_valid(v.value#>>'{}',200)) then
    raise exception 'invalid_atlas_entry' using errcode='22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('dream-atlas:'||p_run_id::text,0));
  select * into current_run from public.product_runs
    where id=p_run_id and user_id=actor and product_id='dream-atlas' for share;
  if not found then raise exception 'atlas_run_unavailable' using errcode='42501'; end if;
  select * into definition from public.workflow_releases where product_id='dream-atlas' for share;
  if not coalesce(definition.enabled,false) or definition.contract_version<>current_run.contract_version or
    current_run.input->>'version' is distinct from definition.contract_version or
    current_run.input->>'productId' is distinct from 'dream-atlas' or
    current_run.input - array['version','productId','consent','context','dreamAtlas'] <> '{}'::jsonb or
    jsonb_typeof(current_run.input->'consent') is distinct from 'object' or
    (current_run.input->'consent') - array['storage','policyVersion','partner','continuity'] <> '{}'::jsonb or
    current_run.input#>>'{consent,storage}' is distinct from 'true' or
    current_run.input#>>'{consent,policyVersion}' is distinct from 'atv-input-consent/1' or
    current_run.input#>>'{consent,continuity}' is distinct from 'false' or
    current_run.input#>>'{consent,partner}' is distinct from 'false' or
    ((current_run.input ? 'context') and
      (jsonb_typeof(current_run.input->'context') is distinct from 'string' or
      not public.product_continuity_text_valid(current_run.input->>'context',1200))) or
    jsonb_typeof(current_run.input->'dreamAtlas') is distinct from 'object' or
    (current_run.input->'dreamAtlas') - 'startDate' <> '{}'::jsonb or
    not exists(select 1 from public.profiles where id=actor and deleted_at is null) or
    (definition.access_policy='entitlement' and not exists(
      select 1 from public.entitlements where user_id=actor and product_id='dream-atlas'
      and state='ACTIVE' and (starts_at is null or starts_at<=now()) and (ends_at is null or ends_at>now()))) then
    raise exception 'atlas_unreleased' using errcode='42501';
  end if;
  start_raw:=current_run.input#>>'{dreamAtlas,startDate}';
  if start_raw is null or start_raw !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
    raise exception 'invalid_atlas_period' using errcode='22023';
  end if;
  begin
    start_date:=start_raw::date;
  exception when invalid_datetime_format or datetime_field_overflow then
    raise exception 'invalid_atlas_period' using errcode='22023';
  end;
  if to_char(start_date,'YYYY-MM-DD')<>start_raw or
    start_date<date '1900-01-01' or start_date>date '2099-12-02' or
    p_dream_date<start_date or p_dream_date>=start_date+30 then
    raise exception 'entry_outside_period' using errcode='22023';
  end if;
  select * into existing from public.dream_atlas_entries where id=p_entry_id;
  if found and (existing.user_id<>actor or existing.run_id<>p_run_id) then
    raise exception 'atlas_entry_unavailable' using errcode='42501';
  end if;
  if coalesce(existing.revision,0)<>p_expected_revision then
    raise exception 'revision_conflict' using errcode='40001';
  end if;
  if existing.id is null and
    (select count(*) from public.dream_atlas_entries where user_id=actor and run_id=p_run_id)>=150 then
    raise exception 'atlas_entry_limit' using errcode='54000';
  end if;
  if existing.id is null then
    insert into public.dream_atlas_entries
      (id,user_id,run_id,dream_date,narrative,emotions,associations,include_in_synthesis,revision)
      values(p_entry_id,actor,p_run_id,p_dream_date,p_narrative,p_emotions,p_associations,p_include_in_synthesis,1);
  else
    update public.dream_atlas_entries set dream_date=p_dream_date,narrative=p_narrative,
      emotions=p_emotions,associations=p_associations,include_in_synthesis=p_include_in_synthesis,
      revision=revision+1,updated_at=now() where id=p_entry_id and user_id=actor;
  end if;
  return p_expected_revision+1;
end $$;

create function public.delete_dream_atlas_entry(p_run_id uuid,p_entry_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); removed integer;
begin
  if actor is null then raise exception 'auth_required' using errcode='42501'; end if;
  delete from public.dream_atlas_entries where id=p_entry_id and user_id=actor and run_id=p_run_id;
  get diagnostics removed=row_count;
  return removed>0;
end $$;

revoke all on function public.read_dream_atlas_entries(uuid),
  public.save_dream_atlas_entry(uuid,uuid,integer,date,text,jsonb,jsonb,boolean),
  public.delete_dream_atlas_entry(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.read_dream_atlas_entries(uuid),
  public.save_dream_atlas_entry(uuid,uuid,integer,date,text,jsonb,jsonb,boolean),
  public.delete_dream_atlas_entry(uuid,uuid) to authenticated;

commit;
