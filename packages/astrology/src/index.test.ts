import assert from 'node:assert/strict';
import test from 'node:test';
import { CaelusEphemerisProvider, CaelusHouseCalculator, validateCalculationInput, type CalculationInput } from './index.ts';

const input: CalculationInput = {
  localDateTime: '2000-01-01T10:00:00', timezone: 'America/Sao_Paulo',
  utcInstant: '2000-01-01T12:00:00.000Z', latitude: -23.5505, longitude: -46.6333,
  locationSource: 'fixture'
};

test('calcula mapa tropical com Placidus e proveniência', async () => {
  const chart = await new CaelusEphemerisProvider().calculate(input);
  assert.equal(chart.positions.length, 10);
  assert.equal(chart.houses.status, 'ok');
  assert.equal(chart.houses.cusps.length, 12);
  assert.equal(chart.provenance.zodiac, 'tropical');
  assert.equal(chart.provenance.provider, 'caelus');
  for (const position of chart.positions) assert.ok(position.longitude >= 0 && position.longitude < 360);
});

test('rejeita coordenadas fora do domínio', async () => {
  await assert.rejects(() => new CaelusEphemerisProvider().calculate({ ...input, latitude: 91 }), RangeError);
});

test('confere DST histórico e rejeita a combinação antes aceita com uma hora de erro', () => {
  assert.equal(validateCalculationInput(input).offsetSeconds, -7200);
  assert.throws(() => validateCalculationInput({ ...input, localDateTime: '2000-01-01T09:00:00' }), TypeError);
  assert.equal(validateCalculationInput({ ...input, localDateTime: '2000-01-01T09:00:00', timezone: 'UTC-03:00' }).offsetSeconds, -10800);
});

test('rejeita datas normalizadas silenciosamente, UTC sem Z, fuso inventado e limites de offset', () => {
  for (const patch of [
    { utcInstant: '2000-02-30T12:00:00Z' }, { localDateTime: '2000-02-30T10:00:00' },
    { utcInstant: '2000-01-01T12:00:00' }, { utcInstant: '2000-01-01T12:00:00+00:00' },
    { timezone: 'Mars/Olympus' }, { timezone: 'UTC+14:01' }, { timezone: 'UTC-03:60' },
    { utcInstant: '1800-01-01T12:00:00Z' }, { utcInstant: '2100-01-01T12:00:00Z' },
    { localDateTime: '2000-01-01T24:00:00' }, { latitude: NaN }, { longitude: Infinity }
  ]) assert.throws(() => validateCalculationInput({ ...input, ...patch }));
});

test('rejeita o salto de DST e aceita as duas ocorrências ambíguas somente com UTC correspondente', () => {
  const ny = { ...input, timezone: 'America/New_York' };
  assert.throws(() => validateCalculationInput({ ...ny, localDateTime: '2024-03-10T02:30:00', utcInstant: '2024-03-10T07:30:00Z' }));
  const fold = { ...ny, localDateTime: '2024-11-03T01:30:00' };
  assert.equal(validateCalculationInput({ ...fold, utcInstant: '2024-11-03T05:30:00Z' }).offsetSeconds, -14400);
  assert.equal(validateCalculationInput({ ...fold, utcInstant: '2024-11-03T06:30:00Z' }).offsetSeconds, -18000);
});

test('casas polares não contêm cúspides de outro sistema e preservam MC independente', () => {
  for (const latitude of [-90, -66, 66, 90]) {
    const houses = new CaelusHouseCalculator().calculate({ ...input, latitude });
    assert.equal(houses.status, 'not-applicable');
    assert.equal(houses.code, 'PLACIDUS_UNAVAILABLE');
    assert.deepEqual(houses.cusps, []);
    assert.ok(Number.isFinite(houses.midheaven));
  }
});

test('milissegundos não são descartados e os fatos são reproduzíveis', async () => {
  const provider = new CaelusEphemerisProvider();
  const a = await provider.calculate(input);
  const b = await provider.calculate(input);
  assert.deepEqual(a.positions, b.positions);
  assert.deepEqual(a.houses, b.houses);
  const shifted = await provider.calculate({ ...input, localDateTime: '2000-01-01T10:00:00.500', utcInstant: '2000-01-01T12:00:00.500Z' });
  assert.notEqual(a.houses.midheaven, shifted.houses.midheaven);
  assert.equal(a.provenance.accuracyStatus, 'experimental');
  assert.equal(a.provenance.temporal.timezoneRules, 'runtime-intl/unpinned');
  assert.ok(a.provenance.dataManifest.files.every((file) => /^[a-f0-9]{64}$/.test(file.sha256)));
});
