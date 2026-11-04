-- Private launch preparation is not an approved reading, entitlement or commercial release.
create table public.atv_launch_preparations (
  id uuid primary key check (id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'),
  owner_id uuid not null references auth.users(id) on delete cascade,
  request_key uuid not null,
  product_id text not null check (product_id in (
    'wedding-date-map','ex-tarot','love-restart-map','sexuality-map','intimacy-map',
    'emotional-reactions-map','financial-blocks-tarot','hidden-talent-map','ascendant-style',
    'conversation-timing','cohabitation-map'
  )),
  input jsonb not null,
  input_digest text not null check (input_digest ~ '^[0-9a-f]{64}$'),
  evidence jsonb not null,
  status text not null default 'AWAITING_CALCULATION'
    check (status in ('AWAITING_CALCULATION','FACTS_READY_AWAITING_REVIEW')),
  created_at timestamptz not null default now(),
  unique (owner_id,request_key),
  constraint launch_input_envelope check (coalesce(
    jsonb_typeof(input)='object'
    and input->>'version'='atv-launch-input/1'
    and input->>'productId'=product_id
    and jsonb_typeof(input->'answers')='object'
    and jsonb_typeof(input->'consent')='object'
    and input->'consent'->'storage'='true'::jsonb
    and input->'consent'->>'policyVersion'='atv-launch-consent/1',false)),
  constraint launch_adult_confirmation check (product_id not in ('sexuality-map','intimacy-map')
    or coalesce(input->'answers'->'adult'='true'::jsonb,false)),
  constraint launch_evidence_envelope check (coalesce(
    jsonb_typeof(evidence)='object'
    and evidence->>'executionId'=id::text
    and evidence->>'productId'=product_id
    and evidence->>'inputDigest'=input_digest
    and evidence->>'state'=status
    and jsonb_typeof(evidence->'facts')='array'
    and (
      (status='AWAITING_CALCULATION' and evidence->>'version'='atv-launch-evidence/1')
      or (status='FACTS_READY_AWAITING_REVIEW'
        and evidence->>'version'='atv-launch-calculation/1'
        and jsonb_typeof(evidence->'data')='object')
    ),false)),
  constraint launch_payload_bound check (
    octet_length(input::text)<=65536 and octet_length(evidence::text)<=2000000
  )
);

alter table public.atv_launch_preparations enable row level security;
create policy launch_preparations_owner_read on public.atv_launch_preparations
  for select to authenticated
  using (owner_id=(select auth.uid()) and (select public.has_atv_trial_access()));
-- Explicitly remove platform default grants; clients can only read their currently authorized rows.
revoke all on public.atv_launch_preparations from public,anon,authenticated,service_role;
grant select on public.atv_launch_preparations to authenticated;
grant select,insert,update on public.atv_launch_preparations to service_role;
create index launch_preparations_owner_created on public.atv_launch_preparations(owner_id,created_at desc);

-- Invoker trigger: service_role already has the necessary private-grant access.
-- Input and calculation are append-once evidence; a retry cannot replace the persisted first result.
create function public.guard_atv_launch_preparation() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if not exists (
    select 1 from public.atv_trial_grants g where g.owner_id=new.owner_id
      and g.revoked_at is null and (g.expires_at is null or g.expires_at>now())
  ) then
    raise exception 'trial_access_revoked' using errcode='42501';
  end if;
  if tg_op='INSERT' then
    if new.status<>'AWAITING_CALCULATION' then
      raise exception 'launch_preparation_must_start_awaiting' using errcode='23514';
    end if;
  else
    if row(new.id,new.owner_id,new.request_key,new.product_id,new.input,new.input_digest,new.created_at)
      is distinct from row(old.id,old.owner_id,old.request_key,old.product_id,old.input,old.input_digest,old.created_at) then
      raise exception 'launch_preparation_input_immutable' using errcode='23514';
    end if;
    if old.status<>'AWAITING_CALCULATION' or new.status<>'FACTS_READY_AWAITING_REVIEW' then
      raise exception 'launch_preparation_transition_invalid' using errcode='23514';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.guard_atv_launch_preparation() from public,anon,authenticated;
create trigger launch_preparation_guard before insert or update on public.atv_launch_preparations
  for each row execute function public.guard_atv_launch_preparation();
