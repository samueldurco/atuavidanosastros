import { tarotFocusEditorialTestFixture, dreamJournalEditorialTestFixture, dreamReadingEditorialTestFixture, threeQuestionsEditorialTestFixture, tarotYesNoEditorialTestFixture, dailyCardEditorialTestFixture, careerEditorialTestFixture, threePillarsEditorialTestFixture, midheavenEditorialTestFixture, ascendantEditorialTestFixture, birthChartEditorialTestFixture } from './helpers/career-editorial-test-fixture.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { SCHEMA_VERSION } from '../packages/ai/src/contracts.ts';
import { buildProductLabCorpus, corpusDigest } from './helpers/product-lab-corpus.mjs';
import { CAPTURE_VERSION, evaluateProductBenchmark, MAX_CAPTURE_BYTES, MAX_OUTPUT_BYTES,
  parseProductCapture, productBenchmarkManifest } from './helpers/product-benchmark.mjs';

const corpus = await buildProductLabCorpus();
const manifest = productBenchmarkManifest(corpus);
const prepared = manifest.cases.filter(item => item.preparation === 'prepared');
const first = prepared[0];
const envelope = (samples = []) => ({ version: CAPTURE_VERSION, dataClass: 'synthetic',
  corpusVersion: manifest.corpusVersion, corpusFingerprint: manifest.corpusFingerprint,
  promptVersion: manifest.promptVersion, provider: 'synthetic-only', model: 'synthetic-only', samples });
// Deliberately generic test content proves ONLY mechanical plumbing, not editorial quality.
function sample(item = first, repetition = 1) {
  const request = corpus.cases.find(row => row.id === item.caseId).request;
  return { caseId: item.caseId, repetition, provider: 'synthetic-only', model: 'synthetic-only',
    executionId: `fixture-${item.caseId}-${repetition}`, requestDigest: item.requestDigest, promptDigest: item.promptDigest,
    output: { schemaVersion: SCHEMA_VERSION, capability: request.facts.capability, scope: 'partial',
      title: 'Fixture de encanamento, não leitura editorial',
      claims: [{ id: 'fixture', kind: 'interpretation', text: 'Conteúdo sintético para exercitar uma referência de evidência.', evidence: [request.facts.facts[0].id] }],
      relations: [], synthesis: [{ claimIds: ['fixture'], text: 'Síntese genérica sem qualquer nota de qualidade.' }],
      reflections: ['Qual informação falta nesta fixture?'], limits: ['Teste local sem homologação editorial.'], ...careerEditorialTestFixture(request.facts), ...threePillarsEditorialTestFixture(request.facts), ...birthChartEditorialTestFixture(request.facts), ...midheavenEditorialTestFixture(request.facts), ...ascendantEditorialTestFixture(request.facts), ...dailyCardEditorialTestFixture(request.facts), ...tarotFocusEditorialTestFixture(request.facts), ...tarotYesNoEditorialTestFixture(request.facts), ...threeQuestionsEditorialTestFixture(request.facts), ...dreamJournalEditorialTestFixture(request.facts),
    ...dreamReadingEditorialTestFixture(request.facts), },
    latencyMs: 100, inputTokens: 2000, outputTokens: 800, costBrl: 0,
    costEvidence: { basis: 'owner-confirmed-free-tier', reference: 'synthetic-test-not-a-receipt' } };
}

test('manifest preserves corpus identity, 102 prepared cases, three blocked polar cases and 12 unavailable products', async () => {
  assert.equal(manifest.corpusFingerprint, '326feb034d473d7ca8f0fc1f6db59195904d1c7468cf511488e39ef39b0c8660');
  assert.equal(manifest.cases.length, 105);
  assert.equal(prepared.length, 102);
  assert.equal(manifest.unavailableProducts.length, 12);
  assert.equal(manifest.cases.find(item => item.caseId === 'ascendant-boundary').requestDigest, null);
  assert.ok(prepared.every(item => /^[a-f0-9]{64}$/.test(item.promptDigest)));
  assert.deepEqual(productBenchmarkManifest(await buildProductLabCorpus()), manifest);
});

test('empty capture reports missing repetitions, never zero-cost success or fabricated outputs', () => {
  const report = evaluateProductBenchmark(envelope(), corpus);
  assert.equal(report.summary.expectedSamples, 306);
  assert.equal(report.summary.missingSamples, 306);
  assert.equal(report.summary.receivedSamples, 0);
  assert.equal(report.products.length, 13);
  assert.equal(report.summary.preparedChecksComplete, false);
  assert.deepEqual(report.cases[0].missingRepetitions, [1, 2, 3]);
  assert.deepEqual(report.cases.find(item => item.caseId === 'ascendant-boundary').missingRepetitions, []);
  assert.equal(report.results.length, 0);
  assert.equal(report.promotionEligible, false);
});

