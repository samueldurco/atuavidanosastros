begin;

-- E3 draft storage only. This table cannot satisfy the independent editorial
-- receipt gate and never changes product_runs.state or product_runs.editorial.
create table public.career_compass_candidates (
  run_id uuid not null references public.product_runs(id) on delete cascade,
  revision integer not null check (revision > 0),
  contract_version text not null,
  calculation jsonb not null check (jsonb_typeof(calculation) = 'object'),
  candidate_version text not null check (candidate_version ~ '^atv-career-compass-candidate/[0-9]+\.[0-9]+\.[0-9]+$'),
  status text not null check (status in ('prepared_for_review', 'blocked')),
  candidate_digest text check (candidate_digest ~ '^[a-f0-9]{64}$'),
  basis_digest text check (basis_digest ~ '^[a-f0-9]{64}$'),
  output_digest text check (output_digest ~ '^[a-f0-9]{64}$'),
  delivery_digest text check (delivery_digest ~ '^[a-f0-9]{64}$'),
  blocked_reason text check (blocked_reason ~ '^[a-z0-9_]{1,80}$'),
  candidate jsonb not null check (jsonb_typeof(candidate) = 'object' and octet_length(candidate::text) <= 200000),
  created_at timestamptz not null default now(),
  primary key (run_id, revision, candidate_version),
  check (
    (status = 'prepared_for_review' and candidate_digest is not null and basis_digest is not null
      and output_digest is not null and delivery_digest is not null and blocked_reason is null)
    or (status = 'blocked' and candidate_digest is null and basis_digest is null
      and output_digest is null and delivery_digest is null and blocked_reason is not null)
  )
);
alter table public.career_compass_candidates enable row level security;
revoke all on public.career_compass_candidates from public, anon, authenticated, service_role;
create index career_compass_candidate_pending on public.product_runs (created_at, id)
  where product_id = 'career-compass' and state = 'AWAITING_EDITORIAL';

