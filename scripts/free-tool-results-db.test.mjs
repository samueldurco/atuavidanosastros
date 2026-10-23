import test from 'node:test';
import assert from 'node:assert/strict';
import { setupProductDatabase, file, owner, other } from './helpers/product-database.mjs';
import { asRole } from './helpers/artifact-fixture.mjs';
const migration='supabase/migrations/20261013115721_public_free_tool_results.sql';
const resultId='10000000-0000-4000-8000-000000000001';
const snapshot={version:'atv-free-tool-result/1.0.0',id:resultId,tool:'carta-do-dia',createdAt:'2026-10-13T12:00:00.000Z',title:'Carta sintética para QA',summary:'Somente isolamento do banco.',facts:[],sections:[],limits:['Fixture de teste, sem aprovação de conteúdo.']};
async function fixture(){const db=await setupProductDatabase();await db.exec(await file(migration));await db.exec(await file('supabase/migrations/20261015145634_expanded_free_tool_result_ids.sql'));return db;}
const insert=(db,user=owner,value=snapshot)=>db.query('insert into free_tool_results(user_id,id,tool,result) values ($1,$2,$3,$4) on conflict(user_id,id) do nothing',[user,resultId,'carta-do-dia',value]);

test('all nine tools retain private persistence and unknown tools remain denied',async()=>{
 const db=await fixture();try{
  for(const tool of ['ascendente','mapa-astral','carta-do-dia','tarot-sim-ou-nao','combinacao-do-casal','registro-de-sonho','meio-do-ceu','dinheiro-no-mapa','carta-do-amor']){
   const id=crypto.randomUUID(),value={...snapshot,id,tool};
   await asRole(db,'service_role',null,()=>db.query('insert into free_tool_results(user_id,id,tool,result) values($1,$2,$3,$4)',[owner,id,tool,value]));
  }
  assert.equal((await asRole(db,'authenticated',owner,()=>db.query('select * from free_tool_results'))).rows.length,9);
  assert.equal((await asRole(db,'authenticated',other,()=>db.query('select * from free_tool_results'))).rows.length,0);
  await assert.rejects(asRole(db,'service_role',null,()=>db.query('insert into free_tool_results(user_id,id,tool,result) values($1,$2,$3,$4)',[owner,resultId,'unknown',{...snapshot,tool:'unknown'}])),/check constraint/);
 }finally{await db.close();}
});

test('direct writes denied; trusted save links one owner-only library item and preserves replay',async()=>{
 const db=await fixture();try{
  await assert.rejects(asRole(db,'anon',null,()=>insert(db)),/permission denied/);
  await assert.rejects(asRole(db,'authenticated',other,()=>insert(db)),/permission denied/);
  await assert.rejects(asRole(db,'authenticated',owner,()=>insert(db)),/permission denied/);
  await asRole(db,'service_role',null,()=>insert(db));
  await asRole(db,'service_role',null,()=>insert(db));
  const own=await asRole(db,'authenticated',owner,()=>db.query("select result from free_tool_results"));assert.equal(own.rows.length,1);assert.deepEqual(own.rows[0].result,snapshot);
  const linked=await asRole(db,'authenticated',owner,()=>db.query("select title,item_type,source_id from library_items where item_type='FREE_TOOL_RESULT'"));assert.equal(linked.rows.length,1);assert.equal(linked.rows[0].source_id,resultId);
  assert.equal((await asRole(db,'authenticated',other,()=>db.query('select * from free_tool_results'))).rows.length,0);
  assert.equal((await asRole(db,'authenticated',other,()=>db.query("select * from library_items where item_type='FREE_TOOL_RESULT'"))).rows.length,0);
  await assert.rejects(asRole(db,'authenticated',owner,()=>db.query("update free_tool_results set result='{}' where id=$1",[resultId])),/permission denied/);
  await assert.rejects(asRole(db,'service_role',null,()=>db.query("update free_tool_results set result='{}' where id=$1",[resultId])),/permission denied/);
  assert.equal((await asRole(db,'authenticated',other,()=>db.query('delete from free_tool_results returning id'))).rows.length,0);
  await asRole(db,'authenticated',owner,()=>db.query('delete from free_tool_results where id=$1',[resultId]));
  assert.equal((await db.query("select * from library_items where item_type='FREE_TOOL_RESULT'")).rows.length,0);
 }finally{await db.close();}
});
test('malformed, mismatched and oversized result cannot enter owner storage',async()=>{
 const db=await fixture();try{
  for(const value of [{}, {...snapshot,id:other},{...snapshot,tool:'registro-de-sonho'},{...snapshot,summary:'x'.repeat(110000)},{...snapshot,facts:null}])await assert.rejects(asRole(db,'service_role',null,()=>insert(db,owner,value)),/check constraint/);
  assert.equal((await db.query('select * from free_tool_results')).rows.length,0);
 }finally{await db.close();}
});
test('additive migration can roll back before release and reapply; existing compass data remains',async()=>{
 const db=await fixture();try{
  await db.exec('drop trigger free_tool_library_link on public.free_tool_results; drop function public.link_free_tool_result(); drop table public.free_tool_results;');
  assert.equal((await db.query("select count(*)::int as count from information_schema.tables where table_name='calculation_results'")).rows[0].count,1);
  await db.exec(await file(migration));await asRole(db,'service_role',null,()=>insert(db));
  assert.equal((await db.query('select count(*)::int as count from free_tool_results')).rows[0].count,1);
 }finally{await db.close();}
});

