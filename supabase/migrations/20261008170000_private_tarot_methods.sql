-- Additive retirement and durable draws. No grants, payments or release gates are enabled.
alter table public.atv_trial_readings add column archived_at timestamptz;
update public.atv_trial_readings set archived_at=now() where product_id in
  ('daily-card','tarot-focus','tarot-yes-no','three-questions','tarot-journey');
-- The hosted private-trial deployment can precede the commercial workflow chain.
-- Archive paid history when that chain exists; do not create or enable it here.
do $$ begin
  if to_regclass('public.product_runs') is not null then
    update public.library_items l set archived_at=coalesce(l.archived_at,now())
    from public.product_runs r where l.item_type='PRODUCT_RUN' and l.source_id=r.id::text
      and r.product_id in ('daily-card','tarot-focus','tarot-yes-no','three-questions','tarot-journey');
  end if;
end; $$;
alter policy trial_readings_read on public.atv_trial_readings using
  (owner_id=auth.uid() and public.has_atv_trial_access() and archived_at is null);
alter policy trial_feedback_owner on public.atv_trial_feedback using
  (owner_id=auth.uid() and public.has_atv_trial_access() and exists
    (select 1 from public.atv_trial_readings r where r.id=reading_id and r.owner_id=auth.uid() and r.archived_at is null))
  with check (owner_id=auth.uid() and public.has_atv_trial_access() and exists
    (select 1 from public.atv_trial_readings r where r.id=reading_id and r.owner_id=auth.uid() and r.archived_at is null));
alter table public.atv_trial_readings drop constraint atv_trial_readings_product_id_check;
alter table public.atv_trial_readings add constraint atv_trial_readings_product_id_check check(product_id in
  ('birth-chart','three-pillars','ascendant','life-atlas','horoscope','date-reading','week-reading','personal-calendar','solar-return',
   'pair-preview','synastry','couple-dossier','daily-card','tarot-focus','tarot-yes-no','three-questions','tarot-journey',
   'midheaven','career-compass','purpose-career','direction-journey','dream-journal','dream-reading','dream-dossier','dream-atlas',
   'tarot-single-card','tarot-situation-challenge-advice','tarot-peladan-cross','tarot-celtic-cross','tarot-aphrodite-temple','tarot-astrological-mandala'));

do $$ begin
if to_regclass('public.workflow_releases') is not null then
insert into public.workflow_releases(product_id,title,universe,kind,contract_version) values
  ('tarot-single-card','Carta Única','tarot-arcanos','tarot','atv-workflow/1.0.0'),
  ('tarot-situation-challenge-advice','Situação, Desafio e Conselho','tarot-arcanos','tarot','atv-workflow/1.0.0'),
  ('tarot-peladan-cross','Cruz Péladan','tarot-arcanos','tarot','atv-workflow/1.0.0'),
  ('tarot-celtic-cross','Cruz Celta','tarot-arcanos','tarot','atv-workflow/1.0.0'),
  ('tarot-aphrodite-temple','Templo de Afrodite','tarot-arcanos','tarot','atv-workflow/1.0.0'),
  ('tarot-astrological-mandala','Mandala Astrológica','tarot-arcanos','tarot','atv-workflow/1.0.0');
update public.workflow_releases set enabled=false,engine_approved=false where product_id in
  ('daily-card','tarot-focus','tarot-yes-no','three-questions','tarot-journey');
end if;
end; $$;

create table public.atv_trial_tarot_draws (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  request_key uuid not null,
  product_id text not null check(product_id in
    ('tarot-single-card','tarot-situation-challenge-advice','tarot-peladan-cross','tarot-celtic-cross','tarot-aphrodite-temple','tarot-astrological-mandala')),
  scope text not null default 'private-free-test' check(scope='private-free-test'),
  input jsonb not null check(jsonb_typeof(input)='object' and input->>'productId'=product_id and octet_length(input::text)<=20000),
  calculation jsonb check(calculation is null or (jsonb_typeof(calculation)='object' and octet_length(calculation::text)<=50000)),
  created_at timestamptz not null default now(),
  recorded_at timestamptz,
  unique(owner_id,request_key),
  check((calculation is null)=(recorded_at is null))
);
alter table public.atv_trial_tarot_draws enable row level security;
create policy trial_tarot_draw_read on public.atv_trial_tarot_draws for select to authenticated
  using(owner_id=auth.uid() and public.has_atv_trial_access());
revoke all on public.atv_trial_tarot_draws from public,anon,authenticated;
grant select on public.atv_trial_tarot_draws to authenticated;
grant all on public.atv_trial_tarot_draws to service_role;

