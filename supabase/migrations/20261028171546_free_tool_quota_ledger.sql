-- Home plan 6.1/6.2: server-owned, successful-result quota ledger.
-- Expansion only. The existing optional library/save contract remains unchanged.
-- Only trusted server code may resolve an HMAC-protected anonymous subject or
-- verified user ID and call these RPCs. No client can read or mutate this ledger.
create table public.free_tool_subjects (
 subject text primary key check (subject ~ '^(anon|user):[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'),
 user_id uuid references public.profiles(id) on delete cascade,
 claimed_by text references public.free_tool_subjects(subject) on delete cascade,
 created_at timestamptz not null default clock_timestamp(),
 check ((subject like 'user:%' and user_id is not null and user_id::text = substr(subject,6)) or (subject like 'anon:%' and user_id is null)),
 check (claimed_by is null or (subject like 'anon:%' and claimed_by like 'user:%'))
);
create table public.free_tool_profiles (
 subject text not null references public.free_tool_subjects(subject) on delete cascade,
 kind text not null check (kind in ('natal','pair')),
 input jsonb not null check (jsonb_typeof(input) = 'object' and octet_length(input::text) <= 20000),
 revision integer not null check (revision > 0),
 updated_at timestamptz not null default clock_timestamp(),
 primary key (subject,kind)
);
create table public.free_tool_quota_results (
 subject text not null references public.free_tool_subjects(subject) on delete cascade,
 tool text not null check (tool in ('ascendente','mapa-astral','meio-do-ceu','dinheiro-no-mapa','combinacao-do-casal','carta-do-dia','carta-do-amor','registro-de-sonho')),
 bucket date not null,
 input_hash text not null check (input_hash ~ '^[0-9a-f]{64}$'),
 input jsonb not null check (jsonb_typeof(input) = 'object' and octet_length(input::text) <= 20000),
 result jsonb not null check (jsonb_typeof(result) = 'object' and octet_length(result::text) <= 110000),
 profile_revision integer not null default 0 check (profile_revision >= 0),
 created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp(),
 primary key (subject,tool,bucket),
 check ((tool in ('carta-do-dia','carta-do-amor','registro-de-sonho') and bucket <> date '0001-01-01') or
        (tool not in ('carta-do-dia','carta-do-amor','registro-de-sonho') and bucket = date '0001-01-01'))
);
create table public.free_tool_quota_events (
 id uuid primary key default gen_random_uuid(),
 subject text not null references public.free_tool_subjects(subject) on delete cascade,
 tool text not null check (tool in ('ascendente','mapa-astral','meio-do-ceu','dinheiro-no-mapa','combinacao-do-casal','carta-do-dia','carta-do-amor','registro-de-sonho')),
 correction boolean not null,
 occurred_at timestamptz not null default clock_timestamp()
);
create index free_tool_quota_corrections on public.free_tool_quota_events(subject,tool,occurred_at desc) where correction;
create unique index free_tool_dream_result_id on public.free_tool_quota_results(subject,(result->>'id')) where tool='registro-de-sonho';

alter table public.free_tool_subjects enable row level security;
alter table public.free_tool_profiles enable row level security;
alter table public.free_tool_quota_results enable row level security;
alter table public.free_tool_quota_events enable row level security;
revoke all on public.free_tool_subjects, public.free_tool_profiles, public.free_tool_quota_results, public.free_tool_quota_events from public,anon,authenticated,service_role;
grant select,insert,update,delete on public.free_tool_subjects, public.free_tool_profiles, public.free_tool_quota_results, public.free_tool_quota_events to service_role;
-- Intentionally no client policies. service_role has the existing Supabase BYPASSRLS role.

create function public.lock_free_tool_subject(p_subject text) returns void
language plpgsql security invoker set search_path = '' as $$
begin
 if p_subject is null or p_subject !~ '^(anon|user):[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
  raise exception using message = 'invalid_input', errcode = '22023';
 end if;
 -- All reads, commits and claims lock the same key for the entire transaction.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_subject, 61028));
 insert into public.free_tool_subjects(subject,user_id)
 values(p_subject,case when p_subject like 'user:%' then substr(p_subject,6)::uuid else null end)
 on conflict(subject) do nothing;
 if exists(select 1 from public.free_tool_subjects where subject=p_subject and claimed_by is not null) then
  raise exception using message = 'subject_claimed', errcode = 'P0001';
 end if;
