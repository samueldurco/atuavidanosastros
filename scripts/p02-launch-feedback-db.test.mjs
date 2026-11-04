import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { setupProductDatabase, owner, other, file } from './helpers/product-database.mjs';
import { asRole } from './helpers/artifact-fixture.mjs';

// SQL fixtures exercise access control; they are not editorial or owner approval.
let db, ownReading, foreignReading;
const writer = (fn) => asRole(db, 'service_role', null, fn);
const client = (fn, user = owner) => asRole(db, 'authenticated', user, fn);
const table = 'atv_launch_feedback';
async function seedReading(user) {
  const id = randomUUID(), digest = 'a'.repeat(64), product = 'ex-tarot';
  const input = {version:'atv-launch-input/1',productId:product,
    consent:{storage:true,policyVersion:'atv-launch-consent/1'},answers:{episode:'Fixture SQL.'}};
  const evidence = {version:'atv-launch-calculation/1',executionId:id,productId:product,
    inputDigest:digest,state:'FACTS_READY_AWAITING_REVIEW',facts:[],data:{fixture:true}};
  await writer(() => db.query(`insert into atv_launch_preparations
    (id,owner_id,request_key,product_id,input,input_digest,evidence)
    values($1,$2,$3,$4,$5,$6,$7)`, [id,user,randomUUID(),product,JSON.stringify(input),digest,
      JSON.stringify({...evidence,version:'atv-launch-evidence/1',state:'AWAITING_CALCULATION',facts:[]})]));
  await writer(() => db.query(`update atv_launch_preparations set status='FACTS_READY_AWAITING_REVIEW',
    evidence=$2 where id=$1`, [id,JSON.stringify(evidence)]));
  const readingDigest='c'.repeat(64);
  const reading={version:'atv-launch-reading/1',executionId:id,productId:product,inputDigest:digest,
    title:'Fixture SQL',summary:'Não representa uma leitura homologada.',
    sections:[{id:'fixture',title:'Fixture',paragraphs:['Teste de isolamento.'],evidenceIds:[],sourceIds:[]}],
    practicalAction:'Nenhuma.',reflection:'Fixture.',limits:['SQL somente.'],provenance:{}};
  const review={version:'atv-launch-reading-review/1',status:'APPROVED_FOR_PRIVATE_TEST',
    policyVersion:'atv-launch-private-editorial-policy/1',checks:[{id:'fixture',passed:true,detail:'SQL.'}],
    reasons:[],digest:readingDigest,provenance:{scope:'private-editorial-consistency',
      commercialPrecisionApproved:false,commercialReleaseApproved:false}};
  await writer(() => db.query(`insert into atv_launch_readings
    (preparation_id,owner_id,product_id,input_digest,calculation_digest,reading_digest,reading,review)
    values($1,$2,$3,$4,$5,$6,$7,$8)`,[id,user,product,digest,'b'.repeat(64),readingDigest,
      JSON.stringify(reading),JSON.stringify(review)]));
  return {id,owner:user,digest:readingDigest};
}
const payload = (reading=ownReading, overrides={}) => ({request_key:randomUUID(),preparation_id:reading.id,
  owner_id:reading.owner,reading_digest:reading.digest,decision:'approved',comment:'',...overrides});
const insert = (row) => db.query(`insert into ${table}
  (request_key,preparation_id,owner_id,reading_digest,decision,comment) values($1,$2,$3,$4,$5,$6)
  returning id,request_key,decision,comment,created_at`,
  [row.request_key,row.preparation_id,row.owner_id,row.reading_digest,row.decision,row.comment]);
before(async () => {
  db=await setupProductDatabase({privateOnly:true});
  for(const migration of ['20261006140000_private_product_trials.sql',
    '20261104102635_p02_launch_preparations.sql','20261104103423_p02_launch_readings.sql',
    '20261104110009_p02_launch_feedback.sql']) await db.exec(await file(`supabase/migrations/${migration}`));
  await writer(() => db.query('insert into atv_trial_grants(owner_id) values($1),($2)',[owner,other]));
  ownReading=await seedReading(owner); foreignReading=await seedReading(other);
});
after(async () => {await db?.close();});

