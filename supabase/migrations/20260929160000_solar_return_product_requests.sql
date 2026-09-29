begin;
-- Private, owner-scoped bridge. Release and engine gates remain in request_product_run.
create table public.solar_return_product_requests (
  run_id uuid primary key references public.product_runs(id) on delete cascade,
  command jsonb not null,
  natal_version integer not null check (natal_version > 0)
);
alter table public.solar_return_product_requests enable row level security;
revoke all on public.solar_return_product_requests from public, anon, authenticated, service_role;

create function public.request_solar_return_product_run(p_request_key uuid, p_command jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_revision integer;
  v_year integer;
  v_target date;
  v_birth_date date;
  v_snapshot jsonb;
  v_natal jsonb;
  v_location jsonb;
  v_city text;
  v_context text;
  v_input jsonb;
  v_run uuid;
  v_receipt jsonb;
begin
  if v_uid is null then raise exception 'auth_required'; end if;
  if p_request_key is null or p_command is null or jsonb_typeof(p_command) <> 'object'
    or octet_length(p_command::text) > 8192 then raise exception 'invalid_input'; end if;
  if (select count(*) from jsonb_object_keys(p_command)) <> (case when p_command ? 'context' then 8 else 7 end)
    or exists(select 1 from jsonb_object_keys(p_command) k where k not in
      ('version','productId','expectedRevision','returnYear','targetDate','returnLocation','context','consent'))
    or p_command->>'version' is distinct from 'atv-solar-return-request/1'
    or p_command->>'productId' is distinct from 'solar-return'
    or jsonb_typeof(p_command->'expectedRevision') is distinct from 'number'
    or (p_command->>'expectedRevision') !~ '^[1-9][0-9]{0,9}$'
    or (p_command->>'expectedRevision')::numeric >= 2147483647
    or jsonb_typeof(p_command->'returnYear') is distinct from 'number'
    or (p_command->>'returnYear') !~ '^[0-9]{4}$'
    or (p_command->>'returnYear')::integer not between 1901 and 2099
    or jsonb_typeof(p_command->'targetDate') is distinct from 'string'
    or (p_command->>'targetDate') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
    or p_command->'consent' is distinct from
      '{"storage":true,"policyVersion":"atv-input-consent/1","partner":false,"continuity":false}'::jsonb
    then raise exception 'invalid_input'; end if;
  v_year := (p_command->>'returnYear')::integer;
  begin
    v_target := (p_command->>'targetDate')::date;
  exception when datetime_field_overflow or invalid_datetime_format then
    raise exception 'invalid_input';
  end;
  if to_char(v_target,'YYYY-MM-DD') is distinct from p_command->>'targetDate'
    or extract(year from v_target)::integer <> v_year then raise exception 'invalid_input'; end if;

  v_location := p_command->'returnLocation';
  if jsonb_typeof(v_location) is distinct from 'object'
    or (select count(*) from jsonb_object_keys(v_location)) <> 4
    or exists(select 1 from jsonb_object_keys(v_location) k where k not in
      ('city','timezone','latitude','longitude'))
    or jsonb_typeof(v_location->'city') is distinct from 'string'
    or jsonb_typeof(v_location->'timezone') is distinct from 'string'
    or jsonb_typeof(v_location->'latitude') is distinct from 'number'
    or jsonb_typeof(v_location->'longitude') is distinct from 'number'
    then raise exception 'invalid_input'; end if;
  v_city := v_location->>'city';
  if char_length(v_city)>120 or octet_length(v_city)>480 or btrim(v_city)=''
    or exists(select 1 from regexp_split_to_table(v_city,'') c where ascii(c)<32 or ascii(c) between 127 and 159)
    or octet_length(v_location->>'timezone')>64
    or not ((v_location->>'timezone')='UTC' or (v_location->>'timezone') ~ '^[A-Z][A-Za-z_]*(/[A-Z][A-Za-z0-9_+\-]*)+$')
    or not exists(select 1 from pg_catalog.pg_timezone_names where name=v_location->>'timezone')
    or abs((v_location->>'latitude')::numeric)>90
    or abs((v_location->>'longitude')::numeric)>180
    then raise exception 'invalid_input'; end if;
  if p_command ? 'context' then
    v_context := p_command->>'context';
    if jsonb_typeof(p_command->'context') is distinct from 'string' or octet_length(v_context)>4800
      or btrim(v_context,chr(9)||chr(10)||chr(11)||chr(12)||chr(13)||chr(32)||chr(160)||chr(5760)||chr(8192)||chr(8193)||chr(8194)||chr(8195)||chr(8196)||chr(8197)||chr(8198)||chr(8199)||chr(8200)||chr(8201)||chr(8202)||chr(8232)||chr(8233)||chr(8239)||chr(8287)||chr(12288)||chr(65279))=''
      or exists(select 1 from regexp_split_to_table(v_context,'') c where (ascii(c)<32 and ascii(c) not in (9,10,13)) or ascii(c) between 127 and 159)
      or (select coalesce(sum(case when ascii(c)>65535 then 2 else 1 end),0) from regexp_split_to_table(v_context,'') c)>1200
      then raise exception 'invalid_input'; end if;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_uid::text,0));
  select onboarding_revision into v_revision from public.profiles
    where id=v_uid and deleted_at is null for update;
  if not found then raise exception 'profile_unavailable'; end if;
  select r.id, s.command into v_run, v_receipt from public.product_runs r
    left join public.solar_return_product_requests s on s.run_id=r.id
    where r.user_id=v_uid and r.request_key=p_request_key;
  if found then
    if v_receipt is distinct from p_command then raise exception 'idempotency_conflict'; end if;
    return v_run;
  end if;
  if v_revision <> (p_command->>'expectedRevision')::integer then raise exception 'revision_conflict'; end if;
  v_snapshot := public.read_natal_onboarding();
  v_natal := v_snapshot->'natal';
  if v_snapshot->>'state' is distinct from 'COMPLETE' or v_natal is null or v_natal='null'::jsonb
    then raise exception 'natal_profile_required'; end if;
  if v_natal->>'timePrecision' is distinct from 'EXACT' then raise exception 'exact_time_required'; end if;
  v_birth_date := left(v_natal->>'localDateTime',10)::date;
  if v_year < extract(year from v_birth_date)::integer then raise exception 'invalid_input'; end if;
  if v_target is distinct from make_date(v_year,extract(month from v_birth_date)::integer,
      case when extract(month from v_birth_date)=2 and extract(day from v_birth_date)=29
        and not (v_year%4=0 and (v_year%100<>0 or v_year%400=0)) then 28
        else extract(day from v_birth_date)::integer end)
    then raise exception 'invalid_input'; end if;

  v_input := jsonb_build_object('version','atv-workflow/1.0.0','productId','solar-return',
    'consent',p_command->'consent','targetDate',p_command->'targetDate','returnYear',v_year,
    'returnLocation',v_location || jsonb_build_object('locationSource','declared-manual/1'),
    'birth',jsonb_build_object(
      'localDateTime',v_natal->'localDateTime','utcInstant',v_natal->'utcInstant',
      'timezone',v_natal->'timezone','latitude',v_natal->'latitude',
      'longitude',v_natal->'longitude','locationSource',v_natal->'locationSource'));
  if p_command ? 'context' then v_input := v_input || jsonb_build_object('context',v_context); end if;
  v_run := public.request_product_run('solar-return',p_request_key,v_input,null);
  insert into public.solar_return_product_requests(run_id,command,natal_version)
    values(v_run,p_command,(v_natal->>'version')::integer);
  return v_run;
end;
$$;
revoke all on function public.request_solar_return_product_run(uuid,jsonb) from public, anon, service_role;
grant execute on function public.request_solar_return_product_run(uuid,jsonb) to authenticated;
commit;
