import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateAspects } from '@atv/astrology';
import { createPurposeCalculators, validCareerCompassProjection } from './src/purpose-calculators.ts';
import {
  CAREER_COMPASS_FULL_BASIS_VERSION, careerCompassFullAspectPolicy,
  careerCompassHouseAt, createCareerCompassFullBasisCalculator, validCareerCompassFullBasis,
} from './src/career-compass-full-basis.ts';
import { prepareCareerCompassFullFacts } from './src/career-compass-full-editorial.ts';

const runId = '00000000-0000-4000-8000-000000000091';
const context = {runId,signal:new AbortController().signal};
function input(latitude=0, reported='Quero avaliar uma transição com pouco tempo disponível.') {
  return {version:'atv-workflow/1.0.0',productId:'career-compass',
    consent:{storage:true,policyVersion:'atv-input-consent/1',partner:false,continuity:false},
    birth:{localDateTime:'2000-01-01T12:00:00',utcInstant:'2000-01-01T12:00:00Z',
      timezone:'UTC',latitude,longitude:0,locationSource:'synthetic'},
    context:reported};
}

test('full basis captures the entire natal evidence and maps five themes to real fact IDs', async () => {
  const candidateInput=input();
  const snapshot=await createCareerCompassFullBasisCalculator()(candidateInput,context);
  assert.equal(snapshot.version,CAREER_COMPASS_FULL_BASIS_VERSION);
  assert.equal(snapshot.data.projection.publication,'blocked');
  assert.equal(snapshot.data.projection.interpretation,'not-produced');
  assert.equal(snapshot.data.positions.length,10);
  assert.equal(snapshot.data.houses.status,'ok');
  assert.equal(snapshot.data.houses.cusps.length,12);
  assert.equal(snapshot.data.evidencePlan.length,5);
  assert.deepEqual(snapshot.data.evidencePlan.map(theme=>theme.role),
    ['contribution','motivation','environment','working-style','sustainability']);
  const ids=new Set(snapshot.facts.map(fact=>fact.id));
  for(const theme of snapshot.data.evidencePlan)
    for(const factId of theme.factIds) assert.ok(ids.has(factId),`${theme.role}: ${factId}`);
  assert.equal(snapshot.facts.find(fact=>fact.id==='personal-context').kind,'reported');
  assert.equal(snapshot.facts.find(fact=>fact.id==='personal-context').display,candidateInput.context);
  assert.deepEqual(snapshot.data.aspects,calculateAspects(snapshot.data.positions,careerCompassFullAspectPolicy));
  assert.equal(validCareerCompassFullBasis(candidateInput,snapshot),true);
  const persisted=JSON.parse(JSON.stringify(snapshot));
  persisted.data=Object.fromEntries(Object.entries(persisted.data).reverse());
  assert.equal(validCareerCompassFullBasis(candidateInput,persisted),true);
});

test('unavailable Placidus leaves ruler house and ascendant unavailable without substitutes', async () => {
  const candidateInput=input(80);
  const snapshot=await createCareerCompassFullBasisCalculator()(candidateInput,context);
  assert.equal(snapshot.data.houses.status,'not-applicable');
  assert.equal(snapshot.data.houses.cusps.length,0);
  assert.equal(snapshot.data.angles.ascendant,null);
  assert.equal(snapshot.data.regent.house,null);
  assert.ok(snapshot.facts.some(fact=>fact.id==='ascendant-unavailable'));
  assert.ok(!snapshot.facts.some(fact=>fact.id.startsWith('house-')));
  assert.equal(validCareerCompassFullBasis(candidateInput,snapshot),true);
});

test('house membership is cyclic and includes each cusp at the beginning of its house', () => {
  const cusps=Array.from({length:12},(_,i)=>(350+i*30)%360);
  assert.equal(careerCompassHouseAt(350,cusps),1);
  assert.equal(careerCompassHouseAt(19.999,cusps),1);
  assert.equal(careerCompassHouseAt(20,cusps),2);
  assert.equal(careerCompassHouseAt(0,[]),null);
});

test('derived evidence and birth binding reject drift, while the historical public MC projection remains separate', async () => {
  const candidateInput=input();
  const snapshot=await createCareerCompassFullBasisCalculator()(candidateInput,context);
  const tampered=structuredClone(snapshot);
  tampered.data.regent.house=12;
  assert.equal(validCareerCompassFullBasis(candidateInput,tampered),false);
  const changedBirth=structuredClone(candidateInput);
  changedBirth.birth.longitude=10;
  assert.equal(validCareerCompassFullBasis(changedBirth,snapshot),false);
  const changedContext=structuredClone(candidateInput);
  changedContext.context='Quero liderar outra equipe.';
  assert.equal(validCareerCompassFullBasis(changedContext,snapshot),false);
  const malformed=structuredClone(snapshot);
  malformed.data.chart.positions[0]=null;
  assert.equal(validCareerCompassFullBasis(candidateInput,malformed),false);
  const publicSnapshot=await createPurposeCalculators()['career-compass'](candidateInput,context);
  assert.equal(validCareerCompassProjection(publicSnapshot),true);
  assert.equal(validCareerCompassProjection(snapshot),false);
  assert.equal(publicSnapshot.data.positions.length,0);
  assert.equal(publicSnapshot.version,'atv-career-compass-calculation/1.0.0');
});

test('full facts are prepared only through the private versioned bridge and remain blocked for publication', async () => {
  const candidateInput=input();
  const snapshot=await createCareerCompassFullBasisCalculator()(candidateInput,context);
  const prepared=prepareCareerCompassFullFacts(candidateInput,snapshot);
  assert.equal(prepared.status,'prepared_for_review');
  assert.equal(prepared.publication,'blocked');
  assert.equal(prepared.facts.completeness,'complete');
  assert.equal(prepared.facts.editorialProfile,'atv-career-compass-editorial/2.0.0');
  assert.equal(prepared.facts.facts.length,snapshot.facts.length);
  assert.ok(prepared.facts.facts.length>25);
  const publicSnapshot=await createPurposeCalculators()['career-compass'](candidateInput,context);
  assert.equal(prepareCareerCompassFullFacts(candidateInput,publicSnapshot).status,'blocked');
  const changed=structuredClone(snapshot);
  changed.facts.find(fact=>fact.id==='career-mc-ruler').display='regente adulterado';
  assert.equal(prepareCareerCompassFullFacts(candidateInput,changed).reason,'calculation_invalid');
});