-- The worker receives only a calculation already persisted by the calculation
-- RPC. Concurrent workers can compose the same candidate; save below fences
-- the revision and makes the duplicate write idempotent.
create function public.select_next_career_compass_candidate(p_candidate_version text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.product_runs;
begin
  if p_candidate_version is null or
     p_candidate_version !~ '^atv-career-compass-candidate/[0-9]+\.[0-9]+\.[0-9]+$' then
    raise exception 'invalid_candidate_version' using errcode = '22023';
  end if;
  select run.* into r from public.product_runs run
    join public.workflow_releases d on d.product_id = run.product_id
    where run.product_id = 'career-compass' and run.state = 'AWAITING_EDITORIAL'
      and run.calculation is not null and d.enabled
      and d.contract_version = run.contract_version
      and not exists (
        select 1 from public.career_compass_candidates c
        where c.run_id = run.id and c.revision = run.revision
          and c.candidate_version = p_candidate_version
      )
    order by run.created_at, run.id limit 1;
  if not found then return null; end if;
  return jsonb_build_object('runId', r.id, 'revision', r.revision,
    'contractVersion', r.contract_version, 'calculation', r.calculation,
    'candidateVersion', p_candidate_version);
end $$;

create function public.save_career_compass_candidate(
  p_run_id uuid, p_revision integer, p_contract_version text,
  p_calculation jsonb, p_candidate_version text, p_candidate jsonb
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.product_runs; existing public.career_compass_candidates;
  candidate_status text; next_candidate_digest text; next_basis_digest text;
  next_output_digest text; next_delivery_digest text; next_reason text;
begin
  if p_revision is null or p_revision < 1 or p_candidate_version is null or
     p_candidate_version !~ '^atv-career-compass-candidate/[0-9]+\.[0-9]+\.[0-9]+$' or
     p_candidate is null or jsonb_typeof(p_candidate) <> 'object' or
     octet_length(p_candidate::text) > 200000 then
    raise exception 'invalid_candidate' using errcode = '22023';
  end if;
  select * into r from public.product_runs where id = p_run_id for update;
  if not found or r.product_id <> 'career-compass' or
     r.state <> 'AWAITING_EDITORIAL' or r.revision <> p_revision or
     r.contract_version is distinct from p_contract_version or
     r.calculation is distinct from p_calculation or
     not exists (select 1 from public.workflow_releases d
       where d.product_id = 'career-compass' and d.enabled
         and d.contract_version = r.contract_version) then
    raise exception 'stale_candidate_basis' using errcode = '40001';
  end if;
  candidate_status := p_candidate->>'status';
  if p_candidate->>'publication' is distinct from 'blocked' or
     candidate_status is null or candidate_status not in ('prepared_for_review', 'blocked') then
    raise exception 'publication_block_required' using errcode = '55000';
  end if;
  if candidate_status = 'prepared_for_review' then
    next_candidate_digest := p_candidate->>'candidateDigest';
    next_basis_digest := p_candidate->'assessment'->>'basisDigest';
    next_output_digest := p_candidate->'assessment'->>'outputDigest';
    next_delivery_digest := p_candidate->'delivery'->>'deliveryDigest';
    if p_candidate->>'version' is distinct from p_candidate_version or
       p_candidate->'assessment'->>'status' is distinct from 'needs_editorial_review' or
       p_candidate->'assessment'->>'publication' is distinct from 'blocked' or
       p_candidate->'delivery'->>'status' is distinct from 'prepared_for_review' or
       p_candidate->'delivery'->>'publication' is distinct from 'blocked' or
       p_candidate->'delivery'->>'basisDigest' is distinct from next_basis_digest or
       p_candidate->'delivery'->>'outputDigest' is distinct from next_output_digest or
       coalesce(next_candidate_digest,'') !~ '^[a-f0-9]{64}$' or
       coalesce(next_basis_digest,'') !~ '^[a-f0-9]{64}$' or
       coalesce(next_output_digest,'') !~ '^[a-f0-9]{64}$' or
       coalesce(next_delivery_digest,'') !~ '^[a-f0-9]{64}$' then
      raise exception 'invalid_candidate_digest' using errcode = '22023';
    end if;
  else
    next_reason := p_candidate->>'reason';
    if next_reason is null or next_reason !~ '^[a-z0-9_]{1,80}$' then
      raise exception 'invalid_candidate_reason' using errcode = '22023';
    end if;
  end if;
  insert into public.career_compass_candidates (
    run_id, revision, contract_version, calculation, candidate_version,
    status, candidate_digest, basis_digest, output_digest, delivery_digest,
    blocked_reason, candidate
  ) values (
    p_run_id, p_revision, p_contract_version, p_calculation, p_candidate_version,
    candidate_status, next_candidate_digest, next_basis_digest, next_output_digest,
    next_delivery_digest, next_reason, p_candidate
  ) on conflict (run_id, revision, candidate_version) do nothing;
  select * into existing from public.career_compass_candidates
    where run_id = p_run_id and revision = p_revision
      and candidate_version = p_candidate_version;
  if existing.calculation is distinct from p_calculation or
     existing.contract_version is distinct from p_contract_version or
     existing.candidate_version is distinct from p_candidate_version or
     existing.candidate is distinct from p_candidate then
    raise exception 'candidate_conflict' using errcode = '40001';
  end if;
  return jsonb_build_object('status', existing.status, 'runId', existing.run_id,
    'revision', existing.revision, 'candidateVersion', existing.candidate_version,
    'candidateDigest', existing.candidate_digest,
    'publication', 'blocked');
end $$;

-- Private review/recovery only. There is deliberately no authenticated-user
-- grant and no path from this row to the owner-facing READY reader.
create function public.read_career_compass_candidate(
  p_run_id uuid, p_revision integer, p_candidate_version text
)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('runId', c.run_id, 'revision', c.revision,
    'contractVersion', c.contract_version, 'calculation', c.calculation,
    'candidateVersion', c.candidate_version, 'status', c.status,
    'candidateDigest', c.candidate_digest, 'basisDigest', c.basis_digest,
    'outputDigest', c.output_digest, 'deliveryDigest', c.delivery_digest,
    'blockedReason', c.blocked_reason, 'candidate', c.candidate,
    'createdAt', c.created_at)
  from public.career_compass_candidates c
  join public.product_runs r on r.id = c.run_id
  where c.run_id = p_run_id and c.revision = p_revision
    and c.candidate_version = p_candidate_version
    and r.product_id = 'career-compass' and r.state = 'AWAITING_EDITORIAL'
    and r.revision = c.revision and r.contract_version = c.contract_version
    and r.calculation = c.calculation
$$;

revoke all on function public.select_next_career_compass_candidate(text),
  public.save_career_compass_candidate(uuid, integer, text, jsonb, text, jsonb),
  public.read_career_compass_candidate(uuid, integer, text)
  from public, anon, authenticated, service_role;
grant execute on function public.select_next_career_compass_candidate(text),
  public.save_career_compass_candidate(uuid, integer, text, jsonb, text, jsonb),
  public.read_career_compass_candidate(uuid, integer, text)
  to service_role;

commit;
