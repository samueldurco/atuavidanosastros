import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { setupProductDatabase, owner, other, file } from './helpers/product-database.mjs';
import { asRole } from './helpers/artifact-fixture.mjs';
import { createWorkflowRepository, processNextProductRun } from '../apps/worker/src/product-processing.ts';
import { createSymbolicCalculators } from '../apps/worker/src/symbolic-calculators.ts';

const migration='supabase/migrations/20260923110000_product_editorial_publication.sql';
const service=(db,sql,args=[])=>asRole(db,'service_role',null,()=>db.query(sql,args)).then(r=>r.rows[0]?.data);
const read=(db,id,user=owner)=>asRole(db,'authenticated',user,()=>db.query('select read_product_run($1) as data',[id])).then(r=>r.rows[0].data);
const claim=(db)=>service(db,"select claim_product_editorial(array['daily-card']) as data");
const complete=(db,c)=>service(db,'select complete_product_editorial($1,$2,$3,$4) as data',[c.runId,c.receiptId,c.token,c.revision]);
const expire=(db,c)=>db.query("update product_editorial_work set lease_until=clock_timestamp()-interval '1 second' where receipt_id=$1",[c.receiptId]);
async function boot(t) {
  const db=await setupProductDatabase({processing:true}); t.after(()=>db.close());
  await db.exec(await file('supabase/migrations/20260915180000_product_artifacts.sql'));
  await db.exec(await file(migration)); return db;
}
async function pending(db) {
  await db.exec("update workflow_releases set enabled=true where product_id='daily-card'");
  const input={version:'atv-workflow/1.0.0',productId:'daily-card',consent:{storage:true,policyVersion:'atv-input-consent/1',partner:false,continuity:false},questions:['Qual aspecto posso observar?']};
  const {rows:[{id}]}=await asRole(db,'authenticated',owner,()=>db.query('select request_product_run($1,$2,$3) as id',['daily-card',randomUUID(),input]));
  const repository=createWorkflowRepository(async(name,args,signal)=>{
    signal.throwIfAborted();
    return service(db,`select ${name}(${Object.keys(args).map((key,i)=>key+' => $'+(i+1)).join(',')}) as data`,Object.values(args));
  });
  assert.equal(await processNextProductRun(repository,createSymbolicCalculators()),'calculated');
  assert.equal(await processNextProductRun(repository,createSymbolicCalculators()),'awaiting_editorial');
  return (await db.query('select * from product_runs where id=$1',[id])).rows[0];
}
// This is deliberately database-owner fixture setup, NOT a production receipt issuer
// or proof of an approved model/editor. No application identity has these grants.
async function receipt(db,r,overrides={}) {
  const promotion='fixture-'+randomUUID();
  await db.query('insert into editorial_promotions values ($1,$2,$3,$4,null)',[promotion,r.product_id,r.contract_version,'b'.repeat(64)]);
  const editorial={version:'synthetic/1',promotionId:promotion,reviewDigest:'a'.repeat(64),title:'Fixture sem interpretação homologada',
    sections:[{title:'Base preservada',text:r.calculation.facts[0].display,evidence:[r.calculation.facts[0].id]}],limits:['Aprovação sintética para testar somente a fronteira SQL.']};
  const args={id:randomUUID(),run_id:r.id,revision:r.revision,calculation:r.calculation,editorial,promotion_id:promotion,
    promotion_evidence_digest:'b'.repeat(64),basis_digest:'c'.repeat(64),review_digest:'a'.repeat(64),authority_reference:'synthetic-review-only',...overrides};
  await db.query(`insert into product_editorial_receipts(${Object.keys(args).join(',')},expires_at) values (${Object.keys(args).map((_,i)=>'$'+(i+1)).join(',')},clock_timestamp()+interval '1 hour')`,Object.values(args));
  return args;
}
const enable=db=>db.exec('update product_editorial_policy set enabled=true');

test('editorial authority is private and default-disabled; no service can fabricate review or promotion',async t=>{
  const db=await boot(t);const r=await pending(db);await receipt(db,r);
  assert.equal(await claim(db),null);assert.equal((await read(db,r.id)).released,false);
  for(const role of ['anon','authenticated','service_role']) {
    for(const table of ['product_editorial_policy','product_editorial_receipts','product_editorial_work']) {
      await assert.rejects(()=>asRole(db,role,owner,()=>db.query('select * from '+table)),/permission denied/);
      await assert.rejects(()=>asRole(db,role,owner,()=>db.query('delete from '+table)),/permission denied/);
      await assert.rejects(()=>asRole(db,role,owner,()=>db.query('insert into '+table+' default values')),/permission denied/);
    }
    await assert.rejects(()=>asRole(db,role,owner,()=>db.exec('update product_editorial_policy set enabled=true')),/permission denied/);
    await assert.rejects(()=>asRole(db,role,owner,()=>db.query('select product_editorial_delivery_allowed($1)',[r.id])),/permission denied/);
  }
  for(const role of ['anon','authenticated']) {
    await assert.rejects(()=>asRole(db,role,owner,()=>db.exec("select claim_product_editorial(array['daily-card'])")),/permission denied/);
    await assert.rejects(()=>asRole(db,role,owner,()=>db.query('select complete_product_editorial($1,$2,$3,3)',[r.id,randomUUID(),randomUUID()])),/permission denied/);
  }
  await assert.rejects(()=>service(db,"select advance_product_run($1,$2,3,'READY')",[r.id,owner]),/permission denied/);
  await assert.rejects(()=>service(db,"update editorial_promotions set revoked_at=null"),/permission denied/);
  await enable(db);assert.ok(await claim(db));
});

