import test from 'node:test';
import assert from 'node:assert/strict';
import { CaelusEphemerisProvider } from '@atv/astrology';
import { createNatalCalculators, natalProductContract, zodiacPosition } from './src/natal-calculators.ts';
import { validateCalculation } from './src/product-processing.ts';

const birth={localDateTime:'2000-01-01T12:00:00',utcInstant:'2000-01-01T12:00:00Z',timezone:'UTC',latitude:0,longitude:0,locationSource:'synthetic'};
const input=productId=>({version:'atv-workflow/1.0.0',productId,birth:{...birth},consent:{storage:true,policyVersion:'atv-input-consent/1',partner:false,continuity:false}});
const context=()=>({runId:'00000000-0000-4000-8000-000000000001',signal:new AbortController().signal});

test('four real natal projections preserve experimental provenance and only their requested factors',async()=>{
  const calculators=createNatalCalculators();
  assert.deepEqual(Object.keys(calculators),['birth-chart','three-pillars','ascendant','midheaven']);assert.ok(Object.isFrozen(calculators));
  for(const [product,counts] of Object.entries({'birth-chart':[10,24],'three-pillars':[2,3],ascendant:[0,1],midheaven:[0,1]})) {
    const value=await calculators[product](input(product),context());
    assert.equal(value.status,'experimental');assert.equal(value.version,natalProductContract.version);
    assert.equal(value.data.positions.length,counts[0]);assert.equal(value.facts.length,counts[1]);
    assert.equal(value.data.provenance.contract.productionPromotion,false);
    assert.equal(value.data.provenance.temporal.dut1Seconds,null);
    assert.equal(value.data.projection.aspects,'not-assessed');
    assert.ok(validateCalculation(value,product));
    if(product!=='birth-chart') assert.deepEqual(value.data.houses.cusps,[]);
  }
});

test('zodiac sectors preserve boundary classification without rounding into the next sign',()=>{
  assert.equal(zodiacPosition(0).sign,'Áries');assert.equal(zodiacPosition(30).sign,'Touro');
  assert.equal(zodiacPosition(30-Number.EPSILON*16).sign,'Áries');
  assert.equal(zodiacPosition(359.99999999999).display,'29.999999° de Peixes');
  for(const v of [-1,360,NaN,Infinity,'30']) assert.throws(()=>zodiacPosition(v),/calculation_invalid/);
});

test('polar and failed-house policy removes unsupported Ascendant and never substitutes cusps',async()=>{
  const calculators=createNatalCalculators();
  for(const latitude of [-90,-66,66,90]) {
    const value=await calculators['birth-chart']({...input('birth-chart'),birth:{...birth,latitude}},context());
    assert.equal(value.data.angles.ascendant,null);assert.equal(value.data.houses.status,'not-applicable');
    assert.deepEqual(value.data.houses.cusps,[]);assert.equal(value.data.positions.length,10);
    assert.ok(value.facts.some(f=>f.id==='ascendant-unavailable'));assert.ok(!value.facts.some(f=>f.id==='angle-ascendant'));
    assert.ok(value.facts.some(f=>f.id==='angle-midheaven'));assert.ok(validateCalculation(value,'birth-chart'));
  }
});

test('calendar and timezone mismatch fail before provider work, and unsupported products stay absent',async()=>{
  let calls=0;const calculators=createNatalCalculators({name:'fixture',version:'0',async calculate(){calls++;throw Error('must not run');}});
  for(const change of [{localDateTime:'2000-02-30T12:00:00'},{utcInstant:'2000-01-01T13:00:00Z'},{timezone:'Invalid/Zone'}])
    await assert.rejects(()=>calculators.ascendant({...input('ascendant'),birth:{...birth,...change}},context()),/input_invalid/);
  await assert.rejects(()=>calculators.ascendant(input('career-compass'),context()),/input_invalid/);
  assert.equal(calls,0);assert.equal(calculators['solar-return'],undefined);assert.equal(calculators.synastry,undefined);
});

test('output snapshots are isolated, facts repeat and personal context remains a reported fact',async()=>{
  const calculators=createNatalCalculators(),value={...input('three-pillars'),context:'Contexto sintético'};
  const first=await calculators['three-pillars'](value,context()),second=await calculators['three-pillars'](value,context());
  assert.deepEqual(first.facts,second.facts);assert.deepEqual(first.data.positions,second.data.positions);
  assert.equal(first.facts.at(-1).kind,'reported');assert.equal(first.facts.at(-1).display,value.context);
  first.data.positions[0].longitude=0;first.data.provenance.dataManifest.changed=true;
  assert.notDeepEqual(first.data.positions,second.data.positions);assert.equal(second.data.provenance.dataManifest.changed,undefined);
});

test('abort fences late provider results and forged positions/provenance cannot become snapshots',async()=>{
  const base=await new CaelusEphemerisProvider().calculate(birth);
  for(const mutate of [v=>v.positions[0].longitude=NaN,v=>v.positions[0].body='invented',v=>v.provenance.accuracyStatus='approved',
    v=>v.provenance.contract.productionPromotion=true,v=>v.input.longitude=12,v=>v.houses.cusps=[]]) {
    const chart=structuredClone(base);mutate(chart);
    const calculators=createNatalCalculators({name:'fixture',version:'0',async calculate(){return chart;}});
    await assert.rejects(()=>calculators.ascendant(input('ascendant'),context()),/calculation_invalid/);
  }
  const controller=new AbortController();let called=false;
  const calculators=createNatalCalculators({name:'fixture',version:'0',async calculate(){called=true;controller.abort();return base;}});
  await assert.rejects(()=>calculators.ascendant(input('ascendant'),{...context(),signal:controller.signal}),/abort/i);assert.equal(called,true);
  called=false;await assert.rejects(()=>calculators.ascendant(input('ascendant'),{...context(),signal:controller.signal}),/abort/i);assert.equal(called,false);
});
