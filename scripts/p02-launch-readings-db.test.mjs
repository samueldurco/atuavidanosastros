import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { setupProductDatabase, owner, other, file } from './helpers/product-database.mjs';
import { asRole } from './helpers/artifact-fixture.mjs';

// SQL security fixtures only: these do not claim an actual editorial approval.
let db;
const table='atv_launch_readings';
const writer=(fn)=>asRole(db,'service_role',null,fn);
const prep=(ownerId=owner)=>{
  const id=randomUUID(),productId='ex-tarot',inputDigest='a'.repeat(64);
  return {id,ownerId,productId,inputDigest,input:{version:'atv-launch-input/1',productId,
    consent:{storage:true,policyVersion:'atv-launch-consent/1'},answers:{episode:'Fixture sintética.'}},
    evidence:{version:'atv-launch-evidence/1',executionId:id,productId,inputDigest,
      state:'AWAITING_CALCULATION',facts:[]}};
};
const addPrep=async(row,ready=true)=>{
  await writer(()=>db.query(`insert into atv_launch_preparations
    (id,owner_id,request_key,product_id,input,input_digest,evidence) values($1,$2,$3,$4,$5,$6,$7)`,
    [row.id,row.ownerId,randomUUID(),row.productId,JSON.stringify(row.input),row.inputDigest,JSON.stringify(row.evidence)]));
  if(ready) await writer(()=>db.query(`update atv_launch_preparations set status='FACTS_READY_AWAITING_REVIEW',evidence=$2 where id=$1`,
    [row.id,JSON.stringify({...row.evidence,version:'atv-launch-calculation/1',state:'FACTS_READY_AWAITING_REVIEW',data:{fixture:true}})]));
  return row;
};
const delivery=(p,overrides={})=>({preparation_id:p.id,owner_id:p.ownerId,product_id:p.productId,
  input_digest:p.inputDigest,calculation_digest:'b'.repeat(64),reading_digest:'c'.repeat(64),
  reading:{version:'atv-launch-reading/1',executionId:p.id,productId:p.productId,inputDigest:p.inputDigest,
    title:'Fixture de segurança',summary:'Não é uma entrega editorial real.',
    sections:[{id:'fixture',title:'Fixture',paragraphs:['Dado sintético.'],evidenceIds:[],sourceIds:[]}],
    practicalAction:'Nenhuma.',reflection:'Fixture.',limits:['Teste SQL, não homologação.'],provenance:{}},
  review:{version:'atv-launch-reading-review/1',status:'APPROVED_FOR_PRIVATE_TEST',
    policyVersion:'atv-launch-private-editorial-policy/1',checks:[{id:'fixture',passed:true,detail:'SQL fixture.'}],
    reasons:[],digest:'c'.repeat(64),provenance:{scope:'private-editorial-consistency',
      commercialPrecisionApproved:false,commercialReleaseApproved:false}},...overrides});
const insert=(row,conflict=false)=>writer(()=>db.query(`insert into ${table}
  (preparation_id,owner_id,product_id,input_digest,calculation_digest,reading_digest,reading,review)
  values($1,$2,$3,$4,$5,$6,$7,$8) ${conflict?'on conflict(preparation_id) do nothing':''} returning preparation_id`,
  [row.preparation_id,row.owner_id,row.product_id,row.input_digest,row.calculation_digest,row.reading_digest,
    JSON.stringify(row.reading),JSON.stringify(row.review)]));
let saved,foreign,pending,ready;
before(async()=>{
  db=await setupProductDatabase({privateOnly:true});
  for(const migration of ['20261006140000_private_product_trials.sql','20261104102635_p02_launch_preparations.sql',
    '20261104103423_p02_launch_readings.sql']) await db.exec(await file(`supabase/migrations/${migration}`));
  await writer(()=>db.query('insert into atv_trial_grants(owner_id) values($1),($2)',[owner,other]));
  saved=delivery(await addPrep(prep()));foreign=delivery(await addPrep(prep(other)));
  ready=await addPrep(prep());pending=await addPrep(prep(),false);
  await insert(saved);await insert(foreign);
});
after(async()=>{await db?.close();});

test('private launch readings are owner-and-grant SELECT only, never anon',async()=>{
  assert.deepEqual((await asRole(db,'authenticated',owner,()=>db.query(`select preparation_id from ${table}`))).rows,
    [{preparation_id:saved.preparation_id}]);
  assert.deepEqual((await asRole(db,'authenticated',owner,()=>db.query(`select * from ${table} where preparation_id=$1`,[foreign.preparation_id]))).rows,[]);
  assert.deepEqual((await asRole(db,'authenticated',other,()=>db.query(`select preparation_id from ${table}`))).rows,
    [{preparation_id:foreign.preparation_id}]);
  await assert.rejects(asRole(db,'anon',null,()=>db.query(`select * from ${table}`)),/permission denied/);
});

