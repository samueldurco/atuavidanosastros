begin;
-- Owner-scoped intake. The existing release and engine gates remain authoritative.
create table public.personal_calendar_product_requests (
  run_id uuid primary key references public.product_runs(id) on delete cascade,
  command jsonb not null,
  natal_version integer not null check (natal_version > 0)
);
alter table public.personal_calendar_product_requests enable row level security;
revoke all on public.personal_calendar_product_requests from public, anon, authenticated, service_role;

create function public.request_personal_calendar_product_run(p_request_key uuid, p_command jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_revision integer;
  v_target date;
  v_next_month date;
  v_context text;
  v_marks jsonb;
  v_mark jsonb;
  v_mark_date date;
  v_mark_label text;
  v_seen text[] := array[]::text[];
  v_snapshot jsonb;
  v_natal jsonb;
  v_input jsonb;
  v_run uuid;
  v_receipt jsonb;
begin
  if v_uid is null then raise exception 'auth_required'; end if;
  if p_request_key is null or p_command is null or jsonb_typeof(p_command) <> 'object'
    or octet_length(p_command::text) > 8192 then raise exception 'invalid_input'; end if;
  if (select count(*) from jsonb_object_keys(p_command)) <>
      5 + (case when p_command ? 'context' then 1 else 0 end) +
          (case when p_command ? 'calendarMarks' then 1 else 0 end)
    or exists(select 1 from jsonb_object_keys(p_command) k where k not in
      ('version','productId','expectedRevision','targetDate','context','calendarMarks','consent'))
    or p_command->>'version' is distinct from 'atv-personal-calendar-request/1'
    or p_command->>'productId' is distinct from 'personal-calendar'
    or jsonb_typeof(p_command->'expectedRevision') is distinct from 'number'
    or (p_command->>'expectedRevision') !~ '^[1-9][0-9]{0,9}$'
    or (p_command->>'expectedRevision')::numeric >= 2147483647
    or jsonb_typeof(p_command->'targetDate') is distinct from 'string'
    or (p_command->>'targetDate') !~ '^[0-9]{4}-[0-9]{2}-01$'
    or p_command->'consent' is distinct from
      '{"storage":true,"policyVersion":"atv-input-consent/1","partner":false,"continuity":false}'::jsonb
    then raise exception 'invalid_input'; end if;
  begin
    v_target := (p_command->>'targetDate')::date;
  exception when datetime_field_overflow or invalid_datetime_format then
    raise exception 'invalid_input';
  end;
  if to_char(v_target,'YYYY-MM-DD') is distinct from p_command->>'targetDate'
    or v_target < date '1900-01-01' or v_target > date '2099-12-01'
    then raise exception 'invalid_input'; end if;
  v_next_month := (v_target + interval '1 month')::date;

  if p_command ? 'context' then
    v_context := p_command->>'context';
    if jsonb_typeof(p_command->'context') is distinct from 'string' or octet_length(v_context)>4800
      or btrim(v_context,chr(9)||chr(10)||chr(11)||chr(12)||chr(13)||chr(32)||chr(160)||chr(5760)||chr(8192)||chr(8193)||chr(8194)||chr(8195)||chr(8196)||chr(8197)||chr(8198)||chr(8199)||chr(8200)||chr(8201)||chr(8202)||chr(8232)||chr(8233)||chr(8239)||chr(8287)||chr(12288)||chr(65279))=''
      or exists(select 1 from regexp_split_to_table(v_context,'') c where (ascii(c)<32 and ascii(c) not in (9,10,13)) or ascii(c) between 127 and 159)
      or (select coalesce(sum(case when ascii(c)>65535 then 2 else 1 end),0) from regexp_split_to_table(v_context,'') c)>1200
      then raise exception 'invalid_input'; end if;
  end if;

  if p_command ? 'calendarMarks' then
    v_marks := p_command->'calendarMarks';
    if jsonb_typeof(v_marks) is distinct from 'object' then raise exception 'invalid_input'; end if;
    if (select count(*) from jsonb_object_keys(v_marks)) <> 2
      or exists(select 1 from jsonb_object_keys(v_marks) k where k not in ('authorization','entries'))
      or v_marks->>'authorization' is distinct from 'atv-personal-calendar-marks/1'
      or jsonb_typeof(v_marks->'entries') is distinct from 'array'
      then raise exception 'invalid_input'; end if;
    if jsonb_array_length(v_marks->'entries') not between 1 and 5 then raise exception 'invalid_input'; end if;
    for v_mark in select value from jsonb_array_elements(v_marks->'entries') loop
      if jsonb_typeof(v_mark) is distinct from 'object' then raise exception 'invalid_input'; end if;
      if (select count(*) from jsonb_object_keys(v_mark)) <> 2
        or exists(select 1 from jsonb_object_keys(v_mark) k where k not in ('date','label'))
        or jsonb_typeof(v_mark->'date') is distinct from 'string'
        or (v_mark->>'date') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
        or jsonb_typeof(v_mark->'label') is distinct from 'string'
        then raise exception 'invalid_input'; end if;
      begin
        v_mark_date := (v_mark->>'date')::date;
      exception when datetime_field_overflow or invalid_datetime_format then
        raise exception 'invalid_input';
      end;
      v_mark_label := v_mark->>'label';
      if to_char(v_mark_date,'YYYY-MM-DD') is distinct from v_mark->>'date'
        or v_mark_date < v_target or v_mark_date >= v_next_month
        or v_mark->>'date' = any(v_seen)
        or octet_length(v_mark_label)>320
        or btrim(v_mark_label,chr(9)||chr(10)||chr(11)||chr(12)||chr(13)||chr(32)||chr(160)||chr(5760)||chr(8192)||chr(8193)||chr(8194)||chr(8195)||chr(8196)||chr(8197)||chr(8198)||chr(8199)||chr(8200)||chr(8201)||chr(8202)||chr(8232)||chr(8233)||chr(8239)||chr(8287)||chr(12288)||chr(65279))=''
        or exists(select 1 from regexp_split_to_table(v_mark_label,'') c where ascii(c)<32 or ascii(c) between 127 and 159)
        or (select coalesce(sum(case when ascii(c)>65535 then 2 else 1 end),0) from regexp_split_to_table(v_mark_label,'') c)>80
        then raise exception 'invalid_input'; end if;
      v_seen := array_append(v_seen,v_mark->>'date');
    end loop;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_uid::text,0));
  select onboarding_revision into v_revision from public.profiles
    where id=v_uid and deleted_at is null for update;
  if not found then raise exception 'profile_unavailable'; end if;
  select r.id, c.command into v_run, v_receipt from public.product_runs r
    left join public.personal_calendar_product_requests c on c.run_id=r.id
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

  v_input := jsonb_build_object('version','atv-workflow/1.0.0','productId','personal-calendar',
    'consent',p_command->'consent','targetDate',p_command->'targetDate',
    'birth',jsonb_build_object(
      'localDateTime',v_natal->'localDateTime','utcInstant',v_natal->'utcInstant',
      'timezone',v_natal->'timezone','latitude',v_natal->'latitude',
      'longitude',v_natal->'longitude','locationSource',v_natal->'locationSource'));
  if p_command ? 'context' then v_input := v_input || jsonb_build_object('context',v_context); end if;
  if p_command ? 'calendarMarks' then v_input := v_input || jsonb_build_object('calendarMarks',v_marks); end if;
  v_run := public.request_product_run('personal-calendar',p_request_key,v_input,null);
  insert into public.personal_calendar_product_requests(run_id,command,natal_version)
    values(v_run,p_command,(v_natal->>'version')::integer);
  return v_run;
end;
$$;
revoke all on function public.request_personal_calendar_product_run(uuid,jsonb) from public, anon, service_role;
grant execute on function public.request_personal_calendar_product_run(uuid,jsonb) to authenticated;
commit;
