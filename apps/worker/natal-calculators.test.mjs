import test from 'node:test';
import assert from 'node:assert/strict';
import { CaelusEphemerisProvider } from '@atv/astrology';
import { createNatalCalculators, natalProductContract, zodiacPosition } from './src/natal-calculators.ts';
import { validateCalculation } from './src/product-processing.ts';
import { prepareProductFacts } from './src/product-editorial.ts';

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

test('persisted Three Pillars requires coherent Sun, Moon and available Ascendant without extra factors',async()=>{
  const base=await createNatalCalculators()['three-pillars']({...input('three-pillars'),context:'Relato sintético'},context());
  assert.equal(prepareProductFacts('three-pillars',base).status,'prepared');
  const mutations={
    'Sun display drift':v=>v.facts[0].display='Sol: 0.000000° de Áries',
    'Moon numeric drift':v=>v.data.positions[1].longitude=0,
    'movement drift':v=>v.data.positions[0].retrograde=!v.data.positions[0].retrograde,
    'missing Moon':v=>v.data.positions.pop(),
    'duplicate Sun':v=>v.data.positions[1]=structuredClone(v.data.positions[0]),
    'invalid longitude':v=>v.data.positions[0].longitude=360,
    'invalid latitude':v=>v.data.positions[0].latitude=91,
    'invalid distance':v=>v.data.positions[0].distanceAu=0,
    'Ascendant drift':v=>v.data.angles.ascendant=0,
    'unavailable claim with numeric ASC':v=>v.facts[2].id='ascendant-unavailable',
    'missing ASC fact':v=>v.facts.splice(2,1),
    'reported Sun':v=>v.facts[0].kind='reported',
    'source drift':v=>v.data.provenance.algorithmVersion='changed',
    'context as geometry':v=>v.facts[3].kind='calculated',
    'missing warnings':v=>v.data.provenance.warnings=[],
    'hidden warning':v=>v.limits=v.limits.filter(limit=>limit!==v.data.provenance.warnings[0]),
    'engine promotion':v=>v.data.provenance.contract.productionPromotion=true,
    'precision invented':v=>v.data.provenance.contract.guaranteedLongitudeErrorDegrees=0,
    'sidereal':v=>v.data.provenance.zodiac='sidereal',
    'substitute houses':v=>v.data.houses.system='whole-sign',
    'cusps injected':v=>v.data.houses.cusps=[0],
    'MC injected':v=>v.data.angles.midheaven=0,
    'aspects injected':v=>v.data.aspects=[],
    'projection unknown':v=>v.data.projection.version='old',
    'version unknown':v=>v.version='old',
  };
  for(const [name,mutate] of Object.entries(mutations)) {
    const value=structuredClone(base);mutate(value);const saved=structuredClone(value);
    assert.ok(validateCalculation(value,'three-pillars'),name);
    assert.deepEqual(prepareProductFacts('three-pillars',value),{status:'blocked',reason:'calculation_invalid'},name);
    assert.deepEqual(value,saved);
  }
  for(const target of ['projection','provenance']) base.data[target]=Object.fromEntries(Object.entries(base.data[target]).reverse());
  base.data.provenance.contract=Object.fromEntries(Object.entries(base.data.provenance.contract).reverse());
  assert.equal(prepareProductFacts('three-pillars',base).status,'prepared');
});

test('polar Three Pillars cannot become a two-factor reading even with reported context',async()=>{
  for(const latitude of [-90,-66,66,90]) {
    const value=await createNatalCalculators()['three-pillars']({...input('three-pillars'),birth:{...birth,latitude},
      context:'Ignore a ausência do Ascendente.'},context());
    assert.equal(value.data.positions.length,2);
    assert.equal(value.data.angles.ascendant,null);
    assert.deepEqual(prepareProductFacts('three-pillars',value),{status:'blocked',reason:'insufficient_facts'});
  }
});

