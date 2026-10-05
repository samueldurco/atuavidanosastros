import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setupProductDatabase, owner, other, file } from './helpers/product-database.mjs';
import { asRole, readyArtifactFixture } from './helpers/artifact-fixture.mjs';

test('continuity access receipts are private, atomic, bounded and disposable', async t => {
  const db=await setupProductDatabase();
  t.after(()=>db.close());
  for(const name of ['20260928130000_product_continuity.sql','20260928133000_product_continuity_selection.sql',
    '20260928140000_product_continuity_profile_guard.sql','20260928160000_product_continuity_access.sql',
    '20260928170100_product_continuity_maintenance.sql'])
    await db.exec(await file(`supabase/migrations/${name}`));
  const rpc=(sql,params=[],user=owner,role='authenticated')=>asRole(db,role,user,async()=>
    (await db.query(sql,params)).rows[0].data);
  const history=(user=owner)=>rpc('select read_product_continuity_access() as data',[],user);
  const select=ids=>rpc('select read_product_continuity_selection($1) as data',[ids]);
  const count=async table=>Number((await db.query(`select count(*) as n from ${table}`)).rows[0].n);
  let run,ids,theirs,theirId;
  await t.test('defaults remain closed and unaudited helper/tables cannot be called directly',async()=>{
    assert.equal((await db.query('select access_retention_days from product_continuity_policy')).rows[0].access_retention_days,null);
    assert.deepEqual(await select([randomUUID()]),{status:'blocked',code:'disabled'});
    assert.deepEqual(await history(),{version:'atv-continuity-access/1',events:[]});
    for(const role of ['anon','authenticated','service_role']){
      for(const table of ['product_continuity_access','product_continuity_access_items'])
        await assert.rejects(asRole(db,role,owner,()=>db.query(`select * from ${table}`)),/permission denied/);
      await assert.rejects(rpc('select product_continuity_selection_snapshot($1) as data',[[randomUUID()]],owner,role),/permission denied/);
    }
    for(const role of ['anon','service_role'])
      for(const name of ['read_product_continuity_selection','read_product_continuity_access','clear_product_continuity_access'])
        await assert.rejects(rpc(`select ${name}(${name.endsWith('selection')?'$1':''}) as data`,name.endsWith('selection')?[[randomUUID()]]:[],owner,role),/permission denied/);
    await assert.rejects(rpc('select read_product_continuity_access() as data',[],null),/auth_required/);
    await assert.rejects(rpc('select purge_expired_product_continuity_access() as data'),/permission denied/);
    const proc=(await db.query("select provolatile,prosecdef,proconfig from pg_proc where oid='read_product_continuity_selection(uuid[])'::regprocedure")).rows[0];
    assert.equal(proc.provolatile,'v'); assert.equal(proc.prosecdef,true); assert.deepEqual(proc.proconfig,['search_path=""']);
  });
  await t.test('no retention decision means no selected response or access receipt',async()=>{
    await db.exec('update product_continuity_policy set enabled=true');
    run=await readyArtifactFixture(db);
    theirs=await readyArtifactFixture(db,'daily-card',other);
    ids=[randomUUID(),randomUUID()];theirId=randomUUID();
    for(const [user,source,chosen] of [[owner,run,ids],[other,theirs,[theirId]]]){
      await rpc('select set_product_continuity_consent($1,$2,$3) as data',[0,[source.id],true],user);
      for(const id of chosen) await rpc('select save_product_continuity_item($1,$2,$3,$4,$5) as data',
        [id,source.id,0,'relevant',{kind:'reported',category:'theme',text:'PRIVATE_NOTE_NEVER_AUDITED'}],user);
    }
    await assert.rejects(select(ids),/continuity_audit_unavailable/);
    assert.equal(await count('product_continuity_access'),0);
    for(const days of [0,31]) await assert.rejects(db.query('update product_continuity_policy set access_retention_days=$1',[days]),/check constraint/);
    await db.exec('update product_continuity_policy set access_retention_days=7'); // Synthetic QA decision only.
  });
  await t.test('one successful selected snapshot writes exact ordered metadata, no source text',async()=>{
    const wire=await select([ids[1],ids[0]]);
    assert.equal(wire.status,'selected'); assert.equal(wire.version,'atv-continuity-selection/1');
    assert.equal('accessId' in wire,false);
    const result=await history(); assert.equal(result.events.length,1);
    const receipt=result.events[0];
    assert.deepEqual(Object.keys(receipt).sort(),['id','purpose','outcome','createdAt','expiresAt','consentRevision','items'].sort());
    assert.equal(receipt.purpose,'reading-context');assert.equal(receipt.outcome,'selected');assert.equal(receipt.consentRevision,1);
    assert.equal(Date.parse(receipt.expiresAt)-Date.parse(receipt.createdAt),7*86400000);
    assert.deepEqual(receipt.items,[ids[1],ids[0]].map(itemId=>({itemId,itemRevision:1,runId:run.id,runRevision:4})));
    const stored=JSON.stringify((await db.query('select to_jsonb(a) as data from product_continuity_access a')).rows)+
      JSON.stringify((await db.query('select to_jsonb(i) as data from product_continuity_access_items i')).rows);
    for(const secret of ['PRIVATE_NOTE_NEVER_AUDITED','Conteúdo sintético','Leitura sintética','selection','input','editorial'])
      assert.equal(stored.includes(secret),false);
    assert.deepEqual((await history(other)).events,[]);
    await rpc('select read_product_continuity_selection($1) as data',[[theirId]],other);
    assert.equal((await history()).events.length,1);assert.equal((await history(other)).events.length,1);
  });
  await t.test('failed selection and receipt write never return partial data or leave a receipt',async()=>{
    const before=await count('product_continuity_access');
    assert.deepEqual(await select([ids[0],theirId]),{status:'blocked',code:'item_unavailable'});
    assert.equal(await count('product_continuity_access'),before);
    await db.exec("create function qa_refuse_access() returns trigger language plpgsql as $$ begin raise exception 'fixture audit failure'; end $$; create trigger qa_refuse_access before insert on product_continuity_access_items for each row execute function qa_refuse_access()");
    await assert.rejects(select(ids),/fixture audit failure/);
    assert.equal(await count('product_continuity_access'),before);
    await db.exec('drop trigger qa_refuse_access on product_continuity_access_items; drop function qa_refuse_access()');
    await db.query('update profiles set deleted_at=now() where id=$1',[owner]);
    assert.deepEqual(await select(ids),{status:'blocked',code:'source_unavailable'});
    await assert.rejects(history(),/profile_unavailable/);
    await db.query('update profiles set deleted_at=null where id=$1',[owner]);
  });
  await t.test('1000 unexpired events cap access; explicit owner clearing preserves notes and other owner',async()=>{
    await db.query('insert into product_continuity_access(user_id,consent_revision,expires_at) select $1,1,now()+interval \'7 days\' from generate_series(1,999)',[owner]);
    await assert.rejects(select(ids),/continuity_audit_capacity/);
    assert.equal((await history()).events.length,1000);
    assert.equal(await rpc('select clear_product_continuity_access() as data'),1000);
    assert.equal(await rpc('select clear_product_continuity_access() as data'),0);
    assert.equal(await count('product_continuity_items'),3);
    assert.equal((await history(other)).events.length,1);
    await select(ids);assert.equal((await history()).events.length,1);
  });
  await t.test('expiry is hidden, narrowly purgeable and removed before the next selected read',async()=>{
    await db.query("update product_continuity_access set created_at=now()-interval '8 days',expires_at=now()-interval '1 day' where user_id=$1",[owner]);
    assert.deepEqual((await history()).events,[]);
    assert.equal(await rpc('select purge_expired_product_continuity_access() as data',[],null,'service_role'),1);
    assert.equal((await history(other)).events.length,1);
    await select(ids);
    await db.query("update product_continuity_access set created_at=now()-interval '8 days',expires_at=now()-interval '1 day' where user_id=$1",[owner]);
    await select(ids);
    assert.equal(await count('product_continuity_access'),2);
  });
  await t.test('deleting any selected item removes the complete receipt, not another owner',async()=>{
    assert.equal(await rpc('select delete_product_continuity_item($1) as data',[ids[0]]),true);
    assert.deepEqual((await history()).events,[]);
    assert.equal((await history(other)).events.length,1);
    assert.equal(await count('product_continuity_access_items'),1);
    await select([ids[1]]);
    await db.query('delete from product_runs where id=$1',[run.id]);
    assert.deepEqual((await history()).events,[]);
    assert.equal((await history(other)).events.length,1);
  });
  await t.test('deleting one source discards the whole multi-source receipt but preserves remaining curation',async()=>{
    const first=await readyArtifactFixture(db), second=await readyArtifactFixture(db);
    const chosen=[randomUUID(),randomUUID()];
    await rpc('select set_product_continuity_consent($1,$2,$3) as data',[1,[first.id,second.id],true]);
    for(const [index,source] of [first,second].entries())
      await rpc('select save_product_continuity_item($1,$2,$3,$4,$5) as data',
        [chosen[index],source.id,0,'relevant',{kind:'reported',category:'theme',text:'Private multi-source fixture'}]);
    await select(chosen);
    assert.equal((await history()).events[0].items.length,2);
    await db.query('delete from product_runs where id=$1',[first.id]);
    assert.deepEqual((await history()).events,[]);
    assert.equal((await history(other)).events.length,1);
    assert.equal(await count('product_continuity_items'),2);
    await select([chosen[1]]);
    ids=[chosen[1]];
  });
  await t.test('service maintenance drains only expired receipts in bounded oldest-first batches',async()=>{
    const before=await count('product_continuity_access');
    const notes=await count('product_continuity_items');
    const consent=(await db.query('select * from product_continuity_consents order by user_id')).rows;
    await db.query(`insert into product_continuity_access(user_id,consent_revision,created_at,expires_at)
      select case when n%2=0 then $1::uuid else $2::uuid end,1,
        now()-interval '30 days',now()-interval '2 days'+n*interval '1 second'
      from generate_series(1,1203) n`,[owner,other]);
    const expired=(await db.query('select id,user_id from product_continuity_access where expires_at<=now() order by expires_at,id')).rows;
    const parent=expired.find(row=>row.user_id===owner);
    await db.query(`insert into product_continuity_access_items(access_id,user_id,position,item_id,item_revision,run_id,run_revision)
      select $1,$2,1,id,revision,run_id,4 from product_continuity_items where id=$3`,[parent.id,owner,ids[0]]);
    for(const role of ['anon','authenticated'])
      await assert.rejects(rpc('select purge_expired_product_continuity_access() as data',[],owner,role),/permission denied/);
    const proc=(await db.query("select prosecdef,proconfig from pg_proc where oid='purge_expired_product_continuity_access()'::regprocedure")).rows[0];
    assert.equal(proc.prosecdef,true);assert.deepEqual(proc.proconfig,['search_path=""']);
    let removed=0;
    for(const expected of [500,500,203,0]){
      assert.equal(await rpc('select purge_expired_product_continuity_access() as data',[],null,'service_role'),expected);
      removed+=expected;
      assert.equal(await count('product_continuity_access'),before+1203-removed);
      const remaining=(await db.query('select id from product_continuity_access where expires_at<=now() order by expires_at,id')).rows;
      assert.deepEqual(remaining.map(row=>row.id),expired.slice(removed).map(row=>row.id));
    }
    assert.equal((await db.query('select count(*)::int n from product_continuity_access_items where access_id=$1',[parent.id])).rows[0].n,0);
    assert.equal(await count('product_continuity_items'),notes);
    assert.deepEqual((await db.query('select * from product_continuity_consents order by user_id')).rows,consent);
    assert.equal((await history()).events.length,1);assert.equal((await history(other)).events.length,1);
  });
  await t.test('failed batch rolls back every deletion and leaves recovery to a new explicit call',async()=>{
    await db.query(`insert into product_continuity_access(user_id,consent_revision,created_at,expires_at)
      select $1,1,now()-interval '2 days',now()-interval '1 day' from generate_series(1,3)`,[owner]);
    const before=await count('product_continuity_access');
    await db.exec(`create function qa_refuse_purge() returns trigger language plpgsql as $$
      begin raise exception 'fixture purge failure'; end $$;
      create trigger qa_refuse_purge after delete on product_continuity_access for each statement execute function qa_refuse_purge()`);
    await assert.rejects(rpc('select purge_expired_product_continuity_access() as data',[],null,'service_role'),/fixture purge failure/);
    assert.equal(await count('product_continuity_access'),before);
    await db.exec('drop trigger qa_refuse_purge on product_continuity_access; drop function qa_refuse_purge()');
    assert.equal(await rpc('select purge_expired_product_continuity_access() as data',[],null,'service_role'),3);
  });
  await t.test('forward-fix never restores unaudited core; revocation, inspection and erasure survive',async()=>{
    await db.exec(await file('supabase/forward-fixes/disable_product_continuity_access.sql'));
    await assert.rejects(select([ids[0]]),/permission denied/);
    await assert.rejects(rpc('select product_continuity_selection_snapshot($1) as data',[[ids[0]]]),/permission denied/);
    assert.equal(await rpc('select set_product_continuity_consent($1,$2,$3) as data',[2,[],false]),3);
    assert.equal((await history()).events.length,1);
    await db.query('update profiles set deleted_at=now() where id=$1',[owner]);
    assert.equal(await rpc('select clear_product_continuity_access() as data'),1);
    assert.equal(await count('product_continuity_items'),2);
    assert.equal((await history(other)).events.length,1);
    await db.query('delete from profiles where id=$1',[other]);
    assert.equal(await count('product_continuity_access'),0);
    assert.equal(await count('product_continuity_access_items'),0);
    assert.equal(await rpc('select clear_product_continuity_access() as data'),0);
  });
  await t.test('maintenance forward-fix closes service purge without removing owner controls or data',async()=>{
    await db.exec(await file('supabase/forward-fixes/disable_product_continuity_maintenance.sql'));
    assert.equal((await db.query('select enabled from product_continuity_policy')).rows[0].enabled,false);
    for(const role of ['anon','authenticated','service_role'])
      await assert.rejects(rpc('select purge_expired_product_continuity_access() as data',[],owner,role),/permission denied/);
    assert.equal(await rpc('select clear_product_continuity_access() as data'),0);
    await db.query('update profiles set deleted_at=null where id=$1',[owner]);
    assert.deepEqual((await history()).events,[]);
    assert.equal(await rpc('select set_product_continuity_consent($1,$2,$3) as data',[3,[],false]),4);
    assert.equal(await count('product_continuity_items'),1);
  });
});
