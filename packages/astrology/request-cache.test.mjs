import test from 'node:test';
import assert from 'node:assert/strict';
import { Engine } from 'caelus';
import { embeddedData } from 'caelus/data-embedded';
import { CaelusEphemerisProvider } from './src/index.ts';
import { RequestCachedCaelusEngine } from './src/ecliptic-request-cache.ts';

test('request cache uses exact instants, isolates returned tuples and evicts oldest entries', () => {
  const original = Engine.prototype.ecliptic;
  let calls = 0;
  Engine.prototype.ecliptic = function (body, jde) {
    calls++;
    return [jde, body === 'sun' ? 0 : 1, 1];
  };
  try {
    const engine = new RequestCachedCaelusEngine(embeddedData);
    engine.ecliptic('sun', 2451545)[0] = 0;
    assert.equal(engine.ecliptic('sun', 2451545)[0], 2451545);
    assert.equal(calls, 1);
    engine.ecliptic('moon', 2451545);
    engine.ecliptic('sun', 2451545.000000001);
    assert.equal(calls, 3);
    for (let i = 0; i < RequestCachedCaelusEngine.maxEntries; i++)
      engine.ecliptic('sun', 2451546 + i);
    const before = calls;
    engine.ecliptic('sun', 2451545);
    assert.equal(calls, before + 1);
    new RequestCachedCaelusEngine(embeddedData).ecliptic('sun', 2451545);
    assert.equal(calls, before + 2);
  } finally {
    Engine.prototype.ecliptic = original;
  }
});

test('cached full charts preserve every value and provenance field except execution timestamp', async () => {
  const ordinary = new CaelusEphemerisProvider();
  const cached = new CaelusEphemerisProvider({ requestCache: true });
  for (const utcInstant of [
    '1900-01-01T12:00:00Z',
    '2000-01-01T12:00:00Z',
    '2026-10-08T00:00:00Z',
    '2026-10-08T06:00:00Z',
    '2026-10-08T12:00:00Z',
    '2099-12-31T12:00:00Z',
  ]) {
    const input = { localDateTime: utcInstant.slice(0, -1), utcInstant, timezone: 'UTC', latitude: 0, longitude: 0, locationSource: 'synthetic-cache-differential' };
    const before = await ordinary.calculate(input);
    const after = await cached.calculate(input);
    before.provenance.calculatedAt = after.provenance.calculatedAt;
    assert.deepEqual(after, before);
  }
});
