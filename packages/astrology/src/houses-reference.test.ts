import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateHouseReference } from '../fixtures/houses/evaluate.ts';

test('Referência ERFA e semiarcos independentes: 168 casos, 1728 ângulos/cúspides e limites polares', () => {
  const report = evaluateHouseReference();
  assert.deepEqual(report.failures, []);
  assert.equal(report.cases, 168);
  assert.equal(report.comparisons, 1728);
  assert.equal(report.productionPromotion, false);
});
