begin;

-- Private, owner-curated memory. No historical input boolean grants this consent.
create table public.product_continuity_policy (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default false
);
insert into public.product_continuity_policy values (true,false);
create table public.product_continuity_consents (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  state text not null check (state in ('granted','revoked')),
  revision integer not null check (revision > 0),
  updated_at timestamptz not null default now()
);
create table public.product_continuity_scopes (
  user_id uuid not null references public.product_continuity_consents(user_id) on delete cascade,
  run_id uuid not null,
  primary key(user_id,run_id),
  foreign key(run_id,user_id) references public.product_runs(id,user_id) on delete cascade
);
create table public.product_continuity_items (
  id uuid primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  run_id uuid not null,
  relevance text not null check (relevance in ('relevant','irrelevant','unreviewed')),
  selection jsonb not null check (jsonb_typeof(selection)='object' and octet_length(selection::text)<=4800),
  revision integer not null check (revision>0),
  updated_at timestamptz not null default now(),
  foreign key(run_id,user_id) references public.product_runs(id,user_id) on delete cascade
);
create index product_continuity_items_owner on public.product_continuity_items(user_id,run_id);
alter table public.product_continuity_policy enable row level security;
alter table public.product_continuity_consents enable row level security;
alter table public.product_continuity_scopes enable row level security;
alter table public.product_continuity_items enable row level security;
-- Deliberately no direct client policies: only narrow authenticated RPCs below.
revoke all on public.product_continuity_policy,public.product_continuity_consents,
  public.product_continuity_scopes,public.product_continuity_items from public,anon,authenticated,service_role;

-- Count UTF-16 units to match the domain's JavaScript string budget, including emoji.
create function public.product_continuity_text_valid(p_text text,p_max integer)
returns boolean language sql immutable set search_path='' as $$
  select coalesce(octet_length(p_text)<=p_max*4 and p_text ~ '[^[:space:]]'
    and translate(p_text,chr(9)||chr(10)||chr(13),'') !~ '[[:cntrl:]]'
    and (select coalesce(sum(case when ascii(c)>65535 then 2 else 1 end),0)
      from regexp_split_to_table(p_text,'') c)<=p_max,false)
$$;
revoke all on function public.product_continuity_text_valid(text,integer) from public,anon,authenticated,service_role;

create function public.read_product_continuity()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=auth.uid();
begin
  if actor is null then raise exception 'auth_required' using errcode='42501'; end if;
  return jsonb_build_object(
    'enabled',coalesce((select enabled from public.product_continuity_policy where singleton),false),
    'consent',jsonb_build_object('version','atv-continuity-consent/1','ownerId',actor,
      'purpose','reading-context','state',coalesce((select state from public.product_continuity_consents where user_id=actor),'revoked'),
      'runIds',(select coalesce(jsonb_agg(run_id order by run_id),'[]'::jsonb) from public.product_continuity_scopes where user_id=actor)),
    'consentRevision',coalesce((select revision from public.product_continuity_consents where user_id=actor),0),
    'items',(select coalesce(jsonb_agg(jsonb_build_object('item',jsonb_build_object(
      'version','atv-continuity/1.0.0','id',i.id,'ownerId',actor,'runId',i.run_id,
      'productId',r.product_id,'relevance',i.relevance,'selection',i.selection),
      'revision',i.revision,'updatedAt',i.updated_at) order by i.updated_at desc,i.id),'[]'::jsonb)
      from public.product_continuity_items i join public.product_runs r on r.id=i.run_id and r.user_id=actor where i.user_id=actor)
  );
end $$;

create function public.set_product_continuity_consent(p_expected_revision integer,p_run_ids uuid[],p_granted boolean)
returns integer language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); current_revision integer; run_id uuid; feature_enabled boolean;
begin
  if actor is null then raise exception 'auth_required' using errcode='42501'; end if;
  if p_expected_revision is null or p_expected_revision<0 or p_granted is null or p_run_ids is null
    or cardinality(p_run_ids)>100 or array_ndims(p_run_ids)>1
    or exists(select 1 from unnest(p_run_ids) x where x is null)
    or (select count(distinct x) from unnest(p_run_ids) x)<>cardinality(p_run_ids)
    or (not p_granted and cardinality(p_run_ids)<>0) then
    raise exception 'invalid_selection' using errcode='22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('atv-continuity:'||actor::text,0));
  select coalesce((select revision from public.product_continuity_consents where user_id=actor),0) into current_revision;
  if current_revision<>p_expected_revision then raise exception 'revision_conflict' using errcode='40001'; end if;
  if p_granted then
    select enabled into feature_enabled from public.product_continuity_policy where singleton for share;
    if not coalesce(feature_enabled,false) then raise exception 'continuity_disabled' using errcode='42501'; end if;
    if cardinality(p_run_ids)=0 then raise exception 'invalid_selection' using errcode='22023'; end if;
    foreach run_id in array p_run_ids loop
      if not coalesce((public.read_product_run(run_id)->>'released')::boolean,false) then
        raise exception 'source_unavailable' using errcode='42501';
      end if;
    end loop;
  end if;
  insert into public.product_continuity_consents(user_id,state,revision) values
    (actor,case when p_granted then 'granted' else 'revoked' end,current_revision+1)
    on conflict(user_id) do update set state=excluded.state,revision=excluded.revision,updated_at=now();
  delete from public.product_continuity_scopes where user_id=actor;
  insert into public.product_continuity_scopes(user_id,run_id) select actor,unnest(p_run_ids);
  return current_revision+1;
