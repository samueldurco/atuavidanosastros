import test from 'node:test';
import assert from 'node:assert/strict';
import { bodies, CaelusEphemerisProvider } from '@atv/astrology';
import { createContextCalculators, contextProductContract } from './src/context-calculators.ts';
import { validateCalculation } from './src/product-processing.ts';
import { prepareProductFacts } from './src/product-editorial.ts';

const birth={localDateTime:'2000-01-01T12:00:00',utcInstant:'2000-01-01T12:00:00Z',timezone:'UTC',latitude:0,longitude:0,locationSource:'synthetic'};
const partner={...birth,localDateTime:'2001-02-03T10:00:00',utcInstant:'2001-02-03T10:00:00Z'};
const input=productId=>({version:'atv-workflow/1.0.0',productId,birth:{...birth},
  ...(productId==='pair-preview'?{partner:{...partner}}:{targetDate:'2026-09-14'}),
  consent:{storage:true,policyVersion:'atv-input-consent/1',partner:productId==='pair-preview',continuity:false}});
const context=()=>({runId:'00000000-0000-4000-8000-000000000001',signal:new AbortController().signal});

test('pair keeps six separate factors with partial provenance and no compatibility or sharing grant',async()=>{
  const calculators=createContextCalculators(),value=await calculators['pair-preview'](input('pair-preview'),context());
  assert.deepEqual(Object.keys(calculators),['pair-preview','date-reading']);assert.ok(Object.isFrozen(calculators));
  assert.equal(value.version,contextProductContract.version);assert.equal(value.status,'experimental');
  assert.deepEqual(value.facts.map(f=>f.id),['person-a-moon','person-a-venus','person-a-mars','person-b-moon','person-b-venus','person-b-mars']);
  for(const side of ['first','second']) {
    assert.deepEqual(value.data[side].positions.map(p=>p.body),['moon','venus','mars']);
    assert.equal(value.data[side].provenance.contract.productionPromotion,false);
    assert.equal(value.data[side].input,undefined);assert.equal(value.data[side].houses,undefined);
  }
  assert.equal(value.data.compatibilityScore,null);assert.equal(value.data.sharing,'not-authorized');
  assert.deepEqual(value.data.aspects,[]);assert.deepEqual(value.data.events,[]);
  assert.ok(validateCalculation(value,'pair-preview'));
  const prepared=prepareProductFacts('pair-preview',value);assert.equal(prepared.status,'prepared');
  assert.equal(prepared.facts.capability,'relationship-dynamics');assert.equal(prepared.facts.completeness,'partial');
  for(const id of ['synastry','couple-dossier','solar-return','weekly-reading']) assert.equal(calculators[id],undefined);
});

test('date is a single explicit UTC sample, not local timing or a full cycle product',async()=>{
  const calculators=createContextCalculators(),data=input('date-reading');
  const value=await calculators['date-reading'](data,context());
  assert.equal(value.facts.length,21);assert.equal(value.data.sampleInstant,'2026-09-14T12:00:00.000Z');
  assert.deepEqual(value.data.first.positions.map(p=>p.body),bodies);
  assert.deepEqual(value.data.second.positions.map(p=>p.body),bodies);
  const expected=await new CaelusEphemerisProvider().calculate({...birth,localDateTime:'2026-09-14T12:00:00',utcInstant:'2026-09-14T12:00:00Z'});
  assert.deepEqual(value.data.second.positions,expected.positions);
  assert.match(value.facts.at(-1).display,/não representa o dia local inteiro/);
  assert.ok(validateCalculation(value,'date-reading'));
  assert.equal(prepareProductFacts('date-reading',value).facts.capability,'cycle-context');
  assert.equal(value.data.projection.completeness,'partial');assert.deepEqual(value.data.events,[]);
});

