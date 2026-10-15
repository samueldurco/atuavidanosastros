import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { setupProductDatabase, owner, other, file } from './helpers/product-database.mjs';
import { asRole } from './helpers/artifact-fixture.mjs';

// Disposable PostgreSQL with synthetic identities, never certification of hosted sessions.
let db;
const approval={status:'approved',scope:'private-free-test',policy:'atv-private-trial-approval/1.0.0',digest:'a'.repeat(64)};
const start=(plan='premium',user=owner,key=randomUUID())=>asRole(db,'authenticated',user,async()=>
 (await db.query('select start_atv_plus_test_cycle($1,$2) as id',[plan,key])).rows[0].id);
const insert=async(cycle,product='personal-calendar',{user=owner,id=randomUUID(),key=randomUUID(),stamp=approval}={})=>{
 const input={productId:product};let calculation={};
 if(product.startsWith('tarot-')){
  const draw=await asRole(db,'service_role',null,async()=>(await db.query('select * from reserve_atv_tarot_draw($1,$2,$3)',[user,key,input])).rows[0]);
  id=draw.id;
  const count={'tarot-situation-challenge-advice':3,'tarot-peladan-cross':5,'tarot-aphrodite-temple':7}[product];
  calculation={version:'atv-tarot-method-calculation/2.0.0',kind:'tarot',status:'recorded',data:{executionId:id,methodId:product,cards:Array.from({length:count},(_,i)=>({position:i+1,cardId:`synthetic-${i}`}))}};
  await asRole(db,'service_role',null,()=>db.query('select record_atv_tarot_draw($1,$2,$3)',[user,id,calculation]));
 }
 await asRole(db,'service_role',null,()=>db.query(`insert into atv_trial_readings
 (id,owner_id,product_id,request_key,input,calculation,reading,approval,atv_plus_cycle_id)
 values($1,$2,$3,$4,$5,$6,$5,$7,$8)`,[id,user,product,key,input,calculation,stamp,cycle]));return id;
};
const uses=async cycle=>(await db.query('select product_id,reading_id from atv_plus_test_uses where cycle_id=$1',[cycle])).rows;
before(async()=>{
 db=await setupProductDatabase();
 for(const migration of ['20261006140000_private_product_trials.sql','20261007160000_private_reading_experience.sql',
  '20261008140536_private_reconstruction_approval.sql','20261008170000_private_tarot_methods.sql','20261015145546_atv_plus_owner_simulation.sql'])
  await db.exec(await file('supabase/migrations/'+migration));
 await asRole(db,'service_role',null,()=>db.query('insert into atv_trial_grants(owner_id) values($1),($2)',[owner,other]));
});
after(async()=>{await db?.close();});