end;
$$;

create function public.read_free_tool_state(p_subject text,p_tool text) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
 v_now timestamptz := clock_timestamp();
 v_bucket date;
 v_kind text;
 v_mode text;
 v_result public.free_tool_quota_results%rowtype;
 v_profile public.free_tool_profiles%rowtype;
 v_count integer;
 v_reset timestamptz;
begin
 if p_tool is null or p_tool not in ('ascendente','mapa-astral','meio-do-ceu','dinheiro-no-mapa','combinacao-do-casal','carta-do-dia','carta-do-amor','registro-de-sonho') then
  raise exception using message = 'invalid_input', errcode = '22023';
 end if;
 perform public.lock_free_tool_subject(p_subject);
 v_now := clock_timestamp();
 v_mode := case when p_tool in ('carta-do-dia','carta-do-amor') then 'daily-draw' when p_tool='registro-de-sonho' then 'daily-entry' else 'corrections' end;
 v_kind := case when p_tool='combinacao-do-casal' then 'pair' when v_mode='corrections' then 'natal' else null end;
 v_bucket := case when v_mode='corrections' then date '0001-01-01' else (v_now at time zone 'America/Sao_Paulo')::date end;
 select * into v_result from public.free_tool_quota_results where subject=p_subject and tool=p_tool and bucket=v_bucket;
 select * into v_profile from public.free_tool_profiles where subject=p_subject and kind=v_kind;
 if v_mode='corrections' then
  select count(*) into v_count from public.free_tool_quota_events
   where subject=p_subject and tool=p_tool and correction and occurred_at > v_now-interval '24 hours';
  -- A merged account can have more than two historical corrections. Reset only
  -- when fewer than two remain, rather than advertising the first expiry.
  select occurred_at+interval '24 hours' into v_reset from public.free_tool_quota_events
   where subject=p_subject and tool=p_tool and correction and occurred_at > v_now-interval '24 hours'
   order by occurred_at desc offset greatest(least(v_count,2)-1,0) limit 1;
  v_reset := coalesce(v_reset,v_now+interval '24 hours');
 else
  v_reset := ((v_now at time zone 'America/Sao_Paulo')::date + 1)::timestamp at time zone 'America/Sao_Paulo';
 end if;
 return jsonb_build_object(
  'result',v_result.result,'input',v_result.input,
  'profile',case when v_profile.subject is null then null else jsonb_build_object('input',v_profile.input,'revision',v_profile.revision) end,
  'quota',jsonb_build_object('mode',v_mode,'remainingCorrections',case when v_mode='corrections' then greatest(0,2-v_count) else null end,
    'resetsAt',v_reset,'profileRevision',coalesce(v_profile.revision,0),
    'stale',v_result.subject is not null and v_kind is not null and v_result.profile_revision<>coalesce(v_profile.revision,0))
 );
end;
$$;

create function public.read_free_tool_history(p_subject text,p_tool text,p_before date default null,p_result_id uuid default null) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare v_state jsonb; v_history jsonb; v_last date; v_more boolean;
begin
 if p_tool is distinct from 'registro-de-sonho' or (p_before is not null and p_result_id is not null) then
  raise exception using message='invalid_input',errcode='22023';
 end if;
 v_state := public.read_free_tool_state(p_subject,p_tool);
 select coalesce(jsonb_agg(jsonb_build_object('result',r.result,'input',r.input,
  'profile',null,'quota',v_state->'quota') order by r.bucket desc),'[]'::jsonb),min(r.bucket) into v_history,v_last
 from (select result,input,bucket from public.free_tool_quota_results
  where subject=p_subject and tool=p_tool and (p_before is null or bucket<p_before)
   and (p_result_id is null or result->>'id'=p_result_id::text)
  order by bucket desc limit 100) r;
 v_more := p_result_id is null and exists(select 1 from public.free_tool_quota_results
  where subject=p_subject and tool=p_tool and bucket<v_last);
 return jsonb_build_object('history',v_history,'nextCursor',case when v_more then v_last else null end);
end;
$$;