test('Auth deletion unlinks six saved results without library privileges; rollback and forward fix preserve isolation',async()=>{
 const db=await fixture();try{
  // PGlite runs FK cascades as the referencing-table owner. This synthetic-only
  // trigger reproduces the hosted AFTER-trigger execution as supabase_auth_admin.
  // Its free-result grant and policy emulate FK deletion; neither is deployed.
  await db.exec(`
   create role supabase_auth_admin;
   grant usage on schema auth to supabase_auth_admin;
   grant select,delete on auth.users to supabase_auth_admin;
   grant select,delete on public.free_tool_results to supabase_auth_admin;
   create policy fixture_hosted_auth_cascade on public.free_tool_results
    to supabase_auth_admin using (true);
   create function auth.delete_fixture_free_results() returns trigger
    language plpgsql security invoker set search_path = '' as $$
   begin
    delete from public.free_tool_results where user_id = old.id;
    return old;
   end;
   $$;
   create trigger fixture_hosted_auth_cascade before delete on auth.users
    for each row execute function auth.delete_fixture_free_results();
  `);
  const fix='supabase/migrations/20261013145855_free_tool_auth_delete_cascade.sql';
  const rollback='supabase/rollbacks/20261013145855_free_tool_auth_delete_cascade.sql';
  const tools=['ascendente','mapa-astral','carta-do-dia','tarot-sim-ou-nao','combinacao-do-casal','registro-de-sonho'];
  const results=tools.map((tool,index)=>({...snapshot,id:`10000000-0000-4000-8000-00000000000${index+1}`,tool}));
  const saveAll=async(user)=>{
   for(const value of results)await asRole(db,'service_role',null,()=>db.query(
    'insert into free_tool_results(user_id,id,tool,result) values ($1,$2,$3,$4)',
    [user,value.id,value.tool,value]));
  };
  const deleteAccount=async(user)=>{
   await db.exec('set role supabase_auth_admin');
   try{return await db.query('delete from auth.users where id=$1',[user]);}
   finally{await db.exec('reset role');}
  };
  const counts=async()=>((await db.query(`select
   (select count(*)::int from auth.users) as users,
   (select count(*)::int from public.profiles) as profiles,
   (select count(*)::int from public.free_tool_results) as results,
   (select count(*)::int from public.library_items) as library`)).rows[0]);
  const libraryPermissionError=(error)=>error.code==='42501'&&/permission denied for table library_items/.test(error.message);
  await saveAll(owner);await saveAll(other);
  await assert.rejects(()=>deleteAccount(owner),libraryPermissionError);
  assert.deepEqual(await counts(),{users:2,profiles:2,results:12,library:12});

  await db.exec(await file(fix));
  const privileges=(await db.query(`select
   has_table_privilege('supabase_auth_admin','public.library_items','SELECT') as library_select,
   has_table_privilege('supabase_auth_admin','public.library_items','DELETE') as library_delete,
   has_table_privilege('supabase_auth_admin','public.free_tool_results','INSERT') as result_insert,
   (select prosecdef from pg_proc where oid='public.link_free_tool_result()'::regprocedure) as security_definer`)).rows[0];
  assert.deepEqual(privileges,{library_select:false,library_delete:false,result_insert:false,security_definer:false});
  await deleteAccount(owner);
  assert.deepEqual(await counts(),{users:1,profiles:1,results:6,library:6});
  assert.equal((await asRole(db,'authenticated',owner,()=>db.query('delete from free_tool_results returning id'))).rows.length,0);
  const remaining=await asRole(db,'authenticated',other,()=>db.query('select id,tool,result from free_tool_results order by id'));
  assert.deepEqual(remaining.rows,results.map(value=>({id:value.id,tool:value.tool,result:value})));
  assert.equal((await asRole(db,'authenticated',other,()=>db.query('delete from free_tool_results where id=$1 returning id',[results[0].id]))).rows.length,1);
  assert.deepEqual(await counts(),{users:1,profiles:1,results:5,library:5});
  await asRole(db,'service_role',null,()=>db.query('insert into free_tool_results(user_id,id,tool,result) values ($1,$2,$3,$4)',
   [other,results[0].id,results[0].tool,results[0]]));

  await db.exec(await file(rollback));
  await assert.rejects(()=>deleteAccount(other),libraryPermissionError);
  assert.deepEqual(await counts(),{users:1,profiles:1,results:6,library:6});
  await db.exec(await file(fix));
  await deleteAccount(other);
  assert.deepEqual(await counts(),{users:0,profiles:0,results:0,library:0});
 }finally{await db.close();}
});
