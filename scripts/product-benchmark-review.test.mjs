import { careerEditorialTestFixture, threePillarsEditorialTestFixture, ascendantEditorialTestFixture, birthChartEditorialTestFixture } from './helpers/career-editorial-test-fixture.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { dimensions } from '../packages/ai/src/director.ts';
import { SCHEMA_VERSION } from '../packages/ai/src/contracts.ts';
import { buildProductLabCorpus, corpusDigest } from './helpers/product-lab-corpus.mjs';
import { CAPTURE_VERSION, MAX_CAPTURE_BYTES, productBenchmarkManifest } from './helpers/product-benchmark.mjs';
import { evaluateProductReview, productReviewTemplate, PRODUCT_REVIEW_VERSION } from './helpers/product-benchmark-review.mjs';

const corpus = await buildProductLabCorpus();
const manifest = productBenchmarkManifest(corpus);
const prepared = manifest.cases.filter(item => item.preparation === 'prepared');
const envelope = (samples = []) => ({ version: CAPTURE_VERSION, dataClass: 'synthetic',
  corpusVersion: manifest.corpusVersion, corpusFingerprint: manifest.corpusFingerprint,
  promptVersion: manifest.promptVersion, provider: 'synthetic-only', model: 'synthetic-only', samples });
// These scores/outputs exercise software only. They are not human reviews or semantic goldens.
function sample(item = prepared[0], repetition = 1) {
  const request = corpus.cases.find(row => row.id === item.caseId).request;
  return { caseId: item.caseId, repetition, provider: 'synthetic-only', model: 'synthetic-only',
    executionId: `fixture-${item.caseId}-${repetition}`, requestDigest: item.requestDigest, promptDigest: item.promptDigest,
    output: { schemaVersion: SCHEMA_VERSION, capability: request.facts.capability, scope: 'partial',
      title: 'Fixture de encanamento, não leitura editorial',
      claims: [{ id: 'fixture', kind: 'interpretation', text: 'CANARY-OUTPUT: referência sintética para teste.', evidence: [request.facts.facts[0].id] }],
      relations: [], synthesis: [{ claimIds: ['fixture'], text: 'Síntese genérica sem qualquer nota de qualidade.' }],
      reflections: ['Qual informação falta nesta fixture?'], limits: ['Teste local sem homologação editorial.'], ...careerEditorialTestFixture(request.facts), ...threePillarsEditorialTestFixture(request.facts), ...birthChartEditorialTestFixture(request.facts), ...ascendantEditorialTestFixture(request.facts) },
    latencyMs: 100, inputTokens: 2000, outputTokens: 800, costBrl: 0,
    costEvidence: { basis: 'owner-confirmed-free-tier', reference: 'CANARY-RECEIPT' } };
}
const capture = () => envelope([sample()]);
function filled(input, localCorpus = corpus) {
  const template = productReviewTemplate(input, localCorpus);
  for (const row of template.annotations) {
    row.source = 'human'; row.reviewer = 'CANARY-REVIEWER'; row.reviewedAt = '2026-09-28T00:00:00.000Z';
    for (const dimension of dimensions) row.dimensions[dimension] = { score: 10, evidence: 'CANARY-EVIDENCE: fixture, não revisão.' };
    for (const criterion of row.criteria) { criterion.verdict = 'pass'; criterion.evidence = 'CANARY-CRITERION: fixture, não revisão.'; }
  }
  return template;
}

test('blank template binds current capture, rubric, exact output and all trusted case criteria', () => {
  const input = capture();
  const template = productReviewTemplate(input, corpus);
  assert.equal(template.version, PRODUCT_REVIEW_VERSION);
  assert.equal(template.binding.captureDigest, corpusDigest(input));
  assert.equal(template.binding.rubricVersion, manifest.rubricVersion);
  const row = template.annotations[0];
  assert.equal(row.outputDigest, corpusDigest(input.samples[0].output));
  assert.equal(row.source, null); assert.equal(row.reviewer, null); assert.equal(row.reviewedAt, null);
  assert.deepEqual(Object.keys(row.dimensions), [...dimensions]);
  assert.ok(Object.values(row.dimensions).every(entry => entry.score === null && entry.evidence === null));
  assert.deepEqual(row.criteria.map(item => item.text), prepared[0].criteria);
  assert.ok(row.criteria.every(item => item.verdict === null && item.evidence === null));
  assert.equal(JSON.stringify(template).includes('CANARY'), false);
});

