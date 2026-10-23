import test from 'node:test';
import assert from 'node:assert/strict';
import { setupProductDatabase, file, owner, other } from './helpers/product-database.mjs';
import { asRole } from './helpers/artifact-fixture.mjs';

const migration = 'supabase/migrations/20261023175333_free_tool_library_universe.sql';
const rollback = 'supabase/rollbacks/20261023175333_free_tool_library_universe.sql';
const catalogUniverses = {
 ascendente: 'meu-ceu', 'mapa-astral': 'meu-ceu',
 'combinacao-do-casal': 'amor', 'registro-de-sonho': 'sonhos',
 'meio-do-ceu': 'proposito', 'dinheiro-no-mapa': 'proposito',
 'carta-do-dia': 'tarot', 'carta-do-amor': 'tarot', 'tarot-sim-ou-nao': 'tarot'
};
const careerTools = ['meio-do-ceu', 'dinheiro-no-mapa'];
async function fixture() {
 const db = await setupProductDatabase();
 for (const name of ['20261013115721_public_free_tool_results.sql',
  '20261013145855_free_tool_auth_delete_cascade.sql', '20261015145634_expanded_free_tool_result_ids.sql']) {
  await db.exec(await file('supabase/migrations/' + name));
 }
 return db;
}
async function save(db, user, tool) {
 const id = crypto.randomUUID();
 const result = { version: 'atv-free-tool-result/1.0.0', id, tool,
  createdAt: '2026-10-23T17:45:00.000Z', title: 'Resultado sintético de QA',
  summary: 'Fixture de persistência, sem aprovação editorial.', facts: [], sections: [], limits: [] };
 await asRole(db, 'service_role', null, () => db.query(
  'insert into public.free_tool_results(user_id,id,tool,result) values($1,$2,$3,$4)', [user,id,tool,result]));
 return id;
}
const rows = async (db, table) => (await db.query(`select * from public.${table} order by user_id,id`)).rows;
const security = async (db) => (await db.query(`select
 p.prosecdef, p.proconfig, p.proowner, p.proacl,
 (select relrowsecurity from pg_class where oid='public.free_tool_results'::regclass) as results_rls,
 (select relrowsecurity from pg_class where oid='public.library_items'::regclass) as library_rls,
 has_table_privilege('authenticated','public.free_tool_results','INSERT') as client_insert,
 has_table_privilege('authenticated','public.free_tool_results','UPDATE') as client_update
 from pg_proc p where p.oid='public.link_free_tool_result()'::regprocedure`)).rows[0];

