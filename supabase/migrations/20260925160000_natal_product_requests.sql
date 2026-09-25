begin;

-- Minimal lineage/consent receipt, not a second copy of birth data. Run deletion cascades.
create table public.natal_product_requests (
  run_id uuid primary key references public.product_runs(id) on delete cascade,
  command jsonb not null,
  natal_version integer not null check (natal_version > 0)
);
alter table public.natal_product_requests enable row level security;
revoke all on public.natal_product_requests from public, anon, authenticated, service_role;

create function public.request_natal_product_run(p_request_key uuid, p_command jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_revision integer;
  v_snapshot jsonb;
  v_natal jsonb;
  v_input jsonb;
  v_run uuid;
  v_receipt jsonb;
begin
  if v_uid is null then raise exception 'auth_required'; end if;
  if p_request_key is null or p_command is null or jsonb_typeof(p_command) <> 'object'
    or octet_length(p_command::text) > 4096 then raise exception 'invalid_input'; end if;
  if (select count(*) from jsonb_object_keys(p_command)) <> 4
    or exists(select 1 from jsonb_object_keys(p_command) k where k not in ('version','productId','expectedRevision','consent'))
    or p_command->>'version' is distinct from 'atv-natal-request/1'
    or coalesce(p_command->>'productId','') not in ('birth-chart','three-pillars','ascendant','midheaven')
    or jsonb_typeof(p_command->'expectedRevision') is distinct from 'number'
    or (p_command->>'expectedRevision') !~ '^[1-9][0-9]{0,9}$'
    or (p_command->>'expectedRevision')::numeric >= 2147483647
    or p_command->'consent' is distinct from '{"storage":true,"policyVersion":"atv-input-consent/1","partner":false,"continuity":false}'::jsonb
    then raise exception 'invalid_input'; end if;

  -- Same lock/order as request_product_run, then onboarding's profile lock.
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
  -- Existing release, entitlement, quota, immutable input, event and Library transaction.
  v_run := public.request_product_run(p_command->>'productId',p_request_key,v_input,null);
  insert into public.natal_product_requests(run_id,command,natal_version)
    values(v_run,p_command,(v_natal->>'version')::integer);
  return v_run;
end;
$$;
revoke all on function public.request_natal_product_run(uuid,jsonb) from public, anon, service_role;
grant execute on function public.request_natal_product_run(uuid,jsonb) to authenticated;
commit;