test('ordinary test grants do not confer owner simulation; clients cannot grant themselves access',async()=>{
 for(const user of [owner,other]){
  assert.equal((await asRole(db,'authenticated',user,()=>db.query('select has_atv_owner_evaluation_access() as ok'))).rows[0].ok,false);
  await assert.rejects(start('essencial',user),/owner_evaluation_required/);
 }
 await assert.rejects(asRole(db,'authenticated',owner,()=>db.query('update atv_trial_grants set owner_evaluation=true')),/permission denied/);
 await insert(null,'career-compass'); // The independent product evaluation remains available.
 await db.query('update atv_trial_grants set owner_evaluation=true where owner_id=$1',[owner]);
});
test('cycle RPC is owner scoped, idempotent, validates plans, and closes a replaced cycle',async()=>{
 const key=randomUUID(),first=await start('essencial',owner,key);
 assert.equal(await start('essencial',owner,key),first);
 await assert.rejects(start('premium',owner,key),/request_key_reused/);
 await assert.rejects(start('unlimited'),/invalid_plus_plan/);
 for(const role of ['anon','authenticated','service_role'])for(const table of ['atv_plus_test_cycles','atv_plus_test_uses'])
  for(const privilege of ['INSERT','UPDATE','DELETE','TRUNCATE'])
   assert.equal((await db.query('select has_table_privilege($1,$2,$3) as ok',[role,table,privilege])).rows[0].ok,false);
 await assert.rejects(asRole(db,'anon',null,()=>db.query('select * from atv_plus_test_cycles')),/permission denied/);
 await assert.rejects(asRole(db,'anon',null,()=>db.query('select start_atv_plus_test_cycle($1,$2)',['premium',randomUUID()])),/permission denied/);
 assert.equal((await asRole(db,'authenticated',other,()=>db.query('select * from atv_plus_test_cycles'))).rows.length,0);
 await start('ampliado');
 await assert.rejects(insert(first),/plus_cycle_inactive/);
});
test('Essencial accepts either forecast exactly once and excludes standalone offers',async()=>{
 for(const forecast of ['personal-calendar','career-forecast-30d']){
  const cycle=await start('essencial');await insert(cycle,forecast);
  for(const product of ['personal-calendar','career-forecast-30d','dream-reading','career-compass'])
   await assert.rejects(insert(cycle,product),/plus_allowance_exhausted/);
  assert.equal((await uses(cycle)).length,1);
 }
});
test('Ampliado admits one forecast and one basic reading in either order',async()=>{
 for(const basic of ['dream-reading','tarot-situation-challenge-advice']){
  const cycle=await start('ampliado');await insert(cycle,basic);await insert(cycle,'career-forecast-30d');
  await assert.rejects(insert(cycle,basic),/plus_allowance_exhausted/);
  await assert.rejects(insert(cycle,'tarot-peladan-cross'),/plus_allowance_exhausted/);
  assert.equal((await uses(cycle)).length,2);
 }
});
test('Premium allows any two basics OR one extended; never a mixture',async()=>{
 for(const pair of [['dream-reading','dream-reading'],['dream-reading','tarot-situation-challenge-advice'],['tarot-situation-challenge-advice','tarot-situation-challenge-advice']]){
  const cycle=await start();for(const product of pair)await insert(cycle,product);
  await insert(cycle,'personal-calendar');
  for(const extra of ['dream-reading','tarot-peladan-cross','tarot-aphrodite-temple'])await assert.rejects(insert(cycle,extra),/plus_allowance_exhausted/);
  assert.equal((await uses(cycle)).length,3);
 }
 for(const extended of ['tarot-peladan-cross','tarot-aphrodite-temple']){
  const cycle=await start();await insert(cycle,extended);await insert(cycle,'personal-calendar');
  for(const extra of ['dream-reading','tarot-situation-challenge-advice',extended])await assert.rejects(insert(cycle,extra),/plus_allowance_exhausted/);
 }
 const cycle=await start();await insert(cycle,'dream-reading');await assert.rejects(insert(cycle,'tarot-peladan-cross'),/plus_allowance_exhausted/);
});
test('failed, duplicate, archived, and deleted readings cannot refill or double-charge allowance',async()=>{
 const cycle=await start('ampliado'),key=randomUUID();
 await assert.rejects(insert(cycle,'personal-calendar',{stamp:{...approval,status:'rejected'}}),/check constraint/);
 assert.equal((await uses(cycle)).length,0);
 const id=await insert(cycle,'personal-calendar',{key});
 await assert.rejects(insert(cycle,'personal-calendar',{key}),/unique constraint/);
 assert.equal((await uses(cycle)).length,1);
 await db.query('update atv_trial_readings set archived_at=now() where id=$1',[id]);
 await assert.rejects(insert(cycle,'personal-calendar'),/plus_allowance_exhausted/);
 await assert.rejects(db.query('update atv_trial_readings set atv_plus_cycle_id=null where id=$1',[id]),/plus_cycle_assignment_immutable/);
 await db.query('delete from atv_trial_readings where id=$1',[id]);
 assert.deepEqual(await uses(cycle),[{product_id:'personal-calendar',reading_id:null}]);
 await assert.rejects(insert(cycle,'personal-calendar'),/plus_allowance_exhausted/);
 for(let i=0;i<3;i++)await insert(null,'personal-calendar');
 assert.equal((await uses(cycle)).length,1);
});
test('expiry, cancellation, revocation and a foreign owner are checked on the trusted insert',async()=>{
 let cycle=await start();
 await db.query("update atv_plus_test_cycles set started_at=now()-interval '31 days',ends_at=now()-interval '1 day' where id=$1",[cycle]);
 await assert.rejects(insert(cycle),/plus_cycle_inactive/);
 cycle=await start();
 await asRole(db,'authenticated',owner,()=>db.query('select cancel_atv_plus_test_cycle($1)',[cycle]));
 await assert.rejects(insert(cycle),/plus_cycle_inactive/);
 cycle=await start();
 await db.query('update atv_trial_grants set owner_evaluation=true where owner_id=$1',[other]);
 await assert.rejects(insert(cycle,'personal-calendar',{user:other}),/plus_cycle_inactive|foreign key/);
 const otherCycle=await start('essencial',other);
 assert.equal((await asRole(db,'authenticated',owner,()=>db.query('select id from atv_plus_test_cycles where id=$1',[otherCycle]))).rows.length,0);
 assert.equal((await asRole(db,'authenticated',owner,()=>db.query('select cancel_atv_plus_test_cycle($1) as ok',[otherCycle]))).rows[0].ok,false);
 await db.query('update atv_trial_grants set owner_evaluation=false where owner_id=$1',[owner]);
 await assert.rejects(insert(cycle),/owner_evaluation_required/);
 assert.equal((await asRole(db,'authenticated',owner,()=>db.query('select * from atv_plus_test_uses'))).rows.length,0);
 await insert(null,'career-compass');
 await db.query('update atv_trial_grants set owner_evaluation=true,revoked_at=now() where owner_id=$1',[owner]);
 await assert.rejects(insert(cycle),/trial_access_revoked|owner_evaluation_required/);
 await db.query('update atv_trial_grants set revoked_at=null where owner_id=$1',[owner]);
});
test('forward fix disables simulation while preserving independent evaluation and all readings',async()=>{
 const before=(await db.query('select count(*) as n from atv_trial_readings')).rows;
 await db.exec(await file('supabase/rollback/20261015145546_atv_plus_owner_simulation.sql'));
 assert.deepEqual((await db.query('select count(*) as n from atv_trial_readings')).rows,before);
 await assert.rejects(start(),/permission denied/);
 await insert(null,'career-compass');
});
