import { careerEditorialTestFixture } from './helpers/career-editorial-test-fixture.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { dimensions } from '../packages/ai/src/director.ts';
import { SCHEMA_VERSION } from '../packages/ai/src/contracts.ts';
import { buildProductLabCorpus } from './helpers/product-lab-corpus.mjs';
import { CAPTURE_VERSION, productBenchmarkManifest } from './helpers/product-benchmark.mjs';
import { productReviewTemplate } from './helpers/product-benchmark-review.mjs';
import { compareProductReviews, PRODUCT_REVIEW_COMPARISON_VERSION } from './helpers/product-review-comparison.mjs';

const corpus = await buildProductLabCorpus();
const manifest = productBenchmarkManifest(corpus);
const prepared = manifest.cases.filter(item => item.preparation === 'prepared');
// Synthetic software fixtures only: not reviews, real executions or calibrated goldens.
function capture(prefix, full = false) {
  const samples = (full ? prepared : prepared.slice(0, 1)).flatMap(item => (full ? [1, 2, 3] : [1]).map(repetition => {
    const request = corpus.cases.find(row => row.id === item.caseId).request;
    return { caseId: item.caseId, repetition, provider: 'synthetic-only', model: 'synthetic-only',
      executionId: `${prefix}-${item.caseId}-${repetition}`, requestDigest: item.requestDigest, promptDigest: item.promptDigest,
      output: { schemaVersion: SCHEMA_VERSION, capability: request.facts.capability, scope: 'partial',
        title: 'Fixture sem autoridade editorial',
        claims: [{ id: 'fixture', kind: 'interpretation', text: 'CANARY-OUTPUT: teste sintético.', evidence: [request.facts.facts[0].id] }],
        relations: [], synthesis: [{ claimIds: ['fixture'], text: 'Síntese de fixture.' }],
        reflections: ['Qual informação falta?'], limits: ['Sem homologação.'], ...careerEditorialTestFixture(request.facts) },
      latencyMs: 100, inputTokens: 2000, outputTokens: 800, costBrl: 0,
      costEvidence: { basis: 'owner-confirmed-free-tier', reference: 'CANARY-RECEIPT' } };
  }));
  return { version: CAPTURE_VERSION, dataClass: 'synthetic', corpusVersion: manifest.corpusVersion,
    corpusFingerprint: manifest.corpusFingerprint, promptVersion: manifest.promptVersion,
    provider: 'synthetic-only', model: 'synthetic-only', samples };
}
function filled(input) {
  const ledger = productReviewTemplate(input, corpus);
  for (const row of ledger.annotations) {
    row.source = 'human'; row.reviewer = 'CANARY-REVIEWER'; row.reviewedAt = '2026-09-28T00:00:00.000Z';
    for (const key of dimensions) row.dimensions[key] = { score: 10, evidence: 'CANARY-EVIDENCE' };
    for (const criterion of row.criteria) { criterion.verdict = 'pass'; criterion.evidence = 'CANARY-CRITERION'; }
  }
  return ledger;
}
function pair(full = false) {
  const b = capture('baseline', full), c = capture('candidate', full);
  return [b, filled(b), c, filled(c)];
}
const compare = args => compareProductReviews(...args, corpus);

test('pairs exact slots and redacts output, evidence, receipts, reviewer and time', () => {
  const args = pair(); const snapshot = JSON.stringify(args); const report = compare(args);
  assert.equal(report.version, PRODUCT_REVIEW_COMPARISON_VERSION);
  assert.equal(report.summary.expectedSlots, 309);
  assert.equal(report.summary.pairedCompleteDeclarations, 1);
  assert.equal(report.rows[0].coverage, 'paired');
  assert.equal(report.rows[1].baselineAnnotation, 'sample-missing');
  assert.equal(report.rows[1].scores[dimensions[0]].delta, null);
  assert.equal(report.summary.preparedDiagnosticsComplete, false);
  assert.equal(JSON.stringify(report).includes('CANARY'), false);
  assert.equal(JSON.stringify(report).includes('2026-09-28T00'), false);
  assert.equal(JSON.stringify(args), snapshot);
});

test('declared score decreases and criterion regressions remain separate from mechanical checks', () => {
  const args = pair(); args[3].annotations[0].dimensions[dimensions[0]].score = 6;
  args[3].annotations[0].criteria[0].verdict = 'fail';
  const report = compare(args), row = report.rows[0];
  assert.equal(row.scores[dimensions[0]].delta, -4);
  assert.deepEqual(row.declaredScoreDecreases, [dimensions[0]]);
  assert.deepEqual(row.declaredCriterionRegressions, [0]);
  assert.equal(row.candidateDecision, 'does-not-meet-local-checks');
  assert.equal(report.mechanical.summary.regressedSlots, 0);
  assert.equal(report.products.find(item => item.productId === row.productId).declaredCriterionRegressionSlots, 1);
});

test('improvements are direction-sensitive and do not cancel other failures', () => {
  const args = pair(); args[1].annotations[0].dimensions[dimensions[0]].score = 6;
  args[1].annotations[0].criteria[0].verdict = 'fail';
  args[3].annotations[0].dimensions[dimensions[1]].score = 5;
  const row = compare(args).rows[0];
  assert.deepEqual(row.declaredScoreIncreases, [dimensions[0]]);
  assert.deepEqual(row.declaredScoreDecreases, [dimensions[1]]);
  assert.deepEqual(row.declaredCriterionImprovements, [0]);
  assert.equal(row.candidateDecision, 'does-not-meet-local-checks');
});

