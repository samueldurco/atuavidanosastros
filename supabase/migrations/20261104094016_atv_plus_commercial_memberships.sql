begin;
create schema if not exists atv_plus_private;
revoke all on schema atv_plus_private from public,anon;
grant usage on schema atv_plus_private to authenticated,service_role;

-- No prices, provider identifiers, editorial approvals or channel releases are invented here.
create table public.atv_plus_commercial_offers (
 id text primary key, plan_id text not null check(plan_id in ('essencial','ampliado','premium')),
 term_months integer not null check(term_months in (3,6,12)),
 commercial_enabled boolean not null default false,
 commercial_terms_approved boolean not null default false, terms_approval_reference text,
 hotmart_product_id text, hotmart_offer_code text, checkout_url text,
 total_minor integer check(total_minor>0),currency text not null default 'BRL' check(currency='BRL'),
 approved_at timestamptz,
 check(id='atv-plus-'||plan_id||'-'||term_months||'m'),
 check(not commercial_enabled or (commercial_terms_approved and length(coalesce(terms_approval_reference,''))>0 and approved_at is not null and total_minor is not null and total_minor>0 and length(coalesce(hotmart_product_id,''))>0
  and length(coalesce(hotmart_offer_code,''))>0 and checkout_url is not null and checkout_url ~ '^https://pay\.hotmart\.com/[A-Za-z0-9][A-Za-z0-9/?=&%._~+\-]*$'
  and checkout_url !~* '[?&]sck=')),
 unique(hotmart_product_id,hotmart_offer_code)
);
insert into public.atv_plus_commercial_offers(id,plan_id,term_months)
select 'atv-plus-'||p||'-'||m||'m',p,m from unnest(array['essencial','ampliado','premium']) p cross join unnest(array[3,6,12]) m;

create table public.atv_plus_checkout_intents (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id) on delete cascade,
 offer_id text not null references public.atv_plus_commercial_offers(id),
 total_minor integer not null check(total_minor>0),currency text not null check(currency='BRL'),
 hotmart_product_id text not null,hotmart_offer_code text not null,terms_approval_reference text not null,
 created_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '24 hours',
 transaction_ref text unique
);
create table public.atv_plus_memberships (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id) on delete cascade,
 profile_id uuid references public.natal_profiles(id) on delete set null,
 plan_id text not null check(plan_id in ('essencial','ampliado','premium')),
 term_months integer not null check(term_months in (3,6,12)),
 status text not null check(status in ('PENDING','ACTIVE','CANCELLED','SUSPENDED','EXPIRED')),
 starts_at timestamptz not null, ends_at timestamptz not null check(ends_at>starts_at),
 provider_subscription_id text,provider_product_id text not null,provider_offer_code text not null,
 total_minor integer not null check(total_minor>0),currency text not null check(currency='BRL'),transaction_ref text not null unique,
 offer_id text not null references public.atv_plus_commercial_offers(id),
 policy_version text not null default 'atv-plus-commercial/1' check(policy_version='atv-plus-commercial/1'),
 onboarded_at timestamptz, solar_return_location jsonb,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index atv_plus_memberships_owner_term on public.atv_plus_memberships(owner_id,ends_at desc);
create index atv_plus_memberships_provider_subscription on public.atv_plus_memberships(provider_subscription_id) where provider_subscription_id is not null;
create index atv_plus_memberships_profile on public.atv_plus_memberships(profile_id) where profile_id is not null;
create index atv_plus_memberships_offer on public.atv_plus_memberships(offer_id);
create index atv_plus_checkout_intents_owner on public.atv_plus_checkout_intents(owner_id,created_at desc);
create index atv_plus_checkout_intents_offer on public.atv_plus_checkout_intents(offer_id);
create table public.atv_plus_contacts (
 owner_id uuid primary key references public.profiles(id) on delete cascade,
 whatsapp text not null check(whatsapp ~ '^\+[1-9][0-9]{7,14}$'),
 consented_at timestamptz not null,policy_version text not null default 'atv-plus-whatsapp/1',
 verified_at timestamptz, verification_reference text,
 check(verified_at is null or length(coalesce(verification_reference,''))>0)
);
create table public.atv_plus_release_gates (
 kind text primary key check(kind in ('personal-horoscope','transit-reading','predictive-tarot','deep-predictive-tarot','solar-return','natal-brief','natal-full')),
 generation_enabled boolean not null default false, channel_enabled boolean not null default false,
 -- The private product pipeline is deployed independently; no hosted dependency is fabricated.
 workflow_product_id text,
 approval_reference text, environment text not null default 'local' check(environment in ('local','staging','production')),
 check(not generation_enabled or (length(coalesce(approval_reference,''))>0 and workflow_product_id is not null)),
 check(not channel_enabled or (generation_enabled and length(coalesce(approval_reference,''))>0))
);
insert into public.atv_plus_release_gates(kind) select unnest(array['personal-horoscope','transit-reading','predictive-tarot','deep-predictive-tarot','solar-return','natal-brief','natal-full']);
create table public.atv_plus_deliveries (
 id uuid primary key default gen_random_uuid(), membership_id uuid not null references public.atv_plus_memberships(id) on delete cascade,
 owner_id uuid not null references public.profiles(id) on delete cascade,
 kind text not null references public.atv_plus_release_gates(kind), period_key text not null,
 reference_year integer check(reference_year between 1901 and 2099),
 due_at timestamptz not null,period_start timestamptz not null,period_end timestamptz not null,
 state text not null default 'SCHEDULED' check(state in ('SCHEDULED','BLOCKED','QUEUED','PROCESSING','READY','SENDING','SENT','RETRY','DELIVERED','FAILED','CANCELLED')),
 gate_code text,attempts integer not null default 0 check(attempts between 0 and 5),
 available_at timestamptz not null default now(), provider_message_id text unique, delivered_at timestamptz,
 artifact_id uuid, created_at timestamptz not null default now(),
 unique(owner_id,kind,period_key),check((state='DELIVERED')=(delivered_at is not null))
);
create index atv_plus_deliveries_membership on public.atv_plus_deliveries(membership_id,due_at);
create index atv_plus_deliveries_due on public.atv_plus_deliveries(due_at,available_at) where state in ('SCHEDULED','BLOCKED','RETRY');
create index atv_plus_deliveries_artifact on public.atv_plus_deliveries(artifact_id) where artifact_id is not null;
create index atv_plus_release_gates_workflow on public.atv_plus_release_gates(workflow_product_id) where workflow_product_id is not null;