test('empty capture retains 306 missing samples, three polar blockers and 12 unavailable products', () => {
  const input = envelope(); const report = evaluateProductReview(input, productReviewTemplate(input, corpus), corpus);
  assert.equal(report.summary.missingSamples, 306); assert.equal(report.summary.blockedCases, 3);
  assert.equal(report.unavailableProducts.length, 12); assert.equal(report.products.length, 13);
  assert.equal(report.summary.preparedDiagnosticsComplete, false); assert.deepEqual(report.results, []);
});

test('blank and omitted annotations remain distinct from complete declared reviews', () => {
  const input = capture(); const template = productReviewTemplate(input, corpus);
  const blank = evaluateProductReview(input, template, corpus);
  assert.equal(blank.results[0].annotationStatus, 'incomplete');
  assert.equal(blank.results[0].declaredDecision, 'not-assessed');
  template.annotations = [];
  assert.equal(evaluateProductReview(input, template, corpus).summary.missingAnnotations, 1);
  const declared = evaluateProductReview(input, filled(input), corpus);
  assert.equal(declared.summary.completeAnnotations, 1);
  assert.equal(declared.summary.declaredMeetsLocalChecks, 1);
  assert.equal(declared.summary.missingSamples, 305);
  assert.equal(declared.summary.preparedDiagnosticsComplete, false);
  assert.equal(declared.trustedReviews, 0); assert.equal(declared.promotionEligible, false);
});

test('every human attribution, dimension and criterion needs explicit evidence to be complete', () => {
  const input = capture();
  const changes = [row => row.source = null, row => row.reviewer = null, row => row.reviewedAt = null,
    ...dimensions.flatMap(key => [row => row.dimensions[key].score = null, row => row.dimensions[key].evidence = null]),
    row => row.criteria[0].verdict = null, row => row.criteria[0].evidence = null];
  for (const change of changes) {
    const annotations = filled(input); change(annotations.annotations[0]);
    const result = evaluateProductReview(input, annotations, corpus).results[0];
    assert.equal(result.annotationStatus, 'incomplete'); assert.equal(result.declaredDecision, 'not-assessed');
  }
});

test('existing intermediate rubric floors and stricter safety/factual floors cannot be bypassed', () => {
  const input = capture(); const annotations = filled(input); const row = annotations.annotations[0];
  for (const dimension of dimensions) {
    const floor = ['responsibility', 'factualFidelity'].includes(dimension) ? 10 : 7;
    row.dimensions[dimension].score = floor;
    assert.equal(evaluateProductReview(input, annotations, corpus).summary.declaredMeetsLocalChecks, 1);
    row.dimensions[dimension].score = floor - 0.1;
    assert.equal(evaluateProductReview(input, annotations, corpus).summary.declaredDoesNotMeetLocalChecks, 1);
    row.dimensions[dimension].score = 10;
  }
});

test('premium tier from trusted corpus uses floor 8, not an annotation-supplied tier', () => {
  const localCorpus = structuredClone(corpus);
  localCorpus.cases.find(row => row.id === prepared[0].caseId).request.tier = 'premium';
  const localManifest = productBenchmarkManifest(localCorpus); const item = localManifest.cases[0];
  const input = capture(); input.corpusFingerprint = localManifest.corpusFingerprint;
  input.samples[0].requestDigest = item.requestDigest; input.samples[0].promptDigest = item.promptDigest;
  const annotations = filled(input, localCorpus);
  annotations.annotations[0].dimensions.depth.score = 7;
  assert.equal(evaluateProductReview(input, annotations, localCorpus).summary.declaredDoesNotMeetLocalChecks, 1);
  annotations.annotations[0].dimensions.depth.score = 8;
  assert.equal(evaluateProductReview(input, annotations, localCorpus).summary.declaredMeetsLocalChecks, 1);
});

