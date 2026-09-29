import { tarotFocusEditorialTestFixture, dailyCardEditorialTestFixture, careerEditorialTestFixture, threePillarsEditorialTestFixture, midheavenEditorialTestFixture, ascendantEditorialTestFixture, birthChartEditorialTestFixture } from './helpers/career-editorial-test-fixture.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { SCHEMA_VERSION } from '../packages/ai/src/contracts.ts';
import { buildProductLabCorpus } from './helpers/product-lab-corpus.mjs';
import { CAPTURE_VERSION, productBenchmarkManifest } from './helpers/product-benchmark.mjs';
import { compareProductBenchmarks, PRODUCT_COMPARISON_VERSION } from './helpers/product-benchmark-comparison.mjs';

const corpus = await buildProductLabCorpus();
const manifest = productBenchmarkManifest(corpus);
const prepared = manifest.cases.filter(item => item.preparation === 'prepared');
const envelope = (samples = []) => ({ version: CAPTURE_VERSION, dataClass: 'synthetic',
  corpusVersion: manifest.corpusVersion, corpusFingerprint: manifest.corpusFingerprint,
  promptVersion: manifest.promptVersion, provider: 'synthetic-only', model: 'synthetic-only', samples });
// Generic synthetic plumbing fixtures, NOT semantic goldens or actual provider executions.
function sample(prefix, item = prepared[0], repetition = 1) {
  const request = corpus.cases.find(row => row.id === item.caseId).request;
  return { caseId: item.caseId, repetition, provider: 'synthetic-only', model: 'synthetic-only',
    executionId: `${prefix}-${item.caseId}-${repetition}`, requestDigest: item.requestDigest, promptDigest: item.promptDigest,
    output: { schemaVersion: SCHEMA_VERSION, capability: request.facts.capability, scope: 'partial',
      title: 'Fixture de encanamento, não leitura editorial',
      claims: [{ id: 'fixture', kind: 'interpretation', text: 'CANARY-SYNTHETIC-OUTPUT: referência para teste.', evidence: [request.facts.facts[0].id] }],
      relations: [], synthesis: [{ claimIds: ['fixture'], text: 'Síntese genérica sem qualquer nota de qualidade.' }],
      reflections: ['Qual informação falta nesta fixture?'], limits: ['Teste local sem homologação editorial.'], ...careerEditorialTestFixture(request.facts), ...threePillarsEditorialTestFixture(request.facts), ...birthChartEditorialTestFixture(request.facts), ...midheavenEditorialTestFixture(request.facts), ...ascendantEditorialTestFixture(request.facts), ...dailyCardEditorialTestFixture(request.facts), ...tarotFocusEditorialTestFixture(request.facts) },
    latencyMs: 100, inputTokens: 2000, outputTokens: 800, costBrl: 0,
    costEvidence: { basis: 'owner-confirmed-free-tier', reference: 'CANARY-SYNTHETIC-RECEIPT' } };
}
const compare = (before = [], after = []) => compareProductBenchmarks(envelope(before), envelope(after), corpus);
const rowFor = report => report.rows.find(row => row.caseId === prepared[0].caseId && row.repetition === 1);

test('empty captures retain every prepared slot, blocked case and unavailable product', () => {
  const report = compare();
  assert.equal(report.version, PRODUCT_COMPARISON_VERSION);
  assert.equal(report.summary.expectedSlots, 306);
  assert.equal(report.summary.missingBothSlots, 306);
  assert.equal(report.summary.regressedSlots, 0);
  assert.equal(report.summary.preparedChecksComplete, false);
  assert.equal(report.products.length, 13);
  assert.equal(report.unavailableProducts.length, 12);
  assert.deepEqual(report.blockedCases.map(item => item.caseId), ['birth-chart-boundary', 'three-pillars-boundary', 'ascendant-boundary']);
  assert.ok(report.blockedCases.every(item => item.blockReason));
  assert.equal(rowFor(report).baselineChecks, null);
  assert.deepEqual(rowFor(report).metricDelta, { latencyMs: null, inputTokens: null, outputTokens: null, costBrl: null });
});

