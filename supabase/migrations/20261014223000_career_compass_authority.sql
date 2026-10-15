begin;

-- Local E3 authority boundary. NOLOGIN has no member or credential in this
-- migration. The processing service and readers cannot issue a receipt.
do $$ begin
  if exists (select 1 from pg_catalog.pg_roles where rolname = 'atv_career_editorial_authority') then
    raise exception 'career_authority_role_conflict' using errcode = '55000';
  end if;
  create role atv_career_editorial_authority nologin noinherit;
end $$;
grant usage on schema public to atv_career_editorial_authority;

create table public.career_compass_receipt_evidence (
  receipt_id uuid primary key references public.product_editorial_receipts(id) on delete cascade,
  candidate_version text not null,
  candidate_digest text not null check (candidate_digest ~ '^[a-f0-9]{64}$'),
  output_digest text not null check (output_digest ~ '^[a-f0-9]{64}$'),
  delivery_digest text not null check (delivery_digest ~ '^[a-f0-9]{64}$'),
  review_digest text not null check (review_digest ~ '^[a-f0-9]{64}$'),
  promotion_evidence_digest text not null check (promotion_evidence_digest ~ '^[a-f0-9]{64}$'),
  recorded_at timestamptz not null default now()
);
alter table public.career_compass_receipt_evidence enable row level security;
revoke all on public.career_compass_receipt_evidence
  from public, anon, authenticated, service_role, atv_career_editorial_authority;