test('valid sample is bound to exact case and prompt, hashes output without returning its content', () => {
  const capture = envelope([sample()]);
  const before = JSON.stringify(capture);
  const report = evaluateProductBenchmark(capture, corpus);
  const result = report.results[0];
  assert.equal(result.schemaPass, true);
  assert.equal(result.mechanicalPass, true);
  assert.equal(result.digest, corpusDigest(capture.samples[0].output));
  assert.equal(result.requestDigest, first.requestDigest);
  assert.equal(result.promptDigest, first.promptDigest);
  assert.equal(result.editorialStatus, 'not_calibrated');
  assert.equal(JSON.stringify(report).includes('Conteúdo sintético'), false);
  assert.equal('output' in result, false);
  assert.equal('request' in report.cases[0], false);
  assert.equal(JSON.stringify(capture), before);
  assert.equal(report.summary.missingSamples, 305);
});

test('full mechanically passing fixture batch still cannot promote, publish or review semantics', () => {
  const samples = prepared.flatMap(item => [1, 2, 3].map(rep => sample(item, rep)));
  const report = evaluateProductBenchmark(envelope(samples), corpus);
  assert.equal(report.summary.preparedChecksComplete, true);
  assert.equal(report.summary.mechanicalPasses, 306);
  assert.equal(report.summary.unreviewedPreparedCases, 102);
  assert.equal(report.summary.unreviewedSamples, 306);
  assert.equal(report.summary.blockedCases, 3);
  assert.equal(report.unavailableProducts.length, 12);
  assert.equal(report.promotionEligible, false);
  assert.equal(report.publication, 'blocked');
  assert.equal(report.provenance, 'declared-not-authenticated');
  assert.ok(report.cases.every(item => item.editorialReview === 'not-reviewed'));
  assert.deepEqual(evaluateProductBenchmark(envelope(samples.reverse()), corpus), report);
});

test('unknown latency/tokens/cost are explicit, not inferred zero or PASS', () => {
  const entry = { ...sample(), latencyMs: null, inputTokens: null, outputTokens: null, costBrl: null, costEvidence: null };
  const report = evaluateProductBenchmark(envelope([entry]), corpus);
  assert.equal(report.summary.latencyUnknown, 1);
  assert.equal(report.summary.tokensUnknown, 1);
  assert.equal(report.summary.costUnknown, 1);
  assert.equal(report.results[0].latencyPass, false);
  assert.equal(report.results[0].tokenUsagePass, false);
  assert.equal(report.results[0].zeroCostPass, false);
  assert.equal(report.results[0].costBrl, null);
});

test('missing cost evidence and nonzero cost never meet zero-cost checks', () => {
  const absent = evaluateProductBenchmark(envelope([{ ...sample(), costEvidence: null }]), corpus).results[0];
  assert.equal(absent.costKnown, false);
  const paid = evaluateProductBenchmark(envelope([{ ...sample(), costBrl: 1,
    costEvidence: { basis: 'provider-receipt', reference: 'synthetic-receipt' } }]), corpus).results[0];
  assert.equal(paid.costKnown, true);
  assert.equal(paid.zeroCostPass, false);
  const malformed = evaluateProductBenchmark(envelope([{ ...sample(), costEvidence: {
    basis: 'provider-receipt', reference: 'https://private-receipt', rawReceipt: 'private-canary' } }]), corpus);
  assert.equal(malformed.results[0].costKnown, false);
  assert.equal(JSON.stringify(malformed).includes('private-'), false);
});

test('schema, unsupported facts, SLA and token failures remain separate diagnostics', () => {
  const invalid = evaluateProductBenchmark(envelope([{ ...sample(), output: { bad: true } }]), corpus).results[0];
  assert.equal(invalid.schemaPass, false);
  assert.equal(invalid.mechanicalPass, false);
  const altered = sample();
  altered.output.claims[0].evidence = ['unknown-fact'];
  altered.latencyMs = 999999;
  altered.outputTokens = 999999;
  const result = evaluateProductBenchmark(envelope([altered]), corpus).results[0];
  assert.equal(result.schemaPass, true);
  assert.equal(result.mechanicalPass, false);
  assert.ok(result.findings.some(item => item.code === 'unknown_fact'));
  assert.equal(result.latencyPass, false);
  assert.equal(result.tokenUsagePass, false);
  assert.equal(result.tokenUsageKnown, true);
});

