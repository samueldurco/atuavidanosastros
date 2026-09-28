import test from 'node:test';
import assert from 'node:assert/strict';
import { CaelusEphemerisProvider } from '@atv/astrology';
import { careerCompassContract, createPurposeCalculators } from './src/purpose-calculators.ts';
import { validateCalculation } from './src/product-processing.ts';
import { prepareProductFacts } from './src/product-editorial.ts';

const birth={localDateTime:'2000-01-01T12:00:00',utcInstant:'2000-01-01T12:00:00Z',timezone:'UTC',latitude:0,longitude:0,locationSource:'synthetic'};
const input=()=>({version:'atv-workflow/1.0.0',productId:'career-compass',birth:{...birth},
  consent:{storage:true,policyVersion:'atv-input-consent/1',partner:false,continuity:false}});
const context=()=>({runId:'00000000-0000-4000-8000-000000000001',signal:new AbortController().signal});

test('career compass exposes only validated MC and keeps context reported, not interpreted',async()=>{
  const registry=createPurposeCalculators(),chart=await new CaelusEphemerisProvider().calculate(birth);
  assert.ok(Object.isFrozen(registry));assert.deepEqual(Object.keys(registry),['career-compass']);
  const value=await registry['career-compass']({...input(),context:'Contexto sintético'},context());
  assert.ok(validateCalculation(value,'career-compass'));assert.equal(value.version,careerCompassContract.version);
  assert.equal(value.status,'experimental');assert.deepEqual(value.data.angles,{ascendant:null,midheaven:chart.houses.midheaven});
  assert.deepEqual(value.data.positions,[]);assert.deepEqual(value.data.houses.cusps,[]);
  assert.equal(value.data.houses.status,'not-requested');assert.equal(value.data.projection.interpretation,'not-produced');
  assert.equal(value.facts.length,2);assert.equal(value.facts[0].id,'angle-midheaven');
  assert.equal(value.facts[1].kind,'reported');assert.equal(value.facts[1].source,'input.context');
  assert.ok(value.facts[0].source.endsWith(careerCompassContract.version));
  assert.equal(prepareProductFacts('career-compass',value).status,'prepared');
  assert.ok(value.limits.some(x=>x.includes('Carreira não se reduz a um signo')));
  assert.ok(value.limits.some(x=>x.includes('não foram produzidos')));
});

test('invalid consent, civil time and unsupported product fail before computation',async()=>{
  let calls=0;const calculate=createPurposeCalculators({async calculate(){calls++;assert.fail('must not compute');}})['career-compass'];
  for(const value of [{...input(),productId:'purpose-career'}, {...input(),consent:{...input().consent,storage:false}},
    {...input(),birth:{...birth,localDateTime:'2000-02-30T12:00:00'}},
    {...input(),birth:{...birth,utcInstant:'2000-01-01T13:00:00Z'}}, {...input(),context:'x'.repeat(1201)}])
    await assert.rejects(()=>calculate(value,context()),/input_invalid/);
  assert.equal(calls,0);
});

test('MC remains independent of unavailable polar houses with no substituted Ascendant',async()=>{
  for(const latitude of [-90,-67,67,90]) {
    const value=await createPurposeCalculators()['career-compass']({...input(),birth:{...birth,latitude}},context());
    assert.equal(value.facts.length,1);assert.equal(value.facts[0].id,'angle-midheaven');
    assert.ok(Number.isFinite(value.data.angles.midheaven));assert.equal(value.data.angles.ascendant,null);
    assert.deepEqual(value.data.houses.cusps,[]);assert.ok(validateCalculation(value,'career-compass'));
  }
});

test('half-open MC signs do not round across boundaries',async()=>{
  const chart=await new CaelusEphemerisProvider().calculate(birth);
  for(const [angle,expected] of [[0,'0.000000° de Áries'],[29.9999999,'29.999999° de Áries'],[30,'0.000000° de Touro'],[359.9999999,'29.999999° de Peixes']]) {
    const copy=structuredClone(chart);copy.houses.midheaven=angle;
    const calculate=createPurposeCalculators({async calculate(){return copy;}})['career-compass'];
    const value=await calculate(input(),context());assert.equal(value.facts[0].display,`Meio do Céu: ${expected}`);
  }
});

test('forged chart provenance fails closed and abort fences provider output',async()=>{
  const chart=await new CaelusEphemerisProvider().calculate(birth);
  for(const mutate of [v=>v.houses.midheaven=360,v=>v.provenance.contract.productionPromotion=true,v=>v.input.longitude=10]) {
    const copy=structuredClone(chart);mutate(copy);
    await assert.rejects(()=>createPurposeCalculators({async calculate(){return copy;}})['career-compass'](input(),context()),/calculation_invalid/);
  }
  const controller=new AbortController();let calls=0;
  const calculate=createPurposeCalculators({async calculate(){calls++;controller.abort();return chart;}})['career-compass'];
  for(let i=0;i<2;i++) await assert.rejects(()=>calculate(input(),{...context(),signal:controller.signal}),/abort/i);
  assert.equal(calls,1);
});

test('snapshots own their mutable facts and provenance',async()=>{
  const chart=await new CaelusEphemerisProvider().calculate(birth);
  const calculate=createPurposeCalculators({async calculate(){return chart;}})['career-compass'];
  const first=await calculate(input(),context()),second=await calculate(input(),context());
  assert.deepEqual(first.facts,second.facts);first.facts[0].display='changed';first.data.provenance.dataManifest.changed=true;
  assert.notDeepEqual(first.facts,second.facts);assert.equal(second.data.provenance.dataManifest.changed,undefined);
  assert.equal(chart.provenance.dataManifest.changed,undefined);
});