test('real calculation reaches READY only through exact private receipt; retry is idempotent and output is owner-only',async t=>{
  const db=await boot(t);const r=await pending(db);const a=await receipt(db,r);await enable(db);
  const c=await claim(db);assert.deepEqual(Object.keys(c).sort(),['leaseUntil','receiptId','revision','runId','token']);
  assert.equal(await claim(db),null);
  assert.deepEqual(await complete(db,c),{state:'READY',revision:4});
  assert.deepEqual(await complete(db,c),{state:'READY',revision:4});
  const delivered=await read(db,r.id);assert.equal(delivered.released,true);
  assert.deepEqual(delivered.editorial,a.editorial);assert.ok(delivered.libraryItemId);
  assert.deepEqual(delivered.history.map(e=>e.state),['QUEUED','CALCULATED','AWAITING_EDITORIAL','READY']);
  assert.equal(await read(db,r.id,other),null);
  const row=(await db.query('select calculation,editorial_receipt_id from product_runs where id=$1',[r.id])).rows[0];
  assert.deepEqual(row.calculation,r.calculation);assert.equal(row.editorial_receipt_id,a.id);
  assert.equal(await claim(db),null);
  await assert.rejects(()=>complete(db,{...c,revision:4}),/stale_revision/);
  await assert.rejects(()=>complete(db,{...c,token:randomUUID()}),/lease_lost/);
});

test('stale lease, revision and cross-run receipt cannot publish; five abandoned claims bound retries',async t=>{
  const db=await boot(t);const r=await pending(db);await receipt(db,r);await enable(db);
  const first=await claim(db);await expire(db,first);const second=await claim(db);
  await assert.rejects(()=>complete(db,first),/lease_lost/);
  await assert.rejects(()=>complete(db,{...second,revision:9}),/stale_revision/);
  const another=await pending(db);
  await assert.rejects(()=>complete(db,{...second,runId:another.id}),/review_receipt_required/);
  let c=second;
  for(let i=3;i<=5;i++){await expire(db,c);c=await claim(db);assert.ok(c);}
  await expire(db,c);assert.equal(await claim(db),null);
  await assert.rejects(()=>complete(db,c),/lease_lost/);
  assert.equal((await read(db,r.id)).state,'AWAITING_EDITORIAL');
  assert.equal((await db.query('select attempts from product_editorial_work')).rows[0].attempts,5);
});

test('gates are checked again after claim and invalidation never partially commits',async t=>{
  const db=await boot(t);const r=await pending(db);const a=await receipt(db,r);await enable(db);const c=await claim(db);
  const cases=[
    ['update product_editorial_policy set enabled=false','update product_editorial_policy set enabled=true','editorial_disabled'],
    ["update workflow_releases set enabled=false where product_id='daily-card'","update workflow_releases set enabled=true where product_id='daily-card'"],
    ["update workflow_releases set contract_version='stale' where product_id='daily-card'","update workflow_releases set contract_version='atv-workflow/1.0.0' where product_id='daily-card'"],
    ['update editorial_promotions set revoked_at=now()','update editorial_promotions set revoked_at=null'],
    ["update editorial_promotions set evidence_digest=repeat('d',64)","update editorial_promotions set evidence_digest=repeat('b',64)"],
    ['update product_editorial_receipts set revoked_at=now()','update product_editorial_receipts set revoked_at=null'],
    ["update product_editorial_receipts set approved_at=now()-interval '2 hours',expires_at=now()-interval '1 hour'","update product_editorial_receipts set approved_at=now(),expires_at=now()+interval '1 hour'"],
    ["update product_editorial_receipts set calculation=jsonb_set(calculation,'{version}','\"changed\"')",null],
  ];
  for(const [change,restore,error='release_evidence_required'] of cases) {
    await db.exec(change);await assert.rejects(()=>complete(db,c),new RegExp(error));
    assert.equal((await read(db,r.id)).state,'AWAITING_EDITORIAL');
    assert.equal((await db.query('select count(*)::int as n from product_run_events where run_id=$1',[r.id])).rows[0].n,3);
    if(restore) await db.exec(restore);else await db.query('update product_editorial_receipts set calculation=$1 where id=$2',[r.calculation,a.id]);
  }
  assert.deepEqual(await complete(db,c),{state:'READY',revision:4});
});

