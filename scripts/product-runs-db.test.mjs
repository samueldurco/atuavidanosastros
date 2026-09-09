import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { workflows } from '../packages/domain/src/workflows.ts';

// Real PostgreSQL in WASM, isolated synthetic users. Supabase auth/storage are minimal stubs;
// this does NOT certify hosted PostgREST, JWT verification, Storage or connection concurrency.
const owner='00000000-0000-4000-8000-000000000001', other='00000000-0000-4000-8000-000000000002';
const file=(path)=>readFile(new URL('../'+path,import.meta.url),'utf8');
async function setup() {
  const db=new PGlite({extensions:{pgcrypto}});
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema extensions; create schema auth; create schema storage;
    create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to anon,authenticated,service_role;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid,bucket_id text,name text);
    alter table storage.objects enable row level security;
    create function storage.foldername(text) returns text[] language sql immutable as $$ select string_to_array($1,'/') $$;
    alter default privileges in schema public grant all on tables to anon,authenticated,service_role;
    alter default privileges in schema public grant all on sequences to anon,authenticated,service_role;`);
  for(const path of ['20260902170000_initial_platform.sql','20260907112000_saved_calculation_results.sql','20260909230000_product_runs.sql'])
    await db.exec(await file('supabase/migrations/'+path));
  await db.query('insert into auth.users(id) values ($1),($2)',[owner,other]);
  return db;
}
async function as(db,role,user,fn) {
  await db.exec(`set role ${role}`);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user??'']);
  try {return await fn();} finally {await db.exec('reset role');}
}
const input=(id)=>({version:'atv-workflow/1.0.0',productId:id,consent:{storage:true,policyVersion:'atv-input-consent/1',partner:false,continuity:false},questions:['Questão sintética']});
const request=(db,id='daily-card',key=randomUUID(),data=input(id),parent=null)=>
  db.query('select public.request_product_run($1,$2,$3,$4) as id',[id,key,JSON.stringify(data),parent]).then(r=>r.rows[0].id);
const advance=(db,id,rev,state,calc=null,edit=null,error=null)=>as(db,'service_role',null,()=>db.query('select public.advance_product_run($1,$2,$3,$4,$5,$6,$7) as revision',[id,owner,rev,state,calc&&JSON.stringify(calc),edit&&JSON.stringify(edit),error]));
const draw={version:'fixture/1',kind:'tarot',status:'recorded',facts:[{id:'card-0',kind:'drawn',display:'O Louco',source:'synthetic fixture'}],data:{cards:[0]},limits:[]};
const editorial={version:'fixture/1',promotionId:'synthetic-only',reviewDigest:'a'.repeat(64),title:'Fixture',sections:[{title:'Fixture',text:'Synthetic',evidence:['card-0']}],limits:[]};

test('PostgreSQL workflow persistence, authorization, gates and recovery',async(t)=>{
  const db=await setup(); t.after(()=>db.close());
  await t.test('catalog is complete, disabled, and unpromoted',async()=>{
    const definitions=(await db.query('select product_id,enabled,engine_approved from workflow_releases')).rows;
    assert.deepEqual(definitions.map(p=>p.product_id).sort(),workflows.map(p=>p.id).sort());
    assert.ok(definitions.every(p=>!p.enabled&&!p.engine_approved));
    assert.equal((await db.query('select * from editorial_promotions')).rows.length,0);
    await assert.rejects(()=>as(db,'authenticated',owner,()=>request(db)),/workflow_unreleased/);
    await assert.rejects(()=>as(db,'anon',null,()=>request(db)),/permission denied/);
    await db.exec("update workflow_releases set enabled=true where product_id in ('daily-card','ascendant','dream-reading')");
    await assert.rejects(()=>as(db,'authenticated',owner,()=>request(db,'dream-reading')),/entitlement_required/);
  });
  let id;
  await t.test('request + event + Library are atomic and retry-safe',async()=>{
    const key=randomUUID(); id=await as(db,'authenticated',owner,()=>request(db,'daily-card',key));
    assert.equal(await as(db,'authenticated',owner,()=>request(db,'daily-card',key)),id);
    await assert.rejects(()=>as(db,'authenticated',owner,()=>request(db,'daily-card',key,{...input('daily-card'),context:'different'})),/idempotency_conflict/);
    assert.equal((await db.query('select * from product_run_events where run_id=$1',[id])).rows.length,1);
    assert.equal((await db.query('select * from library_items where source_id=$1',[id])).rows.length,1);
    await db.exec("create function reject_fixture_library() returns trigger language plpgsql as $$ begin raise exception 'fixture_failure'; end $$; create trigger fixture_abort before insert on library_items for each row execute function reject_fixture_library()");
    await assert.rejects(()=>as(db,'authenticated',owner,()=>request(db)),/fixture_failure/);
    assert.equal((await db.query('select * from product_runs')).rows.length,1);
    await db.exec('drop trigger fixture_abort on library_items; drop function reject_fixture_library()');
  });
  await t.test('RLS hides other users; clients cannot self-approve or mutate release flags',async()=>{
    for(const table of ['product_runs','product_run_events']) {
      assert.equal((await as(db,'authenticated',other,()=>db.query('select * from '+table))).rows.length,0);
      assert.equal((await as(db,'authenticated',owner,()=>db.query('select * from '+table))).rows.length,1);
    }
    await assert.rejects(()=>as(db,'authenticated',owner,()=>db.exec("update product_runs set state='READY'")),/permission denied/);
    await assert.rejects(()=>as(db,'authenticated',owner,()=>db.exec('update workflow_releases set enabled=true')),/permission denied/);
    await assert.rejects(()=>as(db,'authenticated',owner,()=>db.query('select advance_product_run($1,$2,1,$3)',[id,owner,'CALCULATED'])),/permission denied/);
    await assert.rejects(()=>as(db,'authenticated',other,()=>request(db,'daily-card',randomUUID(),null,id)),/parent_not_found/);
  });
  await t.test('CAS and release evidence govern transitions, without redrawing on reprocess',async()=>{
    await assert.rejects(()=>advance(db,id,1,'READY'),/invalid_transition/);
    await advance(db,id,1,'CALCULATED',draw);
    await assert.rejects(()=>advance(db,id,1,'AWAITING_EDITORIAL'),/stale_revision/);
    await assert.rejects(()=>advance(db,id,2,'AWAITING_EDITORIAL',{...draw,data:{cards:[1]}}),/calculation_immutable/);
    await advance(db,id,2,'AWAITING_EDITORIAL');
    await assert.rejects(()=>advance(db,id,3,'READY',null,editorial),/release_evidence_required/);
    const retry=await as(db,'authenticated',owner,()=>request(db,'daily-card',randomUUID(),{invalid:true},id));
    const copy=(await db.query('select * from product_runs where id=$1',[retry])).rows[0];
    assert.equal(copy.state,'CALCULATED'); assert.deepEqual(copy.calculation,draw); assert.deepEqual(copy.input,input('daily-card'));
    assert.equal((await db.query('select state from product_runs where id=$1',[id])).rows[0].state,'AWAITING_EDITORIAL');
    // ONLY a synthetic test promotion, never a seeded or real approval.
    await db.query("insert into editorial_promotions values ('synthetic-only','daily-card','atv-workflow/1.0.0',$1,null)",['b'.repeat(64)]);
    await advance(db,id,3,'READY',null,editorial);
    await assert.rejects(()=>advance(db,id,4,'FAILED',null,null,'safe'),/invalid_transition/);
    assert.equal((await db.query('select * from product_run_events where run_id=$1',[id])).rows.length,4);
    assert.equal((await as(db,'authenticated',other,()=>db.query('select delete_product_run($1) as deleted',[id]))).rows[0].deleted,false);
    assert.equal((await as(db,'authenticated',owner,()=>db.query('select delete_product_run($1) as deleted',[id]))).rows[0].deleted,true);
    assert.equal((await db.query('select * from library_items where source_id=$1',[id])).rows.length,0);
    assert.equal((await db.query('select * from product_run_events where run_id=$1',[id])).rows.length,0);
    assert.equal((await db.query('select parent_id from product_runs where id=$1',[retry])).rows[0].parent_id,null);
    await db.exec('delete from editorial_promotions');
  });
  await t.test('missing or forged engine status cannot approve an astrological result',async()=>{
    const natal=await as(db,'authenticated',owner,()=>request(db,'ascendant'));
    await assert.rejects(()=>advance(db,natal,1,'CALCULATED',{...draw,kind:'natal',status:null}),/calculation_required/);
    await advance(db,natal,1,'CALCULATED',{...draw,kind:'natal'});
    await advance(db,natal,2,'AWAITING_EDITORIAL');
    await db.query("insert into editorial_promotions values ('synthetic-only','ascendant','atv-workflow/1.0.0',$1,null)",['b'.repeat(64)]);
    await assert.rejects(()=>advance(db,natal,3,'READY',null,editorial),/release_evidence_required/);
    await db.exec('delete from editorial_promotions');
  });
  await t.test('pending quota is bounded, idempotency survives the limit',async()=>{
    const key=randomUUID(); const first=await as(db,'authenticated',other,()=>request(db,'daily-card',key));
    for(let n=1;n<15;n++) await as(db,'authenticated',other,()=>request(db));
    await assert.rejects(()=>as(db,'authenticated',other,()=>request(db)),/request_limit/);
    assert.equal(await as(db,'authenticated',other,()=>request(db,'daily-card',key)),first);
  });
  await t.test('forward-fix halts new work, preserves authorized history and deletion',async()=>{
    const before=(await as(db,'authenticated',owner,()=>db.query('select id from product_runs'))).rows;
    await db.exec(await file('supabase/forward-fixes/20260909230000_disable_product_runs.sql'));
    assert.deepEqual((await as(db,'authenticated',owner,()=>db.query('select id from product_runs'))).rows,before);
    await assert.rejects(()=>as(db,'authenticated',owner,()=>request(db)),/permission denied/);
    await assert.rejects(()=>advance(db,before[0].id,1,'FAILED',null,null,'safe'),/permission denied/);
    assert.ok((await db.query('select enabled from workflow_releases')).rows.every(p=>!p.enabled));
  });
});