end $$;

create function public.save_product_continuity_item(p_id uuid,p_run_id uuid,p_expected_revision integer,p_relevance text,p_selection jsonb)
returns integer language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); existing public.product_continuity_items; current_run public.product_runs;
  selected_kind text; selected_text text; section_index integer; valid boolean:=false; feature_enabled boolean;
begin
  if actor is null then raise exception 'auth_required' using errcode='42501'; end if;
  if p_id is null or p_run_id is null or p_expected_revision is null or p_expected_revision<0
    or p_relevance is null or p_relevance not in ('relevant','irrelevant','unreviewed')
    or p_selection is null or jsonb_typeof(p_selection)<>'object' or octet_length(p_selection::text)>4800 then
    raise exception 'invalid_selection' using errcode='22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('atv-continuity:'||actor::text,0));
  select enabled into feature_enabled from public.product_continuity_policy where singleton for share;
  if not coalesce(feature_enabled,false) then raise exception 'continuity_disabled' using errcode='42501'; end if;
  if not exists(select 1 from public.product_continuity_consents c join public.product_continuity_scopes s using(user_id)
    where c.user_id=actor and c.state='granted' and s.run_id=p_run_id) then
    raise exception 'consent_required' using errcode='42501';
  end if;
  if not coalesce((public.read_product_run(p_run_id)->>'released')::boolean,false) then
    raise exception 'source_unavailable' using errcode='42501';
  end if;
  select * into existing from public.product_continuity_items where id=p_id;
  if found and (existing.user_id<>actor or existing.run_id<>p_run_id) then
    raise exception 'item_unavailable' using errcode='42501';
  end if;
  if coalesce(existing.revision,0)<>p_expected_revision then raise exception 'revision_conflict' using errcode='40001'; end if;
  if existing.id is null and (select count(*) from public.product_continuity_items where user_id=actor)>=100 then
    raise exception 'item_limit' using errcode='54000';
  end if;
  select * into current_run from public.product_runs where id=p_run_id and user_id=actor;
  selected_kind:=p_selection->>'kind';
  case selected_kind
    when 'reported' then
      valid:=p_selection-array['kind','category','text']='{}'::jsonb
        and jsonb_typeof(p_selection->'text')='string'
        and p_selection->>'category' in ('theme','event','recurrence','preference','symbol','change')
        and public.product_continuity_text_valid(p_selection->>'text',600);
    when 'result' then
      valid:=p_selection='{"kind":"result"}'::jsonb
        and public.product_continuity_text_valid(current_run.editorial->>'title',1200);
    when 'hypothesis' then
      if p_selection-array['kind','sectionIndex']='{}'::jsonb and jsonb_typeof(p_selection->'sectionIndex')='number'
        and (p_selection->>'sectionIndex')::numeric between 0 and 63
        and mod((p_selection->>'sectionIndex')::numeric,1)=0 then
        section_index:=(p_selection->>'sectionIndex')::numeric::integer;
        selected_text:=current_run.editorial->'sections'->section_index->>'text';
        valid:=public.product_continuity_text_valid(selected_text,1200);
      end if;
    when 'cycle' then
      if p_selection-array['kind','factId']='{}'::jsonb and jsonb_typeof(p_selection->'factId')='string'
        and p_selection->>'factId' ~ '^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$'
        and current_run.calculation->>'kind'='cycles' and current_run.calculation->>'status'='experimental'
        and exists(select 1 from public.workflow_releases where product_id=current_run.product_id and kind='cycles')
        and (select count(*) from jsonb_array_elements(current_run.calculation->'facts') f where f->>'id'=p_selection->>'factId')=1 then
        select f->>'display' into selected_text from jsonb_array_elements(current_run.calculation->'facts') f
          where f->>'id'=p_selection->>'factId' and f->>'kind'='calculated';
        valid:=public.product_continuity_text_valid(selected_text,1200);
      end if;
    else valid:=false;
  end case;
  if not coalesce(valid,false) then raise exception 'invalid_selection' using errcode='22023'; end if;
  if existing.id is null then
    insert into public.product_continuity_items(id,user_id,run_id,relevance,selection,revision)
      values(p_id,actor,p_run_id,p_relevance,p_selection,1);
  else
    update public.product_continuity_items set relevance=p_relevance,selection=p_selection,revision=revision+1,updated_at=now()
      where id=p_id and user_id=actor;
  end if;
  return p_expected_revision+1;
end $$;

create function public.delete_product_continuity_item(p_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); removed integer;
begin
  if actor is null then raise exception 'auth_required' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended('atv-continuity:'||actor::text,0));
  delete from public.product_continuity_items where id=p_id and user_id=actor;
  get diagnostics removed=row_count;
  return removed>0;
end $$;

revoke all on function public.read_product_continuity(),public.set_product_continuity_consent(integer,uuid[],boolean),
  public.save_product_continuity_item(uuid,uuid,integer,text,jsonb),public.delete_product_continuity_item(uuid) from public,anon,authenticated,service_role;
grant execute on function public.read_product_continuity(),public.set_product_continuity_consent(integer,uuid[],boolean),
  public.save_product_continuity_item(uuid,uuid,integer,text,jsonb),public.delete_product_continuity_item(uuid) to authenticated;
commit;