create function public.commit_free_tool_result(p_subject text,p_tool text,p_input_hash text,p_input jsonb,p_result jsonb) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
 v_state jsonb;
 v_now timestamptz;
 v_bucket date;
 v_mode text;
 v_kind text;
 v_result public.free_tool_quota_results%rowtype;
 v_profile public.free_tool_profiles%rowtype;
 v_revision integer := 0;
 v_payload jsonb;
begin
 -- Both the calculation and validation finish before this atomic commit.
 -- A racing daily draw returns the already committed canonical result; the
 -- losing calculation must never be exposed by the HTTP adapter.
 if p_input_hash is null or p_input_hash !~ '^[0-9a-f]{64}$'
  or not coalesce(jsonb_typeof(p_input)='object' and octet_length(p_input::text)<=20000,false)
  or not coalesce(jsonb_typeof(p_result)='object' and octet_length(p_result::text)<=110000
    and p_result->>'version'='atv-free-tool-result/1.0.0' and p_result->>'tool'=p_tool
    and p_result->>'id' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and jsonb_typeof(p_result->'createdAt')='string'
    and jsonb_typeof(p_result->'title')='string' and length(p_result->>'title') between 1 and 180
    and jsonb_typeof(p_result->'facts')='array' and jsonb_typeof(p_result->'sections')='array'
    and jsonb_typeof(p_result->'limits')='array',false) then
  raise exception using message='invalid_input', errcode='22023';
 end if;
 if p_tool='combinacao-do-casal' and not coalesce(p_input->'consent'='true'::jsonb and jsonb_typeof(p_input->'first')='object' and jsonb_typeof(p_input->'second')='object',false) then
  raise exception using message='invalid_input', errcode='22023';
 end if;
 v_state := public.read_free_tool_state(p_subject,p_tool);
 v_now := clock_timestamp();
 v_mode := v_state->'quota'->>'mode';
 v_kind := case when p_tool='combinacao-do-casal' then 'pair' when v_mode='corrections' then 'natal' else null end;
 v_bucket := case when v_mode='corrections' then date '0001-01-01' else (v_now at time zone 'America/Sao_Paulo')::date end;
 -- The HTTP adapter authorizes an explicit history target before copying its
 -- canonical ID into p_result. Ownership is checked again here. Editing an old
 -- dream retains its original server-day bucket and does not use today's slot.
 if p_tool='registro-de-sonho' then
  select * into v_result from public.free_tool_quota_results
   where subject=p_subject and tool=p_tool and result->>'id'=p_result->>'id';
  if v_result.subject is not null then v_bucket:=v_result.bucket; end if;
 end if;
 select * into v_result from public.free_tool_quota_results where subject=p_subject and tool=p_tool and bucket=v_bucket;
 if v_result.subject is not null and (v_mode='daily-draw' or v_result.input_hash=p_input_hash) then
  return public.read_free_tool_state(p_subject,p_tool)||jsonb_build_object('result',v_result.result,'input',v_result.input);
 end if;
 if v_result.subject is not null and v_mode='corrections' and (v_state->'quota'->>'remainingCorrections')::integer=0 then
  raise exception using message='quota_exceeded',errcode='P0001';
 end if;
 if v_kind is not null then
  select * into v_profile from public.free_tool_profiles where subject=p_subject and kind=v_kind;
  if v_profile.subject is null then
   v_revision:=1;
   insert into public.free_tool_profiles(subject,kind,input,revision,updated_at) values(p_subject,v_kind,p_input,v_revision,v_now);
  elsif v_profile.input=p_input then
   v_revision:=v_profile.revision;
  else
   v_revision:=v_profile.revision+1;
   update public.free_tool_profiles set input=p_input,revision=v_revision,updated_at=v_now where subject=p_subject and kind=v_kind;
  end if;
 end if;
 v_payload := p_result;
 -- Corrections and dream edits update one existing logical reading. A new
 -- dream's bucket is the server day, never its user-supplied narrative date.
 if v_result.subject is not null then
  v_payload := jsonb_set(jsonb_set(v_payload,'{id}',v_result.result->'id'),'{createdAt}',v_result.result->'createdAt');
 end if;
 insert into public.free_tool_quota_results(subject,tool,bucket,input_hash,input,result,profile_revision,created_at,updated_at)
 values(p_subject,p_tool,v_bucket,p_input_hash,p_input,v_payload,v_revision,v_now,v_now)
 on conflict(subject,tool,bucket) do update set input_hash=excluded.input_hash,input=excluded.input,result=excluded.result,
  profile_revision=excluded.profile_revision,updated_at=excluded.updated_at;
 if v_result.subject is null or v_mode='corrections' then
  insert into public.free_tool_quota_events(subject,tool,correction,occurred_at)
   values(p_subject,p_tool,v_result.subject is not null,v_now);
 end if;
 return public.read_free_tool_state(p_subject,p_tool)||jsonb_build_object('result',v_payload,'input',p_input);
