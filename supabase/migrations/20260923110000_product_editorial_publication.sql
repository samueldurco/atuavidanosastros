begin;
-- Review authority is deliberately NOT the processing service. No issuer RPC or
-- table grants are provided. Only a separately authenticated, evidence-backed
-- release operation may insert receipts; this migration inserts none.
create table public.product_editorial_policy (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default false
);
insert into public.product_editorial_policy(singleton) values(true);
create table public.product_editorial_receipts (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.product_runs(id) on delete cascade,
  revision integer not null check (revision > 0),
  calculation jsonb not null check (jsonb_typeof(calculation)='object' and octet_length(calculation::text)<=200000),
  editorial jsonb not null check (jsonb_typeof(editorial)='object' and octet_length(editorial::text)<=100000),
  promotion_id text not null references public.editorial_promotions(id),
  promotion_evidence_digest text not null check (promotion_evidence_digest ~ '^[a-f0-9]{64}$'),
  basis_digest text not null check (basis_digest ~ '^[a-f0-9]{64}$'),
  review_digest text not null check (review_digest ~ '^[a-f0-9]{64}$'),
  authority_reference text not null check (length(authority_reference) between 1 and 200),
  approved_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  check (expires_at>approved_at and expires_at<=approved_at+interval '24 hours'),
  check (editorial->>'promotionId' is not distinct from promotion_id),
  check (editorial->>'reviewDigest' is not distinct from review_digest),
  unique(run_id,revision)
);
create table public.product_editorial_work (
  receipt_id uuid primary key references public.product_editorial_receipts(id) on delete cascade,
  attempts integer not null default 0 check (attempts between 0 and 5),
  lease_token uuid,
  lease_until timestamptz,
  completed_token uuid,
  completed_revision integer,
  check ((lease_token is null)=(lease_until is null)),
  check ((completed_token is null)=(completed_revision is null))
);
-- Null is reserved for pre-existing delivery rows; the only service publisher
-- always attaches a receipt. Deleting a receipt cannot reopen a delivered run.
alter table public.product_runs add column editorial_receipt_id uuid
  references public.product_editorial_receipts(id);
alter table public.product_editorial_policy enable row level security;
alter table public.product_editorial_receipts enable row level security;
alter table public.product_editorial_work enable row level security;
revoke all on public.product_editorial_policy,public.product_editorial_receipts,public.product_editorial_work
  from public,anon,authenticated,service_role;

create function public.enqueue_product_editorial_receipt() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  insert into public.product_editorial_work(receipt_id) values(new.id);
  return new;
end $$;
revoke all on function public.enqueue_product_editorial_receipt() from public,anon,authenticated,service_role;
create trigger product_editorial_enqueue after insert on public.product_editorial_receipts
  for each row execute function public.enqueue_product_editorial_receipt();

create function public.claim_product_editorial(p_products text[])
returns jsonb language plpgsql security definer set search_path='' as $$
declare task record; next_token uuid; deadline timestamptz;
begin
  if p_products is null or cardinality(p_products) not between 1 and 25 then
    raise exception 'invalid_claim' using errcode='22023';
  end if;
  perform 1 from public.product_editorial_policy where singleton and enabled for share;
  if not found then return null; end if;
  select r.id,r.revision,a.id as receipt_id into task
    from public.product_runs r
    join public.product_editorial_receipts a on a.run_id=r.id and a.revision=r.revision
    join public.product_editorial_work w on w.receipt_id=a.id
    join public.workflow_releases d on d.product_id=r.product_id
    join public.editorial_promotions p on p.id=a.promotion_id
    where r.state='AWAITING_EDITORIAL' and r.product_id=any(p_products)
      and d.enabled and d.contract_version=r.contract_version
      and (d.engine_approved or (d.kind in ('tarot','dream') and r.calculation->>'status'='recorded'))
      and p.revoked_at is null and p.product_id=r.product_id and p.contract_version=r.contract_version
      and p.evidence_digest=a.promotion_evidence_digest and r.calculation=a.calculation
      and a.revoked_at is null and a.approved_at<=clock_timestamp() and a.expires_at>clock_timestamp()
      and w.completed_token is null and w.attempts<5
      and (w.lease_until is null or w.lease_until<=clock_timestamp())
    order by a.approved_at,a.id limit 1 for update of r,a,w skip locked;
  if not found then return null; end if;
  next_token:=gen_random_uuid(); deadline:=clock_timestamp()+interval '60 seconds';
  update public.product_editorial_work set attempts=attempts+1,lease_token=next_token,lease_until=deadline
    where receipt_id=task.receipt_id;
  -- No owner, raw input, draft, scores or provider response leave this RPC.
  return jsonb_build_object('runId',task.id,'revision',task.revision,'receiptId',task.receipt_id,
    'token',next_token,'leaseUntil',deadline);