test('criterion failure and mechanical/schema rejection override declared perfect scores', () => {
  const input = capture(); const annotations = filled(input); annotations.annotations[0].criteria[0].verdict = 'fail';
  let report = evaluateProductReview(input, annotations, corpus);
  assert.deepEqual(report.results[0].declaredFailedCriteria, [0]); assert.equal(report.summary.declaredDoesNotMeetLocalChecks, 1);
  input.samples[0].output.claims[0].evidence = ['invented-fact'];
  report = evaluateProductReview(input, filled(input), corpus);
  assert.equal(report.results[0].schemaPass, true); assert.equal(report.results[0].mechanicalPass, false);
  assert.equal(report.summary.declaredDoesNotMeetLocalChecks, 1);
  input.samples[0].output = 'not json';
  report = evaluateProductReview(input, filled(input), corpus);
  assert.equal(report.results[0].schemaPass, false); assert.equal(report.summary.declaredDoesNotMeetLocalChecks, 1);
});

test('stale capture content, measurements and identities invalidate the full review file', () => {
  const changes = [input => input.samples[0].output.title += ' changed', input => input.samples[0].latencyMs++,
    input => input.samples[0].executionId += '-changed', input => input.model = input.samples[0].model = 'other'];
  for (const change of changes) {
    const input = capture(); const annotations = filled(input); change(input);
    assert.throws(() => evaluateProductReview(input, annotations, corpus), /review_binding_mismatch/);
  }
  const input = capture(); const annotations = filled(input); const localCorpus = structuredClone(corpus);
  localCorpus.cases[0].criteria[0] += ' changed';
  assert.throws(() => evaluateProductReview(input, annotations, localCorpus), /review_binding_mismatch/);
  for (const key of Object.keys(annotations.binding)) {
    const modified = structuredClone(annotations); modified.binding[key] += '-stale';
    assert.throws(() => evaluateProductReview(input, modified, corpus), /review_binding_mismatch/);
  }
});

test('malformed attribution, numeric coercions, missing/extra dimensions and changed criteria reject atomically', () => {
  const input = capture();
  const mutations = [row => row.source = 'calibrated-reviewer', row => row.reviewer = 'private@example.invalid',
    row => row.reviewedAt = '2026-02-30T00:00:00.000Z', row => row.reviewedAt = '2026-09-28',
    row => row.dimensions.depth.score = '10', row => row.dimensions.depth.score = NaN,
    row => row.dimensions.depth.score = Infinity, row => row.dimensions.depth.score = 11,
    row => row.dimensions.depth.score = -1, row => row.dimensions.depth.evidence = '',
    row => row.dimensions.depth.evidence = ' '.repeat(2), row => row.dimensions.depth.evidence = 'a'.repeat(2001),
    row => row.dimensions.depth.evidence = 'bad\u0000', row => delete row.dimensions.depth,
    row => row.dimensions.newDimension = { score: 10, evidence: 'invented' }, row => row.criteria.pop(),
    row => row.criteria[0].text += 'changed', row => row.criteria[0].index = 1,
    row => row.criteria[0].verdict = true, row => row.criteria[0].evidence = 10,
    row => row.outputDigest = 'a'.repeat(64), row => row.tier = 'free', row => row.extra = true];
  for (const mutate of mutations) {
    const annotations = filled(input); mutate(annotations.annotations[0]);
    assert.throws(() => evaluateProductReview(input, annotations, corpus), /review_/);
  }
});

test('duplicate/foreign slots, promoted envelopes and forged trust flags reject before any report', () => {
  const input = envelope([sample(), sample(prepared[0], 2)]);
  const mutations = [value => value.annotations[1] = value.annotations[0], value => value.annotations[0].caseId = 'ascendant-boundary',
    value => value.annotations[0].repetition = '1', value => value.annotations[0].repetition = 4,
    value => value.version = 'stale', value => value.dataClass = 'real', value => value.trusted = true,
    value => value.binding.authority = 'invented', value => value.annotations.push(value.annotations[0])];
  for (const mutate of mutations) {
    const annotations = filled(input); mutate(annotations);
    assert.throws(() => evaluateProductReview(input, annotations, corpus), /review_/);
  }
  const badCapture = structuredClone(input); badCapture.samples[0].promptDigest = 'a'.repeat(64);
  assert.throws(() => productReviewTemplate(badCapture, corpus), /capture_request_or_prompt_mismatch/);
});