end;
$$;

create function public.claim_free_tool_subject(p_anonymous_subject text,p_user_subject text,p_resolution text default null) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
 v_claimed text;
 v_profile record;
 v_now timestamptz := clock_timestamp();
begin
 if p_anonymous_subject is null or p_user_subject is null or p_anonymous_subject not like 'anon:%' or p_user_subject not like 'user:%'
  or (p_resolution is not null and p_resolution<>'account') then
  raise exception using message='invalid_input',errcode='22023';
 end if;
 -- Stable lock order prevents deadlocks between concurrent claim/commit calls.
 perform public.lock_free_tool_subject(p_user_subject);
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_anonymous_subject,61028));
 select claimed_by into v_claimed from public.free_tool_subjects where subject=p_anonymous_subject;
 if v_claimed=p_user_subject then return jsonb_build_object('claimed',true); end if;
 perform public.lock_free_tool_subject(p_anonymous_subject);
 if p_resolution is null and exists(
  select 1 from public.free_tool_profiles a join public.free_tool_profiles u on u.kind=a.kind and u.subject=p_user_subject
   where a.subject=p_anonymous_subject and a.input<>u.input
 ) then
  raise exception using message='claim_conflict',errcode='P0001';
 end if;
 -- Keep the account profile on conflict. Choosing different inputs afterwards
 -- is an ordinary correction with its ordinary quota, never a silent overwrite.
 insert into public.free_tool_profiles(subject,kind,input,revision,updated_at)
  select p_user_subject,kind,input,1,v_now from public.free_tool_profiles where subject=p_anonymous_subject
  on conflict(subject,kind) do nothing;
 -- If both identities already used the same natal tool, the anonymous initial
 -- result is an additional successful correction when merging consumption.
 update public.free_tool_quota_events e set correction=true
  where e.subject=p_anonymous_subject and not e.correction
   and e.tool not in ('carta-do-dia','carta-do-amor','registro-de-sonho')
   and exists(select 1 from public.free_tool_quota_results r where r.subject=p_user_subject and r.tool=e.tool);
 update public.free_tool_quota_events set subject=p_user_subject where subject=p_anonymous_subject;
 insert into public.free_tool_quota_results(subject,tool,bucket,input_hash,input,result,profile_revision,created_at,updated_at)
  select p_user_subject,r.tool,r.bucket,r.input_hash,r.input,r.result,
   case when p.input=r.input then p.revision else 0 end,r.created_at,r.updated_at
  from public.free_tool_quota_results r left join public.free_tool_profiles p
   on p.subject=p_user_subject and p.kind=case when r.tool='combinacao-do-casal' then 'pair'
     when r.tool in ('ascendente','mapa-astral','meio-do-ceu','dinheiro-no-mapa') then 'natal' else null end
  where r.subject=p_anonymous_subject on conflict(subject,tool,bucket) do nothing;
 delete from public.free_tool_quota_results where subject=p_anonymous_subject;
 delete from public.free_tool_profiles where subject=p_anonymous_subject;
 update public.free_tool_subjects set claimed_by=p_user_subject where subject=p_anonymous_subject;
 return jsonb_build_object('claimed',true);
end;
$$;
revoke all on function public.lock_free_tool_subject(text), public.read_free_tool_state(text,text),
 public.read_free_tool_history(text,text,date,uuid),
 public.commit_free_tool_result(text,text,text,jsonb,jsonb), public.claim_free_tool_subject(text,text,text) from public,anon,authenticated,service_role;
grant execute on function public.lock_free_tool_subject(text), public.read_free_tool_state(text,text),
 public.read_free_tool_history(text,text,date,uuid),
 public.commit_free_tool_result(text,text,text,jsonb,jsonb), public.claim_free_tool_subject(text,text,text) to service_role;