test('paired measured regressions remain separate checks, not an aggregate score', () => {
  const before = sample('baseline');
  const after = sample('candidate');
  after.output = { invalid: true };
  after.latencyMs = 1e9;
  after.outputTokens = 1e9;
  after.costBrl = 1;
  after.costEvidence.basis = 'provider-receipt';
  const report = compare([before], [after]);
  assert.deepEqual(rowFor(report).regressions, ['schemaPass', 'mechanicalPass', 'latencyPass', 'tokenUsagePass', 'zeroCostPass']);
  assert.deepEqual(rowFor(report).improvements, []);
  assert.deepEqual(rowFor(report).evidenceLost, []);
  assert.equal(rowFor(report).metricDelta.costBrl, 1);
  assert.equal(report.summary.regressedSlots, 1);
  assert.equal(report.products.find(row => row.productId === prepared[0].productId).regressedSlots, 1);
});

test('mechanical grounding regression is not misreported as a schema regression', () => {
  const after = sample('candidate');
  after.output.claims[0].evidence = ['unknown-fact'];
  const row = rowFor(compare([sample('baseline')], [after]));
  assert.deepEqual(row.regressions, ['mechanicalPass']);
  assert.equal(row.candidateChecks.schemaPass, 'pass');
});

test('improvements and remaining failures may coexist without declaring a winner', () => {
  const before = sample('baseline');
  const after = sample('candidate');
  before.output = after.output = { invalid: true };
  before.latencyMs = 1e9;
  const report = compare([before], [after]);
  assert.deepEqual(rowFor(report).improvements, ['latencyPass']);
  assert.deepEqual(rowFor(report).unchangedFailures, ['schemaPass', 'mechanicalPass']);
  assert.equal(report.summary.improvedSlots, 1);
  assert.equal(report.summary.unchangedFailingSlots, 1);
  assert.equal(report.promotionEligible, false);
});

test('missing measurements are evidence loss, never zero cost or measured regression', () => {
  const after = sample('candidate');
  after.latencyMs = after.inputTokens = after.outputTokens = null;
  after.costEvidence = null;
  const report = compare([sample('baseline')], [after]);
  const row = rowFor(report);
  assert.deepEqual(row.evidenceLost, ['latencyPass', 'tokenUsagePass', 'zeroCostPass']);
  assert.deepEqual(row.regressions, []);
  assert.equal(row.candidateChecks.zeroCostPass, 'unknown');
  assert.deepEqual(row.metricDelta, { latencyMs: null, inputTokens: null, outputTokens: null, costBrl: null });
  assert.equal(report.summary.evidenceLostSlots, 1);
  assert.equal(report.candidate.summary.costUnknown, 1);
  const reverse = rowFor(compare([after], [sample('recovered')]));
  assert.deepEqual(reverse.evidenceRecovered, row.evidenceLost);
  assert.deepEqual(reverse.improvements, []);
});

test('removing failures creates coverage gaps instead of inflating improvements', () => {
  const before = sample('baseline');
  before.output = {};
  const report = compare([before], [sample('candidate', prepared[1])]);
  assert.equal(report.summary.missingCandidateSlots, 1);
  assert.equal(report.summary.addedCandidateSlots, 1);
  assert.equal(report.summary.missingBothSlots, 304);
  assert.equal(report.summary.pairedSlots, 0);
  assert.equal(report.summary.improvedSlots, 0);
  assert.equal(report.summary.regressedSlots, 0);
  assert.equal(report.summary.preparedChecksComplete, false);
});

test('both captures must validate against the current trusted corpus and prompt', () => {
  for (const side of [0, 1]) {
    for (const change of [
      capture => { capture.corpusFingerprint = '0'.repeat(64); },
      capture => { capture.promptVersion = 'stale-prompt'; },
      capture => { capture.samples[0].promptDigest = '0'.repeat(64); },
      capture => { capture.promotionEligible = true; },
      capture => { capture.samples[0].caseId = 'ascendant-boundary'; },
    ]) {
      const captures = [envelope([sample('baseline')]), envelope([sample('candidate')])];
      change(captures[side]);
      assert.throws(() => compareProductBenchmarks(...captures, corpus), /capture_/);
    }
  }
});

