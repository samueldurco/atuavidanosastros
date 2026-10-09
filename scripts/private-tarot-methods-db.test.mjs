import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { setupProductDatabase, owner, other, file } from './helpers/product-database.mjs';
import { asRole } from './helpers/artifact-fixture.mjs';

let db;
const migration = '20261008170000_private_tarot_methods.sql';
const methods = Object.entries({ 'tarot-single-card': 1, 'tarot-situation-challenge-advice': 3,
  'tarot-peladan-cross': 5, 'tarot-celtic-cross': 10, 'tarot-aphrodite-temple': 7, 'tarot-astrological-mandala': 13 });
const retired = ['daily-card','tarot-focus','tarot-yes-no','three-questions','tarot-journey'];
const inputFor = (productId) => ({ version: 'atv-workflow/1.0.0', productId,
  consent: { storage: true, policyVersion: 'atv-input-consent/1' } });
const approval = { status: 'approved', scope: 'private-free-test', policy: 'atv-private-interpretation-review/4.0.0', digest: 'a'.repeat(64) };
const service = (fn) => asRole(db,'service_role',null,fn);
const reserve = async (input, key=randomUUID(), user=owner, role='service_role') =>
  (await asRole(db,role,role==='authenticated'?user:null,()=>db.query(
    'select * from reserve_atv_tarot_draw($1,$2,$3)',[user,key,JSON.stringify(input)]))).rows[0];
const snapshot = (draw,count) => ({ version: 'atv-tarot-method-calculation/2.0.0',kind:'tarot',status:'recorded',
  data:{executionId:draw.id,methodId:draw.product_id,cards:Array.from({length:count},(_,i)=>({position:i+1,cardId:`synthetic-${i}`}))} });
const record = async (draw,calculation) => (await service(()=>db.query(
  'select * from record_atv_tarot_draw($1,$2,$3)',[draw.owner_id,draw.id,JSON.stringify(calculation)]))).rows[0];
const saveReading = (draw,calculation) => service(()=>db.query(
  'insert into atv_trial_readings(id,owner_id,request_key,product_id,input,calculation,reading,approval) values($1,$2,$3,$4,$5,$6,$5,$7)',
  [draw.id,draw.owner_id,draw.request_key,draw.product_id,JSON.stringify(draw.input),JSON.stringify(calculation),JSON.stringify(approval)]));

before(async()=>{
  db=await setupProductDatabase();
  for(const name of ['20261006140000_private_product_trials.sql','20261007160000_private_reading_experience.sql','20261008140536_private_reconstruction_approval.sql'])
    await db.exec(await file('supabase/migrations/'+name));
  await service(()=>db.query('insert into atv_trial_grants(owner_id) values($1),($2)',[owner,other]));
  for(const id of retired){
    const readingId=randomUUID();
    const historicalRun=randomUUID();
    await db.query('insert into product_runs(id,user_id,product_id,request_key,contract_version,input) values($1,$2,$3,$4,$5,$6)',
      [historicalRun,owner,id,randomUUID(),'atv-workflow/1.0.0',JSON.stringify(inputFor(id))]);
    await db.query('insert into library_items(user_id,title,universe,item_type,source_id,occurred_at) values($1,$2,$3,$4,$5,now())',
      [owner,'Historical synthetic Tarot','tarot-arcanos','PRODUCT_RUN',historicalRun]);
    await service(()=>db.query('insert into atv_trial_readings(id,owner_id,request_key,product_id,input,calculation,reading,approval) values($1,$2,$3,$4,$5,$6,$5,$7)',
      [readingId,owner,randomUUID(),id,JSON.stringify(inputFor(id)),'{}',JSON.stringify(approval)]));
    await asRole(db,'authenticated',owner,()=>db.query('insert into atv_trial_feedback(reading_id,owner_id,product_id,decision) values($1,$2,$3,$4)',[readingId,owner,id,'approved']));
  }
  await db.exec(await file('supabase/migrations/'+migration));
});
after(async()=>{await db?.close();});

test('private-only hosted baseline migrates and forward-fixes without a commercial workflow chain',async()=>{
  const hosted=await setupProductDatabase({privateOnly:true});
  const run=(fn)=>asRole(hosted,'service_role',null,fn);
  try {
    for(const name of ['20261006140000_private_product_trials.sql','20261007160000_private_reading_experience.sql','20261008140536_private_reconstruction_approval.sql'])
      await hosted.exec(await file('supabase/migrations/'+name));
    await run(()=>hosted.query('insert into atv_trial_grants(owner_id) values($1)',[owner]));
    await run(()=>hosted.query('insert into atv_trial_readings(id,owner_id,product_id,request_key,input,calculation,reading,approval) values($1,$2,$3,$4,$5,$6,$5,$7)',
      [randomUUID(),owner,'daily-card',randomUUID(),JSON.stringify(inputFor('daily-card')),'{}',JSON.stringify(approval)]));
    await hosted.exec(await file('supabase/migrations/'+migration));
    assert.equal((await hosted.query("select to_regclass('public.product_runs') as runs,to_regclass('public.workflow_releases') as releases")).rows[0].runs,null);
    assert.equal((await hosted.query("select to_regclass('public.workflow_releases') as releases")).rows[0].releases,null);
    assert.equal((await hosted.query('select count(*)::int as n from atv_trial_readings where archived_at is not null')).rows[0].n,1);
    const input=inputFor('tarot-single-card'),key=randomUUID();
    const draw=(await run(()=>hosted.query('select * from reserve_atv_tarot_draw($1,$2,$3)',[owner,key,JSON.stringify(input)]))).rows[0];
    const calculation=snapshot(draw,1);
    await run(()=>hosted.query('select * from record_atv_tarot_draw($1,$2,$3)',[owner,draw.id,JSON.stringify(calculation)]));
    await run(()=>hosted.query('insert into atv_trial_readings(id,owner_id,request_key,product_id,input,calculation,reading,approval) values($1,$2,$3,$4,$5,$6,$5,$7)',
      [draw.id,owner,key,draw.product_id,JSON.stringify(input),JSON.stringify(calculation),JSON.stringify(approval)]));
    const visible=await asRole(hosted,'authenticated',owner,()=>hosted.query('select id from atv_trial_readings'));
    assert.deepEqual(visible.rows.map(r=>r.id),[draw.id]);
    await hosted.exec(await file('supabase/rollback/'+migration));
    await assert.rejects(run(()=>hosted.query('select * from reserve_atv_tarot_draw($1,$2,$3)',[owner,randomUUID(),JSON.stringify(input)])),/permission denied/);
    assert.equal((await hosted.query('select count(*)::int as n from atv_trial_tarot_draws')).rows[0].n,1);
  } finally { await hosted.close(); }
});

