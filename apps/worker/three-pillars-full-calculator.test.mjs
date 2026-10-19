import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createNatalCalculators, createThreePillarsFullCalculator,
  inspectBirthChartProjection, inspectThreePillarsFullProjection,
  natalProductContract, threePillarsFullContract
} from './src/natal-calculators.ts';
import { createProductCalculators } from './src/product-runtime.ts';
import { validateCalculation } from './src/product-processing.ts';

const birth = {
  localDateTime: '2000-01-01T12:00:00', utcInstant: '2000-01-01T12:00:00Z',
  timezone: 'UTC', latitude: 0, longitude: 0, locationSource: 'synthetic'
};
const input = (productId = 'three-pillars', change = {}) => ({
  version: 'atv-workflow/1.0.0', productId, birth: { ...birth, ...change },
  consent: { storage: true, policyVersion: 'atv-input-consent/1', partner: false, continuity: false }
});
const context = () => ({ runId: '00000000-0000-4000-8000-000000000001', signal: new AbortController().signal });

test('isolated v2 carries the complete natal basis while the registered Three Pillars calculator remains v1', async () => {
  const v1 = await createProductCalculators()['three-pillars'](input(), context());
  const v2 = await createThreePillarsFullCalculator()(input(), context());
  assert.equal(v1.version, natalProductContract.version);
  assert.equal(v1.data.positions.length, 2);
  assert.equal(v1.data.houses.cusps.length, 0);
  assert.equal(v2.version, threePillarsFullContract.version);
  assert.equal(v2.kind, 'natal');
  assert.equal(v2.status, 'experimental');
  assert.equal(v2.data.productId, 'three-pillars');
  assert.equal(v2.data.natal.version, natalProductContract.version);
  assert.equal(v2.data.natal.data.productId, 'birth-chart');
  assert.equal(v2.data.natal.data.positions.length, 10);
  assert.equal(v2.data.natal.data.houses.cusps.length, 12);
  assert.equal(v2.data.natal.facts.length, 24);
  assert.ok(v2.data.natal.facts.some(fact => fact.id === 'angle-midheaven'));
  assert.ok(v2.data.natal.facts.some(fact => fact.id === 'house-12'));
  assert.deepEqual(v2.facts, v2.data.natal.facts);
  assert.deepEqual(v2.limits, v2.data.natal.limits);
  assert.equal(inspectBirthChartProjection(v2.data.natal), 'available');
  assert.equal(inspectThreePillarsFullProjection(v2), 'available');
  assert.ok(validateCalculation(v2, 'three-pillars'));
  assert.ok(JSON.stringify(v2).length < 200000);
  assert.equal(createNatalCalculators()['three-pillars'] instanceof Function, true);
});

test('v2 projection refuses changed geometry, facts, limits or contract', async () => {
  const base = await createThreePillarsFullCalculator()(input(), context());
  const mutations = {
    'planet longitude': value => { value.data.natal.data.positions[0].longitude = 0; },
    'planet fact': value => { value.data.natal.facts[0].display = 'Sol inventado'; },
    'outer fact': value => { value.facts[0].display = 'Sol inventado'; },
    'cusp': value => { value.data.natal.data.houses.cusps[0] = 0; },
    'missing outer fact': value => { value.facts.pop(); },
    'extra outer fact': value => { value.facts.push({ id: 'invented', kind: 'calculated', display: 'aspecto', source: 'fixture' }); },
    'limit drift': value => { value.limits[0] = 'Aprovado'; },
    'hidden warning': value => { value.data.natal.limits.shift(); },
    'nested product': value => { value.data.natal.data.productId = 'three-pillars'; },
    'nested version': value => { value.data.natal.version = 'unknown'; },
    'outer version': value => { value.version = 'unknown'; },
    'projection version': value => { value.data.projection.version = 'unknown'; },
    'extra projection': value => { value.data.injected = true; },
    'approved status': value => { value.status = 'recorded'; }
  };
  for (const [label, mutate] of Object.entries(mutations)) {
    const value = structuredClone(base);
    mutate(value);
    const preserved = structuredClone(value);
    assert.equal(inspectThreePillarsFullProjection(value), null, label);
    assert.deepEqual(value, preserved, label);
  }
});

test('unsupported polar Ascendant remains unavailable and input errors never call the provider', async () => {
  const v2 = await createThreePillarsFullCalculator()(input('three-pillars', { latitude: 66 }), context());
  assert.equal(v2.data.natal.data.angles.ascendant, null);
  assert.deepEqual(v2.data.natal.data.houses.cusps, []);
  assert.equal(inspectThreePillarsFullProjection(v2), 'unavailable');
  let calls = 0;
  const calculator = createThreePillarsFullCalculator({ name: 'fixture', version: '0', async calculate() { calls++; throw Error('unexpected provider call'); } });
  await assert.rejects(() => calculator(input('birth-chart'), context()), /input_invalid/);
  await assert.rejects(() => calculator(input('three-pillars', { localDateTime: '2000-02-30T12:00:00' }), context()), /input_invalid/);
  assert.equal(calls, 0);
});