test('career tool library metadata follows the catalog for old and new saves without touching payloads or other links', async () => {
 const db = await fixture();
 try {
  for (const user of [owner,other]) for (const tool of Object.keys(catalogUniverses)) await save(db,user,tool);
  const ownerOnly = await save(db,owner,'meio-do-ceu');
  await db.query(`update public.library_items item set universe='meu-ceu'
   from public.free_tool_results result where item.user_id=result.user_id
   and item.source_id=result.id::text and result.user_id=$1 and result.tool='dinheiro-no-mapa'`,[other]);
  await db.query("update public.library_items set archived_at='2026-10-23T17:45:00Z' where user_id=$1 and source_id=$2",[owner,ownerOnly]);
  // A matching source ID alone must never modify another owner's link or another item type.
  await db.query(`insert into public.library_items(user_id,title,universe,item_type,source_id,occurred_at)
   values($1,'Unrelated owner','tarot','FREE_TOOL_RESULT',$2,now()),
   ($3,'Unrelated item type','tarot','COMPASS_RESULT',$2,now())`, [other,ownerOnly,owner]);
  const before = await rows(db,'library_items');
  const payloads = await rows(db,'free_tool_results');
  const privilegeBefore = await security(db);
  assert.equal(before.filter(item => item.universe === 'proposito').length,0);
  await db.exec(await file(migration));
  const after = await rows(db,'library_items');
  assert.deepEqual(after,before.map(item => ({...item, universe:
   item.item_type === 'FREE_TOOL_RESULT' && item.universe === 'tarot' && payloads.some(result => result.user_id === item.user_id &&
    result.id === item.source_id && careerTools.includes(result.tool)) ? 'proposito' : item.universe })));
  assert.deepEqual(await rows(db,'free_tool_results'),payloads);
  assert.deepEqual(await security(db),privilegeBefore);
  assert.equal(privilegeBefore.prosecdef,false);
  assert.deepEqual([privilegeBefore.results_rls,privilegeBefore.library_rls,
   privilegeBefore.client_insert,privilegeBefore.client_update],[true,true,false,false]);

  for (const [tool,expected] of Object.entries(catalogUniverses)) {
   const id = await save(db,owner,tool);
   const linked = await asRole(db,'authenticated',owner,()=>db.query(
    "select universe from public.library_items where item_type='FREE_TOOL_RESULT' and source_id=$1",[id]));
   assert.equal(linked.rows[0].universe,expected,tool);
   assert.equal((await asRole(db,'authenticated',other,()=>db.query(
    "select id from public.library_items where item_type='FREE_TOOL_RESULT' and source_id=$1",[id]))).rows.length,0);
  }
  // Reapplication is a no-op for already repaired metadata.
  const repaired = await rows(db,'library_items');
  await db.exec(await file(migration));
  assert.deepEqual(await rows(db,'library_items'),repaired);
  await db.exec(await file(rollback));
  assert.deepEqual(await rows(db,'library_items'),repaired);
  const rollbackId = await save(db,owner,'dinheiro-no-mapa');
  assert.equal((await db.query('select universe from library_items where user_id=$1 and source_id=$2',[owner,rollbackId])).rows[0].universe,'tarot');
  await db.exec(await file(migration));
  assert.equal((await db.query('select universe from library_items where user_id=$1 and source_id=$2',[owner,rollbackId])).rows[0].universe,'proposito');
  assert.deepEqual(await security(db),privilegeBefore);
 } finally { await db.close(); }
});

test('universe migration and its rollback preserve the Auth cascade fix without granting library access', async () => {
 const db = await fixture();
 try {
  // Synthetic hosted AFTER-trigger context; these fixture-only grants are not deployed.
  await db.exec(`create role supabase_auth_admin;
   grant usage on schema auth to supabase_auth_admin;
   grant select,delete on auth.users,public.free_tool_results to supabase_auth_admin;
   create policy fixture_auth_cascade on public.free_tool_results to supabase_auth_admin using(true);
   create function auth.delete_fixture_free_results() returns trigger language plpgsql security invoker set search_path='' as $$
   begin delete from public.free_tool_results where user_id=old.id; return old; end; $$;
   create trigger fixture_auth_cascade before delete on auth.users for each row execute function auth.delete_fixture_free_results();`);
  for(const user of [owner,other]) for(const tool of Object.keys(catalogUniverses)) await save(db,user,tool);
  await db.exec(await file(migration));
  assert.equal((await db.query("select has_table_privilege('supabase_auth_admin','public.library_items','DELETE') as allowed")).rows[0].allowed,false);
  const remaining = (await rows(db,'free_tool_results')).filter(result=>result.user_id===other);
  await db.exec('set role supabase_auth_admin');
  try { await db.query('delete from auth.users where id=$1',[owner]); } finally { await db.exec('reset role'); }
  assert.deepEqual(await rows(db,'free_tool_results'),remaining);
  assert.equal((await rows(db,'library_items')).length,9);
  await db.exec(await file(rollback));
  await db.exec('set role supabase_auth_admin');
  try { await db.query('delete from auth.users where id=$1',[other]); } finally { await db.exec('reset role'); }
  assert.equal((await rows(db,'free_tool_results')).length,0);
  assert.equal((await rows(db,'library_items')).length,0);
 } finally { await db.close(); }
});