test('an execution cannot be reused across cases or models within the same provider', () => {
  const before = sample('baseline');
  const after = sample('candidate', prepared[1]);
  after.executionId = before.executionId;
  const candidate = envelope([after]);
  candidate.model = after.model = 'another-model';
  assert.throws(() => compareProductBenchmarks(envelope([before]), candidate, corpus), /capture_comparison_reused_execution/);
  candidate.provider = after.provider = 'another-provider';
  assert.equal(compareProductBenchmarks(envelope([before]), candidate, corpus).summary.addedCandidateSlots, 1);
});

test('comparison is stable under sample ordering and never mutates or returns payloads', () => {
  const baseline = envelope([sample('baseline'), sample('baseline', prepared[1])]);
  const candidate = envelope([sample('candidate'), sample('candidate', prepared[1])]);
  const snapshot = JSON.stringify([baseline, candidate]);
  const report = compareProductBenchmarks(baseline, candidate, corpus);
  assert.equal(JSON.stringify([baseline, candidate]), snapshot);
  baseline.samples.reverse(); candidate.samples.reverse();
  assert.deepEqual(compareProductBenchmarks(baseline, candidate, corpus), report);
  const serialized = JSON.stringify(report);
  assert.equal(serialized.includes('CANARY-SYNTHETIC'), false);
  assert.equal(serialized.includes('executionId'), false);
  assert.equal(serialized.includes('costEvidenceReference'), false);
  assert.equal(serialized.includes('requestDigest'), false);
  assert.equal(report.provenance, 'declared-not-authenticated');
});

test('612 mechanically passing synthetic fixtures still cannot promote or review semantics', () => {
  const complete = prefix => prepared.flatMap(item => [1, 2, 3].map(rep => sample(prefix, item, rep)));
  const report = compare(complete('baseline'), complete('candidate'));
  assert.equal(report.summary.preparedChecksComplete, true);
  assert.equal(report.summary.pairedSlots, 306);
  assert.equal(report.baseline.summary.unreviewedSamples, 306);
  assert.equal(report.candidate.summary.unreviewedSamples, 306);
  assert.equal(report.summary.regressedSlots, 0);
  assert.equal(report.editorialReview, 'not-reviewed');
  assert.equal(report.promotionEligible, false);
  assert.equal(report.publication, 'blocked');
});

test('CLI comparison has 0/1/2 exit codes, leaves files untouched and sanitizes errors', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'atv-comparison-'));
  const baselinePath = join(dir, 'baseline.json');
  const candidatePath = join(dir, 'candidate.json');
  const cli = fileURLToPath(new URL('./evaluate-product-benchmark.mjs', import.meta.url));
  const run = args => spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  try {
    const baseline = envelope(prepared.flatMap(item => [1, 2, 3].map(rep => sample('baseline', item, rep))));
    const candidate = envelope(prepared.flatMap(item => [1, 2, 3].map(rep => sample('candidate', item, rep))));
    for (const [path, capture] of [[baselinePath, baseline], [candidatePath, candidate]]) await writeFile(path, JSON.stringify(capture));
    const filesBefore = await Promise.all([readFile(baselinePath, 'utf8'), readFile(candidatePath, 'utf8')]);
    const success = run(['--compare', baselinePath, candidatePath]);
    assert.equal(success.status, 0, success.stderr);
    assert.equal(JSON.parse(success.stdout).promotionEligible, false);
    assert.deepEqual(await Promise.all([readFile(baselinePath, 'utf8'), readFile(candidatePath, 'utf8')]), filesBefore);
    candidate.samples.pop();
    await writeFile(candidatePath, JSON.stringify(candidate));
    const incomplete = run(['--compare', baselinePath, candidatePath]);
    assert.equal(incomplete.status, 1, incomplete.stderr);
    assert.equal(JSON.parse(incomplete.stdout).summary.missingCandidateSlots, 1);
    for (const args of [['--compare'], ['--compare', baselinePath], ['--compare', baselinePath, baselinePath], ['--compare', baselinePath, join(dir, 'PRIVATE-CANARY')]]) {
      const rejected = run(args);
      assert.equal(rejected.status, 2);
      assert.equal(rejected.stdout, '');
      assert.equal(rejected.stderr.includes(dir), false);
      assert.equal(rejected.stderr.includes('PRIVATE-CANARY'), false);
      assert.equal(JSON.parse(rejected.stderr).promotionEligible, false);
    }
  } finally { await rm(dir, { recursive: true, force: true }); }
});
