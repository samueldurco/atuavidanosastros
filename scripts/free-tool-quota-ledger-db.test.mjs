import test from 'node:test';
import assert from 'node:assert/strict';
import { setupProductDatabase, file, owner } from './helpers/product-database.mjs';
import { freeToolLedgerForwardFix } from './free-tool-quota-ledger-recovery.mjs';

test('free-tool quota ledger: successful commits, reuse, rolling corrections, daily rules, claims and ACL', async () => {
 const db = await setupProductDatabase({ privateOnly: true });
 try {
  await db.exec(await file('supabase/migrations/20261028171546_free_tool_quota_ledger.sql'));
  await db.exec(await file('supabase/tests/free_tool_quota_ledger.test.sql'));
 } finally {
  await db.close();
 }
});

test('expansion preserves the previous library contract and forward-fix is atomic, repeatable and data preserving', async () => {
 const db = await setupProductDatabase({ privateOnly: true });
 const anonymous = 'anon:40000000-0000-4000-8000-000000000001';
 const user = `user:${owner}`;
 const input = { utcInstant: '1990-05-05T10:00:00Z', latitude: 0, longitude: 0 };
 const payload = { version: 'atv-free-tool-result/1.0.0', tool: 'ascendente', id: '50000000-0000-4000-8000-000000000001', createdAt: '2026-10-28T10:00:00Z', title: 'Synthetic result', facts: [], sections: [], limits: [] };
 const service = callback => db.transaction(async transaction => {
  await transaction.exec('set local role service_role');
  return callback(transaction);
 });
 const snapshot = async () => {
  const data = {};
  for (const table of ['free_tool_subjects', 'free_tool_profiles', 'free_tool_quota_results', 'free_tool_quota_events', 'calculation_results']) {
   data[table] = (await db.query(`select coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text),'[]'::jsonb) as rows from public.${table} t`)).rows[0].rows;
  }
  return data;
 };
 try {
  // The pre-expansion consumer writes through the existing ownership/RLS contract.
  const legacyWrite = fingerprint => db.transaction(async transaction => {
   await transaction.query("select set_config('request.jwt.claim.sub',$1,true)", [owner]);
   await transaction.exec('set local role authenticated');
   return transaction.query("insert into public.calculation_results(user_id,kind,input_fingerprint,result,provenance) values ($1,'MIDHEAVEN',$2,'{\"synthetic\":true}','{\"version\":\"legacy-contract\"}') returning id", [owner, fingerprint]);
  });
  const originalLegacy = (await legacyWrite('before-expansion')).rows[0].id;
  await db.exec(await file('supabase/migrations/20261028171546_free_tool_quota_ledger.sql'));
  await service(transaction => transaction.query('select public.commit_free_tool_result($1,$2,$3,$4,$5)', [anonymous, 'ascendente', 'a'.repeat(64), input, payload]));
  await service(transaction => transaction.query('select public.commit_free_tool_result($1,$2,$3,$4,$5)', [anonymous, 'ascendente', 'b'.repeat(64), { ...input, latitude: 1 }, payload]));
  await service(transaction => transaction.query('select public.claim_free_tool_subject($1,$2,null)', [anonymous, user]));
  const state = (await service(transaction => transaction.query('select public.read_free_tool_state($1,$2) as state', [user, 'ascendente']))).rows[0].state;
  assert.equal(state.quota.remainingCorrections, 1);
  assert.equal(state.result.id, payload.id);
  assert.equal(state.result.createdAt, payload.createdAt);

  // Reverting a library consumer after expansion still preserves its existing rows.
  await legacyWrite('after-expansion-legacy-consumer');
  assert.equal((await db.query('select count(*)::int as count from public.calculation_results where id=$1', [originalLegacy])).rows[0].count, 1);
  const before = await snapshot();
  assert.equal(before.free_tool_subjects.find(row => row.subject === anonymous).claimed_by, user);
  assert.equal(before.free_tool_quota_events.length, 2);

  // Synthetic faulty function/ACL drift: restore in place, with no schema/data rollback.
  await db.exec(`create or replace function public.read_free_tool_state(p_subject text,p_tool text) returns jsonb language plpgsql security invoker set search_path='' as $$ begin raise exception 'synthetic_regression'; end $$;
   grant execute on function public.read_free_tool_state(text,text) to anon;
   alter table public.free_tool_quota_results disable row level security;`);
  await assert.rejects(service(transaction => transaction.query('select public.read_free_tool_state($1,$2)', [user, 'ascendente'])), /synthetic_regression/);
  const fix = await freeToolLedgerForwardFix();
  assert.match(fix, /begin;/);
  assert.match(fix, /commit;/);
  assert.doesNotMatch(fix, /\b(drop|truncate)\s+(table|function|index)\b/i);
  // An interrupted forward-fix cannot leave a mixture of old and new definitions.
  await assert.rejects(db.exec(fix.replace(/commit;\s*$/, 'select 1 / 0;\ncommit;')), /division by zero/);
  await db.exec('rollback;');
  assert.deepEqual(await snapshot(), before);
  await assert.rejects(service(transaction => transaction.query('select public.read_free_tool_state($1,$2)', [user, 'ascendente'])), /synthetic_regression/);
  assert.equal((await db.query("select relrowsecurity as rls from pg_class where oid='public.free_tool_quota_results'::regclass")).rows[0].rls, false);
  for (let attempt = 0; attempt < 2; attempt++) {
   await db.exec(fix);
   assert.deepEqual(await snapshot(), before, 'forward-fix must preserve all rows, claim tombstones, IDs, dates and quota events');
   const restored = (await service(transaction => transaction.query('select public.read_free_tool_state($1,$2) as state', [user, 'ascendente']))).rows[0].state;
   assert.deepEqual(restored, state, 'canonical reading and consumed correction remain unchanged');
   const acl = (await db.query("select has_function_privilege('anon','public.read_free_tool_state(text,text)','execute') as anon, has_function_privilege('authenticated','public.read_free_tool_state(text,text)','execute') as authenticated, has_function_privilege('service_role','public.read_free_tool_state(text,text)','execute') as service, relrowsecurity as rls from pg_class where oid='public.free_tool_quota_results'::regclass")).rows[0];
   assert.deepEqual(acl, { anon: false, authenticated: false, service: true, rls: true });
   await assert.rejects(service(transaction => transaction.query('select public.read_free_tool_state($1,$2)', [anonymous, 'ascendente'])), /subject_claimed/);
  }
 } finally {
  await db.close();
 }
});
// PGlite executes the real SQL with synthetic roles but is a single connection.
// Hosted JWT routing and simultaneous independent PostgreSQL sessions remain
// deployment checks; advisory xact locks + unique keys protect those sessions.
