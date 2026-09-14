begin;
-- Durable calculation work only. Editorial generation/publication is deliberately not a handler.
create table public.product_run_work (
  run_id uuid primary key references public.product_runs(id) on delete cascade,
  attempts integer not null default 0 check (attempts between 0 and 5),
  lease_token uuid,
  lease_until timestamptz,
  available_at timestamptz not null default now(),
  last_error text check (last_error in ('transient_failure','deadline_exceeded','input_invalid','calculation_invalid','attempts_exhausted')),
  receipts jsonb not null default '{}'::jsonb,
  check ((lease_token is null) = (lease_until is null))
);
alter table public.product_run_work enable row level security;
revoke all on public.product_run_work from public,anon,authenticated,service_role;
create index product_run_work_available on public.product_run_work(available_at,run_id);

create function public.enqueue_product_run_work() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  insert into public.product_run_work(run_id) values(new.id);
  return new;
end $$;
revoke all on function public.enqueue_product_run_work() from public,anon,authenticated,service_role;
create trigger product_run_enqueue after insert on public.product_runs
  for each row execute function public.enqueue_product_run_work();
insert into public.product_run_work(run_id)
  select id from public.product_runs where state in ('QUEUED','CALCULATED');

create function public.claim_product_run_work(p_products text[],p_lease_seconds integer default 60)
returns jsonb language plpgsql security definer set search_path='' as $$
declare task record; next_token uuid; deadline timestamptz;
begin
  if p_products is null or cardinality(p_products) not between 1 and 25 or
     p_lease_seconds is null or p_lease_seconds not between 30 and 120 then
    raise exception 'invalid_claim' using errcode='22023';
  end if;
  select r.*,w.attempts into task from public.product_runs r
    join public.product_run_work w on w.run_id=r.id
    join public.workflow_releases d on d.product_id=r.product_id
    where r.product_id=any(p_products) and r.state in ('QUEUED','CALCULATED')
      and d.enabled and d.contract_version=r.contract_version
      and w.available_at<=clock_timestamp() and (w.lease_until is null or w.lease_until<=clock_timestamp())
    order by w.available_at,r.created_at,r.id limit 1 for update of r,w skip locked;
  if not found then return null; end if;
  if task.attempts>=5 then
    perform public.advance_product_run(task.id,task.user_id,task.revision,'FAILED',null,null,'attempts_exhausted');
    update public.product_run_work set lease_token=null,lease_until=null,last_error='attempts_exhausted' where run_id=task.id;
    return jsonb_build_object('status','exhausted','runId',task.id);
  end if;
  next_token:=gen_random_uuid(); deadline:=clock_timestamp()+make_interval(secs=>p_lease_seconds);
  update public.product_run_work set attempts=attempts+1,lease_token=next_token,lease_until=deadline where run_id=task.id;
  return jsonb_build_object('status','claimed','runId',task.id,'productId',task.product_id,
    'revision',task.revision,'state',task.state,'input',task.input,'calculation',task.calculation,
    'token',next_token,'leaseUntil',deadline,'attempt',task.attempts+1);
end $$;

create function public.complete_product_run_work(p_id uuid,p_token uuid,p_revision integer,p_calculation jsonb default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.product_runs; w public.product_run_work; d public.workflow_releases; next_state text; next_revision integer; receipt jsonb;
begin
  select * into r from public.product_runs where id=p_id for update;
  if not found then raise exception 'run_not_found' using errcode='42501'; end if;
  select * into w from public.product_run_work where run_id=p_id for update;
  if p_token is not null and w.receipts ? p_token::text then return w.receipts->p_token::text; end if;
  if w.lease_token is null or w.lease_token is distinct from p_token or w.lease_until<=clock_timestamp() then
    raise exception 'lease_lost' using errcode='40001';
  end if;
  select * into d from public.workflow_releases where product_id=r.product_id;
  if not d.enabled or d.contract_version<>r.contract_version then raise exception 'workflow_unreleased' using errcode='55000'; end if;
  if r.state='QUEUED' and p_calculation is not null then next_state:='CALCULATED';
  elsif r.state='CALCULATED' and p_calculation is null then next_state:='AWAITING_EDITORIAL';
  else raise exception 'invalid_transition' using errcode='55000'; end if;
  next_revision:=public.advance_product_run(r.id,r.user_id,p_revision,next_state,p_calculation);
  receipt:=jsonb_build_object('state',next_state,'revision',next_revision);
  update public.product_run_work set lease_token=null,lease_until=null,available_at=clock_timestamp(),last_error=null,
    receipts=receipts||jsonb_build_object(p_token::text,receipt) where run_id=p_id;
  return receipt;
end $$;

create function public.fail_product_run_work(p_id uuid,p_token uuid,p_error_code text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.product_runs; w public.product_run_work; next_revision integer; receipt jsonb;
begin
  if p_error_code is null or p_error_code not in ('transient_failure','deadline_exceeded','input_invalid','calculation_invalid') then
    raise exception 'safe_error_required' using errcode='22023';
  end if;
  select * into r from public.product_runs where id=p_id for update;
  if not found then raise exception 'run_not_found' using errcode='42501'; end if;
  select * into w from public.product_run_work where run_id=p_id for update;
  if p_token is not null and w.receipts ? p_token::text then return w.receipts->p_token::text; end if;
  if w.lease_token is null or w.lease_token is distinct from p_token or w.lease_until<=clock_timestamp() then
    raise exception 'lease_lost' using errcode='40001';
  end if;
  if r.state not in ('QUEUED','CALCULATED') then raise exception 'invalid_transition' using errcode='55000'; end if;
  if w.attempts>=5 or p_error_code in ('input_invalid','calculation_invalid') then
    next_revision:=public.advance_product_run(r.id,r.user_id,r.revision,'FAILED',null,null,
      case when w.attempts>=5 then 'attempts_exhausted' else p_error_code end);
    receipt:=jsonb_build_object('state','FAILED','revision',next_revision);
  else receipt:=jsonb_build_object('state',r.state,'revision',r.revision); end if;
  update public.product_run_work set lease_token=null,lease_until=null,
    available_at=clock_timestamp()+make_interval(secs=>least(300,5*power(2,w.attempts-1))::integer),
    last_error=case when w.attempts>=5 then 'attempts_exhausted' else p_error_code end,
    receipts=receipts||jsonb_build_object(p_token::text,receipt) where run_id=p_id;
  return receipt;
end $$;

-- The old service writer would bypass lease fencing. Only the bounded calculation RPCs can call it now.
revoke execute on function public.advance_product_run(uuid,uuid,integer,text,jsonb,jsonb,text) from service_role;
revoke all on function public.claim_product_run_work(text[],integer),public.complete_product_run_work(uuid,uuid,integer,jsonb),
  public.fail_product_run_work(uuid,uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.claim_product_run_work(text[],integer),public.complete_product_run_work(uuid,uuid,integer,jsonb),
  public.fail_product_run_work(uuid,uuid,text) to service_role;
commit;
