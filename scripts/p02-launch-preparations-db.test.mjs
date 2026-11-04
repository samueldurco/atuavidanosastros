import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { setupProductDatabase, owner, other, file } from './helpers/product-database.mjs';
import { asRole } from './helpers/artifact-fixture.mjs';

// Disposable PostgreSQL/RLS with synthetic identities. Does not certify hosted JWT/PostgREST.
let db;
const table='atv_launch_preparations';
const baseInput=(productId='ex-tarot')=>({version:'atv-launch-input/1',productId,
  consent:{storage:true,policyVersion:'atv-launch-consent/1'},answers:{episode:'Contato sintético para teste de persistência.'}});
const preparation=(overrides={})=>{
  const row={id:randomUUID(),owner_id:owner,request_key:randomUUID(),product_id:'ex-tarot',
    input:baseInput(),input_digest:'a'.repeat(64),status:'AWAITING_CALCULATION',...overrides};
  row.evidence??={version:'atv-launch-evidence/1',executionId:row.id,productId:row.product_id,
    inputDigest:row.input_digest,state:row.status,facts:[]};
  return row;
};
const writer=(fn)=>asRole(db,'service_role',null,fn);
const insert=(row,conflict=false)=>writer(()=>db.query(`insert into ${table}
  (id,owner_id,request_key,product_id,input,input_digest,evidence,status)
  values($1,$2,$3,$4,$5,$6,$7,$8) ${conflict?'on conflict(owner_id,request_key) do nothing':''} returning id`,
  [row.id,row.owner_id,row.request_key,row.product_id,JSON.stringify(row.input),row.input_digest,JSON.stringify(row.evidence),row.status]));
const readyEvidence=(row)=>({version:'atv-launch-calculation/1',executionId:row.id,productId:row.product_id,
  inputDigest:row.input_digest,state:'FACTS_READY_AWAITING_REVIEW',facts:[{id:'synthetic',kind:'drawn',display:'Somente fixture.',source:'test/1'}],data:{synthetic:true}});
const advance=(row,evidence=readyEvidence(row),conditional=true)=>writer(()=>db.query(`update ${table}
  set status='FACTS_READY_AWAITING_REVIEW',evidence=$3 where id=$1 and owner_id=$2
  ${conditional?"and status='AWAITING_CALCULATION'":''} returning id`,[row.id,row.owner_id,JSON.stringify(evidence)]));
const saved=preparation(),foreign=preparation({owner_id:other}),pending=preparation();
before(async()=>{
  db=await setupProductDatabase({privateOnly:true});
  await db.exec(await file('supabase/migrations/20261006140000_private_product_trials.sql'));
  await db.exec(await file('supabase/migrations/20261104102635_p02_launch_preparations.sql'));
  await writer(()=>db.query('insert into atv_trial_grants(owner_id) values($1),($2)',[owner,other]));
  for(const row of [saved,foreign,pending]) await insert(row);
});
after(async()=>{await db?.close();});

test('owner SELECT is isolated and anon cannot reach private preparations',async()=>{
  const rows=await asRole(db,'authenticated',owner,()=>db.query(`select id from ${table} order by id`));
  assert.deepEqual(rows.rows.map(x=>x.id),[saved.id,pending.id].sort());
  assert.deepEqual((await asRole(db,'authenticated',owner,()=>db.query(`select id from ${table} where id=$1`,[foreign.id]))).rows,[]);
  assert.deepEqual((await asRole(db,'authenticated',other,()=>db.query(`select id from ${table}`))).rows,[{id:foreign.id}]);
  await assert.rejects(asRole(db,'anon',null,()=>db.query(`select * from ${table}`)),/permission denied/);
});