end $$;

create function public.complete_product_editorial(p_id uuid,p_receipt uuid,p_token uuid,p_revision integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.product_runs; a public.product_editorial_receipts; w public.product_editorial_work;
  d public.workflow_releases; p public.editorial_promotions; next_revision integer;
begin
  perform 1 from public.product_editorial_policy where singleton and enabled for share;
  if not found then raise exception 'editorial_disabled' using errcode='55000'; end if;
  select * into r from public.product_runs where id=p_id for update;
  if not found then raise exception 'run_not_found' using errcode='42501'; end if;
  select * into a from public.product_editorial_receipts where id=p_receipt and run_id=r.id for update;
  if not found then raise exception 'review_receipt_required' using errcode='42501'; end if;
  select * into w from public.product_editorial_work where receipt_id=a.id for update;
  select * into d from public.workflow_releases where product_id=r.product_id for share;
  select * into p from public.editorial_promotions where id=a.promotion_id for share;
  if not d.enabled or d.contract_version<>r.contract_version or
     not (d.engine_approved or (d.kind in ('tarot','dream') and r.calculation->>'status'='recorded')) or
     p.revoked_at is not null or p.product_id<>r.product_id or p.contract_version<>r.contract_version or
     p.evidence_digest<>a.promotion_evidence_digest or a.revoked_at is not null or
     a.approved_at>clock_timestamp() or a.expires_at<=clock_timestamp() or r.calculation is distinct from a.calculation then
    raise exception 'release_evidence_required' using errcode='55000';
  end if;
  if p_revision is distinct from a.revision then raise exception 'stale_revision' using errcode='40001'; end if;
  if p_token is not null and w.completed_token=p_token and r.state='READY' and
     r.revision=w.completed_revision and r.editorial=a.editorial then
    return jsonb_build_object('state','READY','revision',w.completed_revision);
  end if;
  if w.lease_token is null or w.lease_token is distinct from p_token or w.lease_until<=clock_timestamp() then
    raise exception 'lease_lost' using errcode='40001';
  end if;
  if r.state<>'AWAITING_EDITORIAL' or r.revision<>p_revision then
    raise exception 'stale_revision' using errcode='40001';
  end if;
  -- Payload is exclusively the authority-owned snapshot, never service arguments.
  next_revision:=public.advance_product_run(r.id,r.user_id,p_revision,'READY',null,a.editorial);
  update public.product_runs set editorial_receipt_id=a.id where id=r.id;
  update public.product_editorial_work set completed_token=p_token,completed_revision=next_revision,
    lease_token=null,lease_until=null where receipt_id=a.id;
  return jsonb_build_object('state','READY','revision',next_revision);
end $$;
revoke all on function public.claim_product_editorial(text[]),public.complete_product_editorial(uuid,uuid,uuid,integer)
  from public,anon,authenticated,service_role;
grant execute on function public.claim_product_editorial(text[]),public.complete_product_editorial(uuid,uuid,uuid,integer)
  to service_role;

create function public.product_editorial_delivery_allowed(p_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.product_runs r where r.id=p_id and
    (r.editorial_receipt_id is null or exists(
      select 1 from public.product_editorial_receipts a
      join public.editorial_promotions p on p.id=a.promotion_id
      join public.product_editorial_work w on w.receipt_id=a.id
      where a.id=r.editorial_receipt_id and a.run_id=r.id and a.revision+1=r.revision
        and w.completed_revision=r.revision and w.completed_token is not null
        and a.revoked_at is null and a.calculation=r.calculation and a.editorial=r.editorial
        and p.evidence_digest=a.promotion_evidence_digest and p.revoked_at is null)))
$$;
revoke all on function public.product_editorial_delivery_allowed(uuid) from public,anon,authenticated,service_role;

-- Preserve projection and ACLs, adding receipt revocation to every delivery path.
create or replace function public.read_product_run(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare current_run public.product_runs; definition public.workflow_releases; released boolean; has_access boolean;
begin
  if auth.uid() is null then raise exception 'auth_required' using errcode='42501'; end if;
  select * into current_run from public.product_runs where id=p_id and user_id=auth.uid();
  if not found then return null; end if;
  select * into definition from public.workflow_releases where product_id=current_run.product_id;
  has_access := definition.access_policy='free' or exists (
    select 1 from public.entitlements where user_id=auth.uid() and product_id=current_run.product_id
      and state='ACTIVE' and (starts_at is null or starts_at<=now()) and (ends_at is null or ends_at>now())
  );
  released := coalesce(current_run.state='READY' and definition.enabled
    and current_run.contract_version=definition.contract_version
    and (definition.engine_approved or (definition.kind in ('tarot','dream') and current_run.calculation->>'status'='recorded'))
    and public.product_editorial_delivery_allowed(current_run.id)
    and exists (select 1 from public.editorial_promotions where id=current_run.editorial->>'promotionId'
      and product_id=current_run.product_id and contract_version=current_run.contract_version and revoked_at is null),false);
  return jsonb_build_object(
    'id',current_run.id,'productId',current_run.product_id,'state',current_run.state,
    'revision',current_run.revision,'parentId',current_run.parent_id,
    'createdAt',current_run.created_at,'updatedAt',current_run.updated_at,'released',released,
    'canReprocess',definition.enabled and has_access and current_run.state in ('READY','FAILED','CANCELLED','AWAITING_EDITORIAL'),
    'libraryItemId',(select id from public.library_items where user_id=auth.uid() and item_type='PRODUCT_RUN'
      and source_id=current_run.id::text and archived_at is null limit 1),
    'history',(select coalesce(jsonb_agg(jsonb_build_object('revision',revision,'state',state,'at',occurred_at) order by revision),'[]'::jsonb)
      from public.product_run_events where run_id=current_run.id and user_id=auth.uid()),
    'calculation',case when released then jsonb_build_object('version',current_run.calculation->'version',
      'facts',(select jsonb_agg(jsonb_build_object('id',fact->'id','kind',fact->'kind','display',fact->'display','source',fact->'source'))
        from jsonb_array_elements(current_run.calculation->'facts') fact),'limits',current_run.calculation->'limits') else null end,
    'cartography',case when released then public.product_cartography_projection(current_run.product_id,current_run.calculation) else null end,
    'editorial',case when released then jsonb_build_object('version',current_run.editorial->'version',
      'title',current_run.editorial->'title','promotionId',current_run.editorial->'promotionId','reviewDigest',current_run.editorial->'reviewDigest',
      'sections',(select jsonb_agg(jsonb_build_object('title',section->'title','text',section->'text','evidence',section->'evidence'))
        from jsonb_array_elements(current_run.editorial->'sections') section),'limits',current_run.editorial->'limits') else null end
  );
end $$;
create or replace function public.product_artifact_run_allowed(p_run_id uuid,p_owner uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists (select 1 from public.product_runs r join public.workflow_releases d on d.product_id=r.product_id
    where r.id=p_run_id and r.user_id=p_owner and r.state='READY' and d.enabled
      and r.contract_version=d.contract_version and public.product_editorial_delivery_allowed(r.id)
      and (d.engine_approved or (d.kind in ('tarot','dream') and r.calculation->>'status'='recorded'))
      and exists(select 1 from public.editorial_promotions p where p.id=r.editorial->>'promotionId'
        and p.product_id=r.product_id and p.contract_version=r.contract_version and p.revoked_at is null)
      and exists(select 1 from public.product_artifact_policy where enabled))
$$;
commit;
