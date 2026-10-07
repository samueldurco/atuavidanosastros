import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { setupProductDatabase, owner, other, file } from './helpers/product-database.mjs';
import { asRole } from './helpers/artifact-fixture.mjs';
let db;
const career=randomUUID(),pair=randomUUID(),foreign=randomUUID();
before(async()=>{
  db=await setupProductDatabase();
  await db.exec(await file('supabase/migrations/20261006140000_private_product_trials.sql'));
  await db.exec(await file('supabase/migrations/20261007160000_private_reading_experience.sql'));
  await asRole(db,'service_role',null,()=>db.query('insert into atv_trial_grants(owner_id) values($1),($2)',[owner,other]));
  for(const [id,user,product] of [[career,owner,'career-compass'],[pair,owner,'synastry'],[foreign,other,'synastry']]){
    await asRole(db,'service_role',null,()=>db.query(`insert into atv_trial_readings(id,owner_id,product_id,request_key,input,calculation,reading,approval) values($1,$2,$3,$4,$5,'{}',$5,$6)`,[id,user,product,randomUUID(),JSON.stringify({productId:product}),JSON.stringify({status:'approved',scope:'private-free-test',policy:'atv-private-trial-approval/3.0.0',digest:'a'.repeat(64)})]));
  }
});
after(async()=>{await db?.close();});
test('reader progress persists for its owner; anonymous and other owners cannot read or write it',async()=>{
  await asRole(db,'authenticated',owner,()=>db.query(`insert into atv_trial_reader_state(owner_id,reading_id,chapter,bookmarks) values($1,$2,3,'{1,3}')`,[owner,career]));
  const row=await asRole(db,'authenticated',owner,()=>db.query('select chapter,bookmarks from atv_trial_reader_state'));
  assert.deepEqual(row.rows,[{chapter:3,bookmarks:[1,3]}]);
  assert.equal((await asRole(db,'authenticated',other,()=>db.query('select * from atv_trial_reader_state'))).rows.length,0);
  await assert.rejects(asRole(db,'anon',null,()=>db.query('select * from atv_trial_reader_state')),/permission denied/);
  await assert.rejects(asRole(db,'authenticated',owner,()=>db.query('insert into atv_trial_reader_state(owner_id,reading_id) values($1,$2)',[owner,foreign])),/foreign key/);
  for(const chapter of [-1,60]) await assert.rejects(asRole(db,'authenticated',owner,()=>db.query('update atv_trial_reader_state set chapter=$1',[chapter])),/check constraint/);
  await assert.rejects(asRole(db,'authenticated',owner,()=>db.query(`update atv_trial_reader_state set bookmarks='{60}'`)),/check constraint/);
});
test('only owned couple readings can receive a hashed share; revocation and replacement persist',async()=>{
  await assert.rejects(asRole(db,'authenticated',owner,()=>db.query('insert into atv_trial_shares(owner_id,reading_id,token_hash,expires_at) values($1,$2,$3,now()+interval \'7 days\')',[owner,career,'b'.repeat(64)])),/row-level security/);
  await assert.rejects(asRole(db,'authenticated',owner,()=>db.query('insert into atv_trial_shares(owner_id,reading_id,token_hash,expires_at) values($1,$2,$3,now()+interval \'7 days\')',[owner,foreign,'b'.repeat(64)])),/row-level security/);
  await asRole(db,'authenticated',owner,()=>db.query('insert into atv_trial_shares(owner_id,reading_id,token_hash,expires_at) values($1,$2,$3,now()+interval \'7 days\')',[owner,pair,'b'.repeat(64)]));
  await assert.rejects(asRole(db,'anon',null,()=>db.query('select * from atv_trial_shares')),/permission denied/);
  assert.equal((await asRole(db,'authenticated',other,()=>db.query('select * from atv_trial_shares'))).rows.length,0);
  await asRole(db,'authenticated',owner,()=>db.query('update atv_trial_shares set revoked_at=now()'));
  assert.equal((await db.query('select revoked_at is not null as revoked from atv_trial_shares')).rows[0].revoked,true);
  await asRole(db,'authenticated',owner,()=>db.query('update atv_trial_shares set token_hash=$1,revoked_at=null',['c'.repeat(64)]));
  assert.equal((await db.query('select token_hash from atv_trial_shares')).rows[0].token_hash,'c'.repeat(64));
});
test('revoked grants hide both tables and block new writes; rollback retains historical readings and progress',async()=>{
  await db.query('update atv_trial_grants set revoked_at=now() where owner_id=$1',[owner]);
  for(const table of ['atv_trial_reader_state','atv_trial_shares']) assert.equal((await asRole(db,'authenticated',owner,()=>db.query('select * from '+table))).rows.length,0);
  await assert.rejects(asRole(db,'authenticated',owner,()=>db.query('insert into atv_trial_reader_state(owner_id,reading_id) values($1,$2)',[owner,pair])),/row-level security/);
  await db.exec(await file('supabase/rollbacks/20261007160000_private_reading_experience.sql'));
  assert.equal((await db.query('select count(*)::int as n from atv_trial_readings')).rows[0].n,3);
  assert.equal((await db.query('select chapter from atv_trial_reader_state')).rows[0].chapter,3);
});
