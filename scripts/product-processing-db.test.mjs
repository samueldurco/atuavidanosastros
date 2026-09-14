import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setupProductDatabase, owner, other, file } from './helpers/product-database.mjs';
import { createWorkflowRepository, processNextProductRun, ProcessingError } from '../apps/worker/src/product-processing.ts';

const input={version:'atv-workflow/1.0.0',productId:'daily-card',consent:{storage:true,policyVersion:'atv-input-consent/1',partner:false,continuity:false},questions:['Fixture only']};
const calculation={version:'fixture/1',kind:'tarot',status:'recorded',facts:[{id:'card-0',kind:'drawn',display:'Fixture',source:'synthetic'}],data:{cards:[0]},limits:[]};
async function as(db,role,user,fn) {
  await db.exec(`set role ${role}`);await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user??'']);
  try{return await fn();}finally{await db.exec('reset role');}
}
async function boot(t) {
  const db=await setupProductDatabase({processing:true});t.after(()=>db.close());return db;
}
const enable=db=>db.exec("update workflow_releases set enabled=true where product_id='daily-card'");
const create=(db,data=input,parent=null)=>as(db,'authenticated',owner,()=>db.query('select request_product_run($1,$2,$3,$4) as data',['daily-card',randomUUID(),data,parent])).then(r=>r.rows[0].data);
const service=(db,query,args=[])=>as(db,'service_role',null,()=>db.query(query,args)).then(r=>r.rows[0]?.data);
const claim=(db,products=['daily-card'])=>service(db,'select claim_product_run_work($1) as data',[products]);
const complete=(db,c,calc=calculation)=>service(db,'select complete_product_run_work($1,$2,$3,$4) as data',[c.runId,c.token,c.revision,calc]);
const fail=(db,c,code='transient_failure')=>service(db,'select fail_product_run_work($1,$2,$3) as data',[c.runId,c.token,code]);
const read=(db,id,user=owner)=>as(db,'authenticated',user,()=>db.query('select read_product_run($1) as data',[id])).then(r=>r.rows[0].data);
const expire=(db,id)=>db.query("update product_run_work set lease_until=clock_timestamp()-interval '1 second',available_at=clock_timestamp()-interval '1 second' where run_id=$1",[id]);
function repository(db) {
  return createWorkflowRepository(async(name,args,signal)=>{
    signal.throwIfAborted();
    const entries=Object.entries(args);const params=entries.map(([key],index)=>key+' => $'+(index+1)).join(',');
    try{return await service(db,`select ${name}(${params}) as data`,entries.map(([,value])=>value));}
    catch(error){throw new ProcessingError(/lease_lost|stale_revision|run_not_found/.test(error.message)?'lease_lost':'unavailable');}
  });
}

test('work queue is private, disabled by default, and old unfenced service writer is revoked',async(t)=>{
  const db=await boot(t);assert.equal(await claim(db),null);
  for(const role of ['anon','authenticated','service_role'])
    await assert.rejects(()=>as(db,role,owner,()=>db.query('select * from product_run_work')),/permission denied/);
  for(const role of ['anon','authenticated'])
    await assert.rejects(()=>as(db,role,owner,()=>db.query("select claim_product_run_work(array['daily-card'])")),/permission denied/);
  await assert.rejects(()=>service(db,'select advance_product_run($1,$2,1,\'FAILED\',null,null,\'fixture\')',[randomUUID(),owner]),/permission denied/);
  await enable(db);const id=await create(db);
  assert.equal((await db.query('select count(*)::int as count from product_run_work where run_id=$1',[id])).rows[0].count,1);
  assert.equal(await claim(db,['ascendant']),null);assert.equal((await claim(db)).runId,id);
  await assert.rejects(()=>service(db,"select claim_product_run_work(array['daily-card'],1)"),/invalid_claim/);
});

test('lease fencing, revision CAS and completion receipts prevent stale or duplicate writes',async(t)=>{
  const db=await boot(t);await enable(db);const id=await create(db);const first=await claim(db);
  assert.equal(await claim(db),null);await expire(db,id);const second=await claim(db);
  assert.notEqual(first.token,second.token);assert.equal(second.attempt,2);
  await assert.rejects(()=>complete(db,first),/lease_lost/);
  await assert.rejects(()=>complete(db,{...second,revision:4}),/stale_revision/);
  assert.deepEqual(await complete(db,second),{state:'CALCULATED',revision:2});
  assert.deepEqual(await complete(db,second,{...calculation,data:{cards:[7]}}),{state:'CALCULATED',revision:2});
  assert.deepEqual((await db.query('select calculation from product_runs where id=$1',[id])).rows[0].calculation,calculation);
  const third=await claim(db);assert.equal(third.state,'CALCULATED');assert.deepEqual(third.calculation,calculation);
  assert.deepEqual(await complete(db,third,null),{state:'AWAITING_EDITORIAL',revision:3});
  assert.deepEqual(await complete(db,third,null),{state:'AWAITING_EDITORIAL',revision:3});assert.equal(await claim(db),null);
  const result=await read(db,id);assert.equal(result.released,false);assert.equal(result.editorial,null);assert.equal(result.history.length,3);
  assert.equal(await read(db,id,other),null);
});

