begin;

-- E3/E4 private full-reading drafts. These rows cannot issue a receipt, change
-- product_runs or satisfy the public release gate.
create table public.career_compass_full_candidates (
  run_id uuid not null references public.product_runs(id) on delete cascade,
  revision integer not null check (revision > 0),
  contract_version text not null,
  workflow_input jsonb not null check (jsonb_typeof(workflow_input) = 'object'
    and octet_length(workflow_input::text) <= 30000),
  source_calculation jsonb not null check (jsonb_typeof(source_calculation) = 'object'
    and octet_length(source_calculation::text) <= 200000),
  candidate_version text not null check (
    candidate_version ~ '^atv-career-compass-full-candidate/[0-9]+\.[0-9]+\.[0-9]+$'),
  status text not null check (status in ('prepared_for_review', 'blocked')),
  basis_digest text check (basis_digest ~ '^[a-f0-9]{64}$'),
  output_digest text check (output_digest ~ '^[a-f0-9]{64}$'),
  delivery_digest text check (delivery_digest ~ '^[a-f0-9]{64}$'),
  blocked_reason text check (blocked_reason ~ '^[a-z0-9_]{1,80}$'),
  candidate jsonb not null check (jsonb_typeof(candidate) = 'object'
    and octet_length(candidate::text) <= 600000),
  created_at timestamptz not null default now(),
  primary key (run_id, revision, candidate_version),
  check (
    (status = 'prepared_for_review' and basis_digest is not null
      and output_digest is not null and delivery_digest is not null
      and blocked_reason is null)
    or (status = 'blocked' and basis_digest is null
      and output_digest is null and delivery_digest is null
      and blocked_reason is not null)
  )
);
alter table public.career_compass_full_candidates enable row level security;
revoke all on public.career_compass_full_candidates
  from public, anon, authenticated, service_role;

