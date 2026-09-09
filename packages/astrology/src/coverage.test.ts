import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateCoverage } from '../fixtures/coverage/evaluate.ts';

test('independent temporal and motion corpus retains inconclusive station neighborhoods', async () => {
  const report = await evaluateCoverage();
  assert.equal(report.temporalCount, 8120);
  assert.equal(report.count, 11040);
  assert.equal(report.motionCount, 2904);
  assert.ok(report.verifiedMotion > 0);
  assert.ok(report.inconclusiveMotion.length > 0);
  assert.equal(report.verifiedMotion + report.inconclusiveMotion.length, report.motionCount);
  assert.deepEqual(report.failures, []);
  assert.equal(report.productionPromotion, false);
});
