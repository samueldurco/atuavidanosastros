begin;

alter table public.profiles add column onboarding_revision integer not null default 0 check (onboarding_revision >= 0);

-- Purpose-specific, append-only receipt. No analytics, marketing or continuity consent is implied.
create table public.natal_storage_consents (
  user_id uuid not null references public.profiles(id) on delete cascade,
  revision integer not null check (revision > 0),
  granted boolean not null,
  policy_version text not null check (policy_version = 'atv-natal-storage/1'),
  occurred_at timestamptz not null default now(),
  primary key (user_id, revision)
);
alter table public.natal_storage_consents enable row level security;
revoke all on public.natal_storage_consents from public, anon, authenticated, service_role;
grant select on public.natal_storage_consents to authenticated;
create policy natal_consent_read_own on public.natal_storage_consents for select to authenticated
using (user_id = (select auth.uid()) and exists(select 1 from public.profiles p where p.id = user_id and p.deleted_at is null));

-- Remove the old all-operations paths: they bypass versioning/consent and onboarding transitions.
drop policy profiles_update_own on public.profiles;
drop policy natal_profiles_own on public.natal_profiles;
revoke insert, update, delete, truncate, references, trigger on public.natal_profiles from anon, authenticated;
revoke insert, update, delete, truncate, references, trigger on public.profiles from anon, authenticated;
create policy natal_profiles_read_own on public.natal_profiles for select to authenticated
using (user_id = (select auth.uid()) and exists(select 1 from public.profiles p where p.id = user_id and p.deleted_at is null));