test('changing partner or date never changes natal facts and context remains reported',async()=>{
  const calculators=createContextCalculators();
  for(const product of Object.keys(calculators)) {
    const a=input(product),b=structuredClone(a);b.context='Relato sintético <script>inert</script>';
    if(product==='pair-preview') b.partner={...birth};else b.targetDate='2026-09-15';
    const first=await calculators[product](a,context()),second=await calculators[product](b,context());
    assert.deepEqual(first.data.first.positions,second.data.first.positions);
    assert.notDeepEqual(first.data.second.positions,second.data.second.positions);
    assert.equal(second.facts.at(-1).kind,'reported');assert.equal(second.facts.at(-1).display,b.context);
    assert.ok(validateCalculation(second,product));assert.equal(prepareProductFacts(product,second).status,'prepared');
  }
});

test('both inputs and consent are validated before any provider work',async()=>{
  let calls=0;const calculators=createContextCalculators({async calculate(){calls++;throw Error('must not run');}});
  const values=[{...input('pair-preview'),partner:undefined},
    {...input('pair-preview'),consent:{...input('pair-preview').consent,partner:false}},
    {...input('pair-preview'),partner:{...partner,utcInstant:'2001-02-03T11:00:00Z'}},
    ...['2026-02-30','1899-12-31','2100-01-01'].map(targetDate=>({...input('date-reading'),targetDate}))];
  for(const value of values) await assert.rejects(()=>calculators[value.productId](value,context()),/input_invalid/);
  assert.equal(calls,0);
});

test('date boundaries and leap day retain experimental snapshots',async()=>{
  const calculate=createContextCalculators()['date-reading'];
  for(const targetDate of ['1900-01-01','2000-02-29','2099-12-31']) {
    const value=await calculate({...input('date-reading'),targetDate},context());
    assert.equal(value.data.sampleInstant,`${targetDate}T12:00:00.000Z`);assert.ok(validateCalculation(value,'date-reading'));
  }
});

test('invalid second chart never substitutes the first chart or produces a partial success',async()=>{
  const provider=new CaelusEphemerisProvider();
  for(const mutate of [v=>v.positions[0].longitude=NaN,v=>v.input.longitude=12,v=>v.provenance.contract.productionPromotion=true]) {
    let calls=0;const calculate=createContextCalculators({async calculate(value){const chart=await provider.calculate(value);if(++calls===2)mutate(chart);return chart;}})['pair-preview'];
    await assert.rejects(()=>calculate(input('pair-preview'),context()),/calculation_invalid/);assert.equal(calls,2);
  }
});

test('abort fences provider work before and between the two charts',async()=>{
  const provider=new CaelusEphemerisProvider(),controller=new AbortController();let calls=0;
  const calculate=createContextCalculators({async calculate(value){calls++;const chart=await provider.calculate(value);controller.abort();return chart;}})['pair-preview'];
  const ctx={...context(),signal:controller.signal};
  await assert.rejects(()=>calculate(input('pair-preview'),ctx),/abort/i);assert.equal(calls,1);
  await assert.rejects(()=>calculate(input('pair-preview'),ctx),/abort/i);assert.equal(calls,1);
});

test('snapshots detach even when a provider reuses and mutates its chart object',async()=>{
  const provider=new CaelusEphemerisProvider();let shared;
  const calculate=createContextCalculators({async calculate(value){const chart=await provider.calculate(value);if(shared)Object.assign(shared,chart);else shared=chart;return shared;}})['pair-preview'];
  const value=await calculate(input('pair-preview'),context()),expected=await provider.calculate(birth);
  assert.deepEqual(value.data.first.positions,expected.positions.filter(p=>['moon','venus','mars'].includes(p.body)));
  shared.positions[0].longitude=99;shared.provenance.dataManifest.changed=true;
  assert.equal(value.data.second.provenance.dataManifest.changed,undefined);
  const again=await calculate(input('pair-preview'),context());assert.deepEqual(value.facts,again.facts);
});
