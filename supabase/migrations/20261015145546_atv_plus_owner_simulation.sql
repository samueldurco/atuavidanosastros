-- Private evaluation only: no purchases, billing, public grants or release changes.
alter table public.atv_trial_grants add column owner_evaluation boolean not null default false;

-- Preserve historical IDs; the new rolling career forecast is an additive product.
alter table public.atv_trial_readings drop constraint atv_trial_readings_product_id_check;
alter table public.atv_trial_readings add constraint atv_trial_readings_product_id_check check(product_id in
 ('birth-chart','three-pillars','ascendant','life-atlas','horoscope','date-reading','week-reading','personal-calendar','solar-return',
  'pair-preview','synastry','couple-dossier','daily-card','tarot-focus','tarot-yes-no','three-questions','tarot-journey',
  'midheaven','career-compass','purpose-career','direction-journey','dream-journal','dream-reading','dream-dossier','dream-atlas',
  'tarot-single-card','tarot-situation-challenge-advice','tarot-peladan-cross','tarot-celtic-cross','tarot-aphrodite-temple','tarot-astrological-mandala','career-forecast-30d'));

create schema if not exists atv_private;
revoke all on schema atv_private from public, anon;
grant usage on schema atv_private to authenticated, service_role;

-- Privileged functions live outside the exposed API schema. Public RPCs are invokers.
create function atv_private.owner_evaluation_access() returns boolean
language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.atv_trial_grants g
  where g.owner_id = (select auth.uid()) and g.owner_evaluation
  and g.revoked_at is null and (g.expires_at is null or g.expires_at > now()));
$$;
revoke all on function atv_private.owner_evaluation_access() from public, anon;
grant execute on function atv_private.owner_evaluation_access() to authenticated, service_role;
create function public.has_atv_owner_evaluation_access() returns boolean
language sql stable security invoker set search_path = '' as $$
 select atv_private.owner_evaluation_access();
$$;
revoke all on function public.has_atv_owner_evaluation_access() from public, anon;
grant execute on function public.has_atv_owner_evaluation_access() to authenticated, service_role;

create table public.atv_plus_test_cycles (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 plan_id text not null check (plan_id in ('essencial','ampliado','premium')),
 request_key uuid not null,
 started_at timestamptz not null default now(),
 ends_at timestamptz not null default (now() + interval '30 days'),
 cancelled_at timestamptz,
 unique(owner_id,id), unique(owner_id,request_key),
 check (ends_at = started_at + interval '30 days')
);
create index atv_plus_test_cycles_owner_created on public.atv_plus_test_cycles(owner_id,started_at desc);
alter table public.atv_plus_test_cycles enable row level security;
revoke all on public.atv_plus_test_cycles from public, anon, authenticated, service_role;
grant select on public.atv_plus_test_cycles to authenticated;
create policy atv_plus_cycle_owner_read on public.atv_plus_test_cycles for select to authenticated
 using(owner_id = (select auth.uid()) and (select public.has_atv_owner_evaluation_access()));

alter table public.atv_trial_readings add column atv_plus_cycle_id uuid;
alter table public.atv_trial_readings add constraint atv_trial_reading_cycle_owner_fk
 foreign key(owner_id,atv_plus_cycle_id) references public.atv_plus_test_cycles(owner_id,id);
create index atv_trial_readings_cycle on public.atv_trial_readings(owner_id,atv_plus_cycle_id)
 where atv_plus_cycle_id is not null;

-- Consumption survives deletion/archival of a reading; deleting personal data cannot refill a cycle.
create table public.atv_plus_test_uses (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null,
 cycle_id uuid not null,
 product_id text not null,
 reading_id uuid unique references public.atv_trial_readings(id) on delete set null,
 created_at timestamptz not null default now(),
 foreign key(owner_id,cycle_id) references public.atv_plus_test_cycles(owner_id,id) on delete cascade,
 check(product_id in ('personal-calendar','career-forecast-30d','tarot-situation-challenge-advice','dream-reading','tarot-peladan-cross','tarot-aphrodite-temple'))
);
create index atv_plus_test_uses_cycle on public.atv_plus_test_uses(owner_id,cycle_id);
alter table public.atv_plus_test_uses enable row level security;
revoke all on public.atv_plus_test_uses from public, anon, authenticated, service_role;
grant select on public.atv_plus_test_uses to authenticated;
create policy atv_plus_use_owner_read on public.atv_plus_test_uses for select to authenticated
 using(owner_id = (select auth.uid()) and (select public.has_atv_owner_evaluation_access()));

create function atv_private.plus_selection_allowed(p_plan text,p_products text[]) returns boolean
language sql immutable security invoker set search_path = '' as $$
 select coalesce(p_plan in ('essencial','ampliado','premium')
  and count(*) filter(where id in ('personal-calendar','career-forecast-30d')) <= 1
  and count(*) filter(where id is null or id not in ('personal-calendar','career-forecast-30d','tarot-situation-challenge-advice','dream-reading','tarot-peladan-cross','tarot-aphrodite-temple')) = 0
  and case p_plan
   when 'essencial' then count(*) filter(where id not in ('personal-calendar','career-forecast-30d')) = 0
   when 'ampliado' then count(*) filter(where id in ('tarot-situation-challenge-advice','dream-reading')) <= 1
    and count(*) filter(where id in ('tarot-peladan-cross','tarot-aphrodite-temple')) = 0
   when 'premium' then (
    count(*) filter(where id in ('tarot-situation-challenge-advice','dream-reading')) <= 2
    and count(*) filter(where id in ('tarot-peladan-cross','tarot-aphrodite-temple')) = 0
   ) or (
    count(*) filter(where id in ('tarot-situation-challenge-advice','dream-reading')) = 0
    and count(*) filter(where id in ('tarot-peladan-cross','tarot-aphrodite-temple')) <= 1
   ) else false end,false)
 from unnest(p_products) as id;
