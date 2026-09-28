begin;
-- v1 stays byte-for-byte idempotent. v2 is career-only and carries an optional report.
create or replace function public.request_natal_product_run(p_request_key uuid, p_command jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_revision integer;
  v_snapshot jsonb;
  v_natal jsonb;
  v_input jsonb;
  v_run uuid;
  v_receipt jsonb;
  v_career boolean;
  v_context text;
begin
  if v_uid is null then raise exception 'auth_required'; end if;
  if p_request_key is null or p_command is null or jsonb_typeof(p_command) <> 'object'
    or octet_length(p_command::text) > 8192 then raise exception 'invalid_input'; end if;
  v_career := coalesce(p_command->>'version'='atv-natal-request/2' and p_command->>'productId'='career-compass',false);
  if (select count(*) from jsonb_object_keys(p_command)) <> (case when v_career and p_command ? 'context' then 5 else 4 end)
    or exists(select 1 from jsonb_object_keys(p_command) k where k not in ('version','productId','expectedRevision','consent') and not (v_career and k='context'))
    or (p_command->>'version' is distinct from 'atv-natal-request/1' and not v_career)
    or coalesce(p_command->>'productId','') not in ('birth-chart','three-pillars','ascendant','midheaven','career-compass')
    or jsonb_typeof(p_command->'expectedRevision') is distinct from 'number'
    or (p_command->>'expectedRevision') !~ '^[1-9][0-9]{0,9}$'
    or (p_command->>'expectedRevision')::numeric >= 2147483647
    or p_command->'consent' is distinct from '{"storage":true,"policyVersion":"atv-input-consent/1","partner":false,"continuity":false}'::jsonb
    then raise exception 'invalid_input'; end if;
  if p_command ? 'context' then
    v_context := p_command->>'context';
    if not v_career or jsonb_typeof(p_command->'context') is distinct from 'string'
      or octet_length(v_context)>4800
      -- ECMAScript trim whitespace, matched explicitly independent of DB locale.
      or btrim(v_context,chr(9)||chr(10)||chr(11)||chr(12)||chr(13)||chr(32)||chr(160)||chr(5760)||chr(8192)||chr(8193)||chr(8194)||chr(8195)||chr(8196)||chr(8197)||chr(8198)||chr(8199)||chr(8200)||chr(8201)||chr(8202)||chr(8232)||chr(8233)||chr(8239)||chr(8287)||chr(12288)||chr(65279))=''
      or exists(select 1 from regexp_split_to_table(v_context,'') c where (ascii(c)<32 and ascii(c) not in (9,10,13)) or ascii(c) between 127 and 159)
      or (select coalesce(sum(case when ascii(c)>65535 then 2 else 1 end),0) from regexp_split_to_table(v_context,'') c)>1200
      then raise exception 'invalid_input'; end if;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_uid::text,0));
  select onboarding_revision into v_revision from public.profiles
    where id = v_uid and deleted_at is null for update;
  if not found then raise exception 'profile_unavailable'; end if;
  select r.id, n.command into v_run, v_receipt from public.product_runs r
    left join public.natal_product_requests n on n.run_id = r.id
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
  v_input := jsonb_build_object('version','atv-workflow/1.0.0', 'productId',p_command->>'productId',
    'consent',p_command->'consent', 'birth',jsonb_build_object(
      'localDateTime',v_natal->'localDateTime', 'utcInstant',v_natal->'utcInstant',
      'timezone',v_natal->'timezone', 'latitude',v_natal->'latitude',
      'longitude',v_natal->'longitude', 'locationSource',v_natal->'locationSource'));
  if p_command ? 'context' then v_input := v_input || jsonb_build_object('context',v_context); end if;
  v_run := public.request_product_run(p_command->>'productId',p_request_key,v_input,null);
  insert into public.natal_product_requests(run_id,command,natal_version)
    values(v_run,p_command,(v_natal->>'version')::integer);
  return v_run;
end;
$$;
revoke all on function public.request_natal_product_run(uuid,jsonb) from public, anon, service_role;
grant execute on function public.request_natal_product_run(uuid,jsonb) to authenticated;
commit;
