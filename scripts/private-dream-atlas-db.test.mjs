import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { setupProductDatabase, owner, other, file } from './helpers/product-database.mjs';
import { asRole } from './helpers/artifact-fixture.mjs';

// Synthetic PostgreSQL fixtures only: closed cycles are inserted by the test administrator.
// The application never accepts a backdated cycle or exposes a time override.
let db, active, closed, today;
const entryId=randomUUID(), closedEntry=randomUUID(), excludedEntry=randomUUID();
const consent='atv-input-consent/1';
const approval={status:'approved',scope:'private-free-test',policy:'atv-private-trial-approval/1.0.0',digest:'a'.repeat(64)};
const data=(date,include=true)=>({version:'atv-dream-atlas-entry/1',dreamDate:date,narrative:'Relato sintético: procurei uma janela conhecida.',emotions:['curiosidade'],associations:['mudança de casa'],includeInSynthesis:include});
const asOwner=(fn,user=owner)=>asRole(db,'authenticated',user,fn);
const start=(key=randomUUID(),user=owner)=>asOwner(()=>db.query('select (public.start_private_dream_atlas($1,$2)).*',[key,consent]),user);
const save=(cycle,id,revision,entry,user=owner)=>asOwner(()=>db.query('select public.save_private_dream_atlas_entry($1,$2,$3,$4) as revision',[cycle,id,revision,JSON.stringify(entry)]),user);
const insertReading=(cycle,ids,revisions,options={})=>asRole(db,'service_role',null,()=>db.query(`insert into atv_trial_readings(id,owner_id,product_id,request_key,input,calculation,reading,approval,source_ids,dream_atlas_cycle_id) values(gen_random_uuid(),$1,'dream-atlas',$2,$3,$4,$5,$6,$7,$8) returning id`,[owner,randomUUID(),JSON.stringify({productId:'dream-atlas',dreamAtlas:{startDate:options.startDate??cycle.start_date}}),JSON.stringify({data:{sourceRevisions:revisions,entries:[{...data(cycle.start_date),id:ids[0],revision:revisions[ids[0]]}]}}),JSON.stringify({productId:'dream-atlas'}),JSON.stringify(approval),ids,cycle.id]));
before(async()=>{
  db=await setupProductDatabase();
  await db.exec(await file('supabase/migrations/20261006140000_private_product_trials.sql'));
  const continuity=await file('supabase/migrations/20260928130000_product_continuity.sql');
  await db.exec(continuity.slice(continuity.indexOf('create function public.product_continuity_text_valid'),continuity.indexOf('revoke all on function public.product_continuity_text_valid')));
  await db.exec(await file('supabase/migrations/20261015152322_private_dream_atlas_cycles.sql'));
  await db.query('insert into atv_trial_grants(owner_id) values($1),($2)',[owner,other]);
  today=(await db.query("select (now() at time zone 'UTC')::date::text as day")).rows[0].day;
});
after(async()=>{await db?.close();});
test('server owns the start and 30-day duration; retries reuse the same active cycle',async()=>{
  const key=randomUUID(); active=(await start(key)).rows[0];
  assert.equal(active.start_date.toISOString?.().slice(0,10)??active.start_date,today);
  active.start_date=today;
  assert.equal(Date.parse(active.ready_at)-Date.parse(active.started_at),30*86400000);
  assert.equal((await start(key)).rows[0].id,active.id);
  assert.equal((await start()).rows[0].id,active.id);
  await assert.rejects(asOwner(()=>db.query('insert into atv_trial_dream_cycles(owner_id,request_key,consent_version) values($1,$2,$3)',[owner,randomUUID(),consent])),/permission denied/);
  await assert.rejects(asRole(db,'anon',null,()=>db.query('select start_private_dream_atlas($1,$2)',[randomUUID(),consent])),/permission denied/);
});
test('entries persist before any avulsa reading; edits use revisions and explicit inclusion',async()=>{
  assert.equal((await save(active.id,entryId,0,data(today))).rows[0].revision,1);
  const entry=(await asOwner(()=>db.query('select * from atv_trial_dreams where id=$1',[entryId]))).rows[0];
  assert.equal(entry.reading_id,null); assert.equal(entry.cycle_id,active.id);
  assert.equal((await save(active.id,entryId,1,data(today,false))).rows[0].revision,2);
  await assert.rejects(save(active.id,entryId,1,data(today)),/revision_conflict/);
  assert.equal((await save(active.id,entryId,2,data(today))).rows[0].revision,3);
  assert.equal((await db.query('select count(*)::int n from atv_trial_readings')).rows[0].n,0);
});
test('date bounds, unknown fields, foreign owners and direct writes cannot bypass the diary',async()=>{
  const tomorrow=new Date(Date.parse(today)+86400000).toISOString().slice(0,10);
  for(const day of [tomorrow,'2000-01-01']) await assert.rejects(save(active.id,randomUUID(),0,data(day)),/entry_outside_period/);
  await assert.rejects(save(active.id,randomUUID(),0,{...data(today),humanApproved:true}),/invalid_atlas_entry/);
  await assert.rejects(save(active.id,randomUUID(),0,data(today),other),/atlas_run_unavailable/);
  assert.equal((await asOwner(()=>db.query('select * from atv_trial_dream_cycles'),other)).rows.length,0);
  assert.equal((await asOwner(()=>db.query('select * from atv_trial_dreams'),other)).rows.length,0);
  await assert.rejects(asOwner(()=>db.query('update atv_trial_dreams set revision=10')),/permission denied/);
});
test('aggregate diary text is bounded and an edit can free capacity',async()=>{
  const added=[];
  const verbose={...data(today), narrative:'a'.repeat(6000)};
  for(let i=0;i<15;i++){const id=randomUUID();added.push(id);await save(active.id,id,0,verbose);}
  await assert.rejects(save(active.id,randomUUID(),0,verbose),/atlas_text_limit/);
  for(const id of added)await asOwner(()=>db.query('select delete_private_dream_atlas_entry($1,$2)',[active.id,id]));
  assert.equal((await save(active.id,entryId,3,data(today))).rows[0].revision,4);
});
test('even service insertion cannot synthesize an unfinished 30-day cycle',async()=>{
  await assert.rejects(insertReading(active,[entryId],{[entryId]:4}),/atlas_period_open/);
  await assert.rejects(insertReading({...active,id:randomUUID()},[entryId],{[entryId]:4}),/atlas_run_unavailable/);
});
test('a completed synthetic cycle admits exactly its current authorized snapshot',async()=>{
  closed=(await db.query(`insert into atv_trial_dream_cycles(owner_id,request_key,consent_version,started_at,ready_at,start_date) values($1,$2,$3,now()-interval '31 days',now()-interval '1 day',(now() at time zone 'UTC')::date-31) returning id,start_date::text`,[owner,randomUUID(),consent])).rows[0];
  for(const [id,include] of [[closedEntry,true],[excludedEntry,false]])await db.query('insert into atv_trial_dreams(id,owner_id,cycle_id,data) values($1,$2,$3,$4)',[id,owner,closed.id,JSON.stringify(data(closed.start_date,include))]);
  await assert.rejects(save(closed.id,closedEntry,1,data(closed.start_date)),/atlas_period_closed/);
  await assert.rejects(insertReading(closed,[closedEntry],{[closedEntry]:1},{startDate:today}),/invalid_atlas_period/);
  await assert.rejects(insertReading(closed,[closedEntry],{[closedEntry]:2}),/atlas_sources_changed/);
  await assert.rejects(insertReading(closed,[closedEntry,excludedEntry].sort(),{[closedEntry]:1,[excludedEntry]:1}),/atlas_sources_changed/);
  await assert.rejects(insertReading(closed,[entryId],{[entryId]:4}),/atlas_sources_changed/);
  assert.ok((await insertReading(closed,[closedEntry],{[closedEntry]:1})).rows[0].id);
  await assert.rejects(insertReading(closed,[closedEntry],{[closedEntry]:1}),/unique constraint/);
});
test('deletion remains possible after closing and preserves the frozen analysis',async()=>{
  assert.equal((await asOwner(()=>db.query('select delete_private_dream_atlas_entry($1,$2) removed',[closed.id,closedEntry]))).rows[0].removed,true);
  const saved=(await asOwner(()=>db.query('select calculation from atv_trial_readings where dream_atlas_cycle_id=$1',[closed.id]))).rows[0];
  assert.equal(saved.calculation.data.entries[0].narrative,data(today).narrative);
});
test('revoked grants fence reads, starts and updates without erasing saved records',async()=>{
  await db.query('update atv_trial_grants set revoked_at=now() where owner_id=$1',[owner]);
  await assert.rejects(start(),/trial_access_revoked/);
  await assert.rejects(save(active.id,entryId,4,data(today)),/trial_access_revoked/);
  assert.equal((await asOwner(()=>db.query('select * from atv_trial_dream_cycles'))).rows.length,0);
  await db.query('update atv_trial_grants set revoked_at=null where owner_id=$1',[owner]);
  assert.equal((await asOwner(()=>db.query('select * from atv_trial_dream_cycles'))).rows.length,2);
});
test('forward-fix closes mutations and retains private historical data',async()=>{
  await db.exec(await file('supabase/rollbacks/20261015152322_private_dream_atlas_cycles.sql'));
  await assert.rejects(start(),/permission denied/);
  await assert.rejects(save(active.id,entryId,3,data(today)),/permission denied/);
  assert.equal((await asOwner(()=>db.query('select * from atv_trial_dream_cycles'))).rows.length,2);
  assert.equal((await asOwner(()=>db.query('select * from atv_trial_readings'))).rows.length,1);
});