test('retirement archives all five readings and feedback, preserving internal history and grants',async()=>{
  assert.equal((await service(()=>db.query('select * from atv_trial_readings where archived_at is not null'))).rows.length,5);
  assert.equal((await db.query("select * from library_items where item_type='PRODUCT_RUN' and archived_at is not null")).rows.length,5);
  assert.equal((await db.query('select * from product_runs')).rows.length,5);
  assert.equal((await asRole(db,'authenticated',owner,()=>db.query('select * from atv_trial_readings'))).rows.length,0);
  assert.equal((await asRole(db,'authenticated',owner,()=>db.query('select * from atv_trial_feedback'))).rows.length,0);
  assert.equal((await db.query('select expires_at from atv_trial_grants where owner_id=$1',[owner])).rows[0].expires_at,null);
  await assert.rejects(service(()=>db.exec("update atv_trial_readings set archived_at=null where product_id='daily-card'")),/tarot_product_retired/);
  const releases=(await db.query('select enabled,engine_approved from workflow_releases where product_id=any($1)',[[...retired,...methods.map(([id])=>id)]])).rows;
  assert.equal(releases.length,11);
  assert.ok(releases.every(r=>!r.enabled&&!r.engine_approved));
});
test('each method reserves once, persists before delivery, and reuses the identical snapshot after a retry',async()=>{
  for(const [id,count] of methods){
    const input=inputFor(id),key=randomUUID(),draw=await reserve(input,key);
    assert.equal(draw.calculation,null);
    assert.equal((await reserve(input,key)).id,draw.id);
    const calculation=snapshot(draw,count);
    await assert.rejects(saveReading(draw,calculation),/tarot_draw_not_recorded/);
    for(const malformed of [{}, {...calculation,data:{...calculation.data,cards:[]}}, {...calculation,data:{...calculation.data,executionId:randomUUID()}}])
      await assert.rejects(record(draw,malformed),/invalid_tarot_snapshot/);
    const saved=await record(draw,calculation);
    assert.ok(saved.recorded_at);
    assert.deepEqual((await reserve(input,key)).calculation,calculation);
    assert.deepEqual((await record(draw,calculation)).calculation,calculation);
    await saveReading(draw,calculation);
    await assert.rejects(record(draw,{...calculation,extra:'changed'}),/tarot_draw_conflict/);
    await assert.rejects(reserve({...input,focus:'different'},key),/tarot_request_conflict/);
    await assert.rejects(service(()=>db.query('update atv_trial_tarot_draws set request_key=$1 where id=$2',[randomUUID(),draw.id])),/tarot_execution_immutable/);
    assert.notEqual((await reserve(input)).id,draw.id);
  }
});
test('draw authority rejects browser writes and keeps owners, anonymous clients and revoked access isolated',async()=>{
  const draw=await reserve(inputFor(methods[0][0]));
  await assert.rejects(reserve(draw.input,randomUUID(),owner,'authenticated'),/permission denied/);
  await assert.rejects(asRole(db,'authenticated',owner,()=>db.query('update atv_trial_tarot_draws set calculation=null')),/permission denied/);
  await assert.rejects(asRole(db,'anon',null,()=>db.query('select * from atv_trial_tarot_draws')),/permission denied/);
  assert.equal((await asRole(db,'authenticated',other,()=>db.query('select * from atv_trial_tarot_draws'))).rows.length,0);
  await service(()=>db.query('update atv_trial_grants set revoked_at=now() where owner_id=$1',[other]));
  await assert.rejects(reserve(draw.input,randomUUID(),other),/trial_access_revoked/);
});
test('forward-fix blocks new draws while preserving recorded draws, readings and hidden historical archives',async()=>{
  const before=(await db.query('select count(*)::int as n from atv_trial_tarot_draws')).rows[0].n;
  await db.exec(await file('supabase/rollback/'+migration));
  await assert.rejects(reserve(inputFor(methods[0][0])),/permission denied/);
  assert.equal((await db.query('select count(*)::int as n from atv_trial_tarot_draws')).rows[0].n,before);
  assert.equal((await asRole(db,'authenticated',owner,()=>db.query('select * from atv_trial_readings'))).rows.length,6);
  assert.equal((await service(()=>db.query('select * from atv_trial_readings where archived_at is not null'))).rows.length,5);
});