create function public.read_natal_onboarding() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_natal jsonb;
begin
  if v_uid is null then raise exception 'auth_required'; end if;
  select * into v_profile from public.profiles where id = v_uid and deleted_at is null;
  if not found then raise exception 'profile_unavailable'; end if;
  select jsonb_build_object(
    'version', n.version, 'localDateTime', to_char(n.local_date + n.local_time, 'YYYY-MM-DD"T"HH24:MI:SS.MS'),
    'utcInstant', to_char(n.utc_instant at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'timezone', n.timezone_iana, 'latitude', n.latitude, 'longitude', n.longitude,
    'locationSource', n.location_source, 'timePrecision', n.time_precision,
    'locationLabel', n.location_label, 'countryCode', n.country_code
  ) into v_natal from public.natal_profiles n
  join public.natal_storage_consents c on c.user_id = n.user_id and c.revision = n.version and c.granted
  where n.user_id = v_uid and n.is_current and n.version <= v_profile.onboarding_revision;
  return jsonb_build_object('version', 'atv-onboarding/1', 'revision', v_profile.onboarding_revision,
    'state', case when v_natal is not null then 'COMPLETE'
      when v_profile.onboarding_state = 'COMPLETE' then 'IN_PROGRESS' else v_profile.onboarding_state end,
    'natal', v_natal);
end;
$$;

create function public.update_natal_onboarding(p_command jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_revision integer;
  v_action text;
  v_n jsonb;
  v_local timestamp;
  v_utc timestamptz;
  v_zone text;
  v_lat double precision;
  v_lon double precision;
begin
  if v_uid is null then raise exception 'auth_required'; end if;
  if p_command is null or jsonb_typeof(p_command) <> 'object' or octet_length(p_command::text) > 4096 then raise exception 'invalid_input'; end if;
  v_action := p_command->>'action';
  if p_command->>'version' is distinct from 'atv-onboarding/1'
    or jsonb_typeof(p_command->'expectedRevision') is distinct from 'number'
    or (p_command->>'expectedRevision') !~ '^(0|[1-9][0-9]{0,9})$'
    or (p_command->>'expectedRevision')::numeric >= 2147483646
    or v_action is null or v_action not in ('begin', 'save-natal', 'forget-natal')
    or (select count(*) from jsonb_object_keys(p_command)) <> (case when v_action = 'save-natal' then 5 else 3 end)
    or exists(select 1 from jsonb_object_keys(p_command) k where k not in ('version','expectedRevision','action','natal','consent'))
    then raise exception 'invalid_input'; end if;
  if v_action = 'save-natal' then
    v_n := p_command->'natal';
    if p_command->'consent' is distinct from '{"storage":true,"policyVersion":"atv-natal-storage/1"}'::jsonb
      or v_n is null or jsonb_typeof(v_n) <> 'object' then raise exception 'invalid_input'; end if;
    if (select count(*) from jsonb_object_keys(v_n)) <> 9
      or exists(select 1 from jsonb_object_keys(v_n) k where k not in ('localDateTime','utcInstant','timezone','latitude','longitude','locationSource','timePrecision','locationLabel','countryCode'))
      or exists(select 1 from jsonb_each(v_n) e where e.key not in ('latitude','longitude') and jsonb_typeof(e.value) <> 'string')
      or jsonb_typeof(v_n->'latitude') is distinct from 'number' or jsonb_typeof(v_n->'longitude') is distinct from 'number'
      or v_n->>'localDateTime' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]{1,3})?$'
      or v_n->>'utcInstant' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]{1,3})?Z$'
      or v_n->>'timePrecision' not in ('EXACT','APPROXIMATE') or v_n->>'countryCode' !~ '^[A-Z]{2}$'
      or length(btrim(v_n->>'locationSource')) not between 1 and 80 or length(v_n->>'locationSource') > 80
      or length(btrim(v_n->>'locationLabel')) not between 1 and 200 or length(v_n->>'locationLabel') > 200
      or exists(select 1 from jsonb_each_text(v_n) e where e.value ~ '[[:cntrl:]]')
      then raise exception 'invalid_input'; end if;
    begin
      v_zone := v_n->>'timezone';
      v_local := (v_n->>'localDateTime')::timestamp;
      v_utc := (v_n->>'utcInstant')::timestamptz;
      v_lat := (v_n->>'latitude')::double precision;
      v_lon := (v_n->>'longitude')::double precision;
      -- UTC resolves repeated times; gaps/mismatches are refused. No geocoding or DST guessing.
      if length(v_zone) > 80 or (v_zone <> 'UTC' and v_zone !~ '^[A-Za-z_]+/[A-Za-z0-9_+/-]+$')
        or not exists(select 1 from pg_catalog.pg_timezone_names where name = v_zone)
        or (v_utc at time zone v_zone) <> v_local
        or to_char(v_local, 'YYYY-MM-DD"T"HH24:MI:SS') <> left(v_n->>'localDateTime',19)
        or to_char(v_utc at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS') <> left(v_n->>'utcInstant',19)
        or v_utc < '1900-01-01T00:00:00Z'::timestamptz or v_utc > '2099-12-31T23:59:59.999Z'::timestamptz
        or v_lat not between -90 and 90 or v_lon not between -180 and 180
        then raise exception 'invalid_input'; end if;
    exception when others then raise exception 'invalid_input'; end;
  end if;
  -- One row lock serializes tabs/retries. A stale revision never silently overwrites newer data.
  select onboarding_revision into v_revision from public.profiles where id = v_uid and deleted_at is null for update;
  if not found then raise exception 'profile_unavailable'; end if;
  if v_revision <> (p_command->>'expectedRevision')::integer then raise exception 'revision_conflict'; end if;
  v_revision := v_revision + 1;
  if v_action = 'save-natal' then
    update public.natal_profiles set is_current = false where user_id = v_uid and is_current;
    insert into public.natal_profiles(user_id, version, local_date, local_time, time_precision, location_label,
      country_code, timezone_iana, utc_instant, latitude, longitude, location_source)
    values(v_uid, v_revision, v_local::date, v_local::time, v_n->>'timePrecision', v_n->>'locationLabel',
      v_n->>'countryCode', v_zone, v_utc, v_lat, v_lon, v_n->>'locationSource');
    insert into public.natal_storage_consents(user_id, revision, granted, policy_version)
    values(v_uid, v_revision, true, 'atv-natal-storage/1');
  elsif v_action = 'forget-natal' then
    delete from public.natal_profiles where user_id = v_uid;
    insert into public.natal_storage_consents(user_id, revision, granted, policy_version)
    values(v_uid, v_revision, false, 'atv-natal-storage/1');
  end if;
  update public.profiles set onboarding_revision = v_revision, onboarding_state =
    case when v_action = 'save-natal' then 'COMPLETE' when v_action = 'forget-natal' then 'IN_PROGRESS'
      when onboarding_state = 'NOT_STARTED' then 'IN_PROGRESS' else onboarding_state end where id = v_uid;
  return public.read_natal_onboarding();
end;
$$;
revoke all on function public.read_natal_onboarding(), public.update_natal_onboarding(jsonb) from public, anon, service_role;
grant execute on function public.read_natal_onboarding(), public.update_natal_onboarding(jsonb) to authenticated;
commit;