test('authenticated owner can append feedback with server-generated identity and time', async () => {
  const row=payload(), result=await client(() => insert(row));
  assert.match(result.rows[0].id,/^[0-9a-f-]{36}$/);
  assert.ok(result.rows[0].created_at);
  assert.equal(result.rows[0].request_key,row.request_key);
  const revision=payload(ownReading,{decision:'rejected',comment:'Quero rever a interpretação.'});
  await client(() => insert(revision));
  const saved=await client(() => db.query(`select decision from ${table} where preparation_id=$1 order by created_at,id`,[ownReading.id]));
  assert.equal(saved.rows.length,2);
  assert.deepEqual(new Set(saved.rows.map(r=>r.decision)),new Set(['approved','rejected']));
  await assert.rejects(client(() => insert(row)),/duplicate key/);
});

test('feedback cannot target another owner, missing reading or a different reading digest', async () => {
  for(const row of [payload(foreignReading),payload(ownReading,{owner_id:other}),
    payload(ownReading,{preparation_id:randomUUID()}),payload(ownReading,{reading_digest:'d'.repeat(64)})]) {
    await assert.rejects(client(() => insert(row)),/launch_feedback_access_denied|launch_feedback_reading_mismatch|row-level security/);
  }
  await client(() => insert(payload(foreignReading)),other);
  assert.equal((await client(() => db.query(`select id from ${table} where preparation_id=$1`,[foreignReading.id]))).rows.length,0);
  assert.equal((await client(() => db.query(`select id from ${table}`),other)).rows.length,1);
  await assert.rejects(asRole(db,'anon',null,() => db.query(`select * from ${table}`)),/permission denied/);
  await assert.rejects(writer(() => insert(payload())),/permission denied/);
});

test('feedback decisions and comments are bounded and clients cannot supply timestamps or mutate history', async () => {
  for(const overrides of [{decision:'unknown'},{decision:'rejected',comment:'  '},{comment:'x'.repeat(3001)}])
    await assert.rejects(client(() => insert(payload(ownReading,overrides))),/check constraint/);
  await assert.rejects(client(() => db.query(`insert into ${table}
    (request_key,preparation_id,owner_id,reading_digest,decision,created_at) values($1,$2,$3,$4,'approved',now())`,
    [randomUUID(),ownReading.id,owner,ownReading.digest])),/permission denied/);
  for(const run of [client,writer]) {
    await assert.rejects(run(() => db.query(`update ${table} set comment='alterado'`)),/permission denied/);
    await assert.rejects(run(() => db.query(`delete from ${table}`)),/permission denied/);
  }
  await assert.rejects(db.query(`update ${table} set comment='alterado'`),/launch_feedback_immutable/);
});

test('revoked and expired access hide feedback and prevent new evaluations', async () => {
  await writer(() => db.query('update atv_trial_grants set revoked_at=now() where owner_id=$1',[owner]));
  assert.equal((await client(() => db.query(`select * from ${table}`))).rows.length,0);
  await assert.rejects(client(() => insert(payload())),/launch_feedback_access_denied|row-level security/);
  await writer(() => db.query('update atv_trial_grants set revoked_at=null,expires_at=now()-interval \'1 second\' where owner_id=$1',[owner]));
  assert.equal((await client(() => db.query(`select * from ${table}`))).rows.length,0);
  await assert.rejects(client(() => insert(payload())),/launch_feedback_access_denied|row-level security/);
});

test('forward disable preserves evidence and closes client access', async () => {
  const count=(await db.query(`select count(*)::int as n from ${table}`)).rows[0].n;
  await db.exec(await file('supabase/rollbacks/20261104110009_p02_launch_feedback_disable.sql'));
  assert.equal((await db.query(`select count(*)::int as n from ${table}`)).rows[0].n,count);
  await assert.rejects(client(() => db.query(`select * from ${table}`)),/permission denied/);
  await assert.rejects(client(() => insert(payload())),/permission denied/);
});