$$;
revoke all on function atv_private.plus_selection_allowed(text,text[]) from public, anon, authenticated, service_role;

create function atv_private.start_plus_test_cycle(p_plan text,p_request_key uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_owner uuid := auth.uid(); v_existing public.atv_plus_test_cycles; v_id uuid;
begin
 if v_owner is null or not atv_private.owner_evaluation_access() then
  raise exception 'owner_evaluation_required' using errcode = '42501';
 end if;
 if p_plan is null or p_plan not in ('essencial','ampliado','premium') or p_request_key is null then
  raise exception 'invalid_plus_plan' using errcode = '22023';
 end if;
 -- Serialize cycle replacement and grant revocation with reading consumption.
 perform 1 from public.atv_trial_grants where owner_id=v_owner and owner_evaluation
  and revoked_at is null and (expires_at is null or expires_at>now()) for update;
 if not found then raise exception 'owner_evaluation_required' using errcode='42501'; end if;
 select * into v_existing from public.atv_plus_test_cycles where owner_id=v_owner and request_key=p_request_key;
 if found then
  if v_existing.plan_id<>p_plan then raise exception 'request_key_reused' using errcode='22023'; end if;
  return v_existing.id;
 end if;
 update public.atv_plus_test_cycles set cancelled_at=now()
  where owner_id=v_owner and cancelled_at is null and ends_at>now();
 insert into public.atv_plus_test_cycles(owner_id,plan_id,request_key) values(v_owner,p_plan,p_request_key) returning id into v_id;
 return v_id;
end;
$$;
revoke all on function atv_private.start_plus_test_cycle(text,uuid) from public, anon;
grant execute on function atv_private.start_plus_test_cycle(text,uuid) to authenticated;
create function public.start_atv_plus_test_cycle(p_plan text,p_request_key uuid) returns uuid
language sql security invoker set search_path = '' as $$
 select atv_private.start_plus_test_cycle(p_plan,p_request_key);
$$;
revoke all on function public.start_atv_plus_test_cycle(text,uuid) from public, anon;
grant execute on function public.start_atv_plus_test_cycle(text,uuid) to authenticated;

create function atv_private.cancel_plus_test_cycle(p_cycle uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
 if auth.uid() is null or not atv_private.owner_evaluation_access() then
  raise exception 'owner_evaluation_required' using errcode='42501';
 end if;
 update public.atv_plus_test_cycles set cancelled_at=coalesce(cancelled_at,now())
  where owner_id=(select auth.uid()) and id=p_cycle;
 return found;
end;
$$;
revoke all on function atv_private.cancel_plus_test_cycle(uuid) from public, anon;
grant execute on function atv_private.cancel_plus_test_cycle(uuid) to authenticated;
create function public.cancel_atv_plus_test_cycle(p_cycle uuid) returns boolean
language sql security invoker set search_path = '' as $$
 select atv_private.cancel_plus_test_cycle(p_cycle);
$$;
revoke all on function public.cancel_atv_plus_test_cycle(uuid) from public, anon;
grant execute on function public.cancel_atv_plus_test_cycle(uuid) to authenticated;

create function atv_private.consume_plus_test_reading() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_cycle public.atv_plus_test_cycles; v_products text[];
begin
 if new.atv_plus_cycle_id is null then return new; end if;
 perform 1 from public.atv_trial_grants where owner_id=new.owner_id and owner_evaluation
  and revoked_at is null and (expires_at is null or expires_at>now()) for share;
 if not found then raise exception 'owner_evaluation_required' using errcode='42501'; end if;
 select * into v_cycle from public.atv_plus_test_cycles
  where id=new.atv_plus_cycle_id and owner_id=new.owner_id for update;
 if not found or v_cycle.cancelled_at is not null or v_cycle.started_at>now() or v_cycle.ends_at<=now() then
  raise exception 'plus_cycle_inactive' using errcode='P0001';
 end if;
 select coalesce(array_agg(product_id),'{}'::text[]) into v_products
  from public.atv_plus_test_uses where owner_id=new.owner_id and cycle_id=v_cycle.id;
 if not atv_private.plus_selection_allowed(v_cycle.plan_id,array_append(v_products,new.product_id)) then
  raise exception 'plus_allowance_exhausted' using errcode='P0001';
 end if;
 insert into public.atv_plus_test_uses(owner_id,cycle_id,product_id,reading_id)
  values(new.owner_id,v_cycle.id,new.product_id,new.id);
 return new;
end;
$$;
revoke all on function atv_private.consume_plus_test_reading() from public, anon, authenticated, service_role;
create trigger atv_plus_consume_reading after insert on public.atv_trial_readings
 for each row execute function atv_private.consume_plus_test_reading();

create function atv_private.keep_plus_cycle_assignment() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
 if new.atv_plus_cycle_id is distinct from old.atv_plus_cycle_id then
  raise exception 'plus_cycle_assignment_immutable' using errcode='22023';
 end if;
 return new;
end;
$$;
revoke all on function atv_private.keep_plus_cycle_assignment() from public, anon, authenticated, service_role;
create trigger atv_plus_keep_assignment before update of atv_plus_cycle_id on public.atv_trial_readings
 for each row execute function atv_private.keep_plus_cycle_assignment();
