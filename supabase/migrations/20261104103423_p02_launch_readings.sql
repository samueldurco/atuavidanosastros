-- Append-once private test deliverable. Does not authorize commerce or hosted release.
create table public.atv_launch_readings (
  preparation_id uuid primary key references public.atv_launch_preparations(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null,
  input_digest text not null check (input_digest ~ '^[0-9a-f]{64}$'),
  calculation_digest text not null check (calculation_digest ~ '^[0-9a-f]{64}$'),
  reading_digest text not null check (reading_digest ~ '^[0-9a-f]{64}$'),
  reading jsonb not null,
  review jsonb not null,
  created_at timestamptz not null default now(),
  constraint launch_reading_envelope check (coalesce(
    jsonb_typeof(reading)='object'
    and reading->>'version'='atv-launch-reading/1'
    and reading->>'executionId'=preparation_id::text
    and reading->>'productId'=product_id
    and reading->>'inputDigest'=input_digest
    and case when jsonb_typeof(reading->'sections')='array'
      then jsonb_array_length(reading->'sections')>0 else false end,false)),
  constraint launch_review_envelope check (coalesce(
    jsonb_typeof(review)='object'
    and review->>'version'='atv-launch-reading-review/1'
    and review->>'status'='APPROVED_FOR_PRIVATE_TEST'
    and review->>'policyVersion'='atv-launch-private-editorial-policy/1'
    and jsonb_typeof(review->'checks')='array'
    and jsonb_typeof(review->'reasons')='array'
    and review->>'digest'=reading_digest
    and review->'provenance'->>'scope'='private-editorial-consistency'
    and review->'provenance'->'commercialPrecisionApproved'='false'::jsonb
    and review->'provenance'->'commercialReleaseApproved'='false'::jsonb,false)),
  constraint launch_reading_payload_bound check (
    octet_length(reading::text)<=2000000 and octet_length(review::text)<=262144
  )
);

alter table public.atv_launch_readings enable row level security;
create policy launch_readings_owner_read on public.atv_launch_readings
  for select to authenticated
  using (owner_id=(select auth.uid()) and (select public.has_atv_trial_access()));
revoke all on public.atv_launch_readings from public,anon,authenticated,service_role;
grant select on public.atv_launch_readings to authenticated;
grant select,insert on public.atv_launch_readings to service_role;
create index launch_readings_owner_created on public.atv_launch_readings(owner_id,created_at desc);

-- The API computes canonical digests and re-runs review before insert. PostgreSQL
-- checks identity and immutable source state; JSONB::text is not JS canonical JSON.
create function public.guard_atv_launch_reading() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if tg_op<>'INSERT' then
    raise exception 'launch_reading_immutable' using errcode='23514';
  end if;
  if not exists (
    select 1 from public.atv_trial_grants g where g.owner_id=new.owner_id
      and g.revoked_at is null and (g.expires_at is null or g.expires_at>now())
  ) then
    raise exception 'trial_access_revoked' using errcode='42501';
  end if;
  if not exists (
    select 1 from public.atv_launch_preparations p
    where p.id=new.preparation_id and p.owner_id=new.owner_id
      and p.product_id=new.product_id and p.input_digest=new.input_digest
      and p.status='FACTS_READY_AWAITING_REVIEW'
  ) then
    raise exception 'launch_reading_preparation_mismatch' using errcode='23514';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_atv_launch_reading() from public,anon,authenticated;
create trigger launch_reading_guard before insert or update on public.atv_launch_readings
  for each row execute function public.guard_atv_launch_reading();