test('reports omit reviewers, notes, raw output and receipt; inputs are unchanged and annotations may reorder', () => {
  const input = envelope([sample(), sample(prepared[0], 2)]); const annotations = filled(input);
  const before = JSON.stringify([input, annotations]); const report = evaluateProductReview(input, annotations, corpus);
  assert.equal(JSON.stringify([input, annotations]), before);
  assert.equal(JSON.stringify(report).includes('CANARY'), false);
  assert.equal(report.provenance, 'declared-not-authenticated'); assert.equal(report.editorialReview, 'not-authenticated');
  annotations.annotations.reverse(); assert.deepEqual(evaluateProductReview(input, annotations, corpus), report);
});

test('unknown cost/latency still prevent complete diagnostics despite declared perfect annotations', () => {
  const input = envelope(prepared.flatMap(item => [1, 2, 3].map(rep => sample(item, rep))));
  for (const metric of ['costBrl', 'latencyMs', 'inputTokens']) {
    const modified = structuredClone(input); modified.samples[0][metric] = null;
    const report = evaluateProductReview(modified, filled(modified), corpus);
    assert.equal(report.summary.declaredMeetsLocalChecks, 306); assert.equal(report.summary.preparedDiagnosticsComplete, false);
  }
});

test('306 complete synthetic annotations cannot authenticate, homologate or enable publication', () => {
  const input = envelope(prepared.flatMap(item => [1, 2, 3].map(rep => sample(item, rep))));
  const report = evaluateProductReview(input, filled(input), corpus);
  assert.equal(report.summary.preparedDiagnosticsComplete, true); assert.equal(report.summary.completeAnnotations, 306);
  assert.equal(report.products.reduce((sum, item) => sum + item.completeAnnotations, 0), 306);
  assert.equal(report.trustedReviews, 0); assert.equal(report.publication, 'blocked'); assert.equal(report.promotionEligible, false);
});

test('CLI templates/reviews are read-only with 0/1/2 exit codes and sanitized errors', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'atv-review-'));
  const capturePath = join(dir, 'capture.json'); const annotationsPath = join(dir, 'annotations.json');
  const cli = fileURLToPath(new URL('./evaluate-product-benchmark.mjs', import.meta.url));
  const run = args => spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  try {
    const input = envelope(prepared.flatMap(item => [1, 2, 3].map(rep => sample(item, rep))));
    await writeFile(capturePath, JSON.stringify(input));
    const templateResult = run(['--review-template', capturePath]); assert.equal(templateResult.status, 0, templateResult.stderr);
    const template = JSON.parse(templateResult.stdout); assert.equal(template.annotations.length, 306);
    await writeFile(annotationsPath, JSON.stringify(template));
    const incomplete = run(['--review', capturePath, annotationsPath]); assert.equal(incomplete.status, 1, incomplete.stderr);
    assert.equal(JSON.parse(incomplete.stdout).summary.incompleteAnnotations, 306);
    await writeFile(annotationsPath, JSON.stringify(filled(input)));
    const before = await Promise.all([readFile(capturePath, 'utf8'), readFile(annotationsPath, 'utf8')]);
    const complete = run(['--review', capturePath, annotationsPath]); assert.equal(complete.status, 0, complete.stderr);
    assert.equal(JSON.parse(complete.stdout).trustedReviews, 0);
    assert.deepEqual(await Promise.all([readFile(capturePath, 'utf8'), readFile(annotationsPath, 'utf8')]), before);
    for (const args of [['--review'], ['--review-template'], ['--review', capturePath], ['--unknown'],
      ['--review', capturePath, join(dir, 'PRIVATE-CANARY')], ['--review', capturePath, dir]]) {
      const rejected = run(args); assert.equal(rejected.status, 2); assert.equal(rejected.stdout, '');
      assert.equal(rejected.stderr.includes('PRIVATE-CANARY'), false); assert.equal(rejected.stderr.includes(dir), false);
    }
    for (const content of ['PRIVATE-CANARY', JSON.stringify({ authority: 'PRIVATE-CANARY' }), ' '.repeat(MAX_CAPTURE_BYTES + 1)]) {
      await writeFile(annotationsPath, content);
      const rejected = run(['--review', capturePath, annotationsPath]); assert.equal(rejected.status, 2);
      assert.equal(rejected.stdout, ''); assert.equal(rejected.stderr.includes('PRIVATE-CANARY'), false);
    }
  } finally { await rm(dir, { recursive: true, force: true }); }
});
