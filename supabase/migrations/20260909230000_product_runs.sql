begin;

-- Expand-only, disabled by default. No production model or engine approval is implied.
create table public.workflow_releases (
  product_id text primary key,
  title text not null,
  universe text not null,
  kind text not null check (kind in ('natal','cycles','relationship','tarot','purpose','dream')),
  contract_version text not null,
  enabled boolean not null default false,
  engine_approved boolean not null default false,
  access_policy text not null default 'entitlement' check (access_policy in ('free','entitlement'))
);
insert into public.workflow_releases(product_id,title,universe,kind,contract_version) values
('birth-chart','Mapa Astral','meu-ceu','natal','atv-workflow/1.0.0'),
('three-pillars','Três Pilares','meu-ceu','natal','atv-workflow/1.0.0'),
('ascendant','Ascendente','meu-ceu','natal','atv-workflow/1.0.0'),
('life-atlas','Atlas da Vida 360','meu-ceu','natal','atv-workflow/1.0.0'),
('horoscope','Horóscopo','ciclos-tempo','cycles','atv-workflow/1.0.0'),
('date-reading','Leitura da Data','ciclos-tempo','cycles','atv-workflow/1.0.0'),
('week-reading','Semana','ciclos-tempo','cycles','atv-workflow/1.0.0'),
('personal-calendar','Calendário pessoal','ciclos-tempo','cycles','atv-workflow/1.0.0'),
('solar-return','Revolução Solar','ciclos-tempo','cycles','atv-workflow/1.0.0'),
('synastry','Sinastria','amor-relacoes','relationship','atv-workflow/1.0.0'),
('pair-preview','Preview do par','amor-relacoes','relationship','atv-workflow/1.0.0'),
('couple-dossier','Dossiê do Casal','amor-relacoes','relationship','atv-workflow/1.0.0'),
('daily-card','Carta do Dia','tarot-arcanos','tarot','atv-workflow/1.0.0'),
('tarot-yes-no','Sim/Não responsável','tarot-arcanos','tarot','atv-workflow/1.0.0'),
('three-questions','Três Perguntas','tarot-arcanos','tarot','atv-workflow/1.0.0'),
('tarot-journey','Jornada de Tarot','tarot-arcanos','tarot','atv-workflow/1.0.0'),
('tarot-focus','Foco Agora','tarot-arcanos','tarot','atv-workflow/1.0.0'),
('purpose-career','Mapa de Propósito & Carreira','proposito-prosperidade','purpose','atv-workflow/1.0.0'),
('midheaven','Meio do Céu','proposito-prosperidade','purpose','atv-workflow/1.0.0'),
('career-compass','Bússola de Carreira','proposito-prosperidade','purpose','atv-workflow/1.0.0'),
('direction-journey','Jornada de Direção','proposito-prosperidade','purpose','atv-workflow/1.0.0'),
('dream-reading','Leitura Essencial de Sonhos','sonhos-simbolos','dream','atv-workflow/1.0.0'),
('dream-journal','Registro de sonho','sonhos-simbolos','dream','atv-workflow/1.0.0'),
('dream-dossier','Dossiê do Sonho','sonhos-simbolos','dream','atv-workflow/1.0.0'),
('dream-atlas','Atlas dos Sonhos','sonhos-simbolos','dream','atv-workflow/1.0.0');
update public.workflow_releases set access_policy='free' where product_id in
  ('ascendant','three-pillars','horoscope','pair-preview','daily-card','midheaven','career-compass','dream-journal');

-- Filled only by an evidence-backed release operation; an empty table is intentional.
create table public.editorial_promotions (
  id text primary key,
  product_id text not null references public.workflow_releases(product_id),
  contract_version text not null,
  evidence_digest text not null check (evidence_digest ~ '^[a-f0-9]{64}$'),
  revoked_at timestamptz
);
create table public.product_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id text not null references public.workflow_releases(product_id),
  request_key uuid not null,
  parent_id uuid,
  contract_version text not null,
  input jsonb not null check (jsonb_typeof(input) = 'object' and octet_length(input::text) <= 20000),
  state text not null default 'QUEUED' check (state in ('QUEUED','CALCULATED','AWAITING_EDITORIAL','READY','FAILED','CANCELLED')),
  revision integer not null default 1 check (revision >= 1),
  calculation jsonb,
  editorial jsonb,
  error_code text check (error_code ~ '^[a-z0-9_]{1,80}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,request_key),
  unique(id,user_id),
  foreign key(parent_id,user_id) references public.product_runs(id,user_id) on delete set null (parent_id)
);
create index product_runs_owner_recent on public.product_runs(user_id,created_at desc);
create index product_runs_pending on public.product_runs(state,created_at) where state in ('QUEUED','CALCULATED','AWAITING_EDITORIAL');
create table public.product_run_events (
  id bigint generated always as identity primary key,
  run_id uuid not null references public.product_runs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  revision integer not null,
  state text not null,
  occurred_at timestamptz not null default now(),
  unique(run_id,revision)
);