test('retry backoff is durable, error codes are allowlisted and the fifth loss exhausts work',async(t)=>{
  const db=await boot(t);await enable(db);const id=await create(db);let current=await claim(db);
  await assert.rejects(()=>fail(db,current,'raw provider secret'),/safe_error_required/);
  assert.deepEqual(await fail(db,current),{state:'QUEUED',revision:1});
  assert.deepEqual(await fail(db,current),{state:'QUEUED',revision:1});assert.equal(await claim(db),null);
  await db.query("update product_run_work set available_at=clock_timestamp()-interval '1 second' where run_id=$1",[id]);
  current=await claim(db);assert.equal(current.attempt,2);
  for(let attempt=3;attempt<=5;attempt++){await expire(db,id);current=await claim(db);assert.equal(current.attempt,attempt);}
  await expire(db,id);assert.deepEqual(await claim(db),{status:'exhausted',runId:id});assert.equal(await claim(db),null);
  assert.equal((await read(db,id)).state,'FAILED');
  assert.equal((await db.query('select error_code from product_runs where id=$1',[id])).rows[0].error_code,'attempts_exhausted');
});

test('release revocation and owner deletion during a lease reject completion without losing privacy',async(t)=>{
  const db=await boot(t);await enable(db);const id=await create(db);const current=await claim(db);
  await db.exec('update workflow_releases set enabled=false');
  await assert.rejects(()=>complete(db,current),/workflow_unreleased/);assert.equal((await read(db,id)).state,'QUEUED');
  assert.equal(await claim(db),null);
  assert.equal((await as(db,'authenticated',owner,()=>db.query('select delete_product_run($1) as data',[id]))).rows[0].data,true);
  await assert.rejects(()=>complete(db,current),/run_not_found/);
  assert.equal((await db.query('select count(*)::int as count from product_run_work')).rows[0].count,0);
});

test('portable processor drives real SQL from saved input through immutable calculation to Library history',async(t)=>{
  const db=await boot(t);await enable(db);const id=await create(db);const store=repository(db);let calculated=0;
  const calculators={'daily-card':async(value,ctx)=>{assert.deepEqual(value,input);assert.equal(ctx.runId,id);calculated++;return calculation;}};
  assert.equal(await processNextProductRun(store,calculators),'calculated');
  assert.equal(await processNextProductRun(store,calculators),'awaiting_editorial');
  assert.equal(await processNextProductRun(store,calculators),'idle');assert.equal(calculated,1);
  const result=await read(db,id);assert.equal(result.state,'AWAITING_EDITORIAL');assert.ok(result.libraryItemId);
  const child=await create(db,null,id);
  assert.equal(await processNextProductRun(store,{'daily-card':async()=>{throw Error('must retain draw');}}),'awaiting_editorial');
  assert.equal((await read(db,child)).parentId,id);
  assert.equal((await db.query('select * from editorial_promotions')).rows.length,0);
});

test('worker validates full input and calculation even when a minimal SQL request is accepted',async(t)=>{
  const db=await boot(t);await enable(db);let invoked=0;
  const id=await create(db,{...input,questions:[]});const store=repository(db);
  assert.equal(await processNextProductRun(store,{'daily-card':async()=>{invoked++;return calculation;}}),'failed');assert.equal(invoked,0);
  assert.equal((await read(db,id)).state,'FAILED');
  const invalid=await create(db);
  assert.equal(await processNextProductRun(store,{'daily-card':async()=>({...calculation,facts:[]})}),'failed');
  assert.equal((await read(db,invalid)).state,'FAILED');
});

test('processing forward-fix preserves owner retrieval/deletion without reopening the unfenced writer',async(t)=>{
  const db=await boot(t);await enable(db);const id=await create(db);const current=await claim(db);
  await db.exec(await file('supabase/forward-fixes/20260914140000_disable_product_run_processing.sql'));
  await assert.rejects(()=>claim(db),/permission denied/);await assert.rejects(()=>complete(db,current),/permission denied/);
  await assert.rejects(()=>fail(db,current),/permission denied/);
  assert.equal((await read(db,id)).state,'QUEUED');
  assert.equal((await as(db,'authenticated',owner,()=>db.query('select delete_product_run($1) as data',[id]))).rows[0].data,true);
});
