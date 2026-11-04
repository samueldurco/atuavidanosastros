-- P06 expand-only. No message body, phone number, name, birth data or reply text.
create table public.whatsapp_consultation_sessions (
  subject_key text primary key check (subject_key ~ '^[a-f0-9]{64}$'),
  state jsonb not null default '{"step":"menu"}'::jsonb,
  last_timestamp bigint not null default 0,
  active_event text,
  active_since timestamptz,
  expires_at timestamptz not null default now() + interval '24 hours'
);
create table public.whatsapp_consultation_dispatches (
  external_event_id text primary key check (external_event_id ~ '^[a-f0-9]{64}$'),
  subject_key text not null check (subject_key ~ '^[a-f0-9]{64}$'),
  state text not null check (state in ('SENDING','SENT','FAILED','NEEDS_RECONCILIATION','SKIPPED')),
  provider_message_hash text check (provider_message_hash ~ '^[a-f0-9]{64}$'),
  intent text check (intent ~ '^[a-z0-9_-]{1,80}$'),
  product_id text check (product_id ~ '^[a-z0-9-]{1,100}$'),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index whatsapp_consultation_dispatch_created_idx on public.whatsapp_consultation_dispatches(created_at);
alter table public.whatsapp_consultation_sessions enable row level security;
alter table public.whatsapp_consultation_dispatches enable row level security;
revoke all on public.whatsapp_consultation_sessions, public.whatsapp_consultation_dispatches from public, anon, authenticated;
grant all on public.whatsapp_consultation_sessions, public.whatsapp_consultation_dispatches to service_role;

-- Serialize per sender and claim each durable event once. A send is never automatically retried:
-- an uncertain provider result requires reconciliation, not a second charge/message.
create function public.claim_whatsapp_consultation(p_event_id text,p_subject_key text,p_timestamp bigint)
returns jsonb language plpgsql security invoker set search_path = public, pg_temp as $$
declare s public.whatsapp_consultation_sessions%rowtype;
begin
  if p_event_id is null or p_subject_key is null or p_timestamp is null
      or p_event_id !~ '^[a-f0-9]{64}$' or p_subject_key !~ '^[a-f0-9]{64}$' or p_timestamp < 0 then
    raise exception 'invalid_claim';
  end if;
  if not exists(select 1 from public.webhook_inbox where provider='whatsapp'
      and external_event_id=p_event_id and signature_verified and event_type like 'whatsapp.message.%') then
    raise exception 'durable_message_required';
  end if;
  insert into public.whatsapp_consultation_sessions(subject_key) values(p_subject_key) on conflict do nothing;
  select * into s from public.whatsapp_consultation_sessions where subject_key=p_subject_key for update;
  if exists(select 1 from public.whatsapp_consultation_dispatches where external_event_id=p_event_id) then
    return jsonb_build_object('result','duplicate');
  end if;
  if s.active_event is not null and s.active_since > now()-interval '2 minutes' then
    return jsonb_build_object('result','busy');
  end if;
  if s.active_event is not null then
    update public.whatsapp_consultation_dispatches set state='NEEDS_RECONCILIATION',completed_at=now()
      where external_event_id=s.active_event and state='SENDING';
    update public.webhook_inbox set processing_state='QUARANTINED',processed_at=now(),last_error_code='needs_reconciliation'
      where provider='whatsapp' and external_event_id=s.active_event;
    s.state := '{"step":"menu"}'::jsonb;
    update public.whatsapp_consultation_sessions set state=s.state,active_event=null,active_since=null
      where subject_key=p_subject_key;
  end if;
  if s.expires_at < now() then s.state := '{"step":"menu"}'::jsonb; end if;
  if p_timestamp < s.last_timestamp or to_timestamp(p_timestamp) < now()-interval '24 hours'
      or to_timestamp(p_timestamp) > now()+interval '1 minute' then
    insert into public.whatsapp_consultation_dispatches(external_event_id,subject_key,state,completed_at)
      values(p_event_id,p_subject_key,'SKIPPED',now());
    update public.webhook_inbox set processing_state='PROCESSED',processed_at=now(),last_error_code='outside_response_window'
      where provider='whatsapp' and external_event_id=p_event_id;
    return jsonb_build_object('result','skipped');
  end if;
  insert into public.whatsapp_consultation_dispatches(external_event_id,subject_key,state) values(p_event_id,p_subject_key,'SENDING');
  update public.whatsapp_consultation_sessions set state=s.state,active_event=p_event_id,active_since=now(),
    last_timestamp=p_timestamp,expires_at=now()+interval '24 hours' where subject_key=p_subject_key;
  update public.webhook_inbox set processing_state='PROCESSING',attempts=attempts+1 where provider='whatsapp' and external_event_id=p_event_id;
  return jsonb_build_object('result','claimed','state',s.state);
end $$;

create function public.complete_whatsapp_consultation(p_event_id text,p_subject_key text,p_outcome text,
  p_state jsonb,p_intent text default null,p_product_id text default null,p_provider_message_hash text default null)
returns void language plpgsql security invoker set search_path = public, pg_temp as $$
declare session_state jsonb;
begin
  if p_outcome is null or p_outcome not in ('SENT','FAILED','NEEDS_RECONCILIATION') then raise exception 'invalid_outcome'; end if;
  if p_state is null or jsonb_typeof(p_state) <> 'object' or (p_state - array['step','choices']) <> '{}'::jsonb
      or coalesce(p_state->>'step','') not in ('menu','topic','question','prosper','choice','closed') then
    raise exception 'invalid_state';
  end if;
  if p_state ? 'choices' then
    if jsonb_typeof(p_state->'choices') <> 'array' or jsonb_array_length(p_state->'choices') > 10 then raise exception 'invalid_state'; end if;
    if exists(select 1 from jsonb_array_elements(p_state->'choices') x where jsonb_typeof(x) <> 'string' or (x #>> '{}') !~ '^[a-z0-9-]{1,100}$') then raise exception 'invalid_state'; end if;
  end if;
  -- Same lock order as claim; expired older callbacks cannot overwrite a later session.
  perform 1 from public.whatsapp_consultation_sessions where subject_key=p_subject_key for update;
  update public.whatsapp_consultation_dispatches set state=p_outcome,completed_at=now(),
    intent=p_intent,product_id=p_product_id,provider_message_hash=p_provider_message_hash
    where external_event_id=p_event_id and subject_key=p_subject_key and state='SENDING';
  if not found then return; end if;
  session_state := case when p_outcome='SENT' then p_state else '{"step":"menu"}'::jsonb end;
  update public.whatsapp_consultation_sessions set state=session_state,active_event=null,active_since=null
    where subject_key=p_subject_key and active_event=p_event_id;
  update public.webhook_inbox set processing_state=case when p_outcome='SENT' then 'PROCESSED' else 'QUARANTINED' end,
    processed_at=now(),last_error_code=case when p_outcome='SENT' then null else lower(p_outcome) end
    where provider='whatsapp' and external_event_id=p_event_id;
end $$;
revoke all on function public.claim_whatsapp_consultation(text,text,bigint) from public,anon,authenticated;
revoke all on function public.complete_whatsapp_consultation(text,text,text,jsonb,text,text,text) from public,anon,authenticated;
grant execute on function public.claim_whatsapp_consultation(text,text,bigint) to service_role;
grant execute on function public.complete_whatsapp_consultation(text,text,text,jsonb,text,text,text) to service_role;

-- Forward-fix / disable: set FEATURE_WHATSAPP_CONSULTATION=false, leaving the receiver
-- and other providers untouched. Retain dispatch records for reconciliation. After the
-- retention window and audit, remove both functions then these two additive tables.
