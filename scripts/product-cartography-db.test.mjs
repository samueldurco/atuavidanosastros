import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setupProductDatabase, owner, other, file } from './helpers/product-database.mjs';

async function as(db,role,user,fn) {
  await db.exec(`set role ${role}`);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user??'']);
  try { return await fn(); } finally { await db.exec('reset role'); }
}
const bodies=['sun','moon','mercury','venus','mars','jupiter','saturn','uranus','neptune','pluto'];
function snapshot(product='birth-chart') {
  const full=product==='birth-chart';
  return {version:'atv-natal-product-calculation/1.0.0',kind:'natal',status:'experimental',
    facts:[{id:'angle-ascendant',kind:'calculated',display:'Fixture',source:'synthetic'}],limits:[],
    data:{productId:product,raw:'RAW_SECRET',birth:{date:'PRIVATE_DATE'},
      positions:full?bodies.map((body,i)=>({body,longitude:i*35.123456789,latitude:1,distanceAu:99,raw:'RAW_SECRET'})):[],
      angles:{ascendant:21.123456789,midheaven:full?291.987654321:null,raw:'RAW_SECRET'},
      houses:{system:'placidus',status:full?'ok':'not-requested',cusps:full?Array.from({length:12},(_,i)=>(i*30+21.123456789)%360):[],raw:'RAW_SECRET'},
      provenance:{zodiac:'tropical',referenceFrame:'geocentric-apparent-ecliptic-of-date',birth:'PRIVATE_DATE'}}};
}
test('PostgreSQL minimized cartography, fresh release gates, ACL and forward-fix',async t=>{
  const db=await setupProductDatabase(); t.after(()=>db.close());
  const project=calc=>db.query('select product_cartography_projection($1,$2) as geo',[calc.data.productId,JSON.stringify(calc)]).then(r=>r.rows[0].geo);
  await t.test('preserves exact coordinates while excluding private and raw fields',async()=>{
    for(const product of ['birth-chart','ascendant']) {
      const calc=snapshot(product), geo=await project(calc);
      assert.deepEqual(geo.positions,calc.data.positions.map(({body,longitude})=>({body,longitude})));
      assert.deepEqual(geo.angles,{ascendant:calc.data.angles.ascendant,midheaven:calc.data.angles.midheaven});
      assert.deepEqual(geo.houses.cusps,calc.data.houses.cusps);
      assert.doesNotMatch(JSON.stringify(geo),/RAW_SECRET|PRIVATE_DATE|latitude|distanceAu/);
    }
    const polar=snapshot(); polar.data.angles.ascendant=null; polar.data.houses={system:'placidus',status:'not-applicable',cusps:[]};
    assert.equal((await project(polar)).angles.ascendant,null);
    assert.deepEqual((await project(polar)).houses.cusps,[]);
  });
  await t.test('rejects malformed geometry instead of raising or parsing display facts',async()=>{
    const changes=[c=>c.version='old',c=>c.status='recorded',c=>c.data.positions=[],
      c=>c.data.positions.push(c.data.positions[0]),c=>c.data.positions[1]=c.data.positions[0],
      c=>c.data.houses.cusps=['raw'],c=>c.data.houses.cusps=[{secret:'raw'}],
      c=>c.data.houses.cusps=[],c=>c.data.angles.ascendant={},c=>delete c.data.angles.midheaven,
      c=>c.data.houses.status='not-requested',c=>c.data.provenance.zodiac='sidereal',
      ...[-1,360,'12',null,{}].map(value=>c=>c.data.positions[0].longitude=value)];
    for(const change of changes) {const calc=snapshot();change(calc);assert.equal(await project(calc),null);}
  });
  await t.test('helper is not callable by any API role',async()=>{
    for(const role of ['anon','authenticated','service_role']) await assert.rejects(()=>as(db,role,owner,()=>project(snapshot())),/permission denied/);
  });
  let id;
  const read=(user=owner)=>as(db,'authenticated',user,()=>db.query('select read_product_run($1) as view',[id])).then(r=>r.rows[0].view);
  await t.test('geometry is absent until READY and absent for other users or revoked gates',async()=>{
    // Local test-only promotion; never seeded by migrations or used as homologation evidence.
    await db.exec("update workflow_releases set enabled=true,engine_approved=true where product_id='ascendant'");
    id=(await as(db,'authenticated',owner,()=>db.query('select request_product_run($1,$2,$3) as id',['ascendant',randomUUID(),JSON.stringify({version:'atv-workflow/1.0.0',productId:'ascendant',consent:{storage:true,policyVersion:'atv-input-consent/1'}})]))).rows[0].id;
    assert.equal((await read()).cartography,null);
    const advance=(rev,state,calc=null,edit=null)=>as(db,'service_role',null,()=>db.query('select advance_product_run($1,$2,$3,$4,$5,$6)',[id,owner,rev,state,calc&&JSON.stringify(calc),edit&&JSON.stringify(edit)]));
    await advance(1,'CALCULATED',snapshot('ascendant')); await advance(2,'AWAITING_EDITORIAL');
    assert.equal((await read()).cartography,null);
    await db.query("insert into editorial_promotions values ('fixture-svg','ascendant','atv-workflow/1.0.0',$1,null)",['b'.repeat(64)]);
    await advance(3,'READY',null,{version:'fixture/1',promotionId:'fixture-svg',reviewDigest:'a'.repeat(64),title:'Synthetic',sections:[{title:'Synthetic',text:'Fixture only',evidence:['angle-ascendant']}],limits:[]});
    const view=await read(); assert.equal(view.released,true);assert.deepEqual(view.cartography,await project(snapshot('ascendant')));
    assert.equal(view.calculation.data,undefined); assert.equal(view.input,undefined);assert.equal(view.history.length,4);
    assert.equal(await read(other),null);
    for(const [disable,restore] of [["update editorial_promotions set revoked_at=now()","update editorial_promotions set revoked_at=null"],
      ["update workflow_releases set engine_approved=false where product_id='ascendant'","update workflow_releases set engine_approved=true where product_id='ascendant'"],
      ["update workflow_releases set enabled=false where product_id='ascendant'","update workflow_releases set enabled=true where product_id='ascendant'"]]) {
      await db.exec(disable); const denied=await read();assert.equal(denied.cartography,null);assert.equal(denied.released,false);await db.exec(restore);
    }
  });
  await t.test('reader replacement preserves emergency revocation; forward-fix keeps reading/deleting safe',async()=>{
    await db.exec('revoke execute on function read_product_run(uuid) from authenticated');
    // Simulates reader CREATE OR REPLACE when its execute grant has already been withdrawn.
    const migration=await file('supabase/migrations/20260915130000_product_cartography.sql');
    await db.exec(migration.slice(migration.indexOf('create or replace function public.read_product_run')));
    await assert.rejects(()=>read(),/permission denied/);
    await db.exec('grant execute on function read_product_run(uuid) to authenticated');
    await db.exec(await file('supabase/forward-fixes/20260915130000_disable_product_cartography.sql'));
    const view=await read();assert.equal(view.cartography,null);assert.equal(view.released,true);assert.equal(view.editorial.title,'Synthetic');assert.equal(view.history.length,4);
    await assert.rejects(()=>as(db,'authenticated',owner,()=>db.query('select * from product_runs')),/permission denied/);
    await as(db,'authenticated',owner,()=>db.query('select delete_product_run($1)',[id]));assert.equal(await read(),null);
  });
});