test('incomplete declaration loses evidence, not a zero score or quality regression', () => {
  const args = pair(); args[3].annotations[0].dimensions[dimensions[0]].evidence = null;
  const report = compare(args), row = report.rows[0];
  assert.equal(report.summary.evidenceLostSlots, 1);
  assert.equal(row.candidateAnnotation, 'incomplete');
  assert.equal(row.candidateDecision, 'not-assessed');
  assert.ok(Object.values(row.scores).every(score => score.candidate === null && score.delta === null));
  assert.deepEqual(row.declaredScoreDecreases, []); assert.deepEqual(row.declaredCriterionRegressions, []);
});

test('omitted annotations differ from absent samples and recovered evidence is not improvement', () => {
  const args = pair(); args[1].annotations = [];
  let report = compare(args);
  assert.equal(report.rows[0].baselineAnnotation, 'missing');
  assert.equal(report.summary.evidenceRecoveredSlots, 1);
  assert.equal(report.summary.declaredScoreIncreaseSlots, 0);
  args[2].samples = []; args[3] = filled(args[2]); report = compare(args);
  assert.equal(report.rows[0].coverage, 'missing-candidate');
  assert.equal(report.rows[0].candidateAnnotation, 'sample-missing');
  args[1] = filled(args[0]); report = compare(args);
  assert.equal(report.summary.evidenceLostSlots, 1);
  assert.equal(report.mechanical.summary.missingCandidateSlots, 1);
});

test('unfilled ledgers preserve unknowns on both sides and all excluded products', () => {
  const args = pair(); args[1] = productReviewTemplate(args[0], corpus); args[3] = productReviewTemplate(args[2], corpus);
  const report = compare(args);
  assert.equal(report.summary.pairedCompleteDeclarations, 0);
  assert.equal(report.summary.evidenceLostSlots, 0); assert.equal(report.summary.evidenceRecoveredSlots, 0);
  assert.equal(report.mechanical.blockedCases.length, 2); assert.equal(report.mechanical.unavailableProducts.length, 12);
  assert.equal(report.products.length, 13);
});

test('mechanical schema failure overrides perfect declared scores', () => {
  const args = pair(); args[2].samples[0].output = {}; args[3] = filled(args[2]);
  const report = compare(args);
  assert.equal(report.rows[0].candidateDecision, 'does-not-meet-local-checks');
  assert.ok(report.mechanical.rows[0].regressions.includes('schemaPass'));
  assert.deepEqual(report.rows[0].declaredScoreDecreases, []);
});

test('stale or swapped ledgers and extra authority fields reject the entire comparison', () => {
  const args = pair(); assert.throws(() => compare([args[0], args[3], args[2], args[1]]), /review_binding_mismatch/);
  args[3].promotionEligible = true; assert.throws(() => compare(args), /review_envelope_invalid/);
});

test('old corpus and reused execution references still reject', () => {
  const args = pair(); args[2].samples[0].executionId = args[0].samples[0].executionId;
  assert.throws(() => compare(args), /capture_comparison_reused_execution/);
  const stale = pair(); stale[2].corpusVersion = 'old'; assert.throws(() => compare(stale), /capture_/);
});

test('618 perfect fixture declarations never grant trust or promotion', () => {
  const report = compare(pair(true));
  assert.equal(report.summary.preparedDiagnosticsComplete, true);
  assert.equal(report.summary.pairedCompleteDeclarations, 309);
  assert.equal(report.trustedReviews, 0); assert.equal(report.promotionEligible, false);
  assert.equal(report.publication, 'blocked'); assert.equal(report.editorialReview, 'not-authenticated');
  assert.equal(report.provenance, 'declared-not-authenticated');
});

test('order of annotations never changes slot matching', () => {
  const args = pair(true);
  args[3].annotations[0].criteria[0].verdict = 'fail';
  const expected = compare(args);
  args[1].annotations.reverse(); args[3].annotations.reverse();
  assert.deepEqual(compare(args), expected);
});

test('unknown operational cost prevents complete diagnostics despite complete declarations', () => {
  const args = pair(true); args[2].samples[0].costBrl = null; args[2].samples[0].costEvidence = null;
  args[3] = filled(args[2]); const report = compare(args);
  assert.equal(report.summary.pairedCompleteDeclarations, 309);
  assert.equal(report.summary.preparedDiagnosticsComplete, false);
  assert.ok(report.mechanical.rows[0].evidenceLost.includes('zeroCostPass'));
  assert.equal(report.summary.evidenceLostSlots, 0);
});

test('CLI compares four bounded local inputs and rejects usage/stale bindings without private data', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'atv-review-comparison-'));
  try {
    const args = pair(), paths = args.map((_, i) => join(dir, `${i}.json`));
    await Promise.all(args.map((value, i) => writeFile(paths[i], JSON.stringify(value))));
    const cli = (...files) => spawnSync(process.execPath, ['scripts/evaluate-product-benchmark.mjs', '--compare-reviews', ...files], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
    const result = cli(...paths); assert.equal(result.status, 1, result.stderr);
    assert.equal(JSON.parse(result.stdout).summary.pairedCompleteDeclarations, 1);
    const bad = cli(paths[0], paths[3], paths[2], paths[1]); assert.equal(bad.status, 2);
    assert.equal(JSON.parse(bad.stderr).code, 'review_binding_mismatch'); assert.equal(bad.stdout, '');
    assert.equal(bad.stderr.includes(dir), false); assert.equal(bad.stderr.includes('CANARY'), false);
    assert.equal(JSON.parse(cli(...paths.slice(0, 3)).stderr).code, 'usage');
    const full = pair(true);
    await Promise.all(full.map((value, i) => writeFile(paths[i], JSON.stringify(value))));
    const complete = cli(...paths); assert.equal(complete.status, 0, complete.stderr);
    assert.equal(JSON.parse(complete.stdout).promotionEligible, false);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