alter table public.workflow_releases enable row level security;
alter table public.editorial_promotions enable row level security;
alter table public.product_runs enable row level security;
alter table public.product_run_events enable row level security;
create policy workflow_releases_read on public.workflow_releases for select to anon,authenticated using (true);
create policy product_runs_own_read on public.product_runs for select to authenticated using ((select auth.uid()) = user_id);
create policy product_run_events_own_read on public.product_run_events for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.workflow_releases,public.editorial_promotions,public.product_runs,public.product_run_events from anon,authenticated,service_role;
grant select on public.workflow_releases to anon,authenticated,service_role;
grant select on public.product_runs,public.product_run_events to authenticated,service_role;

create function public.request_product_run(p_product_id text,p_request_key uuid,p_input jsonb,p_parent_id uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  definition public.workflow_releases;
  previous public.product_runs;
  existing public.product_runs;
  result_id uuid;
  frozen_calculation jsonb;
begin
  if owner_id is null then raise exception 'auth_required' using errcode='42501'; end if;
  if p_request_key is null then raise exception 'invalid_request_key' using errcode='22023'; end if;
  -- Serialize quota + idempotency for this owner, including simultaneous retries.
  perform pg_advisory_xact_lock(hashtextextended(owner_id::text,0));
  select * into existing from public.product_runs where user_id=owner_id and request_key=p_request_key;
  if found then
    if existing.product_id is distinct from p_product_id or existing.parent_id is distinct from p_parent_id or
       (p_parent_id is null and existing.input is distinct from p_input) then
      raise exception 'idempotency_conflict' using errcode='22023';
    end if;
    return existing.id;
  end if;
  select * into definition from public.workflow_releases where product_id=p_product_id;
  if not found or not definition.enabled then raise exception 'workflow_unreleased' using errcode='55000'; end if;
  if definition.access_policy='entitlement' and not exists(
    select 1 from public.entitlements e where e.user_id=owner_id and e.product_id=p_product_id
      and e.state='ACTIVE' and (e.starts_at is null or e.starts_at<=now()) and (e.ends_at is null or e.ends_at>now())
  ) then raise exception 'entitlement_required' using errcode='42501'; end if;
  if p_parent_id is not null then
    select * into previous from public.product_runs where id=p_parent_id and user_id=owner_id;
    if not found or previous.product_id<>p_product_id then raise exception 'parent_not_found' using errcode='42501'; end if;
    if previous.state not in ('READY','FAILED','AWAITING_EDITORIAL','CANCELLED') then raise exception 'parent_not_reprocessable' using errcode='55000'; end if;
    p_input := previous.input;
    -- Immutable input and draw. Reprocessing is not permission for a new draw.
    if definition.kind='tarot' then frozen_calculation := previous.calculation; end if;
  end if;
  if p_input is null or jsonb_typeof(p_input)<>'object' or octet_length(p_input::text)>20000 or
    p_input->>'productId' is distinct from p_product_id or
    p_input->>'version' is distinct from definition.contract_version or
    p_input#>>'{consent,storage}' is distinct from 'true' or
    p_input#>>'{consent,policyVersion}' is distinct from 'atv-input-consent/1' or
    (definition.kind='relationship' and p_input#>>'{consent,partner}' is distinct from 'true') then
    raise exception 'invalid_input_or_consent' using errcode='22023';
  end if;
  if (select count(*) from public.product_runs where user_id=owner_id and created_at>now()-interval '1 day') >= 50 or
     (select count(*) from public.product_runs where user_id=owner_id and state in ('QUEUED','CALCULATED','AWAITING_EDITORIAL')) >= 15 then
    raise exception 'request_limit' using errcode='54000';
  end if;
  insert into public.product_runs(user_id,product_id,request_key,parent_id,contract_version,input,calculation,state)
    values(owner_id,p_product_id,p_request_key,p_parent_id,definition.contract_version,p_input,frozen_calculation,
      case when frozen_calculation is null then 'QUEUED' else 'CALCULATED' end) returning id into result_id;
  insert into public.product_run_events(run_id,user_id,revision,state)
    select id,user_id,revision,state from public.product_runs where id=result_id;
  insert into public.library_items(user_id,title,universe,item_type,source_id,occurred_at)
    values(owner_id,definition.title,definition.universe,'PRODUCT_RUN',result_id::text,now());
  return result_id;
end $$;

-- Service adapter is the only writer of calculated/editorial state. Clients cannot self-approve.
create function public.advance_product_run(p_id uuid,p_owner uuid,p_revision integer,p_state text,
  p_calculation jsonb default null,p_editorial jsonb default null,p_error_code text default null)
returns integer language plpgsql security definer set search_path = '' as $$
declare current_run public.product_runs; calc jsonb; edited jsonb; definition public.workflow_releases;
begin
  select * into current_run from public.product_runs where id=p_id and user_id=p_owner for update;
  if not found then raise exception 'run_not_found' using errcode='42501'; end if;
  if current_run.revision<>p_revision then raise exception 'stale_revision' using errcode='40001'; end if;
  if not (
    (current_run.state='QUEUED' and p_state in ('CALCULATED','FAILED','CANCELLED')) or
    (current_run.state='CALCULATED' and p_state in ('AWAITING_EDITORIAL','FAILED','CANCELLED')) or
    (current_run.state='AWAITING_EDITORIAL' and p_state in ('READY','FAILED','CANCELLED'))
  ) then raise exception 'invalid_transition' using errcode='55000'; end if;
  select * into definition from public.workflow_releases where product_id=current_run.product_id;
  calc := coalesce(p_calculation,current_run.calculation);
  edited := coalesce(p_editorial,current_run.editorial);
  if current_run.calculation is not null and p_calculation is not null and current_run.calculation<>p_calculation then
    raise exception 'calculation_immutable' using errcode='55000';
  end if;
  if p_state in ('CALCULATED','AWAITING_EDITORIAL','READY') and (
    calc is null or jsonb_typeof(calc)<>'object' or calc->>'kind' is distinct from definition.kind or
    coalesce(calc->>'status','') not in ('experimental','recorded') or
    coalesce(jsonb_typeof(calc->'facts'),'')<>'array' or coalesce(jsonb_array_length(calc->'facts'),0)<1
  ) then raise exception 'calculation_required' using errcode='22023'; end if;
  if p_state='READY' and (
    not definition.enabled or
    ((calc->>'status'='experimental' or definition.kind not in ('tarot','dream')) and not definition.engine_approved) or
    edited is null or coalesce(edited->>'reviewDigest','') !~ '^[a-f0-9]{64}$' or
    coalesce(jsonb_typeof(edited->'sections'),'')<>'array' or coalesce(jsonb_array_length(edited->'sections'),0)<1 or
    not exists(select 1 from public.editorial_promotions p where p.id=edited->>'promotionId'
      and p.product_id=current_run.product_id and p.contract_version=current_run.contract_version and p.revoked_at is null)
  ) then raise exception 'release_evidence_required' using errcode='55000'; end if;
  if p_state='FAILED' and (p_error_code is null or p_error_code !~ '^[a-z0-9_]{1,80}$') then
    raise exception 'safe_error_required' using errcode='22023';
  end if;
  if octet_length(coalesce(calc,'{}')::text)>200000 or octet_length(coalesce(edited,'{}')::text)>100000 then
    raise exception 'result_limit' using errcode='54000';
  end if;
  update public.product_runs set state=p_state,calculation=calc,editorial=edited,error_code=p_error_code,
    revision=revision+1,updated_at=now() where id=p_id;
  insert into public.product_run_events(run_id,user_id,revision,state) values(p_id,p_owner,p_revision+1,p_state);
  return p_revision+1;
end $$;

create function public.delete_product_run(p_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare owner_id uuid:=auth.uid(); deleted_count integer;
begin
  if owner_id is null then raise exception 'auth_required' using errcode='42501'; end if;
  delete from public.library_items where user_id=owner_id and item_type='PRODUCT_RUN' and source_id=p_id::text;
  delete from public.product_runs where user_id=owner_id and id=p_id;
  get diagnostics deleted_count = row_count;
  return deleted_count>0;
end $$;
revoke all on function public.request_product_run(text,uuid,jsonb,uuid) from public,anon,authenticated,service_role;
revoke all on function public.advance_product_run(uuid,uuid,integer,text,jsonb,jsonb,text) from public,anon,authenticated,service_role;
revoke all on function public.delete_product_run(uuid) from public,anon,authenticated,service_role;
grant execute on function public.request_product_run(text,uuid,jsonb,uuid),public.delete_product_run(uuid) to authenticated;
grant execute on function public.advance_product_run(uuid,uuid,integer,text,jsonb,jsonb,text) to service_role;
commit;
