begin;

-- Private evaluation only. No commercial release or entitlement is created.
create table public.atv_trial_dream_cycles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  request_key uuid not null,
  started_at timestamptz not null default now(),
  ready_at timestamptz not null default (now()+interval '30 days'),
  start_date date not null default ((now() at time zone 'UTC')::date),
  consent_version text not null check(consent_version='atv-input-consent/1'),
  unique(owner_id,id), unique(owner_id,request_key),
  check(ready_at=started_at+interval '30 days'),
  check(start_date=(started_at at time zone 'UTC')::date)
);
alter table public.atv_trial_dream_cycles enable row level security;
create policy trial_dream_cycles_owner on public.atv_trial_dream_cycles for select to authenticated
  using(owner_id=(select auth.uid()) and public.has_atv_trial_access());
revoke all on public.atv_trial_dream_cycles from public,anon,authenticated;
grant select on public.atv_trial_dream_cycles to authenticated;
grant all on public.atv_trial_dream_cycles to service_role;
create index trial_dream_cycles_owner_date on public.atv_trial_dream_cycles(owner_id,started_at desc);

alter table public.atv_trial_dreams alter column reading_id drop not null;
alter table public.atv_trial_dreams add column cycle_id uuid;
alter table public.atv_trial_dreams add column updated_at timestamptz not null default now();
alter table public.atv_trial_dreams add foreign key(owner_id,cycle_id)
  references public.atv_trial_dream_cycles(owner_id,id) on delete cascade;
alter table public.atv_trial_dreams add constraint trial_dream_source_kind
  check((reading_id is not null and cycle_id is null) or (reading_id is null and cycle_id is not null));
create index trial_dreams_owner_cycle on public.atv_trial_dreams(owner_id,cycle_id);
alter table public.atv_trial_readings add column dream_atlas_cycle_id uuid;
alter table public.atv_trial_readings add foreign key(owner_id,dream_atlas_cycle_id)
  references public.atv_trial_dream_cycles(owner_id,id);
create unique index trial_atlas_cycle_one_reading on public.atv_trial_readings(dream_atlas_cycle_id)
  where dream_atlas_cycle_id is not null;

create function public.start_private_dream_atlas(p_request_key uuid,p_consent_version text)
returns public.atv_trial_dream_cycles language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); result public.atv_trial_dream_cycles;
begin
  if actor is null or not public.has_atv_trial_access() then raise exception 'trial_access_revoked' using errcode='42501'; end if;
  if p_request_key is null or p_consent_version is distinct from 'atv-input-consent/1' then raise exception 'invalid_atlas_consent' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('private-atlas:'||actor::text,0));
  select * into result from public.atv_trial_dream_cycles where owner_id=actor and request_key=p_request_key;
  if found then return result; end if;
  select * into result from public.atv_trial_dream_cycles where owner_id=actor and ready_at>now() order by started_at desc limit 1;
  if found then return result; end if;
  insert into public.atv_trial_dream_cycles(owner_id,request_key,consent_version)
    values(actor,p_request_key,p_consent_version) returning * into result;
  return result;
end $$;

