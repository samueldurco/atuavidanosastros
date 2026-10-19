-- Forward-fix / rollback for a deployed gate: disable all three entry points first.
-- Prior definitions return for schema compatibility; grants stay revoked.
revoke execute on function public.request_product_run(text,uuid,jsonb,uuid),
  public.read_product_request_access(text),
  public.save_dream_atlas_entry(uuid,uuid,integer,date,text,jsonb,jsonb,boolean) from authenticated;

create or replace function public.request_product_run(p_product_id text,p_request_key uuid,p_input jsonb,p_parent_id uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  definition public.workflow_releases;
  previous public.product_runs;
  existing public.product_runs;
  result_id uuid;
  frozen_calculation jsonb;
begin
  if owner_id is null then raise exception 'auth_required' using errcode='42501'; end if;
  if p_request_key is null then raise exception 'invalid_request_key' using errcode='22023'; end if;
  -- Serialize quota + idempotency for this owner, including simultaneous retries.
  perform pg_advisory_xact_lock(hashtextextended(owner_id::text,0));
  select * into existing from public.product_runs where user_id=owner_id and request_key=p_request_key;
  if found then
    if existing.product_id is distinct from p_product_id or existing.parent_id is distinct from p_parent_id or
       (p_parent_id is null and existing.input is distinct from p_input) then
      raise exception 'idempotency_conflict' using errcode='22023';
    end if;
    return existing.id;
  end if;
  select * into definition from public.workflow_releases where product_id=p_product_id;
  if not found or not definition.enabled then raise exception 'workflow_unreleased' using errcode='55000'; end if;
  if definition.access_policy='entitlement' and not exists(
    select 1 from public.entitlements e where e.user_id=owner_id and e.product_id=p_product_id
      and e.state='ACTIVE' and (e.starts_at is null or e.starts_at<=now()) and (e.ends_at is null or e.ends_at>now())
  ) then raise exception 'entitlement_required' using errcode='42501'; end if;
  if p_parent_id is not null then
    select * into previous from public.product_runs where id=p_parent_id and user_id=owner_id;
    if not found or previous.product_id<>p_product_id then raise exception 'parent_not_found' using errcode='42501'; end if;
    if previous.state not in ('READY','FAILED','AWAITING_EDITORIAL','CANCELLED') then raise exception 'parent_not_reprocessable' using errcode='55000'; end if;
    p_input := previous.input;
    -- Immutable input and draw. Reprocessing is not permission for a new draw.
    if definition.kind='tarot' then frozen_calculation := previous.calculation; end if;
  end if;
  if p_input is null or jsonb_typeof(p_input)<>'object' or octet_length(p_input::text)>20000 or
    p_input->>'productId' is distinct from p_product_id or
    p_input->>'version' is distinct from definition.contract_version or
    p_input#>>'{consent,storage}' is distinct from 'true' or
    p_input#>>'{consent,policyVersion}' is distinct from 'atv-input-consent/1' or
    (definition.kind='relationship' and p_input#>>'{consent,partner}' is distinct from 'true') then
    raise exception 'invalid_input_or_consent' using errcode='22023';
  end if;
  if (select count(*) from public.product_runs where user_id=owner_id and created_at>now()-interval '1 day') >= 50 or
     (select count(*) from public.product_runs where user_id=owner_id and state in ('QUEUED','CALCULATED','AWAITING_EDITORIAL')) >= 15 then
    raise exception 'request_limit' using errcode='54000';
  end if;
  insert into public.product_runs(user_id,product_id,request_key,parent_id,contract_version,input,calculation,state)
    values(owner_id,p_product_id,p_request_key,p_parent_id,definition.contract_version,p_input,frozen_calculation,
      case when frozen_calculation is null then 'QUEUED' else 'CALCULATED' end) returning id into result_id;
  insert into public.product_run_events(run_id,user_id,revision,state)
    select id,user_id,revision,state from public.product_runs where id=result_id;
  insert into public.library_items(user_id,title,universe,item_type,source_id,occurred_at)
    values(owner_id,definition.title,definition.universe,'PRODUCT_RUN',result_id::text,now());
  return result_id;
end $$;

create or replace function public.read_product_request_access(p_product_id text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare owner_id uuid := auth.uid(); definition public.workflow_releases;
begin
  if owner_id is null or not exists (
    select 1 from public.profiles where id=owner_id and deleted_at is null
  ) then raise exception 'auth_required' using errcode='42501'; end if;
  select * into definition from public.workflow_releases where product_id=p_product_id;
  if not found or not definition.enabled then
    return jsonb_build_object('state','UNRELEASED');
  end if;
  if definition.contract_version <> 'atv-workflow/1.0.0' then
    raise exception 'contract_unavailable' using errcode='55000';
  end if;
  if definition.access_policy='entitlement' and not exists (
    select 1 from public.entitlements e where e.user_id=owner_id and e.product_id=p_product_id
      and e.state='ACTIVE' and (e.starts_at is null or e.starts_at<=now())
      and (e.ends_at is null or e.ends_at>now())
  ) then return jsonb_build_object('state','ACCESS_REQUIRED'); end if;
  return jsonb_build_object('state','AVAILABLE');
end;
$$;

create or replace function public.save_dream_atlas_entry(
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

drop function if exists public.has_current_product_entitlement(uuid,text);