alter table public.atv_plus_commercial_offers enable row level security;
alter table public.atv_plus_checkout_intents enable row level security;
alter table public.atv_plus_memberships enable row level security;
alter table public.atv_plus_contacts enable row level security;
alter table public.atv_plus_release_gates enable row level security;
alter table public.atv_plus_deliveries enable row level security;
revoke all on public.atv_plus_commercial_offers,public.atv_plus_checkout_intents,public.atv_plus_memberships,public.atv_plus_contacts,public.atv_plus_release_gates,public.atv_plus_deliveries from public,anon,authenticated;
grant all on public.atv_plus_commercial_offers,public.atv_plus_checkout_intents,public.atv_plus_memberships,public.atv_plus_contacts,public.atv_plus_release_gates,public.atv_plus_deliveries to service_role;
grant select on public.atv_plus_memberships,public.atv_plus_deliveries to authenticated;
create policy atv_plus_memberships_own on public.atv_plus_memberships for select to authenticated using(owner_id=(select auth.uid()) and exists(select 1 from public.profiles p where p.id=owner_id and p.deleted_at is null));
create policy atv_plus_deliveries_own on public.atv_plus_deliveries for select to authenticated using(owner_id=(select auth.uid()) and exists(select 1 from public.profiles p where p.id=owner_id and p.deleted_at is null));

create function atv_plus_private.public_offers() returns jsonb
language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'plan_id',plan_id,'term_months',term_months,
 'commercial_enabled',true,'total_minor',total_minor,'currency',currency) order by id),'[]'::jsonb)
 from public.atv_plus_commercial_offers where commercial_enabled;
$$;
create function public.atv_plus_public_offers() returns jsonb language sql stable security invoker set search_path='' as $$select atv_plus_private.public_offers()$$;
-- Anonymous callers can only execute the sanitized, approved-offer projection.
grant usage on schema atv_plus_private to anon;
revoke all on function atv_plus_private.public_offers(),public.atv_plus_public_offers() from public;
grant execute on function atv_plus_private.public_offers(),public.atv_plus_public_offers() to anon,authenticated,service_role;

create function atv_plus_private.membership_state() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare v_owner uuid:=auth.uid();v_contact jsonb;
begin
 if v_owner is null then raise exception 'auth_required' using errcode='42501';end if;
 if not exists(select 1 from public.profiles where id=v_owner and deleted_at is null) then raise exception 'profile_unavailable';end if;
 select jsonb_build_object('whatsapp_masked','•••• '||right(whatsapp,4),'consented',true,'verified',verified_at is not null) into v_contact from public.atv_plus_contacts where owner_id=v_owner;
 return jsonb_build_object('policyVersion','atv-plus-commercial/1','memberships',
  (select coalesce(jsonb_agg(jsonb_build_object('id',id,'owner_id',owner_id,'profile_id',profile_id,'plan_id',plan_id,'term_months',term_months,'status',status,'starts_at',starts_at,'ends_at',ends_at,'onboarded_at',onboarded_at) order by starts_at desc),'[]') from public.atv_plus_memberships where owner_id=v_owner),
  'contact',v_contact,'deliveries',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'membership_id',membership_id,'kind',kind,'due_at',due_at,'period_start',period_start,'period_end',period_end,'state',state,'gate_code',gate_code,'delivered_at',delivered_at) order by due_at),'[]') from public.atv_plus_deliveries where owner_id=v_owner),
  'offers',atv_plus_private.public_offers());
end;$$;
create function public.atv_plus_membership_state() returns jsonb language sql stable security invoker set search_path='' as $$select atv_plus_private.membership_state()$$;
revoke all on function atv_plus_private.membership_state(),public.atv_plus_membership_state() from public,anon,service_role;
grant execute on function atv_plus_private.membership_state(),public.atv_plus_membership_state() to authenticated;

