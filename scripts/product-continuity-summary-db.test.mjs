import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { setupProductDatabase, file, owner, other } from './helpers/product-database.mjs';
import { asRole, readyArtifactFixture } from './helpers/artifact-fixture.mjs';

test('dashboard continuity summary (local PostgreSQL, not hosted JWT)', async t => {
  const db=await setupProductDatabase();
  t.after(()=>db.close());
  for(const name of ['20260928130000_product_continuity','20260928133000_product_continuity_selection','20260928140000_product_continuity_profile_guard','20260928150000_product_continuity_summary'])
    await db.exec(await file(`supabase/migrations/${name}.sql`));
  const rpc=(sql,params=[],user=owner,role='authenticated')=>asRole(db,role,user,async()=>
    (await db.query(sql,params)).rows[0].data);
  const read=(user=owner,role='authenticated')=>rpc('select read_product_continuity_summary() as data',[],user,role);
  const empty={version:'atv-continuity-summary/1',enabled:false,consentState:'revoked',counts:{total:0,relevant:0,irrelevant:0,unreviewed:0}};
  let run;
  await t.test('default-off, no inferred grant, metadata-only empty result',async()=>{
    assert.deepEqual(await read(),empty);
    const definition=await db.query("select proconfig,prosecdef,provolatile,pronargs from pg_proc where oid='public.read_product_continuity_summary()'::regprocedure");
    assert.deepEqual(definition.rows,[{proconfig:['search_path=""'],prosecdef:true,provolatile:'s',pronargs:0}]);
  });
  await t.test('anonymous, service role, missing auth and unavailable profile fail closed',async()=>{
    for(const role of ['anon','service_role']) await assert.rejects(read(owner,role),/permission denied/);
    await assert.rejects(read(null),/auth_required/);
    await assert.rejects(read(randomUUID()),/profile_unavailable/);
    await db.query('update profiles set deleted_at=now() where id=$1',[owner]);
    await assert.rejects(read(),/profile_unavailable/);
    await db.query('update profiles set deleted_at=null where id=$1',[owner]);
  });
  await t.test('counts only the authenticated owner without projecting private fields',async()=>{
    run=await readyArtifactFixture(db);
    const foreign=await readyArtifactFixture(db,'daily-card',other);
    await db.exec('update product_continuity_policy set enabled=true');
    for(const [user,source] of [[owner,run.id],[other,foreign.id]]){
      await rpc('select set_product_continuity_consent(0,$1,true) as data',[[source]],user);
      for(const relevance of user===owner ? ['relevant','relevant','irrelevant','unreviewed'] : ['relevant'])
        await rpc('select save_product_continuity_item($1,$2,0,$3,$4) as data',
          [randomUUID(),source,relevance,{kind:'reported',category:'theme',text:'PRIVATE-CURATED-CONTENT'}],user);
    }
    assert.deepEqual(await read(),{...empty,enabled:true,consentState:'granted',counts:{total:4,relevant:2,irrelevant:1,unreviewed:1}});
    assert.deepEqual((await read(other)).counts,{total:1,relevant:1,irrelevant:0,unreviewed:0});
    assert.doesNotMatch(JSON.stringify(await read()),/PRIVATE|selection|runId|userId|updatedAt|revision|[0-9a-f]{8}-[0-9a-f]{4}/);
  });
  await t.test('revocation and disabled feature retain counts; neither implies eligibility',async()=>{
    await rpc('select set_product_continuity_consent(1,$1,false) as data',[[]]);
    await db.exec('update product_continuity_policy set enabled=false');
    assert.deepEqual(await read(),{...empty,counts:{total:4,relevant:2,irrelevant:1,unreviewed:1}});
  });
  await t.test('forward-fix denies summary but preserves notes and management',async()=>{
    await db.exec(await file('supabase/forward-fixes/disable_product_continuity_summary.sql'));
    await assert.rejects(read(),/permission denied/);
    const management=await rpc('select read_product_continuity() as data');
    assert.equal(management.items.length,4);
    assert.equal(management.enabled,false);
    await db.exec('grant execute on function public.read_product_continuity_summary() to authenticated');
    assert.equal((await read()).counts.total,4);
  });
  await t.test('source deletion updates counts through existing FK; foreign notes remain',async()=>{
    await db.query('delete from product_runs where id=$1',[run.id]);
    assert.deepEqual(await read(),empty);
    assert.equal((await read(other)).counts.total,1);
  });
});
