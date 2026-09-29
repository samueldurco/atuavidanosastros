-- Explicit Sinastria v2 intake; no release, policy approval or runtime registration.
begin;
create or replace function public.request_pair_product_run(p_request_key uuid, p_command jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_revision integer;
  v_partner jsonb;
  v_local timestamp;
  v_utc timestamptz;
  v_zone text;
  v_snapshot jsonb;
  v_natal jsonb;
  v_input jsonb;
  v_run uuid;
  v_receipt jsonb;
  v_product text;
  v_synastry boolean;
  v_context text;
begin
  if v_uid is null then raise exception 'auth_required'; end if;
  v_product := p_command->>'productId';
  v_synastry := coalesce(v_product='synastry' and p_command->>'version'='atv-pair-request/2',false);
  if p_request_key is null or p_command is null or jsonb_typeof(p_command) <> 'object'
    or octet_length(p_command::text) > (case when v_synastry then 8192 else 4096 end) then raise exception 'invalid_input'; end if;
  if (select count(*) from jsonb_object_keys(p_command)) <> (case when v_synastry and p_command ? 'context' then 7 else 6 end)
    or exists(select 1 from jsonb_object_keys(p_command) k where k not in ('version','productId','expectedRevision','partner','consent','partnerConsent') and not (v_synastry and k='context'))
    or (not v_synastry and (p_command->>'version' is distinct from 'atv-pair-request/1' or v_product is distinct from 'pair-preview'))
    or jsonb_typeof(p_command->'expectedRevision') is distinct from 'number'
    or (p_command->>'expectedRevision') !~ '^[1-9][0-9]{0,9}$'
    or (p_command->>'expectedRevision')::numeric >= 2147483647
    or p_command->'consent' is distinct from '{"storage":true,"policyVersion":"atv-input-consent/1","partner":true,"continuity":false}'::jsonb
    or p_command->'partnerConsent' is distinct from '{"storage":true,"policyVersion":"atv-partner-storage/1","permissionDeclared":true,"sharing":false}'::jsonb
    then raise exception 'invalid_input'; end if;
  if p_command ? 'context' then
    v_context := p_command->>'context';
    if not v_synastry or jsonb_typeof(p_command->'context') is distinct from 'string'
      or octet_length(v_context)>4800
      -- ECMAScript trim whitespace, independent of DB locale; UTF-16 limit matches UI.
      or btrim(v_context,chr(9)||chr(10)||chr(11)||chr(12)||chr(13)||chr(32)||chr(160)||chr(5760)||chr(8192)||chr(8193)||chr(8194)||chr(8195)||chr(8196)||chr(8197)||chr(8198)||chr(8199)||chr(8200)||chr(8201)||chr(8202)||chr(8232)||chr(8233)||chr(8239)||chr(8287)||chr(12288)||chr(65279))=''
      or exists(select 1 from regexp_split_to_table(v_context,'') c where (ascii(c)<32 and ascii(c) not in (9,10,13)) or ascii(c) between 127 and 159)
      or (select coalesce(sum(case when ascii(c)>65535 then 2 else 1 end),0) from regexp_split_to_table(v_context,'') c)>1200
      then raise exception 'invalid_input'; end if;
  end if;
  v_partner := p_command->'partner';
  if v_partner is null or jsonb_typeof(v_partner) <> 'object' then raise exception 'invalid_input'; end if;
  if (select count(*) from jsonb_object_keys(v_partner)) <> 7
    or exists(select 1 from jsonb_object_keys(v_partner) k where k not in ('localDateTime','utcInstant','timezone','latitude','longitude','locationSource','timePrecision'))
    or exists(select 1 from jsonb_each(v_partner) e where e.key not in ('latitude','longitude') and jsonb_typeof(e.value) <> 'string')
    or jsonb_typeof(v_partner->'latitude') is distinct from 'number' or jsonb_typeof(v_partner->'longitude') is distinct from 'number'
    or v_partner->>'localDateTime' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]{1,3})?$'
    or v_partner->>'utcInstant' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]{1,3})?Z$'
    or v_partner->>'timePrecision' is distinct from 'EXACT'
    or length(btrim(v_partner->>'locationSource')) not between 1 and 80
    or length(v_partner->>'locationSource') > 80
    or exists(select 1 from jsonb_each_text(v_partner) e where e.value ~ '[[:cntrl:]]')
    then raise exception 'invalid_input'; end if;
  begin
    v_zone := v_partner->>'timezone';
    v_local := (v_partner->>'localDateTime')::timestamp;
    v_utc := (v_partner->>'utcInstant')::timestamptz;
    if length(v_zone) > 80 or (v_zone <> 'UTC' and v_zone !~ '^[A-Za-z_]+/[A-Za-z0-9_+/-]+$')
      or not exists(select 1 from pg_catalog.pg_timezone_names where name = v_zone)
      or (v_utc at time zone v_zone) <> v_local
      or to_char(v_local, 'YYYY-MM-DD"T"HH24:MI:SS') <> left(v_partner->>'localDateTime',19)
      or to_char(v_utc at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS') <> left(v_partner->>'utcInstant',19)
      or v_utc < '1900-01-01T00:00:00Z'::timestamptz or v_utc > '2099-12-31T23:59:59.999Z'::timestamptz
      or (v_partner->>'latitude')::double precision not between -90 and 90
      or (v_partner->>'longitude')::double precision not between -180 and 180
      then raise exception 'invalid_input'; end if;
  exception when others then raise exception 'invalid_input'; end;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_uid::text,0));
  select onboarding_revision into v_revision from public.profiles
    where id = v_uid and deleted_at is null for update;
  if not found then raise exception 'profile_unavailable'; end if;
  select r.id, n.command into v_run, v_receipt from public.product_runs r
    left join public.pair_product_requests n on n.run_id = r.id
    where r.user_id = v_uid and r.request_key = p_request_key;
  if found then
    if v_receipt is distinct from p_command then raise exception 'idempotency_conflict'; end if;
    return v_run;
  end if;
  if v_revision <> (p_command->>'expectedRevision')::integer then raise exception 'revision_conflict'; end if;
  v_snapshot := public.read_natal_onboarding();
  v_natal := v_snapshot->'natal';
  if v_snapshot->>'state' is distinct from 'COMPLETE' or v_natal is null or v_natal = 'null'::jsonb
    then raise exception 'natal_profile_required'; end if;
  if v_natal->>'timePrecision' is distinct from 'EXACT' then raise exception 'exact_time_required'; end if;
  v_input := jsonb_build_object('version','atv-workflow/1.0.0', 'productId',v_product,
    'consent',p_command->'consent', 'partner',v_partner - 'timePrecision',
    'birth',jsonb_build_object(
      'localDateTime',v_natal->'localDateTime', 'utcInstant',v_natal->'utcInstant',
      'timezone',v_natal->'timezone', 'latitude',v_natal->'latitude',
      'longitude',v_natal->'longitude', 'locationSource',v_natal->'locationSource'));
  if p_command ? 'context' then v_input := v_input || jsonb_build_object('context',v_context); end if;
  v_run := public.request_product_run(v_product,p_request_key,v_input,null);
  insert into public.pair_product_requests(run_id,command,natal_version)
    values(v_run,p_command,(v_natal->>'version')::integer);
  return v_run;
end;
$$;
revoke all on function public.request_pair_product_run(uuid,jsonb) from public, anon, service_role;
grant execute on function public.request_pair_product_run(uuid,jsonb) to authenticated;
commit;