-- The caller must first independently rebuild the persisted candidate, verify
-- both editorial reviews and promotion provenance. SQL then fences the exact
-- immutable revision, private candidate and currently approved release.
create function public.issue_career_compass_editorial_receipt(
  p_run_id uuid, p_revision integer, p_candidate_version text,
  p_candidate_digest text, p_basis_digest text, p_output_digest text,
  p_delivery_digest text, p_review_digest text,
  p_promotion_id text, p_promotion_evidence_digest text,
  p_authority_reference text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  r public.product_runs;
  c public.career_compass_candidates;
  d public.workflow_releases;
  p public.editorial_promotions;
  prior public.product_editorial_receipts;
  editorial jsonb;
  receipt_id uuid;
begin
  if p_revision is null or p_revision < 1 or
     coalesce(p_candidate_version,'') !~ '^atv-career-compass-candidate/[0-9]+\.[0-9]+\.[0-9]+$' or
     coalesce(p_candidate_digest,'') !~ '^[a-f0-9]{64}$' or
     coalesce(p_basis_digest,'') !~ '^[a-f0-9]{64}$' or
     coalesce(p_output_digest,'') !~ '^[a-f0-9]{64}$' or
     coalesce(p_delivery_digest,'') !~ '^[a-f0-9]{64}$' or
     coalesce(p_review_digest,'') !~ '^[a-f0-9]{64}$' or
     coalesce(p_promotion_evidence_digest,'') !~ '^[a-f0-9]{64}$' or
     p_promotion_id is null or length(p_promotion_id) not between 1 and 200 or
     p_authority_reference is null or length(p_authority_reference) not between 1 and 200 then
    raise exception 'invalid_issuance_evidence' using errcode = '22023';
  end if;
  select * into r from public.product_runs where id = p_run_id for update;
  if not found or r.product_id <> 'career-compass' or
     r.state <> 'AWAITING_EDITORIAL' or r.revision <> p_revision or
     r.calculation is null then
    raise exception 'stale_run_basis' using errcode = '40001';
  end if;
  select * into c from public.career_compass_candidates
    where run_id = r.id and revision = r.revision
      and candidate_version = p_candidate_version for share;
  if not found or c.status <> 'prepared_for_review' or
     c.contract_version is distinct from r.contract_version or
     c.calculation is distinct from r.calculation or
     c.candidate_digest is distinct from p_candidate_digest or
     c.basis_digest is distinct from p_basis_digest or
     c.output_digest is distinct from p_output_digest or
     c.delivery_digest is distinct from p_delivery_digest or
     c.candidate->>'publication' is distinct from 'blocked' or
     c.candidate->'assessment'->>'status' is distinct from 'needs_editorial_review' or
     c.candidate->'assessment'->>'basisDigest' is distinct from p_basis_digest or
     c.candidate->'assessment'->>'outputDigest' is distinct from p_output_digest or
     c.candidate->'delivery'->>'status' is distinct from 'prepared_for_review' or
     c.candidate->'delivery'->>'publication' is distinct from 'blocked' or
     c.candidate->'delivery'->>'basisDigest' is distinct from p_basis_digest or
     c.candidate->'delivery'->>'outputDigest' is distinct from p_output_digest or
     c.candidate->'delivery'->>'deliveryDigest' is distinct from p_delivery_digest or
     jsonb_typeof(c.candidate->'delivery'->'content') is distinct from 'object' then
    raise exception 'candidate_evidence_mismatch' using errcode = '55000';
  end if;
  select * into d from public.workflow_releases
    where product_id = 'career-compass' for share;
  if not found or not d.enabled or not d.engine_approved or
     d.contract_version is distinct from r.contract_version then
    raise exception 'release_evidence_required' using errcode = '55000';
  end if;
  select * into p from public.editorial_promotions
    where id = p_promotion_id for share;
  if not found or p.revoked_at is not null or
     p.product_id <> 'career-compass' or
     p.contract_version is distinct from r.contract_version or
     p.evidence_digest is distinct from p_promotion_evidence_digest then
    raise exception 'promotion_evidence_required' using errcode = '55000';
  end if;
  editorial := c.candidate->'delivery'->'content' ||
    jsonb_build_object('promotionId', p_promotion_id, 'reviewDigest', p_review_digest);
  select * into prior from public.product_editorial_receipts
    where run_id = r.id and revision = r.revision for update;
  if found then
    if prior.revoked_at is not null or prior.expires_at <= clock_timestamp() or
       prior.calculation is distinct from r.calculation or
       prior.editorial is distinct from editorial or
       prior.promotion_id is distinct from p_promotion_id or
       prior.promotion_evidence_digest is distinct from p_promotion_evidence_digest or
       prior.basis_digest is distinct from p_basis_digest or
       prior.review_digest is distinct from p_review_digest or
       prior.authority_reference is distinct from p_authority_reference or
       not exists (select 1 from public.career_compass_receipt_evidence e
         where e.receipt_id = prior.id and e.candidate_version = p_candidate_version
           and e.candidate_digest = p_candidate_digest and e.output_digest = p_output_digest
           and e.delivery_digest = p_delivery_digest and e.review_digest = p_review_digest
           and e.promotion_evidence_digest = p_promotion_evidence_digest) then
      raise exception 'receipt_conflict' using errcode = '40001';
    end if;
    return jsonb_build_object('receiptId', prior.id, 'runId', r.id,
      'revision', r.revision, 'status', 'private_receipt_issued');
  end if;
  insert into public.product_editorial_receipts (
    run_id, revision, calculation, editorial, promotion_id,
    promotion_evidence_digest, basis_digest, review_digest,
    authority_reference, expires_at
  ) values (
    r.id, r.revision, r.calculation, editorial, p_promotion_id,
    p_promotion_evidence_digest, p_basis_digest, p_review_digest,
    p_authority_reference, clock_timestamp() + interval '1 hour'
  ) returning id into receipt_id;
  insert into public.career_compass_receipt_evidence (
    receipt_id, candidate_version, candidate_digest, output_digest,
    delivery_digest, review_digest, promotion_evidence_digest
  ) values (
    receipt_id, p_candidate_version, p_candidate_digest, p_output_digest,
    p_delivery_digest, p_review_digest, p_promotion_evidence_digest
  );
  return jsonb_build_object('receiptId', receipt_id, 'runId', r.id,
    'revision', r.revision, 'status', 'private_receipt_issued');
end $$;

revoke all on function public.issue_career_compass_editorial_receipt(
  uuid, integer, text, text, text, text, text, text, text, text, text
) from public, anon, authenticated, service_role;
grant execute on function public.issue_career_compass_editorial_receipt(
  uuid, integer, text, text, text, text, text, text, text, text, text
) to atv_career_editorial_authority;

commit;