test('only service_role can insert or update and it cannot delete evidence',async()=>{
  for(const [role,user] of [['authenticated',owner],['authenticated',other],['anon',null]]){
    await assert.rejects(asRole(db,role,user,()=>db.query(`insert into ${table} select * from ${table} where false`)),/permission denied/);
    await assert.rejects(asRole(db,role,user,()=>db.query(`update ${table} set status=status where id=$1`,[saved.id])),/permission denied/);
    await assert.rejects(asRole(db,role,user,()=>db.query(`delete from ${table} where id=$1`,[saved.id])),/permission denied/);
  }
  await assert.rejects(writer(()=>db.query(`delete from ${table} where id=$1`,[saved.id])),/permission denied/);
});

test('owner/request key is idempotent and cannot overwrite the first payload',async()=>{
  const duplicate=preparation({request_key:saved.request_key,input:{...baseInput(),answers:{episode:'Payload posterior.'}}});
  await assert.rejects(insert(duplicate),/duplicate key/);
  assert.deepEqual((await insert(duplicate,true)).rows,[]);
  assert.deepEqual((await db.query(`select input from ${table} where id=$1`,[saved.id])).rows[0].input,saved.input);
  const otherKey=preparation({owner_id:other,request_key:saved.request_key});
  assert.equal((await insert(otherKey)).rows.length,1);
  // Request keys are UUIDs, not necessarily v4; only execution IDs are v4.
  assert.equal((await insert(preparation({request_key:'00000000-0000-1000-8000-000000000009'}))).rows.length,1);
});

test('input/evidence envelopes, product allowlist, UUIDv4, consent and size are database constraints',async()=>{
  const variants=[
    {id:'00000000-0000-1000-8000-000000000009'}, {product_id:'birth-chart',input:baseInput('birth-chart')},
    {input:[]}, {input:{}}, {input:{...baseInput(),version:'future/1'}},
    {input:baseInput('wedding-date-map')}, {input:{...baseInput(),answers:[]}},
    {input:{...baseInput(),consent:{storage:false,policyVersion:'atv-launch-consent/1'}}},
    {input:{...baseInput(),consent:{storage:true,policyVersion:'unknown'}}},
    {input_digest:'A'.repeat(64)}, {input_digest:'abc'}, {evidence:[]},
    {input:{...baseInput(),answers:{episode:'x'.repeat(66000)}}}
  ];
  for(const variant of variants) await assert.rejects(insert(preparation(variant)),/check constraint/);
  for(const patch of [{executionId:randomUUID()},{productId:'wedding-date-map'},{inputDigest:'b'.repeat(64)},
    {state:'READY'},{version:'unknown'},{facts:{}}]){
    const row=preparation();row.evidence={...row.evidence,...patch};
    await assert.rejects(insert(row),/check constraint/);
  }
  const oversized=preparation();oversized.evidence.padding='x'.repeat(2000001);
  await assert.rejects(insert(oversized),/check constraint/);
  const startReady=preparation({status:'FACTS_READY_AWAITING_REVIEW'});startReady.evidence=readyEvidence(startReady);
  await assert.rejects(insert(startReady),/launch_preparation_must_start_awaiting/);
  await assert.rejects(insert(preparation({status:'APPROVED'})),/launch_preparation_must_start_awaiting|check constraint/);
});

test('adult products require explicit true, not a truthy string',async()=>{
  for(const productId of ['sexuality-map','intimacy-map']){
    for(const adult of [undefined,false,'true']){
      const input=baseInput(productId);input.answers.adult=adult;
      await assert.rejects(insert(preparation({product_id:productId,input})),/check constraint/);
    }
    const input=baseInput(productId);input.answers.adult=true;
    assert.equal((await insert(preparation({product_id:productId,input}))).rows.length,1);
  }
});

test('identity, request, input, digest and creation timestamp cannot change during calculation',async()=>{
  for(const [column,value] of [['id',randomUUID()],['owner_id',other],['request_key',randomUUID()],
    ['product_id','wedding-date-map'],['input',JSON.stringify({...baseInput(),answers:{episode:'Alterado'}})],
    ['input_digest','b'.repeat(64)],['created_at','2026-01-01T00:00:00Z']]){
    await assert.rejects(writer(()=>db.query(`update ${table} set ${column}=$2 where id=$1`,[pending.id,value])),/launch_preparation_input_immutable/);
  }
});

