-- Owner-curated preparation only. This schema authorizes no interpretation execution.
create table public.atv_trial_continuity_policy (
  singleton boolean primary key default true check (singleton),
  collection_enabled boolean not null default true
);
insert into public.atv_trial_continuity_policy default values;
create table public.atv_trial_continuity_state (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  revision integer not null check (revision > 0),
  granted boolean not null default false,
  consent_version text not null default 'atv-trial-continuity-consent/1' check (consent_version = 'atv-trial-continuity-consent/1'),
  purpose text not null default 'reading-context' check (purpose = 'reading-context'),
  updated_at timestamptz not null default now()
);
create table public.atv_trial_continuity_items (
  owner_id uuid not null references public.atv_trial_continuity_state(owner_id) on delete cascade,
  id uuid not null,
  reading_id uuid not null,
  selection jsonb not null check (jsonb_typeof(selection) = 'object'),
  primary key (owner_id, id),
  foreign key (owner_id, reading_id) references public.atv_trial_readings(owner_id, id) on delete cascade
);
alter table public.atv_trial_continuity_policy enable row level security;
alter table public.atv_trial_continuity_state enable row level security;
alter table public.atv_trial_continuity_items enable row level security;
revoke all on public.atv_trial_continuity_policy, public.atv_trial_continuity_state, public.atv_trial_continuity_items from public, anon, authenticated, service_role;

create function public.read_atv_trial_continuity() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  who uuid := auth.uid();
  state public.atv_trial_continuity_state%rowtype;
  available boolean;
  items jsonb;
begin
  if who is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  select * into state from public.atv_trial_continuity_state where owner_id = who;
  available := public.has_atv_trial_access() and (select collection_enabled from public.atv_trial_continuity_policy where singleton);
  if state.owner_id is null then
    return jsonb_build_object('revision', 0, 'granted', false, 'available', available, 'items', '[]'::jsonb);
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', i.id, 'readingId', i.reading_id, 'selection', i.selection,
    'source', case when available and state.granted and r.id is not null then jsonb_build_object(
      'productId', r.product_id, 'title', r.reading->>'title', 'version', r.reading->>'version',
      'policy', r.approval->>'policy', 'digest', r.approval->>'digest',
      'text', case i.selection->>'kind'
        when 'reported' then i.selection->>'text'
        when 'result' then r.reading->>'title'
        when 'hypothesis' then r.reading->'sections'->((i.selection->>'sectionIndex')::integer)->>'text'
      end,
      'limits', r.reading->'limits'
    ) else null end
  ) order by i.id), '[]'::jsonb) into items
  from public.atv_trial_continuity_items i
  left join public.atv_trial_readings r on r.owner_id = who and r.id = i.reading_id
    and r.archived_at is null and r.approval->>'status' = 'approved'
    and r.approval->>'scope' = 'private-free-test'
    and r.product_id not in ('daily-card','tarot-focus','tarot-yes-no','three-questions','tarot-journey')
  where i.owner_id = who;
  return jsonb_build_object('revision', state.revision, 'granted', state.granted, 'available', available, 'items', items);
end;
$$;

create function public.set_atv_trial_continuity(p_revision integer, p_granted boolean, p_items jsonb) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  who uuid := auth.uid();
  current_revision integer;
  item jsonb;
  selection jsonb;
  reading public.atv_trial_readings%rowtype;
  item_id uuid;
  reading_id uuid;
begin
  if who is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if p_revision is null or p_revision < 0 or p_revision >= 2147483647 or p_granted is null
    or p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 12
    or octet_length(p_items::text) > 35000
    or (p_granted and jsonb_array_length(p_items) = 0)
    or (not p_granted and jsonb_array_length(p_items) <> 0)
  then raise exception 'invalid_selection' using errcode = '22023'; end if;
  if p_granted and (not public.has_atv_trial_access() or not (select collection_enabled from public.atv_trial_continuity_policy where singleton))
    then raise exception 'continuity_unavailable' using errcode = '42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(who::text, 901));
  select revision into current_revision from public.atv_trial_continuity_state where owner_id = who;
  if coalesce(current_revision, 0) <> p_revision then raise exception 'revision_conflict' using errcode = '40001'; end if;
  if (select count(distinct lower(v->>'id')) from jsonb_array_elements(p_items) v) <> jsonb_array_length(p_items)
    then raise exception 'invalid_selection' using errcode = '22023'; end if;
  for item in select value from jsonb_array_elements(p_items) loop
    if jsonb_typeof(item) <> 'object' or (select count(*) from jsonb_object_keys(item)) <> 3
      or not (item ?& array['id','readingId','selection'])
      or coalesce(item->>'id','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      or coalesce(item->>'readingId','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    then raise exception 'invalid_selection' using errcode = '22023'; end if;
    selection := item->'selection';
    if jsonb_typeof(selection) <> 'object' then raise exception 'invalid_selection' using errcode = '22023'; end if;
    if selection->>'kind' = 'reported' then
      if (select count(*) from jsonb_object_keys(selection)) <> 3 or not (selection ?& array['kind','category','text'])
        or coalesce(selection->>'category','') not in ('theme','event','recurrence','preference','symbol','change')
        or jsonb_typeof(selection->'text') <> 'string' or length(btrim(selection->>'text')) = 0
        or length(selection->>'text') > 600 or octet_length(selection->>'text') > 2400
        or (selection->>'text') ~ '[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]'
      then raise exception 'invalid_selection' using errcode = '22023'; end if;
    elsif selection->>'kind' = 'result' then
      if selection <> '{"kind":"result"}'::jsonb then raise exception 'invalid_selection' using errcode = '22023'; end if;
    elsif selection->>'kind' = 'hypothesis' then
      if (select count(*) from jsonb_object_keys(selection)) <> 2 or not (selection ?& array['kind','sectionIndex'])
        or jsonb_typeof(selection->'sectionIndex') <> 'number'
        or coalesce(selection->>'sectionIndex','') !~ '^(0|[1-5]?[0-9]|6[0-3])$'
      then raise exception 'invalid_selection' using errcode = '22023'; end if;
    else raise exception 'invalid_selection' using errcode = '22023'; end if;
    select * into reading from public.atv_trial_readings r where r.owner_id = who and r.id = (item->>'readingId')::uuid
      and r.archived_at is null and r.approval->>'status' = 'approved' and r.approval->>'scope' = 'private-free-test'
      and r.product_id not in ('daily-card','tarot-focus','tarot-yes-no','three-questions','tarot-journey');
    if reading.id is null or (selection->>'kind' = 'hypothesis' and jsonb_typeof(reading.reading->'sections'->((selection->>'sectionIndex')::integer)->'text') is distinct from 'string')
      then raise exception 'source_unavailable' using errcode = '22023'; end if;
  end loop;
  insert into public.atv_trial_continuity_state(owner_id, revision, granted) values(who, p_revision + 1, p_granted)
    on conflict(owner_id) do update set revision = excluded.revision, granted = excluded.granted, updated_at = now();
  delete from public.atv_trial_continuity_items where owner_id = who;
  for item in select value from jsonb_array_elements(p_items) loop
    insert into public.atv_trial_continuity_items(owner_id, id, reading_id, selection)
      values(who, (item->>'id')::uuid, (item->>'readingId')::uuid, item->'selection');
  end loop;
  return public.read_atv_trial_continuity();
end;
$$;
revoke all on function public.read_atv_trial_continuity(), public.set_atv_trial_continuity(integer, boolean, jsonb) from public, anon, service_role;
grant execute on function public.read_atv_trial_continuity(), public.set_atv_trial_continuity(integer, boolean, jsonb) to authenticated;
