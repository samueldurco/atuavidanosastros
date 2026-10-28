-- Disposable synthetic profiles from scripts/helpers/product-database.mjs only.
-- Execute in a transaction; this file never depends on production identities.
begin;
set local role service_role;
do $$
declare
 a text := 'anon:10000000-0000-4000-8000-000000000001';
 b text := 'anon:10000000-0000-4000-8000-000000000002';
 u text := 'user:00000000-0000-4000-8000-000000000001';
 input_a jsonb := '{"utcInstant":"1990-05-05T10:00:00Z","localDateTime":"1990-05-05T10:00:00","timezone":"UTC","latitude":0,"longitude":0,"locationSource":"test"}';
 input_b jsonb;
 payload jsonb := '{"version":"atv-free-tool-result/1.0.0","tool":"ascendente","id":"20000000-0000-4000-8000-000000000001","createdAt":"2026-10-28T10:00:00Z","title":"Synthetic result","facts":[],"sections":[],"limits":[]}';
 state jsonb;
 first_result jsonb;
 today_result jsonb;
 history jsonb;
 events_before integer;
 tool_id text;
 expected_midnight timestamptz;
begin
 state:=public.read_free_tool_state(a,'ascendente');
 assert state->'result'='null'::jsonb and state->'profile'='null'::jsonb, 'empty state';
 assert state->'quota'->>'remainingCorrections'='2', 'two corrections before first result';
 state:=public.commit_free_tool_result(a,'ascendente',repeat('a',64),input_a,payload);
 first_result:=state->'result';
 assert state->'quota'->>'profileRevision'='1', 'initial profile';
 assert state->'quota'->>'remainingCorrections'='2', 'initial is not correction';
 state:=public.commit_free_tool_result(a,'ascendente',repeat('a',64),input_a,payload||'{"id":"20000000-0000-4000-8000-000000000099"}');
 assert state->'result'=first_result, 'identical retry returns canonical result';
 assert (select count(*) from public.free_tool_quota_events where subject=a)=1, 'retry has no quota event';

 -- Each tool owns its first result and two corrections; all four share a profile.
 foreach tool_id in array array['mapa-astral','meio-do-ceu','dinheiro-no-mapa'] loop
  state:=public.commit_free_tool_result(a,tool_id,repeat('a',64),input_a,payload||jsonb_build_object('tool',tool_id));
  assert state->'quota'->>'remainingCorrections'='2', 'separate initial quota';
  assert state->'quota'->>'profileRevision'='1', 'same shared profile';
 end loop;
 input_b:=input_a||'{"latitude":1}';
 state:=public.commit_free_tool_result(a,'ascendente',repeat('b',64),input_b,payload);
 assert state->'quota'->>'remainingCorrections'='1', 'first correction counted';
 assert state->'quota'->>'profileRevision'='2', 'profile revision incremented';
 assert state->'result'->>'id'=first_result->>'id', 'correction retains one result id';
 state:=public.read_free_tool_state(a,'mapa-astral');
 assert state->'quota'->>'stale'='true' and state->'quota'->>'remainingCorrections'='2', 'other tool stale without charging';
 assert state->'profile'->'input'=input_b, 'shared latest profile recoverable';
 state:=public.commit_free_tool_result(a,'ascendente',repeat('c',64),input_a||'{"latitude":2}',payload);
 assert state->'quota'->>'remainingCorrections'='0', 'second correction counted';
 select count(*) into events_before from public.free_tool_quota_events;
 begin
  perform public.commit_free_tool_result(a,'ascendente',repeat('d',64),input_a||'{"latitude":3}',payload);
  raise exception 'missing quota_exceeded';
 exception when raise_exception then
  if sqlerrm<>'quota_exceeded' then raise; end if;
 end;
 assert (select count(*) from public.free_tool_quota_events)=events_before, 'rejected correction no event';
 state:=public.commit_free_tool_result(a,'ascendente',repeat('c',64),input_a||'{"latitude":2}',payload);
 assert state->'quota'->>'remainingCorrections'='0', 'reconsult allowed after quota exhausted';
 update public.free_tool_quota_events set occurred_at=clock_timestamp()-interval '25 hours' where subject=a and tool='ascendente' and correction;
 state:=public.commit_free_tool_result(a,'ascendente',repeat('d',64),input_a||'{"latitude":3}',payload);
 assert state->'quota'->>'remainingCorrections'='1', 'rolling window expires';

 -- Daily Tarot is independent by tool and cannot be rerolled by changing a question.
 state:=public.commit_free_tool_result(a,'carta-do-dia',repeat('1',64),'{"focus":"one"}',payload||'{"tool":"carta-do-dia"}');
 first_result:=state->'result';
 expected_midnight:=((clock_timestamp() at time zone 'America/Sao_Paulo')::date+1)::timestamp at time zone 'America/Sao_Paulo';
 assert (state->'quota'->>'resetsAt')::timestamptz=expected_midnight, 'Sao Paulo midnight';
 state:=public.commit_free_tool_result(a,'carta-do-dia',repeat('2',64),'{"focus":"different"}',payload||'{"tool":"carta-do-dia","id":"20000000-0000-4000-8000-000000000099"}');
 assert state->'result'=first_result, 'daily canonical draw survives reroll';
 state:=public.commit_free_tool_result(a,'carta-do-amor',repeat('3',64),'{}',payload||'{"tool":"carta-do-amor"}');
 assert state->'result'->>'tool'='carta-do-amor', 'independent love daily draw';
 assert (select count(*) from public.free_tool_quota_events where subject=a and tool='carta-do-dia')=1, 'daily reroll no event';
 update public.free_tool_quota_results set bucket=bucket-1 where subject=a and tool='carta-do-dia';
 state:=public.read_free_tool_state(a,'carta-do-dia');
 assert state->'result'='null'::jsonb, 'yesterday does not block a new day';

 -- Dream editing preserves identity and consumes no new record regardless of narrative date.
 state:=public.commit_free_tool_result(a,'registro-de-sonho',repeat('4',64),'{"date":"1999-01-01","narrative":"one"}',payload||'{"tool":"registro-de-sonho"}');
 first_result:=state->'result';
 state:=public.commit_free_tool_result(a,'registro-de-sonho',repeat('5',64),'{"date":"2001-01-01","narrative":"edited"}',payload||'{"tool":"registro-de-sonho","id":"20000000-0000-4000-8000-000000000099","createdAt":"2027-01-01T00:00:00Z"}');
 assert state->'result'->>'id'=first_result->>'id' and state->'result'->>'createdAt'=first_result->>'createdAt', 'dream identity preserved';
 assert (select count(*) from public.free_tool_quota_results where subject=a and tool='registro-de-sonho')=1, 'one dream record';
 assert (select count(*) from public.free_tool_quota_events where subject=a and tool='registro-de-sonho')=1, 'dream edit not charged';

 -- Editing yesterday does not spend or overwrite today's independent slot.
 update public.free_tool_quota_results set bucket=bucket-1 where subject=a and tool='registro-de-sonho';
 state:=public.commit_free_tool_result(a,'registro-de-sonho',repeat('a',64),'{"narrative":"yesterday revised"}',first_result);
 assert (public.read_free_tool_state(a,'registro-de-sonho'))->'result'='null'::jsonb, 'old edit leaves today available';
 state:=public.commit_free_tool_result(a,'registro-de-sonho',repeat('b',64),'{"narrative":"today"}',payload||'{"tool":"registro-de-sonho","id":"20000000-0000-4000-8000-000000000098"}');
 today_result:=state->'result';
 state:=public.commit_free_tool_result(a,'registro-de-sonho',repeat('c',64),'{"narrative":"yesterday revised again"}',first_result);
 assert state->'result'->>'id'=first_result->>'id' and state->'input'->>'narrative'='yesterday revised again', 'commit returns edited history target';
 assert (public.read_free_tool_state(a,'registro-de-sonho'))->'result'=today_result, 'old edit does not replace today';
 assert (select count(*) from public.free_tool_quota_events where subject=a and tool='registro-de-sonho')=2, 'only new dream days consume entries';
 history:=public.read_free_tool_history(a,'registro-de-sonho');
 assert jsonb_array_length(history->'history')=2 and history->'history'->0->'result'=today_result, 'history latest day first';
 assert (public.read_free_tool_history(b,'registro-de-sonho'))->'history'='[]'::jsonb, 'history isolated by subject';
 begin
  perform public.read_free_tool_history(a,'ascendente');
  raise exception 'history only for dreams';
 exception when invalid_parameter_value then null;
 end;
 insert into public.free_tool_quota_results(subject,tool,bucket,input_hash,input,result)
  select a,'registro-de-sonho',(clock_timestamp() at time zone 'America/Sao_Paulo')::date-n,repeat('d',64),'{}',
   payload||jsonb_build_object('tool','registro-de-sonho','id',md5(n::text)::uuid::text) from generate_series(2,102) n;
 history:=public.read_free_tool_history(a,'registro-de-sonho');
 assert jsonb_array_length(history->'history')=100 and history->'history'->0->'result'=today_result, 'history limited to 100 newest';
 assert history->>'nextCursor' is not null, 'remaining history advertises cursor';
 history:=public.read_free_tool_history(a,'registro-de-sonho',(history->>'nextCursor')::date);
 assert jsonb_array_length(history->'history')=3 and history->'nextCursor'='null'::jsonb, 'cursor exposes complete older history';
 history:=public.read_free_tool_history(a,'registro-de-sonho',null,md5('102')::uuid);
 assert jsonb_array_length(history->'history')=1 and history->'history'->0->'result'->>'id'=md5('102')::uuid::text, 'owned old result lookup';
 assert history->'nextCursor'='null'::jsonb, 'single target does not paginate';
 assert (public.read_free_tool_history(b,'registro-de-sonho',null,md5('102')::uuid))->'history'='[]'::jsonb, 'target lookup cannot cross subjects';

 -- A fixed logical pair, with two corrections and explicit consent.
 state:=public.commit_free_tool_result(a,'combinacao-do-casal',repeat('6',64),jsonb_build_object('first',input_a,'second',input_b,'consent',true),payload||'{"tool":"combinacao-do-casal"}');
 assert state->'quota'->>'remainingCorrections'='2', 'pair initial';
 state:=public.commit_free_tool_result(a,'combinacao-do-casal',repeat('7',64),jsonb_build_object('first',input_b,'second',input_b,'consent',true),payload||'{"tool":"combinacao-do-casal"}');
 state:=public.commit_free_tool_result(a,'combinacao-do-casal',repeat('8',64),jsonb_build_object('first',input_b,'second',input_a,'consent',true),payload||'{"tool":"combinacao-do-casal"}');
 assert state->'quota'->>'remainingCorrections'='0', 'pair two corrections';
 assert (select count(*) from public.free_tool_profiles where subject=a and kind='pair')=1, 'one fixed pair profile';
 begin
  perform public.commit_free_tool_result(a,'combinacao-do-casal',repeat('9',64),jsonb_build_object('first',input_a,'second',input_a,'consent',false),payload||'{"tool":"combinacao-do-casal"}');
  raise exception 'missing invalid_input';
 exception when invalid_parameter_value then null;
 end;

 -- Failed/invalid calculation payloads never create a quota event.
 select count(*) into events_before from public.free_tool_quota_events;
 begin
  perform public.commit_free_tool_result(a,'ascendente',repeat('f',64),input_a,'{}');
  raise exception 'missing invalid_input';
 exception when invalid_parameter_value then null;
 end;
 assert (select count(*) from public.free_tool_quota_events)=events_before, 'invalid payload no quota';
 begin
  perform public.read_free_tool_state(a,'tarot-sim-ou-nao');
  raise exception 'legacy tool must be canonicalized in adapter';
 exception when invalid_parameter_value then null;
 end;

 -- Claim never resets consumption; conflicting profiles require explicit account preservation.
 state:=public.commit_free_tool_result(b,'ascendente',repeat('a',64),input_a,payload);
 state:=public.commit_free_tool_result(b,'ascendente',repeat('b',64),input_b,payload);
 state:=public.commit_free_tool_result(u,'ascendente',repeat('c',64),input_a||'{"latitude":3}',payload);
 begin
  perform public.claim_free_tool_subject(b,u);
  raise exception 'missing claim_conflict';
 exception when raise_exception then
  if sqlerrm<>'claim_conflict' then raise; end if;
 end;
 assert (select claimed_by is null from public.free_tool_subjects where subject=b), 'conflict is atomic';
 perform public.claim_free_tool_subject(b,u,'account');
 state:=public.read_free_tool_state(u,'ascendente');
 assert state->'profile'->'input'=input_a||'{"latitude":3}'::jsonb, 'account profile never silently overwritten';
 assert state->'quota'->>'remainingCorrections'='0', 'merged initial and correction conservatively counted';
 select count(*) into events_before from public.free_tool_quota_events where subject=u;
 perform public.claim_free_tool_subject(b,u,'account');
 assert (select count(*) from public.free_tool_quota_events where subject=u)=events_before, 'claim is idempotent';
 begin
  perform public.read_free_tool_state(b,'ascendente');
  raise exception 'missing subject_claimed';
 exception when raise_exception then
  if sqlerrm<>'subject_claimed' then raise; end if;
 end;
 begin
  perform public.commit_free_tool_result(b,'ascendente',repeat('e',64),input_a,payload);
  raise exception 'missing subject_claimed';
 exception when raise_exception then
  if sqlerrm<>'subject_claimed' then raise; end if;
 end;