test('calculation persists once, binds every envelope field and never becomes an approved reading',async()=>{
  for(const patch of [{executionId:randomUUID()},{productId:'wedding-date-map'},{inputDigest:'b'.repeat(64)},
    {state:'READY'},{version:'atv-launch-evidence/1'},{data:[]},{facts:null}]){
    await assert.rejects(advance(saved,{...readyEvidence(saved),...patch}),/check constraint/);
  }
  const result=readyEvidence(saved);
  assert.deepEqual((await advance(saved,result)).rows,[{id:saved.id}]);
  assert.deepEqual((await advance(saved,{...result,data:{replacement:true}})).rows,[]);
  await assert.rejects(advance(saved,result,false),/launch_preparation_transition_invalid/);
  await assert.rejects(writer(()=>db.query(`update ${table} set status='AWAITING_CALCULATION' where id=$1`,[saved.id])),/launch_preparation_transition_invalid/);
  const persisted=(await db.query(`select status,evidence from ${table} where id=$1`,[saved.id])).rows[0];
  assert.equal(persisted.status,'FACTS_READY_AWAITING_REVIEW');
  assert.deepEqual(persisted.evidence,result);
  assert.equal((await db.query('select count(*)::int as count from atv_trial_readings')).rows[0].count,0);
  for(const productId of ['wedding-date-map','love-restart-map','sexuality-map','intimacy-map',
    'emotional-reactions-map','financial-blocks-tarot','hidden-talent-map','ascendant-style',
    'conversation-timing','cohabitation-map']){
    const input=baseInput(productId);
    if(['sexuality-map','intimacy-map'].includes(productId)) input.answers.adult=true;
    const item=preparation({product_id:productId,input});
    await insert(item);
    assert.equal((await advance(item)).rows.length,1);
  }
});

test('revocation and expiration fence SELECT and privileged writes; restoration retains evidence',async()=>{
  const count=(await db.query(`select count(*)::int as count from ${table} where owner_id=$1`,[owner])).rows[0].count;
  await db.query('update atv_trial_grants set revoked_at=now() where owner_id=$1',[owner]);
  assert.deepEqual((await asRole(db,'authenticated',owner,()=>db.query(`select id from ${table}`))).rows,[]);
  await assert.rejects(insert(preparation()),/trial_access_revoked/);
  await assert.rejects(advance(pending),/trial_access_revoked/);
  await db.query("update atv_trial_grants set revoked_at=null,expires_at=now()-interval '1 second' where owner_id=$1",[owner]);
  assert.deepEqual((await asRole(db,'authenticated',owner,()=>db.query(`select id from ${table}`))).rows,[]);
  await assert.rejects(insert(preparation()),/trial_access_revoked/);
  await assert.rejects(advance(pending),/trial_access_revoked/);
  await db.query('update atv_trial_grants set expires_at=null where owner_id=$1',[owner]);
  assert.equal((await asRole(db,'authenticated',owner,()=>db.query(`select count(*)::int as count from ${table}`))).rows[0].count,count);
});

test('forward-fix closes access and writes while retaining all private rows',async()=>{
  const count=(await db.query(`select count(*)::int as count from ${table}`)).rows[0].count;
  await db.exec(await file('supabase/rollbacks/20261104102635_p02_launch_preparations.sql'));
  await assert.rejects(insert(preparation()),/permission denied/);
  await assert.rejects(advance(pending),/permission denied/);
  await assert.rejects(asRole(db,'authenticated',owner,()=>db.query(`select * from ${table}`)),/permission denied/);
  assert.equal((await db.query(`select count(*)::int as count from ${table}`)).rows[0].count,count);
});
