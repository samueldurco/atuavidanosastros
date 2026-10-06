import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { setupProductDatabase, owner, other, file } from './helpers/product-database.mjs';
import { asRole } from './helpers/artifact-fixture.mjs';

// Real disposable PostgreSQL policies with synthetic identities, never a hosted-session claim.
let db;
const readings={owner:randomUUID(),other:randomUUID()},nonce=randomUUID();
const approval={status:'approved',scope:'private-free-test',policy:'atv-private-trial-approval/1.0.0',digest:'a'.repeat(64)};
const insert=(user,id,key=randomUUID(),stamp=approval,input={productId:'career-compass'})=>asRole(db,'service_role',null,()=>db.query(`insert into atv_trial_readings(id,owner_id,product_id,request_key,input,calculation,reading,approval) values($1,$2,'career-compass',$3,$4,'{}',$5,$6)`,[id,user,key,JSON.stringify(input),JSON.stringify({productId:'career-compass'}),JSON.stringify(stamp)]));
before(async()=>{
  db=await setupProductDatabase();
  await db.exec(await file('supabase/migrations/20261006140000_private_product_trials.sql'));
  await asRole(db,'service_role',null,()=>db.query('insert into atv_trial_grants(owner_id) values($1),($2)',[owner,other]));
  await insert(owner,readings.owner,nonce);await insert(other,readings.other);
});
after(async()=>{await db?.close();});
test('private readings require a server insert and exact approval fields; duplicates cannot replay',async()=>{
  await assert.rejects(insert(owner,randomUUID(),nonce),/unique constraint/);
  for(const stamp of [{},{...approval,digest:'forged'},{...approval,scope:'commercial'}])await assert.rejects(insert(owner,randomUUID(),randomUUID(),stamp),/check constraint/);
  await assert.rejects(insert(owner,randomUUID(),randomUUID(),approval,{}),/check constraint/);
  for(const table of ['atv_trial_grants','atv_trial_readings','atv_trial_dreams'])for(const privilege of ['INSERT','UPDATE','DELETE','TRUNCATE']){
    const result=await db.query('select has_table_privilege($1,$2,$3) as allowed',['authenticated','public.'+table,privilege]);assert.equal(result.rows[0].allowed,false);
  }
  for(const table of ['atv_trial_feedback','atv_trial_notes','atv_trial_club_feedback']){
    const result=await db.query('select has_table_privilege($1,$2,\'TRUNCATE\') as allowed',['authenticated','public.'+table]);assert.equal(result.rows[0].allowed,false);
  }
});
test('anonymous access is denied; authenticated readers see only their own records',async()=>{
  await assert.rejects(asRole(db,'anon',null,()=>db.query('select * from atv_trial_readings')),/permission denied/);
  await assert.rejects(asRole(db,'anon',null,()=>db.query('select has_atv_trial_access()')),/permission denied/);
  for(const [user,id] of [[owner,readings.owner],[other,readings.other]]){
    const rows=await asRole(db,'authenticated',user,()=>db.query('select id from atv_trial_readings'));assert.deepEqual(rows.rows,[{id}]);
    const grant=await asRole(db,'authenticated',user,()=>db.query('select has_atv_trial_access() as allowed'));assert.equal(grant.rows[0].allowed,true);
  }
});
test('personal approval, notes and club review are owner scoped and tied to the correct saved reading',async()=>{
  await asRole(db,'authenticated',owner,()=>db.query(`insert into atv_trial_feedback(owner_id,product_id,reading_id,decision,comment) values($1,'career-compass',$2,'rejected','Revisar o exemplo.')`,[owner,readings.owner]));
  await assert.rejects(asRole(db,'authenticated',owner,()=>db.query(`update atv_trial_feedback set reading_id=$1 where owner_id=$2`,[readings.other,owner])),/foreign key/);
  await assert.rejects(asRole(db,'authenticated',owner,()=>db.query(`insert into atv_trial_feedback(owner_id,product_id,reading_id,decision) values($1,'career-compass',$2,'approved')`,[other,readings.other])),/row-level security/);
  await asRole(db,'authenticated',owner,()=>db.query(`insert into atv_trial_notes(owner_id,reading_id,step,text) values($1,$2,7,'Anotei o experimento.')`,[owner,readings.owner]));
  await assert.rejects(asRole(db,'authenticated',owner,()=>db.query(`insert into atv_trial_notes(owner_id,reading_id,step,text) values($1,$2,7,'Nota em leitura alheia.')`,[owner,readings.other])),/foreign key/);
  await asRole(db,'authenticated',owner,()=>db.query(`insert into atv_trial_club_feedback(owner_id,decision) values($1,'approved')`,[owner]));
  const privateRows=await asRole(db,'authenticated',other,()=>db.query('select * from atv_trial_club_feedback'));assert.equal(privateRows.rows.length,0);
  const reading=await db.query('select approval from atv_trial_readings where id=$1',[readings.owner]);assert.deepEqual(reading.rows[0].approval,approval);
});
test('revocation races are fenced at insertion, history and all personal writes; restoration preserves data',async()=>{
  await db.query('update atv_trial_grants set revoked_at=now() where owner_id=$1',[owner]);
  await assert.rejects(insert(owner,randomUUID()),/trial_access_revoked/);
  await assert.rejects(asRole(db,'service_role',null,()=>db.query(`insert into atv_trial_dreams(owner_id,reading_id,data) values($1,$2,'{}')`,[owner,readings.owner])),/trial_access_revoked/);
  const invisible=await asRole(db,'authenticated',owner,()=>db.query('select * from atv_trial_readings'));assert.equal(invisible.rows.length,0);
  await assert.rejects(asRole(db,'authenticated',owner,()=>db.query(`insert into atv_trial_notes(owner_id,reading_id,step,text) values($1,$2,0,'Novo')`,[owner,readings.owner])),/row-level security/);
  await db.query('update atv_trial_grants set revoked_at=null,expires_at=now()-interval \'1 second\' where owner_id=$1',[owner]);
  await assert.rejects(insert(owner,randomUUID()),/trial_access_revoked/);
  await db.query('update atv_trial_grants set expires_at=null where owner_id=$1',[owner]);
  const visible=await asRole(db,'authenticated',owner,()=>db.query('select id from atv_trial_readings'));assert.deepEqual(visible.rows,[{id:readings.owner}]);
});
test('reviewed forward-fix retains all records and closes only private test grants',async()=>{
  const before=await db.query('select count(*)::int as count from atv_trial_readings');
  await db.exec(await file('supabase/rollbacks/20261006140000_private_product_trials.sql'));
  const after=await db.query('select count(*)::int as count from atv_trial_readings');assert.deepEqual(after.rows,before.rows);
  for(const user of [owner,other]){
    const result=await asRole(db,'authenticated',user,()=>db.query('select has_atv_trial_access() as allowed'));assert.equal(result.rows[0].allowed,false);
  }
  await db.query('update atv_trial_grants set revoked_at=null where owner_id=$1',[owner]);
  const restored=await asRole(db,'authenticated',owner,()=>db.query('select count(*)::int as count from atv_trial_readings'));assert.equal(restored.rows[0].count,1);
});