end;
$$;
reset role;

do $$
declare r record;
begin
 for r in select c.oid,c.relname,c.relrowsecurity from pg_class c where c.relnamespace='public'::regnamespace
  and c.relname in ('free_tool_subjects','free_tool_profiles','free_tool_quota_results','free_tool_quota_events') loop
  assert r.relrowsecurity, 'RLS required on all ledger tables';
  assert not has_table_privilege('anon',r.oid,'SELECT,INSERT,UPDATE,DELETE'), 'no anon table privilege';
  assert not has_table_privilege('authenticated',r.oid,'SELECT,INSERT,UPDATE,DELETE'), 'no authenticated table privilege';
 end loop;
 for r in select p.oid,p.prosecdef,p.proconfig from pg_proc p where p.oid in (
  'public.lock_free_tool_subject(text)'::regprocedure,'public.read_free_tool_state(text,text)'::regprocedure,
  'public.read_free_tool_history(text,text,date,uuid)'::regprocedure,
  'public.commit_free_tool_result(text,text,text,jsonb,jsonb)'::regprocedure,'public.claim_free_tool_subject(text,text,text)'::regprocedure) loop
  assert not r.prosecdef, 'security invoker only';
  assert 'search_path=""'=any(r.proconfig), 'fixed empty search path';
  assert not has_function_privilege('anon',r.oid,'EXECUTE'), 'no anonymous RPC';
  assert not has_function_privilege('authenticated',r.oid,'EXECUTE'), 'no client RPC';
  assert has_function_privilege('service_role',r.oid,'EXECUTE'), 'server RPC enabled';
 end loop;
 -- Deleting the account cascades owned data and claimed anonymous tombstones.
 delete from public.profiles where id='00000000-0000-4000-8000-000000000001';
 assert not exists(select 1 from public.free_tool_subjects where subject in ('user:00000000-0000-4000-8000-000000000001','anon:10000000-0000-4000-8000-000000000002')), 'account deletion cascades';
end;
$$;
set local role anon;
do $$ begin
 begin
  perform public.read_free_tool_state('anon:10000000-0000-4000-8000-000000000001','ascendente');
  raise exception 'anonymous RPC leaked';
 exception when insufficient_privilege then null;
 end;
 begin
  perform 1 from public.free_tool_quota_results;
  raise exception 'anonymous table leaked';
 exception when insufficient_privilege then null;
 end;
end; $$;
rollback;