test('a revoked receipt closes reader and persisted artifact recovery without exposing private evidence',async t=>{
  const db=await boot(t);const r=await pending(db);const a=await receipt(db,r);await enable(db);const c=await claim(db);await complete(db,c);
  await db.exec('update product_artifact_policy set enabled=true');
  const body=Buffer.from('<html>synthetic only</html>');
  const artifact=await service(db,"select persist_product_artifact($1,$2,4,$3,'web',-1,'atv-web-export/1.0.0',$4,$5) as data",
    [r.id,owner,a.review_digest,body.toString('base64'),createHash('sha256').update(body).digest('hex')]);
  const artifacts=()=>asRole(db,'authenticated',owner,()=>db.query('select list_product_artifacts($1) as data',[r.id])).then(x=>x.rows[0].data);
  const download=()=>asRole(db,'authenticated',owner,()=>db.query('select read_product_artifact($1,$2) as data',[r.id,artifact.id])).then(x=>x.rows[0].data);
  assert.equal((await artifacts()).length,1);assert.ok(await download());
  await db.exec('update product_editorial_receipts set revoked_at=now()');
  const hidden=await read(db,r.id);assert.equal(hidden.released,false);assert.equal(hidden.editorial,null);assert.equal(hidden.calculation,null);assert.equal(hidden.cartography,null);
  assert.deepEqual(await artifacts(),[]);assert.equal(await download(),null);
  await assert.rejects(()=>complete(db,c),/release_evidence_required/);
  await assert.rejects(()=>db.exec('delete from product_editorial_receipts'),/foreign key/);
  // Expiry bounds permission to publish, not ownership of a previously delivered reading.
  await db.exec("update product_editorial_receipts set revoked_at=null,approved_at=now()-interval '2 hours',expires_at=now()-interval '1 hour'");
  assert.equal((await read(db,r.id)).released,true);assert.ok(await download());
});

test('owner deletion cascades approved receipts, work and artifacts; emergency stop preserves recovery',async t=>{
  const db=await boot(t);const r=await pending(db);await receipt(db,r);await enable(db);const c=await claim(db);await complete(db,c);
  await db.exec(await file('supabase/forward-fixes/20260923110000_disable_product_editorial.sql'));
  await assert.rejects(()=>claim(db),/permission denied/);await assert.rejects(()=>complete(db,c),/permission denied/);
  assert.equal((await read(db,r.id)).released,true);
  const deleted=await asRole(db,'authenticated',owner,()=>db.query('select delete_product_run($1) as data',[r.id]));
  assert.equal(deleted.rows[0].data,true);assert.equal(await read(db,r.id),null);
  for(const table of ['product_editorial_receipts','product_editorial_work'])
    assert.equal((await db.query('select count(*)::int as n from '+table)).rows[0].n,0);
});

test('missing approval, mismatched snapshot and experimental engine gates leave work waiting',async t=>{
  const db=await boot(t);const r=await pending(db);await enable(db);assert.equal(await claim(db),null);
  const a=await receipt(db,r,{calculation:{...r.calculation,version:'changed'}});assert.equal(await claim(db),null);
  await db.query('update product_editorial_receipts set calculation=$1 where id=$2',[r.calculation,a.id]);
  await db.exec("update product_runs set calculation=jsonb_set(calculation,'{status}','\"experimental\"'); update product_editorial_receipts set calculation=jsonb_set(calculation,'{status}','\"experimental\"')");
  assert.equal(await claim(db),null);
  await db.exec("update workflow_releases set engine_approved=true where product_id='daily-card'");const c=await claim(db);assert.ok(c);
  await db.exec("update workflow_releases set engine_approved=false where product_id='daily-card'");
  await assert.rejects(()=>complete(db,c),/release_evidence_required/);
  await assert.rejects(()=>service(db,'select claim_product_editorial($1)',[[]]),/invalid_claim/);
});

test('migration preserves pre-existing reader emergency ACL instead of reopening it',async t=>{
  const db=await setupProductDatabase({processing:true});t.after(()=>db.close());
  await db.exec(await file('supabase/migrations/20260915180000_product_artifacts.sql'));
  await db.exec(await file('supabase/forward-fixes/20260914120000_disable_product_run_reader.sql'));
  await db.exec(await file(migration));
  await assert.rejects(()=>read(db,randomUUID()),/permission denied/);
  assert.equal((await db.query('select count(*)::int as n from product_editorial_receipts')).rows[0].n,0);
  assert.equal((await db.query('select count(*)::int as n from editorial_promotions')).rows[0].n,0);
  assert.equal((await db.query('select count(*)::int as n from workflow_releases where enabled')).rows[0].n,0);
});