-- Selection is a claim hint; save takes a row lock and rechecks every source
-- field so concurrent workers cannot persist a stale or substituted basis.
create function public.select_next_career_compass_full_candidate(p_candidate_version text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.product_runs;
begin
  if p_candidate_version is null or
     p_candidate_version !~ '^atv-career-compass-full-candidate/[0-9]+\.[0-9]+\.[0-9]+$' then
    raise exception 'invalid_candidate_version' using errcode = '22023';
  end if;
  select run.* into r from public.product_runs run
    join public.workflow_releases d on d.product_id = run.product_id
    where run.product_id = 'career-compass' and run.state = 'AWAITING_EDITORIAL'
      and run.calculation is not null and d.enabled
      and d.contract_version = run.contract_version
      and not exists (
        select 1 from public.career_compass_full_candidates c
        where c.run_id = run.id and c.revision = run.revision
          and c.candidate_version = p_candidate_version
      )
    order by run.created_at, run.id limit 1;
  if not found then return null; end if;
  return jsonb_build_object('runId', r.id, 'revision', r.revision,
    'contractVersion', r.contract_version, 'workflowInput', r.input,
    'sourceCalculation', r.calculation, 'candidateVersion', p_candidate_version);
end $$;

create function public.save_career_compass_full_candidate(
  p_run_id uuid, p_revision integer, p_contract_version text,
  p_workflow_input jsonb, p_source_calculation jsonb,
  p_candidate_version text, p_candidate jsonb
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.product_runs; existing public.career_compass_full_candidates;
  candidate_status text; next_basis_digest text; next_output_digest text;
  next_delivery_digest text; next_reason text;
begin
  if p_revision is null or p_revision < 1 or p_candidate_version is null or
     p_candidate_version !~ '^atv-career-compass-full-candidate/[0-9]+\.[0-9]+\.[0-9]+$' or
     p_workflow_input is null or jsonb_typeof(p_workflow_input) <> 'object' or
     octet_length(p_workflow_input::text) > 30000 or
     p_source_calculation is null or jsonb_typeof(p_source_calculation) <> 'object' or
     octet_length(p_source_calculation::text) > 200000 or
     p_candidate is null or jsonb_typeof(p_candidate) <> 'object' or
     octet_length(p_candidate::text) > 600000 then
    raise exception 'invalid_full_candidate' using errcode = '22023';
  end if;
  select * into r from public.product_runs where id = p_run_id for update;
  if not found or r.product_id <> 'career-compass' or
     r.state <> 'AWAITING_EDITORIAL' or r.revision <> p_revision or
     r.contract_version is distinct from p_contract_version or
     r.input is distinct from p_workflow_input or
     r.calculation is distinct from p_source_calculation or
     not exists (select 1 from public.workflow_releases d
       where d.product_id = 'career-compass' and d.enabled
         and d.contract_version = r.contract_version) then
    raise exception 'stale_full_candidate_basis' using errcode = '40001';
  end if;
  candidate_status := p_candidate->>'status';
  if p_candidate->>'version' is distinct from p_candidate_version or
     p_candidate->>'publication' is distinct from 'blocked' or
     candidate_status is null or candidate_status not in ('prepared_for_review', 'blocked') then
    raise exception 'publication_block_required' using errcode = '55000';
  end if;
  if candidate_status = 'prepared_for_review' then
    next_basis_digest := p_candidate->'assessment'->>'basisDigest';
    next_output_digest := p_candidate->'assessment'->>'outputDigest';
    next_delivery_digest := p_candidate->'delivery'->>'deliveryDigest';
    if p_candidate->'assessment'->>'status' is distinct from 'needs_editorial_review' or
       p_candidate->'assessment'->>'publication' is distinct from 'blocked' or
       p_candidate->'delivery'->>'status' is distinct from 'prepared_for_review' or
       p_candidate->'delivery'->>'publication' is distinct from 'blocked' or
       p_candidate->'delivery'->>'basisDigest' is distinct from next_basis_digest or
       p_candidate->'delivery'->>'outputDigest' is distinct from next_output_digest or
       jsonb_typeof(p_candidate->'fullCalculation') is distinct from 'object' or
       jsonb_typeof(p_candidate->'output') is distinct from 'object' or
       coalesce(next_basis_digest,'') !~ '^[a-f0-9]{64}$' or
       coalesce(next_output_digest,'') !~ '^[a-f0-9]{64}$' or
       coalesce(next_delivery_digest,'') !~ '^[a-f0-9]{64}$' then
      raise exception 'invalid_full_candidate_digest' using errcode = '22023';
    end if;
  else
    next_reason := p_candidate->>'reason';
    if next_reason is null or next_reason !~ '^[a-z0-9_]{1,80}$' or
       p_candidate ? 'fullCalculation' or p_candidate ? 'output' or
       p_candidate ? 'assessment' or
       p_candidate ? 'delivery' then
      raise exception 'invalid_full_candidate_reason' using errcode = '22023';
    end if;
  end if;
  insert into public.career_compass_full_candidates (
    run_id, revision, contract_version, workflow_input, source_calculation,
    candidate_version, status, basis_digest, output_digest, delivery_digest,
    blocked_reason, candidate
  ) values (
    p_run_id, p_revision, p_contract_version, p_workflow_input, p_source_calculation,
    p_candidate_version, candidate_status, next_basis_digest, next_output_digest,
    next_delivery_digest, next_reason, p_candidate
  ) on conflict (run_id, revision, candidate_version) do nothing;
  select * into existing from public.career_compass_full_candidates
    where run_id = p_run_id and revision = p_revision
      and candidate_version = p_candidate_version;
  if existing.workflow_input is distinct from p_workflow_input or
     existing.source_calculation is distinct from p_source_calculation or
     existing.contract_version is distinct from p_contract_version or
     existing.candidate is distinct from p_candidate then
    raise exception 'full_candidate_conflict' using errcode = '40001';
  end if;
  return jsonb_build_object('status', existing.status, 'runId', existing.run_id,
    'revision', existing.revision, 'candidateVersion', existing.candidate_version,
    'basisDigest', existing.basis_digest, 'outputDigest', existing.output_digest,
    'deliveryDigest', existing.delivery_digest, 'publication', 'blocked');
end $$;

-- Review/recovery only: no authenticated-user grant or READY reader bridge.
create function public.read_career_compass_full_candidate(
  p_run_id uuid, p_revision integer, p_candidate_version text
)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('runId', c.run_id, 'revision', c.revision,
    'contractVersion', c.contract_version, 'workflowInput', c.workflow_input,
    'sourceCalculation', c.source_calculation,
    'candidateVersion', c.candidate_version, 'status', c.status,
    'basisDigest', c.basis_digest, 'outputDigest', c.output_digest,
    'deliveryDigest', c.delivery_digest, 'blockedReason', c.blocked_reason,
    'candidate', c.candidate, 'createdAt', c.created_at)
  from public.career_compass_full_candidates c
  join public.product_runs r on r.id = c.run_id
  where c.run_id = p_run_id and c.revision = p_revision
    and c.candidate_version = p_candidate_version
    and r.product_id = 'career-compass' and r.state = 'AWAITING_EDITORIAL'
    and r.revision = c.revision and r.contract_version = c.contract_version
    and r.input = c.workflow_input and r.calculation = c.source_calculation
$$;

revoke all on function public.select_next_career_compass_full_candidate(text),
  public.save_career_compass_full_candidate(uuid, integer, text, jsonb, jsonb, text, jsonb),
  public.read_career_compass_full_candidate(uuid, integer, text)
  from public, anon, authenticated, service_role;
grant execute on function public.select_next_career_compass_full_candidate(text),
  public.save_career_compass_full_candidate(uuid, integer, text, jsonb, jsonb, text, jsonb),
  public.read_career_compass_full_candidate(uuid, integer, text)
  to service_role;

commit;
