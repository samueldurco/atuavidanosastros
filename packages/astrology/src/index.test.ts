import assert from 'node:assert/strict';
import test from 'node:test';
import { CaelusEphemerisProvider, type CalculationInput } from './index.ts';

const input: CalculationInput = {
  localDateTime: '2000-01-01T09:00:00', timezone: 'America/Sao_Paulo',
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
