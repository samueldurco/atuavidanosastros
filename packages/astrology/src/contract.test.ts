import assert from 'node:assert/strict';
import test from 'node:test';
import { CaelusEphemerisProvider, CaelusHouseCalculator, engineContract, validateCalculationInput, type CalculationInput } from './index.ts';

const at = (utcInstant: string): CalculationInput => ({ localDateTime: utcInstant.slice(0, -1), utcInstant, timezone: 'UTC', latitude: 0, longitude: 0, locationSource: 'synthetic-contract' });

test('UTC domain endpoints are inclusive; calendar and millisecond precision are strict', async () => {
  const provider = new CaelusEphemerisProvider();
  for (const epoch of [engineContract.minUtcInstant, engineContract.maxUtcInstant, '2000-02-29T23:59:59.999Z', '2096-02-29T00:00:00Z']) {
    const chart = await provider.calculate(at(epoch));
    assert.equal(chart.positions.length, 10);
    assert.equal(chart.provenance.temporal.utcInstant, new Date(epoch).toISOString());
    assert.ok(Number.isFinite(chart.provenance.temporal.deltaTSeconds));
  }
  for (const epoch of ['1899-12-31T23:59:59.999Z', '2100-01-01T00:00:00Z', '1900-02-29T00:00:00Z', '2000-01-01T00:00:00.0001Z', '2016-12-31T23:59:60Z', '2000-01-01T24:00:00Z', '2000-13-01T00:00:00Z']) assert.throws(() => validateCalculationInput(at(epoch)));
  assert.equal(validateCalculationInput(at('2000-01-01T00:00:00.1Z')).instant.getUTCMilliseconds(), 100);
  for (const invalid of [null, undefined, [], 1, '']) assert.throws(() => validateCalculationInput(invalid as unknown as CalculationInput), TypeError);
});

test('offset endpoints, civil year crossings and non-hour offsets preserve the exact instant', () => {
  for (const [timezone, localDateTime, utcInstant, expected] of [
    ['UTC+14:00', '2100-01-01T13:59:59.999', engineContract.maxUtcInstant, 50400],
    ['UTC-14:00', '1899-12-31T10:00:00', engineContract.minUtcInstant, -50400],
    ['UTC+05:45', '2000-01-01T05:45:00', '2000-01-01T00:00:00Z', 20700],
    ['UTC-03:30', '1999-12-31T20:30:00', '2000-01-01T00:00:00Z', -12600],
    ['UTC-00:00', '2000-01-01T00:00:00', '2000-01-01T00:00:00Z', 0]
  ] as const) assert.equal(validateCalculationInput({ ...at(utcInstant), timezone, localDateTime }).offsetSeconds, expected);
  for (const timezone of ['UTC+15:00', 'UTC-14:01', 'UTC+5:00', 'UTC+00:60', 'GMT', 'America/Does_Not_Exist']) assert.throws(() => validateCalculationInput({ ...at('2000-01-01T00:00:00Z'), timezone }));
});

test('runtime IANA handles half-hour folds, skipped days and historical second offsets without claiming pinned rules', () => {
  const lordHowe = { ...at('2024-04-06T14:45:00Z'), timezone: 'Australia/Lord_Howe', localDateTime: '2024-04-07T01:45:00' };
  assert.equal(validateCalculationInput(lordHowe).offsetSeconds, 39600);
  assert.equal(validateCalculationInput({ ...lordHowe, utcInstant: '2024-04-06T15:15:00Z' }).offsetSeconds, 37800);
  assert.throws(() => validateCalculationInput({ ...at('2011-12-30T12:00:00Z'), timezone: 'Pacific/Apia', localDateTime: '2011-12-30T12:00:00' }));
  const paris = validateCalculationInput({ ...at('1900-01-01T00:00:00Z'), timezone: 'Europe/Paris', localDateTime: '1900-01-01T00:09:21' });
  assert.equal(paris.offsetSeconds, 561);
  assert.equal(paris.timezoneRules, 'runtime-intl/unpinned');
  assert.throws(() => validateCalculationInput({ ...lordHowe, localDateTime: '2024-04-07T01:45:00.001' }));
});

test('latitude cutoff and antimeridian have explicit, consistent domain behavior', () => {
  const calculator = new CaelusHouseCalculator();
  const base = at('2026-03-20T12:00:00Z');
  for (const latitude of [-90, -66, 66, 90]) {
    const result = calculator.calculate({ ...base, latitude });
    assert.equal(result.status, 'not-applicable');
    assert.deepEqual(result.cusps, []);
    assert.equal(result.code, 'PLACIDUS_UNAVAILABLE');
  }
  for (const latitude of [-65.999999, 0, 65.999999]) {
    const east = calculator.calculate({ ...base, latitude, longitude: 180 });
    const west = calculator.calculate({ ...base, latitude, longitude: -180 });
    assert.equal(east.status, 'ok');
    assert.ok(Math.abs(east.midheaven - west.midheaven) < 1e-9);
    east.cusps.forEach((cusp, i) => assert.ok(Math.abs(cusp - west.cusps[i]!) < 1e-9));
  }
  for (const patch of [{ latitude: 90.0000001 }, { latitude: -90.0000001 }, { longitude: 180.0000001 }, { longitude: -180.0000001 }, { latitude: '0' }, { longitude: null }, { locationSource: '' }, { locationSource: ' '.repeat(3) }, { locationSource: 'x'.repeat(81) }]) assert.throws(() => validateCalculationInput({ ...base, ...patch } as CalculationInput));
});

test('provenance is reproducible, detached and cannot promote the sampled engine', async () => {
  const provider = new CaelusEphemerisProvider();
  const input = at('2000-01-01T12:00:00Z');
  const first = await provider.calculate(input);
  const expected = structuredClone(first.provenance.dataManifest);
  first.provenance.dataManifest.files[0]!.sha256 = 'tampered';
  first.provenance.dataManifest.files.pop();
  first.input.latitude = 50;
  const second = await provider.calculate(input);
  assert.deepEqual(second.provenance.dataManifest, expected);
  assert.equal(second.input.latitude, 0);
  assert.deepEqual(second.positions, first.positions);
  assert.deepEqual(second.houses, first.houses);
  assert.equal(second.provenance.algorithmVersion, 'atv-caelus-adapter-v3');
  assert.equal(second.provenance.temporal.julianDayUt1Approx, 2451545);
  assert.equal(second.provenance.temporal.dut1Seconds, null);
  assert.equal(second.provenance.contract.guaranteedLongitudeErrorDegrees, null);
  assert.equal(second.provenance.contract.productionPromotion, false);
  assert.equal(second.provenance.accuracyStatus, 'experimental');
  assert.ok(Object.isFrozen(engineContract));
  assert.equal(JSON.parse(JSON.stringify(second)).provenance.temporal.utcInstant, '2000-01-01T12:00:00.000Z');
});
