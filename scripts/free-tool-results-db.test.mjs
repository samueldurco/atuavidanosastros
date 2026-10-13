import test from 'node:test';
import assert from 'node:assert/strict';
import { setupProductDatabase, file, owner, other } from './helpers/product-database.mjs';
import { asRole } from './helpers/artifact-fixture.mjs';
const migration='supabase/migrations/20261013115721_public_free_tool_results.sql';
const resultId='10000000-0000-4000-8000-000000000001';
const snapshot={version:'atv-free-tool-result/1.0.0',id:resultId,tool:'carta-do-dia',createdAt:'2026-10-13T12:00:00.000Z',title:'Carta sintética para QA',summary:'Somente isolamento do banco.',facts:[],sections:[],limits:['Fixture de teste, sem aprovação de conteúdo.']};
async function fixture(){const db=await setupProductDatabase();await db.exec(await file(migration));return db;}
const insert=(db,user=owner,value=snapshot)=>db.query('insert into free_tool_results(user_id,id,tool,result) values ($1,$2,$3,$4) on conflict(user_id,id) do nothing',[user,resultId,'carta-do-dia',value]);

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