create function public.guard_atv_tarot_draw() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if not exists(select 1 from public.atv_trial_grants g where g.owner_id=new.owner_id and g.revoked_at is null and (g.expires_at is null or g.expires_at>now())) then
    raise exception 'trial_access_revoked' using errcode='42501';
  end if;
  if tg_op='UPDATE' and (row(new.id,new.owner_id,new.request_key,new.product_id,new.scope,new.input,new.created_at)
      is distinct from row(old.id,old.owner_id,old.request_key,old.product_id,old.scope,old.input,old.created_at)
      or (old.calculation is not null and row(new.calculation,new.recorded_at) is distinct from row(old.calculation,old.recorded_at))) then
    raise exception 'tarot_execution_immutable' using errcode='23514';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_atv_tarot_draw() from public,anon,authenticated;
create trigger tarot_draw_immutable before insert or update on public.atv_trial_tarot_draws for each row execute function public.guard_atv_tarot_draw();

create function public.reserve_atv_tarot_draw(p_owner uuid,p_request_key uuid,p_input jsonb)
returns public.atv_trial_tarot_draws language plpgsql security definer set search_path='' as $$
declare result public.atv_trial_tarot_draws;
begin
  insert into public.atv_trial_tarot_draws(owner_id,request_key,product_id,input)
    values(p_owner,p_request_key,p_input->>'productId',p_input) on conflict(owner_id,request_key) do nothing;
  select * into strict result from public.atv_trial_tarot_draws where owner_id=p_owner and request_key=p_request_key for update;
  if result.input is distinct from p_input then raise exception 'tarot_request_conflict' using errcode='23505'; end if;
  if not exists(select 1 from public.atv_trial_grants g where g.owner_id=p_owner and g.revoked_at is null and (g.expires_at is null or g.expires_at>now())) then
    raise exception 'trial_access_revoked' using errcode='42501';
  end if;
  return result;
end;
$$;
revoke all on function public.reserve_atv_tarot_draw(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.reserve_atv_tarot_draw(uuid,uuid,jsonb) to service_role;

create function public.record_atv_tarot_draw(p_owner uuid,p_id uuid,p_calculation jsonb)
returns public.atv_trial_tarot_draws language plpgsql security definer set search_path='' as $$
declare result public.atv_trial_tarot_draws; expected_count integer;
begin
  select * into strict result from public.atv_trial_tarot_draws where owner_id=p_owner and id=p_id for update;
  expected_count=case result.product_id when 'tarot-single-card' then 1 when 'tarot-situation-challenge-advice' then 3
    when 'tarot-peladan-cross' then 5 when 'tarot-celtic-cross' then 10 when 'tarot-aphrodite-temple' then 7 when 'tarot-astrological-mandala' then 13 end;
  if not coalesce(p_calculation->>'version'='atv-tarot-method-calculation/2.0.0'
    and p_calculation->>'kind'='tarot' and p_calculation->>'status'='recorded'
    and p_calculation#>>'{data,executionId}'=p_id::text and p_calculation#>>'{data,methodId}'=result.product_id
    and jsonb_array_length(p_calculation#>'{data,cards}')=expected_count,false) then
    raise exception 'invalid_tarot_snapshot' using errcode='23514';
  end if;
  if result.calculation is not null and result.calculation is distinct from p_calculation then
    raise exception 'tarot_draw_conflict' using errcode='23514';
  end if;
  if result.calculation is null then
    update public.atv_trial_tarot_draws set calculation=p_calculation,recorded_at=now() where id=p_id returning * into result;
  elsif not exists(select 1 from public.atv_trial_grants g where g.owner_id=p_owner and g.revoked_at is null and (g.expires_at is null or g.expires_at>now())) then
    raise exception 'trial_access_revoked' using errcode='42501';
  end if;
  return result;
end;
$$;
revoke all on function public.record_atv_tarot_draw(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.record_atv_tarot_draw(uuid,uuid,jsonb) to service_role;

create function public.guard_atv_tarot_reading() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.product_id in ('daily-card','tarot-focus','tarot-yes-no','three-questions','tarot-journey') then
    if tg_op='INSERT' or new.archived_at is null then raise exception 'tarot_product_retired' using errcode='23514'; end if;
  elsif new.product_id like 'tarot-%' then
    if not exists(select 1 from public.atv_trial_tarot_draws d where d.id=new.id and d.owner_id=new.owner_id
      and d.request_key=new.request_key and d.product_id=new.product_id and d.input=new.input and d.calculation=new.calculation
      and d.recorded_at is not null) then raise exception 'tarot_draw_not_recorded' using errcode='23514'; end if;
  end if;
  return new;
end;
$$;
revoke all on function public.guard_atv_tarot_reading() from public,anon,authenticated;
create trigger tarot_reading_recorded before insert or update on public.atv_trial_readings for each row execute function public.guard_atv_tarot_reading();
