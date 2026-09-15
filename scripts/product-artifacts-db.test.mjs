import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { setupProductDatabase,owner,other,file } from './helpers/product-database.mjs';
import { asRole,readyArtifactFixture } from './helpers/artifact-fixture.mjs';
import { persistRenderedProductArtifact } from '../apps/worker/src/product-artifacts.ts';

test('private binary artifacts: service persistence, owner recovery and emergency gates',async t=>{
  const db=await setupProductDatabase();t.after(()=>db.close());
  await db.exec(await file('supabase/migrations/20260915180000_product_artifacts.sql'));
  const reading=await readyArtifactFixture(db);
  const input={owner,reading,format:'web',section:-1,rendererVersion:'atv-web-export/1.0.0',bytes:new TextEncoder().encode('<html>synthetic artifact</html>')};
  const rpc=async(name,args,signal)=>{signal.throwIfAborted();return (await asRole(db,'service_role',null,()=>db.query(
    `select ${name}(${Object.keys(args).map((key,i)=>key+' => $'+(i+1)).join(',')}) as data`,Object.values(args)))).rows[0].data;};
  const read=(id,user=owner,run=reading.id)=>asRole(db,'authenticated',user,()=>db.query('select read_product_artifact($1,$2) as data',[run,id])).then(r=>r.rows[0].data);
  const list=(user=owner)=>asRole(db,'authenticated',user,()=>db.query('select list_product_artifacts($1) as data',[reading.id])).then(r=>r.rows[0].data);
  let saved;
  await t.test('independent policy is disabled and clients cannot fabricate or inspect bytes',async()=>{
    assert.equal((await db.query('select enabled from product_artifact_policy')).rows[0].enabled,false);
    await assert.rejects(()=>persistRenderedProductArtifact(rpc,input),/artifact_unavailable/);
    for(const role of ['anon','authenticated','service_role']) {
      await assert.rejects(()=>asRole(db,role,owner,()=>db.query('select * from product_artifacts')),/permission denied/);
      await assert.rejects(()=>asRole(db,role,owner,()=>db.exec('update product_artifact_policy set enabled=true')),/permission denied/);
      await assert.rejects(()=>asRole(db,role,owner,()=>db.query('select product_artifact_run_allowed($1,$2)',[reading.id,owner])),/permission denied/);
    }
    for(const role of ['anon','authenticated']) await assert.rejects(()=>asRole(db,role,owner,()=>db.query(
      'select persist_product_artifact($1,$2,4,$3,\'web\',-1,\'atv-web-export/1.0.0\',\'YQ==\',$4)',[reading.id,owner,'a'.repeat(64),'b'.repeat(64)])),/permission denied/);
    assert.deepEqual(await list(),[]);
    await db.exec('update product_artifact_policy set enabled=true');
  });
  await t.test('trusted bytes persist exactly and lost-response retries return the same manifest',async()=>{
    saved=await persistRenderedProductArtifact(rpc,input);
    assert.deepEqual(await persistRenderedProductArtifact(rpc,input),saved);
    const artifact=await read(saved.id);
    assert.equal(Buffer.from(artifact.bodyBase64,'base64').toString(),'<html>synthetic artifact</html>');
    assert.equal(artifact.sha256,createHash('sha256').update(input.bytes).digest('hex'));
    assert.equal(artifact.bytes,input.bytes.length);
    assert.deepEqual(await list(),[saved]);assert.equal(Object.hasOwn((await list())[0],'bodyBase64'),false);
    assert.equal((await db.query('select count(*) from product_artifacts')).rows[0].count,1);
    await assert.rejects(()=>persistRenderedProductArtifact(rpc,{...input,bytes:new TextEncoder().encode('changed')}),/artifact_unavailable/);
    assert.equal((await read(saved.id)).sha256,saved.sha256);
  });
  await t.test('direct service RPC rejects hash/base64, revision, owner, renderer and format mismatches',async()=>{
    const args=[reading.id,owner,4,reading.reviewDigest,'web',-1,input.rendererVersion,Buffer.from(input.bytes).toString('base64'),saved.sha256];
    const call=values=>asRole(db,'service_role',null,()=>db.query('select persist_product_artifact($1,$2,$3,$4,$5,$6,$7,$8,$9)',values));
    for(const [i,value] of [[0,randomUUID()],[1,other],[2,3],[3,'c'.repeat(64)],[4,'audio'],[5,0],[6,'unknown/1'],[7,'%%%'],[7,'Y Q=='],[8,'c'.repeat(64)]]) {
      const changed=[...args];changed[i]=value;await assert.rejects(()=>call(changed),/artifact_invalid|artifact_unavailable/);
    }
    for(const [format,renderer,section] of [['pdf','atv-pdf-export/1.0.0',-1],['svg','atv-svg-export/1.0.0',-1],['card','atv-reading-card/1.0.0',1]]) {
      const changed=[...args];changed[4]=format;changed[5]=section;changed[6]=renderer;await assert.rejects(()=>call(changed),/artifact_invalid/);
    }
  });
  await t.test('owner isolation, substituted run IDs and anonymous/service reads fail closed',async()=>{
    assert.equal(await read(saved.id,other),null);assert.deepEqual(await list(other),[]);
    assert.equal(await read(saved.id,owner,randomUUID()),null);
    await assert.rejects(()=>read(saved.id,null),/auth_required/);
    for(const role of ['anon','service_role']) await assert.rejects(()=>asRole(db,role,owner,()=>db.query('select read_product_artifact($1,$2)',[reading.id,saved.id])),/permission denied/);
  });
  await t.test('all publication/revision/policy gates recheck old bytes without erasing history',async()=>{
    for(const [disable,restore] of [
      ["update workflow_releases set enabled=false where product_id='daily-card'","update workflow_releases set enabled=true where product_id='daily-card'"],
      ["update workflow_releases set contract_version='revoked' where product_id='daily-card'","update workflow_releases set contract_version='atv-workflow/1.0.0' where product_id='daily-card'"],
      ['update editorial_promotions set revoked_at=now()','update editorial_promotions set revoked_at=null'],
      ["update product_runs set editorial=jsonb_set(editorial,'{reviewDigest}',to_jsonb(repeat('c',64)))","update product_runs set editorial=jsonb_set(editorial,'{reviewDigest}',to_jsonb(repeat('a',64)))"],
      ['update product_artifact_policy set enabled=false','update product_artifact_policy set enabled=true']]) {
      await db.exec(disable);assert.equal(await read(saved.id),null);assert.deepEqual(await list(),[]);await db.exec(restore);
      assert.equal((await read(saved.id)).sha256,saved.sha256);
    }
    assert.equal((await db.query('select count(*) from product_run_events where run_id=$1',[reading.id])).rows[0].count,4);
  });
  await t.test('astrology needs current engine approval; per-run bytes and owner count are bounded',async()=>{
    const cleanup=[];
    try {
      const natal=await readyArtifactFixture(db,'birth-chart',other);
      cleanup.push(natal.id);
      const large={...input,owner:other,reading:natal,bytes:new Uint8Array(8388608).fill(65)};
      const stored=await persistRenderedProductArtifact(rpc,large);
      await db.exec("update workflow_releases set engine_approved=false where product_id='birth-chart'");
      assert.equal(await read(stored.id,other,natal.id),null);
      await assert.rejects(()=>persistRenderedProductArtifact(rpc,large),/artifact_unavailable/);
      await db.exec("update workflow_releases set engine_approved=true where product_id='birth-chart'");
      await persistRenderedProductArtifact(rpc,{...large,format:'pdf',rendererVersion:'atv-pdf-export/1.0.0'});
      await assert.rejects(()=>persistRenderedProductArtifact(rpc,{...large,format:'card',section:0,
        rendererVersion:'atv-reading-card/1.0.0',bytes:new Uint8Array([65])}),/artifact_unavailable/);
      assert.equal((await db.query('select count(*) from product_artifacts where run_id=$1',[natal.id])).rows[0].count,2);
      // Superuser fixture accelerates reaching the cardinality boundary; no application direct writer exists.
      await db.query(`insert into product_artifacts(run_id,user_id,revision,review_digest,format,section_index,renderer_version,checksum_sha256,body)
        select $1,$2,4,$3,'web',-1,'fixture/'||n,$3,decode('41','hex') from generate_series(1,198) as n`,[natal.id,other,'a'.repeat(64)]);
      const another=await readyArtifactFixture(db,'daily-card',other);
      cleanup.push(another.id);
      await assert.rejects(()=>persistRenderedProductArtifact(rpc,{...input,owner:other,reading:another}),/artifact_unavailable/);
      assert.deepEqual(await persistRenderedProductArtifact(rpc,large),stored);
    } finally {
      for(const id of cleanup) await db.query('delete from product_runs where id=$1',[id]);
      await db.exec("update workflow_releases set enabled=false,engine_approved=false where product_id='birth-chart'");
    }
  });
  await t.test('quotas are transactional, idempotent retry at capacity is still allowed',async()=>{
    const large={...input,bytes:new Uint8Array(8388608).fill(65)};
    const first=await readyArtifactFixture(db),second=await readyArtifactFixture(db),third=await readyArtifactFixture(db);
    await persistRenderedProductArtifact(rpc,{...large,reading:first});await persistRenderedProductArtifact(rpc,{...large,reading:second});
    await persistRenderedProductArtifact(rpc,{...large,reading:third});
    const fourth=await readyArtifactFixture(db);
    await assert.rejects(()=>persistRenderedProductArtifact(rpc,{...large,reading:fourth}),/artifact_unavailable/);
    assert.deepEqual(await persistRenderedProductArtifact(rpc,input),saved);
    assert.equal((await db.query('select count(*) from product_artifacts where run_id=$1',[fourth.id])).rows[0].count,0);
  });
  await t.test('forward-fix is recoverable, stops reads/writes and deletion removes binaries atomically',async()=>{
    await db.exec(await file('supabase/forward-fixes/20260915180000_disable_product_artifacts.sql'));
    await assert.rejects(()=>read(saved.id),/permission denied/);
    await assert.rejects(()=>persistRenderedProductArtifact(rpc,input),/artifact_unavailable/);
    assert.equal((await db.query('select count(*) from product_artifacts where run_id=$1',[reading.id])).rows[0].count,1);
    await asRole(db,'authenticated',owner,()=>db.query('select delete_product_run($1)',[reading.id]));
    assert.equal((await db.query('select count(*) from product_artifacts where run_id=$1',[reading.id])).rows[0].count,0);
    assert.equal((await db.query('select count(*) from product_run_events where run_id=$1',[reading.id])).rows[0].count,0);
  });
});