create function atv_plus_private.start_checkout(p_offer_id text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_owner uuid:=auth.uid();v_offer public.atv_plus_commercial_offers%rowtype;v_id uuid;
begin
 if v_owner is null then raise exception 'auth_required' using errcode='42501';end if;
 perform 1 from public.profiles where id=v_owner and deleted_at is null for update;
 if not found then raise exception 'profile_unavailable';end if;
 select * into v_offer from public.atv_plus_commercial_offers where id=p_offer_id and commercial_enabled;
 if not found then raise exception 'commercial_offer_unavailable';end if;
 insert into public.atv_plus_checkout_intents(owner_id,offer_id,total_minor,currency,hotmart_product_id,hotmart_offer_code,terms_approval_reference)
 values(v_owner,p_offer_id,v_offer.total_minor,v_offer.currency,v_offer.hotmart_product_id,v_offer.hotmart_offer_code,v_offer.terms_approval_reference) returning id into v_id;
 return jsonb_build_object('intent_id',v_id,'checkout_url',v_offer.checkout_url||case when position('?' in v_offer.checkout_url)>0 then '&' else '?' end||'sck='||v_id::text);
end;$$;
create function public.atv_plus_start_checkout(p_offer_id text) returns jsonb language sql security invoker set search_path='' as $$select atv_plus_private.start_checkout(p_offer_id)$$;
revoke all on function atv_plus_private.start_checkout(text),public.atv_plus_start_checkout(text) from public,anon,service_role;
grant execute on function atv_plus_private.start_checkout(text),public.atv_plus_start_checkout(text) to authenticated;

create function atv_plus_private.schedule(p_membership_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare m public.atv_plus_memberships%rowtype;n public.natal_profiles%rowtype;v_year integer;v_local date;v_kind text;v_cadence integer;v_monthly boolean;v_i integer;v_due timestamptz;v_next timestamptz;
begin
 select * into m from public.atv_plus_memberships where id=p_membership_id for update;
 if not found or m.status not in ('ACTIVE','CANCELLED') or m.onboarded_at is null or now()>=m.ends_at then return;end if;
 select * into n from public.natal_profiles where id=m.profile_id and user_id=m.owner_id;
 if not found then raise exception 'natal_profile_required';end if;
 v_local:=(m.onboarded_at at time zone (m.solar_return_location->>'timezone'))::date;
 v_year:=extract(year from v_local)::integer;
 -- owner_id is the stable person profile; natal record version changes cannot refill gifts.
 -- This is a request marker, not a fabricated solar-cycle interval. The approved
 -- deterministic calculation must select the first return strictly after intake.
 insert into public.atv_plus_deliveries(membership_id,owner_id,kind,period_key,reference_year,due_at,period_start,period_end)
 values(m.id,m.owner_id,'solar-return','reference:'||v_year::text,v_year,m.onboarded_at,m.onboarded_at,m.onboarded_at)
 on conflict(owner_id,kind,period_key) do update set membership_id=excluded.membership_id,reference_year=excluded.reference_year,due_at=excluded.due_at,period_start=excluded.period_start,period_end=excluded.period_end,state='SCHEDULED',gate_code=null,attempts=0,available_at=now(),artifact_id=null
  where atv_plus_deliveries.state='CANCELLED' and atv_plus_deliveries.gate_code='membership_suspended' and atv_plus_deliveries.provider_message_id is null and atv_plus_deliveries.delivered_at is null;
 if m.plan_id<>'essencial' then
  insert into public.atv_plus_deliveries(membership_id,owner_id,kind,period_key,due_at,period_start,period_end)
  values(m.id,m.owner_id,case m.plan_id when 'ampliado' then 'natal-brief' else 'natal-full' end,'once',m.onboarded_at,m.onboarded_at,m.onboarded_at)
  on conflict(owner_id,kind,period_key) do update set membership_id=excluded.membership_id,due_at=excluded.due_at,period_start=excluded.period_start,period_end=excluded.period_end,state='SCHEDULED',gate_code=null,attempts=0,available_at=now(),artifact_id=null
   where atv_plus_deliveries.state='CANCELLED' and atv_plus_deliveries.gate_code='membership_suspended' and atv_plus_deliveries.provider_message_id is null and atv_plus_deliveries.delivered_at is null;
 end if;
 for v_kind,v_cadence,v_monthly in select kind,days,monthly from (values
  ('personal-horoscope',case when m.plan_id='essencial' then 15 else 7 end,false,m.plan_id in ('essencial','premium')),
  ('transit-reading',7,false,m.plan_id='ampliado'),('predictive-tarot',0,true,m.plan_id='ampliado'),('deep-predictive-tarot',7,false,m.plan_id='premium')) as s(kind,days,monthly,included) where included
 loop
  for v_i in 1..54 loop
   v_due:=case when v_monthly then m.starts_at+make_interval(months=>v_i) else m.starts_at+make_interval(days=>v_i*v_cadence) end;
   exit when v_due>=m.ends_at;
   continue when v_due<=m.onboarded_at;
   v_next:=least(m.ends_at,case when v_monthly then m.starts_at+make_interval(months=>v_i+1) else m.starts_at+make_interval(days=>(v_i+1)*v_cadence) end);
   insert into public.atv_plus_deliveries(membership_id,owner_id,kind,period_key,due_at,period_start,period_end)
   values(m.id,m.owner_id,v_kind,to_char(v_due at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')||'/'||to_char(v_next at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),v_due,v_due,v_next)
   on conflict(owner_id,kind,period_key) do update set membership_id=excluded.membership_id,state='SCHEDULED',gate_code=null,attempts=0,available_at=now()
    where atv_plus_deliveries.state='CANCELLED' and atv_plus_deliveries.gate_code='membership_upgraded';
  end loop;
 end loop;
end;$$;
revoke all on function atv_plus_private.schedule(uuid) from public,anon,authenticated;
grant execute on function atv_plus_private.schedule(uuid) to service_role;

create function atv_plus_private.complete_onboarding(p_membership_id uuid,p_profile_id uuid,p_whatsapp text,p_whatsapp_consent boolean,p_solar_return_location jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_owner uuid:=auth.uid();m public.atv_plus_memberships%rowtype;v_lat numeric;v_lon numeric;
begin
 if v_owner is null then raise exception 'auth_required' using errcode='42501';end if;
 select * into m from public.atv_plus_memberships where id=p_membership_id and owner_id=v_owner for update;
 if not found or m.status not in ('ACTIVE','CANCELLED') or now()<m.starts_at or now()>=m.ends_at then raise exception 'active_membership_required';end if;
 if p_whatsapp_consent is distinct from true or p_whatsapp is null or p_whatsapp !~ '^\+[1-9][0-9]{7,14}$' then raise exception 'whatsapp_consent_required';end if;
 if jsonb_typeof(p_solar_return_location) is distinct from 'object' or length(coalesce(p_solar_return_location->>'label','')) not between 2 and 200
  or coalesce(p_solar_return_location->>'countryCode','') !~ '^[A-Z]{2}$'
  or not exists(select 1 from pg_catalog.pg_timezone_names where name=p_solar_return_location->>'timezone') then raise exception 'solar_return_location_invalid';end if;
 begin v_lat:=(p_solar_return_location->>'latitude')::numeric;v_lon:=(p_solar_return_location->>'longitude')::numeric;
 exception when others then raise exception 'solar_return_location_invalid';end;
 if v_lat is null or v_lon is null or not(v_lat between -90 and 90) or not(v_lon between -180 and 180) then raise exception 'solar_return_location_invalid';end if;
 perform 1 from public.natal_profiles n join public.natal_storage_consents c on c.user_id=n.user_id and c.revision=n.version and c.granted
  join public.profiles p on p.id=n.user_id and p.deleted_at is null
  where n.id=p_profile_id and n.user_id=v_owner and n.is_current and n.version<=p.onboarding_revision;
 if not found then raise exception 'natal_profile_required';end if;
 if m.onboarded_at is not null and (m.profile_id<>p_profile_id or m.solar_return_location<>p_solar_return_location) then raise exception 'onboarding_already_completed';end if;
 insert into public.atv_plus_contacts(owner_id,whatsapp,consented_at) values(v_owner,p_whatsapp,now())
 on conflict(owner_id) do update set whatsapp=excluded.whatsapp,consented_at=excluded.consented_at,
 verified_at=case when atv_plus_contacts.whatsapp=excluded.whatsapp then atv_plus_contacts.verified_at end,
 verification_reference=case when atv_plus_contacts.whatsapp=excluded.whatsapp then atv_plus_contacts.verification_reference end;
 update public.atv_plus_memberships set profile_id=p_profile_id,onboarded_at=coalesce(onboarded_at,now()),solar_return_location=p_solar_return_location,updated_at=now() where id=m.id;
 perform atv_plus_private.schedule(m.id);
 return atv_plus_private.membership_state();
end;$$;
create function public.atv_plus_complete_onboarding(p_membership_id uuid,p_profile_id uuid,p_whatsapp text,p_whatsapp_consent boolean,p_solar_return_location jsonb) returns jsonb language sql security invoker set search_path='' as $$select atv_plus_private.complete_onboarding(p_membership_id,p_profile_id,p_whatsapp,p_whatsapp_consent,p_solar_return_location)$$;
revoke all on function atv_plus_private.complete_onboarding(uuid,uuid,text,boolean,jsonb),public.atv_plus_complete_onboarding(uuid,uuid,text,boolean,jsonb) from public,anon,service_role;
grant execute on function atv_plus_private.complete_onboarding(uuid,uuid,text,boolean,jsonb),public.atv_plus_complete_onboarding(uuid,uuid,text,boolean,jsonb) to authenticated;

create function atv_plus_private.cancel_membership(p_membership_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 update public.atv_plus_memberships set status='CANCELLED',updated_at=now() where id=p_membership_id and owner_id=auth.uid() and status in ('ACTIVE','CANCELLED');
 if not found then raise exception 'membership_unavailable';end if;
 -- No refund/revocation is implied. The already paid period continues.
 return atv_plus_private.membership_state();
end;$$;
create function public.atv_plus_cancel_membership(p_membership_id uuid) returns jsonb language sql security invoker set search_path='' as $$select atv_plus_private.cancel_membership(p_membership_id)$$;
revoke all on function atv_plus_private.cancel_membership(uuid),public.atv_plus_cancel_membership(uuid) from public,anon,service_role;
grant execute on function atv_plus_private.cancel_membership(uuid),public.atv_plus_cancel_membership(uuid) to authenticated;

-- service-only inbox transition. Verified event + approved mapping + account-bound checkout intent are all required.
create function atv_plus_private.process_hotmart(p_external_event_id text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare e public.webhook_inbox%rowtype;o public.atv_plus_commercial_offers%rowtype;i public.atv_plus_checkout_intents%rowtype;
 m public.atv_plus_memberships%rowtype;v_previous public.atv_plus_memberships%rowtype;v_tx text;v_sub text;v_sck text;v_start timestamptz;v_reason text;v_price numeric;
begin
 select * into e from public.webhook_inbox where provider='hotmart' and external_event_id=p_external_event_id for update;
 if not found or not e.signature_verified then raise exception 'verified_inbox_required';end if;
 if e.processing_state='PROCESSED' then return jsonb_build_object('state','already_processed');end if;
 v_tx:=e.payload#>>'{data,purchase,transaction}';v_sub:=e.payload#>>'{data,subscription,subscriber,code}';
 if e.event_type='SUBSCRIPTION_CANCELLATION' then
  -- Hotmart cancellation has data.subscriber.code, unlike purchase notifications.
  v_sub:=e.payload#>>'{data,subscriber,code}';
  update public.atv_plus_memberships x set status='CANCELLED',updated_at=now()
   where x.provider_product_id=e.payload#>>'{data,product,id}'
   and x.provider_subscription_id=v_sub and x.status='ACTIVE';
  if not found and not exists(select 1 from public.atv_plus_memberships x
   where x.provider_subscription_id=v_sub and x.provider_product_id=e.payload#>>'{data,product,id}') then return jsonb_build_object('state','ignored','code','membership_unmatched');end if;
  -- Keep the paid end date; neither cancellation_date nor an untrusted next charge can extend it.
 elsif e.event_type in ('PURCHASE_REFUNDED','PURCHASE_CHARGEBACK','PURCHASE_CANCELED') then
  select x.* into m from public.atv_plus_memberships x
   where x.transaction_ref=v_tx and x.provider_product_id=e.payload#>>'{data,product,id}' for update of x;
  if not found then
   if not exists(select 1 from public.atv_plus_checkout_intents where hotmart_product_id=e.payload#>>'{data,product,id}')
    and not exists(select 1 from public.atv_plus_commercial_offers where hotmart_product_id=e.payload#>>'{data,product,id}') then return jsonb_build_object('state','ignored','code','commercial_offer_unmapped');end if;
   v_reason:='membership_unmatched';
  else
   update public.atv_plus_memberships set status='SUSPENDED',updated_at=now() where id=m.id;
   update public.atv_plus_deliveries set state='CANCELLED',gate_code='membership_suspended' where membership_id=m.id and state not in ('DELIVERED','SENDING','SENT');
   update public.atv_plus_deliveries set gate_code='delivery_reconciliation_required' where membership_id=m.id and state in ('SENDING','SENT');
   update public.jobs set state='CANCELLED',last_error_code='membership_suspended' where idempotency_key in
    (select 'atv-plus:'||id::text from public.atv_plus_deliveries where membership_id=m.id and state='CANCELLED') and state in ('QUEUED','RETRY','RUNNING');
   -- A revoked upgrade cannot consume the remaining lower, already paid forecasts.
   update public.atv_plus_deliveries d set state='SCHEDULED',gate_code=null,available_at=now()
    from public.atv_plus_memberships paid where d.membership_id=paid.id and paid.owner_id=m.owner_id
    and paid.status in ('ACTIVE','CANCELLED') and now()<paid.ends_at and d.due_at>now()
    and d.state='CANCELLED' and d.gate_code='membership_upgraded'
    and not exists(select 1 from public.atv_plus_memberships higher where higher.owner_id=paid.owner_id and higher.status in ('ACTIVE','CANCELLED')
     and d.due_at>=higher.starts_at and d.due_at<higher.ends_at
     and case higher.plan_id when 'essencial' then 1 when 'ampliado' then 2 else 3 end>case paid.plan_id when 'essencial' then 1 when 'ampliado' then 2 else 3 end);
  end if;
 elsif e.event_type in ('PURCHASE_APPROVED','PURCHASE_COMPLETE') then
  -- Checkout is an immutable financial snapshot. Disabling/changing an offer or
  -- delaying the notification cannot erase a payment already authorized there.
  select * into m from public.atv_plus_memberships where transaction_ref=v_tx for update;
  v_sck:=e.payload#>>'{data,purchase,origin,sck}';
  select * into i from public.atv_plus_checkout_intents where id::text=v_sck and (transaction_ref is null or transaction_ref=v_tx) for update;
  select * into o from public.atv_plus_commercial_offers where id=coalesce(m.offer_id,i.offer_id);
  if not found then
   if not exists(select 1 from public.atv_plus_commercial_offers where hotmart_product_id=e.payload#>>'{data,product,id}')
    and not exists(select 1 from public.atv_plus_checkout_intents where hotmart_product_id=e.payload#>>'{data,product,id}') then return jsonb_build_object('state','ignored','code','commercial_offer_unmapped');end if;
   update public.webhook_inbox set processing_state='QUARANTINED',last_error_code='checkout_identity_unmatched',attempts=attempts+1 where id=e.id;
   return jsonb_build_object('state','quarantined','code','checkout_identity_unmatched');
  end if;
  begin v_price:=(e.payload#>>'{data,purchase,price,value}')::numeric;exception when others then v_price:=null;end;
  if e.payload#>>'{data,product,id}' is distinct from coalesce(m.provider_product_id,i.hotmart_product_id)
   or e.payload#>>'{data,purchase,offer,code}' is distinct from coalesce(m.provider_offer_code,i.hotmart_offer_code) then v_reason:='purchase_offer_mismatch';
  elsif v_price is null or v_price*100<>coalesce(m.total_minor,i.total_minor) or e.payload#>>'{data,purchase,price,currency_value}' is distinct from coalesce(m.currency,i.currency) then v_reason:='purchase_price_mismatch';
  elsif exists(select 1 from public.webhook_inbox t where t.provider='hotmart' and t.signature_verified and t.event_type in ('PURCHASE_REFUNDED','PURCHASE_CHARGEBACK','PURCHASE_CANCELED')
   and t.payload#>>'{data,purchase,transaction}'=v_tx and t.payload#>>'{data,product,id}'=e.payload#>>'{data,product,id}') then v_reason:='terminal_purchase';end if;
  if v_reason is null then
  select * into m from public.atv_plus_memberships where transaction_ref=v_tx for update;
  if found then
   if m.status='SUSPENDED' then v_reason:='terminal_membership';end if;
  else
   v_sck:=e.payload#>>'{data,purchase,origin,sck}';
   select * into i from public.atv_plus_checkout_intents where id::text=v_sck and offer_id=o.id and (transaction_ref=v_tx or transaction_ref is null) for update;
   if not found then v_reason:='checkout_identity_unmatched';
   elsif v_tx is null or length(v_tx) not between 1 and 200 then v_reason:='transaction_invalid';
   else
    -- Serialize activation/renewal per account. Upgrade starts now; same-level renewal extends the paid term.
    perform 1 from public.profiles where id=i.owner_id and deleted_at is null for update;
    if not found then v_reason:='profile_unavailable';else
     select greatest(now(),coalesce(max(ends_at),now())) into v_start from public.atv_plus_memberships where owner_id=i.owner_id and status in ('ACTIVE','CANCELLED')
      and case plan_id when 'essencial' then 1 when 'ampliado' then 2 else 3 end>=case o.plan_id when 'essencial' then 1 when 'ampliado' then 2 else 3 end;
     insert into public.atv_plus_memberships(owner_id,plan_id,term_months,status,starts_at,ends_at,provider_subscription_id,provider_product_id,provider_offer_code,total_minor,currency,transaction_ref,offer_id)
     values(i.owner_id,o.plan_id,o.term_months,'ACTIVE',v_start,v_start+make_interval(months=>o.term_months),v_sub,i.hotmart_product_id,i.hotmart_offer_code,i.total_minor,i.currency,v_tx,o.id) returning * into m;
     update public.atv_plus_checkout_intents set transaction_ref=v_tx where id=i.id;
     -- Upgrades replace the remaining forecasts in their overlapping paid window.
     -- Gifts and sends already in flight retain their original identity/history.
     update public.atv_plus_deliveries d set state='CANCELLED',gate_code='membership_upgraded'
      from public.atv_plus_memberships previous where previous.id=d.membership_id and previous.owner_id=i.owner_id and previous.id<>m.id
      and case previous.plan_id when 'essencial' then 1 when 'ampliado' then 2 else 3 end<case o.plan_id when 'essencial' then 1 when 'ampliado' then 2 else 3 end
      and d.kind not in ('solar-return','natal-brief','natal-full') and d.due_at>=m.starts_at and d.due_at<m.ends_at
      and d.state not in ('DELIVERED','SENDING','SENT');
     update public.jobs set state='CANCELLED',last_error_code='membership_upgraded' where idempotency_key in
      (select 'atv-plus:'||id::text from public.atv_plus_deliveries where owner_id=i.owner_id and gate_code='membership_upgraded') and state in ('QUEUED','RETRY','RUNNING');
     -- A paid renewal/upgrade reuses only still-current, consented personal data.
     select x.* into v_previous from public.atv_plus_memberships x join public.natal_profiles n on n.id=x.profile_id and n.is_current and n.user_id=i.owner_id
      join public.natal_storage_consents c on c.user_id=n.user_id and c.revision=n.version and c.granted
      where x.owner_id=i.owner_id and x.id<>m.id and x.onboarded_at is not null and x.status in ('ACTIVE','CANCELLED') order by x.created_at desc limit 1;
     if found then
      update public.atv_plus_memberships set profile_id=v_previous.profile_id,solar_return_location=v_previous.solar_return_location,onboarded_at=v_start where id=m.id;
      perform atv_plus_private.schedule(m.id);
     end if;
    end if;
   end if;
  end if;
  end if;
 else return jsonb_build_object('state','ignored','code','unsupported_event');
 end if;
 update public.webhook_inbox set attempts=attempts+1,processing_state=case when v_reason is null then 'PROCESSED' else 'QUARANTINED' end,last_error_code=v_reason,processed_at=case when v_reason is null then now() end where id=e.id;
 return jsonb_build_object('state',case when v_reason is null then 'processed' else 'quarantined' end,'code',v_reason,'membership_id',m.id);
end;$$;
create function public.process_atv_plus_hotmart_event(p_external_event_id text) returns jsonb language sql security invoker set search_path='' as $$select atv_plus_private.process_hotmart(p_external_event_id)$$;
revoke all on function atv_plus_private.process_hotmart(text),public.process_atv_plus_hotmart_event(text) from public,anon,authenticated;
grant execute on function atv_plus_private.process_hotmart(text),public.process_atv_plus_hotmart_event(text) to service_role;

-- The independently deployed private pipeline may be absent on the hosted base.
-- Its availability and current release are checked dynamically, never bypassed.
create function atv_plus_private.pipeline_available(p_product_id text) returns boolean
language plpgsql stable security definer set search_path='' as $$
declare v_allowed boolean;
begin
 if to_regclass('public.workflow_releases') is null or to_regclass('public.product_runs') is null
  or to_regclass('public.product_artifacts') is null or to_regclass('public.product_artifact_policy') is null
  or to_regprocedure('public.product_artifact_run_allowed(uuid,uuid)') is null then return false;end if;
 execute 'select exists(select 1 from public.workflow_releases where product_id=$1 and enabled and (engine_approved or kind in (''tarot'',''dream''))) and exists(select 1 from public.product_artifact_policy where enabled)' into v_allowed using p_product_id;
 return coalesce(v_allowed,false);
exception when undefined_table or undefined_column or undefined_function then return false;
end;$$;
revoke all on function atv_plus_private.pipeline_available(text) from public,anon,authenticated;
grant execute on function atv_plus_private.pipeline_available(text) to service_role;

create function atv_plus_private.profile_allowed(p_membership_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.atv_plus_memberships m join public.profiles p on p.id=m.owner_id and p.deleted_at is null
 join public.natal_profiles n on n.id=m.profile_id and n.user_id=m.owner_id and n.is_current
 join public.natal_storage_consents c on c.user_id=n.user_id and c.revision=n.version and c.granted
 where m.id=p_membership_id);
$$;
revoke all on function atv_plus_private.profile_allowed(uuid) from public,anon,authenticated;
grant execute on function atv_plus_private.profile_allowed(uuid) to service_role;

create function atv_plus_private.dispatch_due() returns jsonb
language plpgsql security definer set search_path='' as $$
declare d public.atv_plus_deliveries%rowtype;m public.atv_plus_memberships%rowtype;g public.atv_plus_release_gates%rowtype;v_gate text;v_queued integer:=0;
begin
 update public.atv_plus_memberships set status='EXPIRED',updated_at=now() where ends_at<=now() and status in ('ACTIVE','CANCELLED');
 for d in select * from public.atv_plus_deliveries where state in ('SCHEDULED','BLOCKED','RETRY') and due_at<=now() and available_at<=now() order by due_at limit 100 for update skip locked loop
  select * into m from public.atv_plus_memberships where id=d.membership_id;
  select * into g from public.atv_plus_release_gates where kind=d.kind;
  v_gate:=case when m.status not in ('ACTIVE','CANCELLED') or now()>=m.ends_at then 'membership_not_current'
   when now()<m.starts_at then 'membership_not_started'
   when not atv_plus_private.profile_allowed(m.id) then 'profile_or_consent_unavailable'
   when not g.generation_enabled then 'content_not_released'
   when not g.channel_enabled then 'whatsapp_channel_not_released'
   when not atv_plus_private.pipeline_available(g.workflow_product_id) then 'pipeline_unavailable'
   when not exists(select 1 from public.atv_plus_contacts where owner_id=d.owner_id and verified_at is not null) then 'whatsapp_not_verified'
   else null end;
  if v_gate='membership_not_current' then update public.atv_plus_deliveries set state='CANCELLED',gate_code=v_gate where id=d.id;
  elsif v_gate is not null then update public.atv_plus_deliveries set state='BLOCKED',gate_code=v_gate where id=d.id;
  else
   insert into public.jobs(job_type,idempotency_key,payload,available_at) values('atv_plus.generate','atv-plus:'||d.id::text,jsonb_build_object('deliveryId',d.id,'membershipId',m.id,'ownerId',d.owner_id,'kind',d.kind,'policyVersion',m.policy_version),now()) on conflict(idempotency_key) do update set state='QUEUED',payload=excluded.payload,available_at=excluded.available_at where public.jobs.state in ('FAILED','RETRY','CANCELLED');
   update public.atv_plus_deliveries set state='QUEUED',gate_code=null where id=d.id;v_queued:=v_queued+1;
  end if;
 end loop;
 return jsonb_build_object('queued',v_queued);
end;$$;
create function public.atv_plus_dispatch_due() returns jsonb language sql security invoker set search_path='' as $$select atv_plus_private.dispatch_due()$$;
revoke all on function atv_plus_private.dispatch_due(),public.atv_plus_dispatch_due() from public,anon,authenticated;
grant execute on function atv_plus_private.dispatch_due(),public.atv_plus_dispatch_due() to service_role;

-- Trusted renderer/channel orchestration. An uncertain send never returns to the automatic retry queue.
create function atv_plus_private.delivery_step(p_delivery_id uuid,p_action text,p_artifact_id uuid,p_provider_message_id text,p_error_code text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare d public.atv_plus_deliveries%rowtype;m public.atv_plus_memberships%rowtype;g public.atv_plus_release_gates%rowtype;a record;v_phone text;v_return timestamptz;v_return_year integer;v_key text;
begin
 select * into d from public.atv_plus_deliveries where id=p_delivery_id for update;
 if not found then raise exception 'delivery_unavailable';end if;
 if d.state='DELIVERED' then return jsonb_build_object('state','DELIVERED');end if;
 if p_action='CLAIM' and d.state in ('SENDING','SENT') then return jsonb_build_object('state',d.state);end if;
 select * into m from public.atv_plus_memberships where id=d.membership_id;
 select * into g from public.atv_plus_release_gates where kind=d.kind;
 select whatsapp into v_phone from public.atv_plus_contacts where owner_id=d.owner_id and verified_at is not null;
 if p_action='CONFIRM' then
  if d.state not in ('SENT','SENDING') or p_provider_message_id is null or length(p_provider_message_id) not between 1 and 255
   or (d.provider_message_id is not null and d.provider_message_id<>p_provider_message_id) then raise exception 'delivery_transition_invalid';end if;
  update public.atv_plus_deliveries set state='DELIVERED',provider_message_id=p_provider_message_id,delivered_at=now(),gate_code=null where id=d.id;
  return jsonb_build_object('state','DELIVERED');
 end if;
 if p_action='UNCERTAIN' and d.state='SENDING' then
  update public.atv_plus_deliveries set gate_code='delivery_reconciliation_required' where id=d.id;
  return jsonb_build_object('state','SENDING','code','delivery_reconciliation_required');
 end if;
 if p_action='FAIL' then
  if d.state not in ('PROCESSING','READY') then raise exception 'delivery_transition_invalid';end if;
  update public.atv_plus_deliveries set state=case when attempts>=5 then 'FAILED' else 'RETRY' end,
   available_at=now()+make_interval(secs=>least(3600,30*power(2,attempts)::integer)),gate_code='generation_or_preflight_failed' where id=d.id returning * into d;
  update public.jobs set state=case when d.state='FAILED' then 'FAILED' else 'RETRY' end,available_at=d.available_at,last_error_code=d.gate_code where idempotency_key='atv-plus:'||d.id::text;
  return jsonb_build_object('state',d.state);
 end if;
 if m.status not in ('ACTIVE','CANCELLED') or now()<m.starts_at or now()>=m.ends_at or not g.generation_enabled or not g.channel_enabled or v_phone is null
  or not atv_plus_private.profile_allowed(m.id) then raise exception 'delivery_gate_closed';end if;
 if not atv_plus_private.pipeline_available(g.workflow_product_id) then raise exception 'pipeline_unavailable';end if;
 if p_action='CLAIM' then
  if d.state<>'QUEUED' or d.attempts>=5 or d.due_at>now() or d.available_at>now() then raise exception 'delivery_transition_invalid';end if;
  update public.atv_plus_deliveries set state='PROCESSING',attempts=attempts+1,gate_code=null where id=d.id;
  return jsonb_build_object('state','PROCESSING','deliveryId',d.id,'ownerId',d.owner_id,'profileId',m.profile_id,'kind',d.kind,'workflowProductId',g.workflow_product_id,
   'periodStart',d.period_start,'periodEnd',d.period_end,'solarReturnLocation',m.solar_return_location,'referenceYear',d.reference_year,
   'nextSolarReturnAfter',case when d.kind='solar-return' then m.onboarded_at end,'idempotencyKey','atv-plus:'||d.id::text);
 elsif p_action='ATTACH' then
  if d.state<>'PROCESSING' then raise exception 'delivery_transition_invalid';end if;
  execute $artifact$select a0.* from public.product_artifacts a0 join public.product_runs r on r.id=a0.run_id and r.user_id=a0.user_id
   where a0.id=$1 and a0.user_id=$2 and a0.format='pdf' and r.product_id=$3 and r.request_key=$4 and a0.revision=r.revision and a0.review_digest=r.editorial->>'reviewDigest'
   and (case when $5 in ('predictive-tarot','deep-predictive-tarot') then
     r.input->>'focus'='Previsões do período '||to_char($8 at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')||' a '||to_char($9 at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    else exists(select 1 from public.natal_profiles n where n.id=$6 and n.user_id=$7
     and (r.input#>>'{birth,utcInstant}')::timestamptz=n.utc_instant and r.input#>>'{birth,timezone}'=n.timezone_iana
     and (r.input#>>'{birth,latitude}')::numeric=n.latitude and (r.input#>>'{birth,longitude}')::numeric=n.longitude
     and (r.input#>>'{birth,localDateTime}')::timestamp=n.local_date+n.local_time
     and n.time_precision='EXACT') end)
   and ($5 not in ('personal-horoscope','transit-reading') or r.input->>'targetDate'=to_char($8 at time zone ($10->>'timezone'),'YYYY-MM-DD'))
   and ($5<>'solar-return' or (r.input->'returnLocation'->>'timezone'=$10->>'timezone'
    and (r.input#>>'{returnLocation,latitude}')::numeric=($10->>'latitude')::numeric
    and (r.input#>>'{returnLocation,longitude}')::numeric=($10->>'longitude')::numeric))
   and public.product_artifact_run_allowed(a0.run_id,$2)$artifact$ into a
   using p_artifact_id,d.owner_id,g.workflow_product_id,d.id,d.kind,m.profile_id,m.owner_id,d.period_start,d.period_end,m.solar_return_location;
  if a.id is null then raise exception 'approved_pdf_required';end if;
  if d.kind='solar-return' then
   execute 'select (r.calculation#>>''{data,returnInstant}'')::timestamptz,(r.input->>''returnYear'')::integer from public.product_runs r where r.id=$1 and r.product_id=''solar-return''' into v_return,v_return_year using a.run_id;
   if v_return is null or v_return<=m.onboarded_at or v_return>m.onboarded_at+interval '370 days' or v_return_year not between d.reference_year-1 and d.reference_year+1 then raise exception 'next_solar_return_required';end if;
   v_key:='cycle:'||v_return_year::text;
   -- A refunded, never accepted PDF did not fulfil the gift. Keep its cancelled
   -- audit row while permitting the newly paid delivery for that same cycle.
   perform pg_advisory_xact_lock(hashtextextended('atv-plus:solar:'||d.owner_id::text,0));
   update public.atv_plus_deliveries set period_key='cancelled:'||id::text||':'||period_key
    where owner_id=d.owner_id and kind=d.kind and period_key=v_key and id<>d.id
     and state='CANCELLED' and gate_code='membership_suspended' and provider_message_id is null and delivered_at is null;
   if exists(select 1 from public.atv_plus_deliveries where owner_id=d.owner_id and kind=d.kind and period_key=v_key and id<>d.id) then
    update public.atv_plus_deliveries set state='CANCELLED',gate_code='solar_cycle_already_issued' where id=d.id;
    update public.jobs set state='SUCCEEDED' where idempotency_key='atv-plus:'||d.id::text;
    return jsonb_build_object('state','DUPLICATE');
   end if;
   update public.atv_plus_deliveries set period_key=v_key,period_start=v_return,period_end=v_return where id=d.id;
  end if;
  update public.atv_plus_deliveries set state='READY',artifact_id=a.id where id=d.id;
  return jsonb_build_object('state','READY');
 elsif p_action='BEGIN_SEND' then
  if d.state<>'READY' then raise exception 'delivery_transition_invalid';end if;
  execute 'select a0.* from public.product_artifacts a0 join public.product_runs r on r.id=a0.run_id where a0.id=$1 and a0.user_id=$2 and a0.format=''pdf''
   and r.product_id=$3 and r.request_key=$4 and a0.revision=r.revision and a0.review_digest=r.editorial->>''reviewDigest'' and public.product_artifact_run_allowed(a0.run_id,$2)' into a using d.artifact_id,d.owner_id,g.workflow_product_id,d.id;
  if a.id is null then raise exception 'approved_pdf_required';end if;
  update public.atv_plus_deliveries set state='SENDING' where id=d.id;
  return jsonb_build_object('state','SENDING','recipient',v_phone,'artifactId',a.id,'bodyBase64',replace(encode(a.body,'base64'),E'\n',''),'sha256',a.checksum_sha256,'idempotencyKey','atv-plus:'||d.id::text);
 elsif p_action='ACCEPTED' then
  if d.state<>'SENDING' or p_provider_message_id is null or length(p_provider_message_id) not between 1 and 255 then raise exception 'delivery_transition_invalid';end if;
  update public.atv_plus_deliveries set state='SENT',provider_message_id=p_provider_message_id,gate_code=null where id=d.id;
  update public.jobs set state='SUCCEEDED' where idempotency_key='atv-plus:'||d.id::text;
  return jsonb_build_object('state','SENT');
 end if;
 raise exception 'delivery_transition_invalid';
end;$$;
create function public.atv_plus_delivery_step(p_delivery_id uuid,p_action text,p_artifact_id uuid default null,p_provider_message_id text default null,p_error_code text default null) returns jsonb language sql security invoker set search_path='' as $$select atv_plus_private.delivery_step(p_delivery_id,p_action,p_artifact_id,p_provider_message_id,p_error_code)$$;
revoke all on function atv_plus_private.delivery_step(uuid,text,uuid,text,text),public.atv_plus_delivery_step(uuid,text,uuid,text,text) from public,anon,authenticated;
grant execute on function atv_plus_private.delivery_step(uuid,text,uuid,text,text),public.atv_plus_delivery_step(uuid,text,uuid,text,text) to service_role;
commit;
