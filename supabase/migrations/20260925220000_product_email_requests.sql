begin;

-- Acceptance only. This policy is never authorization to dispatch email.
create table public.product_email_policy (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default false
);
insert into public.product_email_policy default values;
create table public.product_email_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  run_id uuid not null,
  request_key uuid not null,
  revision integer not null check (revision between 1 and 8),
  review_digest text not null check (review_digest ~ '^[a-f0-9]{64}$'),
  command jsonb not null check (octet_length(command::text) <= 2048),
  state text not null default 'REQUESTED' check (state in ('REQUESTED','CANCELLED')),
  created_at timestamptz not null default now(),
  cancelled_at timestamptz,
  foreign key (run_id,user_id) references public.product_runs(id,user_id) on delete cascade,
  unique(user_id,request_key),
  unique(run_id,revision),
  check ((state='REQUESTED' and cancelled_at is null) or (state='CANCELLED' and cancelled_at is not null))
);
create index product_email_owner_time on public.product_email_requests(user_id,created_at);
alter table public.product_email_policy enable row level security;
alter table public.product_email_requests enable row level security;
revoke all on public.product_email_policy,public.product_email_requests from public,anon,authenticated,service_role;

create function public.product_email_projection(p_row public.product_email_requests)
returns jsonb language sql stable set search_path='' as $$
  select jsonb_build_object('id',p_row.id,'runId',p_row.run_id,'revision',p_row.revision,
    'reviewDigest',p_row.review_digest,'state',p_row.state,'createdAt',p_row.created_at,'cancelledAt',p_row.cancelled_at)
$$;
revoke all on function public.product_email_projection(public.product_email_requests) from public,anon,authenticated,service_role;

create function public.request_product_email(p_request_key uuid,p_command jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_owner uuid := auth.uid();
  v_run public.product_runs;
  v_saved public.product_email_requests;
  v_projection jsonb;
  v_run_id uuid;
begin
  if v_owner is null then raise exception 'auth_required'; end if;
  if p_request_key is null or p_command is null or jsonb_typeof(p_command)<>'object'
    or octet_length(p_command::text)>2048 then raise exception 'invalid_input'; end if;
  if (select count(*) from jsonb_object_keys(p_command))<>5
    or exists(select 1 from jsonb_object_keys(p_command) k where k not in ('version','runId','expectedRevision','reviewDigest','consent'))
    or p_command->>'version' is distinct from 'atv-email-request/1'
    or jsonb_typeof(p_command->'runId') is distinct from 'string'
    or coalesce(p_command->>'runId','') !~* '^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$'
    or jsonb_typeof(p_command->'expectedRevision') is distinct from 'number'
    or coalesce(p_command->>'expectedRevision','') !~ '^[1-8]$'
    or jsonb_typeof(p_command->'reviewDigest') is distinct from 'string'
    or coalesce(p_command->>'reviewDigest','') !~ '^[a-f0-9]{64}$'
    or p_command->'consent' is distinct from '{"transactional":true,"policyVersion":"atv-email-delivery/1","recipient":"account-owner"}'::jsonb
    then raise exception 'invalid_input'; end if;
  v_run_id := (p_command->>'runId')::uuid;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('email:'||v_owner::text,0));
  perform 1 from public.profiles where id=v_owner and deleted_at is null for share;
  if not found then raise exception 'profile_unavailable'; end if;
  select * into v_saved from public.product_email_requests where user_id=v_owner and request_key=p_request_key;
  if found then
    if v_saved.command is distinct from p_command then raise exception 'idempotency_conflict'; end if;
    return public.product_email_projection(v_saved);
  end if;
  select * into v_run from public.product_runs where id=v_run_id and user_id=v_owner for share;
  if not found then raise exception 'email_unavailable'; end if;
  perform 1 from public.product_email_policy where singleton for share;
  perform 1 from public.workflow_releases where product_id=v_run.product_id for share;
  perform 1 from public.editorial_promotions where id=v_run.editorial->>'promotionId' for share;
  if not exists(select 1 from public.product_email_policy where enabled) then raise exception 'email_disabled'; end if;
  v_projection := public.read_product_run(v_run_id);
  if v_projection->>'released' is distinct from 'true'
    or v_projection->>'libraryItemId' is null
    or v_run.revision is distinct from (p_command->>'expectedRevision')::integer
    or v_run.editorial->>'reviewDigest' is distinct from p_command->>'reviewDigest'
    then raise exception 'email_unavailable'; end if;
  if exists(select 1 from public.product_email_requests where run_id=v_run_id and revision=v_run.revision)
    then raise exception 'email_already_requested'; end if;
  if (select count(*) from public.product_email_requests where user_id=v_owner)>=100
    or (select count(*) from public.product_email_requests where user_id=v_owner and created_at>now()-interval '24 hours')>=20
    then raise exception 'request_limit'; end if;
  insert into public.product_email_requests(user_id,run_id,request_key,revision,review_digest,command)
    values(v_owner,v_run_id,p_request_key,v_run.revision,p_command->>'reviewDigest',p_command) returning * into v_saved;
  return public.product_email_projection(v_saved);
end $$;

create function public.read_product_email_request(p_request_key uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_saved public.product_email_requests;
begin
  if auth.uid() is null then raise exception 'auth_required'; end if;
  select * into v_saved from public.product_email_requests where user_id=auth.uid() and request_key=p_request_key;
  if not found then return null; end if;
  return public.product_email_projection(v_saved);
end $$;

create function public.cancel_product_email_request(p_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_saved public.product_email_requests;
begin
  if auth.uid() is null then raise exception 'auth_required'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('email:'||auth.uid()::text,0));
  update public.product_email_requests set state='CANCELLED',cancelled_at=coalesce(cancelled_at,now())
    where user_id=auth.uid() and id=p_id returning * into v_saved;
  if not found then return null; end if;
  return public.product_email_projection(v_saved);
end $$;
revoke all on function public.request_product_email(uuid,jsonb),public.read_product_email_request(uuid),public.cancel_product_email_request(uuid)
  from public,anon,authenticated,service_role;
grant execute on function public.request_product_email(uuid,jsonb),public.read_product_email_request(uuid),public.cancel_product_email_request(uuid) to authenticated;
commit;