create function public.save_private_dream_atlas_entry(p_cycle_id uuid,p_entry_id uuid,p_expected_revision integer,p_entry jsonb)
returns integer language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); cycle public.atv_trial_dream_cycles; existing public.atv_trial_dreams; day date;
begin
  if actor is null or not public.has_atv_trial_access() then raise exception 'trial_access_revoked' using errcode='42501'; end if;
  select * into cycle from public.atv_trial_dream_cycles where owner_id=actor and id=p_cycle_id for update;
  if not found then raise exception 'atlas_run_unavailable' using errcode='42501'; end if;
  if now()>=cycle.ready_at then raise exception 'atlas_period_closed' using errcode='22023'; end if;
  if p_entry_id is null or p_expected_revision is null or p_expected_revision<0 or p_expected_revision>=2147483647 or
     jsonb_typeof(p_entry) is distinct from 'object' or
     p_entry-array['version','dreamDate','narrative','emotions','associations','includeInSynthesis']<>'{}'::jsonb or
     p_entry->>'version' is distinct from 'atv-dream-atlas-entry/1' or
     jsonb_typeof(p_entry->'includeInSynthesis') is distinct from 'boolean' or
     jsonb_typeof(p_entry->'narrative') is distinct from 'string' or
     not public.product_continuity_text_valid(p_entry->>'narrative',6000) or
     jsonb_typeof(p_entry->'emotions') is distinct from 'array' or
     jsonb_typeof(p_entry->'associations') is distinct from 'array' or
     coalesce(p_entry->>'dreamDate','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
    raise exception 'invalid_atlas_entry' using errcode='22023';
  end if;
  if jsonb_array_length(p_entry->'emotions')>8 or jsonb_array_length(p_entry->'associations')>8 or
    exists(select 1 from jsonb_array_elements(p_entry->'emotions') v where jsonb_typeof(v)<>'string' or not public.product_continuity_text_valid(v#>>'{}',80)) or
    exists(select 1 from jsonb_array_elements(p_entry->'associations') v where jsonb_typeof(v)<>'string' or not public.product_continuity_text_valid(v#>>'{}',200)) then
    raise exception 'invalid_atlas_entry' using errcode='22023';
  end if;
  day:=(p_entry->>'dreamDate')::date;
  if day<cycle.start_date or day>=cycle.start_date+30 or day>(now() at time zone 'UTC')::date then
    raise exception 'entry_outside_period' using errcode='22023';
  end if;
  select * into existing from public.atv_trial_dreams where id=p_entry_id;
  if found and (existing.owner_id<>actor or existing.cycle_id is distinct from p_cycle_id) then raise exception 'atlas_entry_unavailable' using errcode='42501'; end if;
  if coalesce(existing.revision,0)<>p_expected_revision then raise exception 'revision_conflict' using errcode='40001'; end if;
  -- Retain room for ids/revisions and the signed synthesis envelope.
  if coalesce((select sum(octet_length(data::text)+160) from public.atv_trial_dreams where owner_id=actor and cycle_id=p_cycle_id and id<>p_entry_id),0)+octet_length(p_entry::text)+160>100000 then
    raise exception 'atlas_text_limit' using errcode='54000';
  end if;
  if existing.id is null then
    if (select count(*) from public.atv_trial_dreams where owner_id=actor and cycle_id=p_cycle_id)>=150 then raise exception 'atlas_entry_limit' using errcode='54000'; end if;
    insert into public.atv_trial_dreams(id,owner_id,cycle_id,data) values(p_entry_id,actor,p_cycle_id,p_entry);
  else
    update public.atv_trial_dreams set data=p_entry,revision=revision+1,updated_at=now() where id=p_entry_id;
  end if;
  return p_expected_revision+1;
end $$;

create function public.delete_private_dream_atlas_entry(p_cycle_id uuid,p_entry_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); removed integer;
begin
  if actor is null or not public.has_atv_trial_access() then raise exception 'trial_access_revoked' using errcode='42501'; end if;
  perform 1 from public.atv_trial_dream_cycles where owner_id=actor and id=p_cycle_id for update;
  if not found then raise exception 'atlas_run_unavailable' using errcode='42501'; end if;
  delete from public.atv_trial_dreams where id=p_entry_id and cycle_id=p_cycle_id and owner_id=actor;
  get diagnostics removed=row_count;
  return removed>0;
end $$;

create function public.guard_private_dream_atlas_synthesis()
returns trigger language plpgsql security definer set search_path='' as $$
declare cycle public.atv_trial_dream_cycles; ids uuid[]; revisions jsonb; entries jsonb;
begin
  if new.product_id<>'dream-atlas' then
    if new.dream_atlas_cycle_id is not null then raise exception 'invalid_atlas_cycle' using errcode='22023'; end if;
    return new;
  end if;
  select * into cycle from public.atv_trial_dream_cycles where owner_id=new.owner_id and id=new.dream_atlas_cycle_id for update;
  if not found then raise exception 'atlas_run_unavailable' using errcode='42501'; end if;
  if now()<cycle.ready_at then raise exception 'atlas_period_open' using errcode='22023'; end if;
  if new.input#>>'{dreamAtlas,startDate}' is distinct from cycle.start_date::text then raise exception 'invalid_atlas_period' using errcode='22023'; end if;
  select array_agg(id order by id),jsonb_object_agg(id::text,revision),jsonb_agg(data||jsonb_build_object('id',id,'revision',revision) order by data->>'dreamDate',id) into ids,revisions,entries
    from public.atv_trial_dreams where owner_id=new.owner_id and cycle_id=cycle.id and data->>'includeInSynthesis'='true';
  if ids is null or new.source_ids is distinct from ids or new.calculation#>'{data,sourceRevisions}' is distinct from revisions or new.calculation#>'{data,entries}' is distinct from entries then
    raise exception 'atlas_sources_changed' using errcode='22023';
  end if;
  return new;
end $$;
create trigger trial_atlas_synthesis before insert on public.atv_trial_readings
  for each row execute function public.guard_private_dream_atlas_synthesis();
revoke all on function public.start_private_dream_atlas(uuid,text),
  public.save_private_dream_atlas_entry(uuid,uuid,integer,jsonb),public.delete_private_dream_atlas_entry(uuid,uuid),
  public.guard_private_dream_atlas_synthesis() from public,anon,authenticated;
grant execute on function public.start_private_dream_atlas(uuid,text),
  public.save_private_dream_atlas_entry(uuid,uuid,integer,jsonb),public.delete_private_dream_atlas_entry(uuid,uuid) to authenticated;

commit;