test('rejects stale corpus/prompt, extra review fields, personal data class and invalid candidates', () => {
  for (const change of [{ corpusVersion: 'old' }, { corpusFingerprint: '0'.repeat(64) }, { promptVersion: 'old' },
    { dataClass: 'personal' }, { version: 'old' }, { review: { score: 10 } }, { provider: ' Synthetic' }, { model: '' }]) {
    assert.throws(() => evaluateProductBenchmark({ ...envelope(), ...change }, corpus), /capture_/);
  }
});

test('rejects unknown/blocked cases, mixed identity, wrong requests and repetition tampering', () => {
  for (const change of [{ caseId: 'missing' }, { caseId: 'ascendant-boundary' }, { provider: 'other' }, { model: 'other' },
    { requestDigest: prepared[1].requestDigest }, { promptDigest: '0'.repeat(64) }, { repetition: 0 }, { repetition: 4 },
    { repetition: '1' }, { executionId: '' }, { executionId: 'a'.repeat(121) }, { executionId: 'https://private' },
    { tier: 'premium' }, { review: { score: 10 } }]) {
    assert.throws(() => evaluateProductBenchmark(envelope([{ ...sample(), ...change }]), corpus), /capture_/);
  }
});

test('reused execution IDs or slots fail the entire batch; identical independent outputs remain diagnostic', () => {
  const a = sample();
  for (const b of [{ ...sample(first, 2), executionId: a.executionId },
    { ...sample(prepared[1]), executionId: a.executionId }, { ...a, executionId: 'different' }]) {
    assert.throws(() => evaluateProductBenchmark(envelope([a, b]), corpus), /capture_duplicate/);
  }
  const report = evaluateProductBenchmark(envelope([a, sample(first, 2)]), corpus);
  assert.equal(report.results.length, 2);
  assert.equal(report.results[0].digest, report.results[1].digest);
});

test('malformed measurements, oversize outputs and excessive samples are rejected without coercion', () => {
  for (const change of [{ latencyMs: -1 }, { latencyMs: '100' }, { inputTokens: -1 }, { outputTokens: 1.5 },
    { costBrl: '0' }, { output: undefined }, { output: 'á'.repeat(MAX_OUTPUT_BYTES) }]) {
    assert.throws(() => evaluateProductBenchmark(envelope([{ ...sample(), ...change }]), corpus), /capture_/);
  }
  assert.throws(() => evaluateProductBenchmark(envelope(Array(313).fill(sample())), corpus), /capture_sample_count_invalid/);
  assert.throws(() => parseProductCapture('x'.repeat(MAX_CAPTURE_BYTES + 1)), /capture_size_invalid/);
  assert.throws(() => parseProductCapture('{private-invalid'), /^Error: capture_json_invalid$/);
  assert.deepEqual(parseProductCapture(JSON.stringify(envelope())), envelope());
});

test('CLI emits manifest/report with distinct exit codes and sanitized errors; source remains unchanged', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'atv-product-benchmark-'));
  const cli = new URL('./evaluate-product-benchmark.mjs', import.meta.url);
  const invoke = args => spawnSync(process.execPath, [fileURLToPath(cli), ...args], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  try {
    const index = invoke(['--manifest']);
    assert.equal(index.status, 0, index.stderr);
    assert.deepEqual(JSON.parse(index.stdout), manifest);
    const path = join(directory, 'capture.json');
    const source = JSON.stringify(envelope([sample()]));
    await writeFile(path, source);
    const partial = invoke([path]);
    assert.equal(partial.status, 1, partial.stderr);
    assert.equal(JSON.parse(partial.stdout).summary.missingSamples, 305);
    assert.equal(await readFile(path, 'utf8'), source);
    await writeFile(path, JSON.stringify(envelope(prepared.flatMap(item => [1, 2, 3].map(rep => sample(item, rep))))));
    const complete = invoke([path]);
    assert.equal(complete.status, 0, complete.stderr);
    assert.equal(JSON.parse(complete.stdout).promotionEligible, false);
    await writeFile(path, '{secret-canary-not-json');
    const invalid = invoke([path]);
    assert.equal(invalid.status, 2);
    assert.equal(invalid.stdout, '');
    assert.equal(invalid.stderr.includes('secret-canary'), false);
    assert.equal(JSON.parse(invalid.stderr).code, 'capture_json_invalid');
    await writeFile(path, Buffer.alloc(MAX_CAPTURE_BYTES + 1, 32));
    const oversized = invoke([path]);
    assert.equal(oversized.status, 2);
    assert.equal(JSON.parse(oversized.stderr).code, 'capture_size_invalid');
    const missing = invoke([join(directory, 'private-path-do-not-print')]);
    assert.equal(missing.status, 2);
    assert.equal(missing.stderr.includes('private-path'), false);
    const usage = invoke([]);
    assert.equal(usage.status, 2);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