test('only service_role can insert; clients and writer cannot update or delete',async()=>{
  for(const [role,user] of [['authenticated',owner],['authenticated',other],['anon',null]]){
    await assert.rejects(asRole(db,role,user,()=>db.query(`insert into ${table} select * from ${table} where false`)),/permission denied/);
    await assert.rejects(asRole(db,role,user,()=>db.query(`update ${table} set reading=reading`)),/permission denied/);
    await assert.rejects(asRole(db,role,user,()=>db.query(`delete from ${table}`)),/permission denied/);
  }
  await assert.rejects(writer(()=>db.query(`update ${table} set reading=reading`)),/permission denied/);
  await assert.rejects(writer(()=>db.query(`delete from ${table}`)),/permission denied/);
  await assert.rejects(db.query(`update ${table} set reading=reading where preparation_id=$1`,[saved.preparation_id]),/launch_reading_immutable/);
});

test('one deliverable per preparation retains the first payload even on retry',async()=>{
  const replacement={...saved,reading:{...saved.reading,summary:'Tentativa de substituição.'}};
  await assert.rejects(insert(replacement),/duplicate key/);
  assert.deepEqual((await insert(replacement,true)).rows,[]);
  assert.deepEqual((await db.query(`select reading,review from ${table} where preparation_id=$1`,[saved.preparation_id])).rows,
    [{reading:saved.reading,review:saved.review}]);
});

test('preparation must exist, have persisted facts and bind owner, product and input',async()=>{
  for(const row of [delivery(pending),delivery({...ready,id:randomUUID()}),delivery(ready,{owner_id:other}),
    delivery(ready,{product_id:'wedding-date-map'}),delivery(ready,{input_digest:'d'.repeat(64)})]){
    await assert.rejects(insert(row),/launch_reading_preparation_mismatch/);
  }
});

test('reading envelope and all digests reject identity substitution, missing fields and oversized JSON',async()=>{
  const base=delivery(ready);
  for(const patch of [{version:'future/1'},{executionId:randomUUID()},{productId:'wedding-date-map'},
    {inputDigest:'d'.repeat(64)},{sections:[]},{sections:{}},{sections:null}]){
    await assert.rejects(insert({...base,reading:{...base.reading,...patch}}),/check constraint/);
  }
  for(const patch of [{calculation_digest:'B'.repeat(64)},{reading_digest:'x'},{reading_digest:'d'.repeat(64)},
    {reading:[]},{reading:{...base.reading,padding:'x'.repeat(2000001)}}]){
    await assert.rejects(insert({...base,...patch}),/check constraint/);
  }
});

test('only versioned approved private review bound to reading digest may persist',async()=>{
  const base=delivery(ready);
  for(const patch of [{version:'future/1'},{status:'REJECTED'},{status:'APPROVED'},
    {policyVersion:'future/1'},{checks:{}},{reasons:{}},{digest:'d'.repeat(64)},
    {provenance:{...base.review.provenance,commercialPrecisionApproved:true}},
    {provenance:{...base.review.provenance,commercialReleaseApproved:true}},
    {provenance:{...base.review.provenance,scope:'commercial'}},
    {padding:'x'.repeat(262145)}]){
    await assert.rejects(insert({...base,review:{...base.review,...patch}}),/check constraint/);
  }
  for(const review of [{},[],null]) await assert.rejects(insert({...base,review}),/check constraint/);
  assert.equal((await insert(base)).rows.length,1);
});

test('revocation and expiry hide existing delivery and block privileged insertion',async()=>{
  const newReady=await addPrep(prep()),row=delivery(newReady);
  await db.query('update atv_trial_grants set revoked_at=now() where owner_id=$1',[owner]);
  assert.deepEqual((await asRole(db,'authenticated',owner,()=>db.query(`select * from ${table}`))).rows,[]);
  await assert.rejects(insert(row),/trial_access_revoked/);
  await db.query("update atv_trial_grants set revoked_at=null,expires_at=now()-interval '1 second' where owner_id=$1",[owner]);
  assert.deepEqual((await asRole(db,'authenticated',owner,()=>db.query(`select * from ${table}`))).rows,[]);
  await assert.rejects(insert(row),/trial_access_revoked/);
  await db.query('update atv_trial_grants set expires_at=null where owner_id=$1',[owner]);
  assert.equal((await insert(row)).rows.length,1);
  assert.deepEqual((await db.query(`select reading from ${table} where preparation_id=$1`,[saved.preparation_id])).rows,[{reading:saved.reading}]);
});

test('forward-fix disables clients and writer without deleting private delivery',async()=>{
  const p=await addPrep(prep()),count=(await db.query(`select count(*)::int as n from ${table}`)).rows[0].n;
  await db.exec(await file('supabase/rollbacks/20261104103423_p02_launch_readings.sql'));
  await assert.rejects(insert(delivery(p)),/permission denied/);
  await assert.rejects(asRole(db,'authenticated',owner,()=>db.query(`select * from ${table}`)),/permission denied/);
  assert.equal((await db.query(`select count(*)::int as n from ${table}`)).rows[0].n,count);
});