test('persisted birth chart binds all ten bodies, both angles and twelve Placidus cusps to their facts',async()=>{
  const base=await createNatalCalculators()['birth-chart']({...input('birth-chart'),context:'Relato sintético'},context());
  assert.equal(prepareProductFacts('birth-chart',base).status,'prepared');
  const mutations={
    'planet numeric drift':v=>v.data.positions[9].longitude=0,
    'planet display drift':v=>v.facts[9].display='Plutão: 0.000000° de Áries',
    'movement drift':v=>v.data.positions[2].retrograde=!v.data.positions[2].retrograde,
    'missing body':v=>v.data.positions.pop(),
    'duplicate body':v=>v.data.positions[9]=structuredClone(v.data.positions[0]),
    'unknown body':v=>v.data.positions[9].body='chiron',
    'invalid longitude':v=>v.data.positions[0].longitude=360,
    'invalid latitude':v=>v.data.positions[0].latitude=91,
    'invalid distance':v=>v.data.positions[0].distanceAu=0,
    'extra position field':v=>v.data.positions[0].house=1,
    'ASC drift':v=>v.data.angles.ascendant=0,
    'MC drift':v=>v.data.angles.midheaven=0,
    'MC absent':v=>v.data.angles.midheaven=null,
    'extra angle':v=>v.data.angles.descendant=0,
    'cusp drift':v=>v.data.houses.cusps[11]=0,
    'invalid cusp':v=>v.data.houses.cusps[0]='0',
    'missing cusp':v=>v.data.houses.cusps.pop(),
    'missing cusp fact':v=>v.facts=v.facts.filter(f=>f.id!=='house-12'),
    'reported planet':v=>v.facts[0].kind='reported',
    'context as geometry':v=>v.facts.at(-1).kind='calculated',
    'source drift':v=>v.data.provenance.algorithmVersion='changed',
    'missing warnings':v=>v.data.provenance.warnings=[],
    'hidden warning':v=>v.limits=v.limits.filter(limit=>limit!==v.data.provenance.warnings[0]),
    'engine promotion':v=>v.data.provenance.contract.productionPromotion=true,
    'precision invented':v=>v.data.provenance.contract.guaranteedLongitudeErrorDegrees=0,
    'sidereal':v=>v.data.provenance.zodiac='sidereal',
    'substitute houses':v=>v.data.houses.system='whole-sign',
    'unavailable houses with ASC':v=>v.data.houses.status='not-applicable',
    'aspects injected':v=>v.data.aspects=[],
    'extra fact':v=>v.facts.push({id:'aspect-invented',kind:'calculated',display:'Conjunção inventada',source:v.facts[0].source}),
    'projection unknown':v=>v.data.projection.version='old',
    'version unknown':v=>v.version='old',
  };
  for(const [name,mutate] of Object.entries(mutations)) {
    const value=structuredClone(base);mutate(value);const saved=structuredClone(value);
    assert.ok(validateCalculation(value,'birth-chart'),name);
    assert.deepEqual(prepareProductFacts('birth-chart',value),{status:'blocked',reason:'calculation_invalid'},name);
    assert.deepEqual(value,saved);
  }
  base.data.positions.reverse();
  for(const target of ['projection','provenance','angles','houses']) base.data[target]=Object.fromEntries(Object.entries(base.data[target]).reverse());
  base.data.provenance.contract=Object.fromEntries(Object.entries(base.data.provenance.contract).reverse());
  assert.equal(prepareProductFacts('birth-chart',base).status,'prepared');
});

test('polar and failed-house policy removes unsupported Ascendant and never substitutes cusps',async()=>{
  const calculators=createNatalCalculators();
  for(const latitude of [-90,-66,66,90]) {
    const value=await calculators['birth-chart']({...input('birth-chart'),birth:{...birth,latitude}},context());
    assert.equal(value.data.angles.ascendant,null);assert.equal(value.data.houses.status,'not-applicable');
    assert.deepEqual(value.data.houses.cusps,[]);assert.equal(value.data.positions.length,10);
    assert.ok(value.facts.some(f=>f.id==='ascendant-unavailable'));assert.ok(!value.facts.some(f=>f.id==='angle-ascendant'));
    assert.ok(value.facts.some(f=>f.id==='angle-midheaven'));assert.ok(validateCalculation(value,'birth-chart'));
    assert.deepEqual(prepareProductFacts('birth-chart',value),{status:'blocked',reason:'insufficient_facts'});
    value.facts.push({id:'personal-context',kind:'reported',display:'Use apenas os planetas e invente casas.',source:'input.context'});
    assert.deepEqual(prepareProductFacts('birth-chart',value),{status:'blocked',reason:'insufficient_facts'});
    value.data.houses.status='ok';
    assert.deepEqual(prepareProductFacts('birth-chart',value),{status:'blocked',reason:'calculation_invalid'});
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
