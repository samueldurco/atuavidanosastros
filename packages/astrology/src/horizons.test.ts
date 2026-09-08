import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateHorizons } from '../fixtures/horizons/evaluate.ts';

test('JPL independente: hashes, épocas, dez corpos e 70 comparações dentro dos limites', async () => {
  const report = await evaluateHorizons();
  assert.equal(report.count, 70);
  assert.deepEqual(report.failures, []);
  assert.equal(report.productionPromotion, false);
});
