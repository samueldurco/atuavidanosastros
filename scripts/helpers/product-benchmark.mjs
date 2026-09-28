import { BENCHMARK_POLICY_VERSION, evaluateSample } from '../../packages/ai/src/lab/benchmark.ts';
import { PROMPT_VERSION, SCHEMA_VERSION } from '../../packages/ai/src/contracts.ts';
import { RUBRIC_VERSION } from '../../packages/ai/src/director.ts';
import { buildPrompt } from '../../packages/ai/src/prompt.ts';
import { corpusDigest } from './product-lab-corpus.mjs';

export const PRODUCT_BENCHMARK_VERSION = 'atv-product-benchmark/1.0.0';
export const CAPTURE_VERSION = 'atv-product-capture/1.0.0';
export const MAX_CAPTURE_BYTES = 16 * 1024 * 1024;
export const MAX_OUTPUT_BYTES = 64 * 1024;
const repetitions = [1, 2, 3];
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const exact = (value, keys) => record(value) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const matches = (value, pattern) => typeof value === 'string' && pattern.test(value);
function requireThat(condition, code) { if (!condition) throw new Error(code); }

/** Manifest is generated from the trusted local corpus, never supplied by a capture. */
export function productBenchmarkManifest(corpus) {
  requireThat(corpus.dataClass === 'synthetic', 'corpus_not_synthetic');
  return {
    version: PRODUCT_BENCHMARK_VERSION, captureVersion: CAPTURE_VERSION,
    corpusVersion: corpus.version,
    corpusFingerprint: corpusDigest(corpus.cases.map(({ id, request }) => ({ id, request }))),
    promptVersion: PROMPT_VERSION, benchmarkPolicy: BENCHMARK_POLICY_VERSION,
    schemaVersion: SCHEMA_VERSION, rubricVersion: RUBRIC_VERSION,
    dataClass: 'synthetic', scope: corpus.scope, repetitions: [...repetitions],
    editorialReview: 'not-reviewed', promotionEligible: false,
    unavailableProducts: [...corpus.unavailableProducts],
    cases: corpus.cases.map(item => ({
      caseId: item.id, productId: item.productId, category: item.category, suite: item.suite ?? 'base',
      preparation: item.preparation,
      criteria: [...item.criteria],
      requestDigest: item.request ? corpusDigest(item.request) : null,
      promptDigest: item.request ? corpusDigest(buildPrompt(item.request)) : null,
      blockReason: item.blockReason ?? null,
    })),
  };
}

export function parseProductCapture(text) {
  requireThat(typeof text === 'string' && Buffer.byteLength(text) <= MAX_CAPTURE_BYTES, 'capture_size_invalid');
  try { return JSON.parse(text); } catch { throw new Error('capture_json_invalid'); }
}

/** Local diagnostic only. Does not authenticate captures, review semantics or promote anything. */
export function evaluateProductBenchmark(capture, corpus) {
  const manifest = productBenchmarkManifest(corpus);
  requireThat(exact(capture, ['version', 'dataClass', 'corpusVersion', 'corpusFingerprint', 'promptVersion', 'provider', 'model', 'samples']), 'capture_envelope_invalid');
  requireThat(capture.version === CAPTURE_VERSION && capture.dataClass === 'synthetic', 'capture_version_or_class_invalid');
  requireThat(capture.corpusVersion === manifest.corpusVersion && capture.corpusFingerprint === manifest.corpusFingerprint, 'capture_corpus_mismatch');
  requireThat(capture.promptVersion === PROMPT_VERSION, 'capture_prompt_mismatch');
  requireThat(matches(capture.provider, /^[a-z0-9][a-z0-9._-]{0,99}$/) &&
    matches(capture.model, /^[A-Za-z0-9][A-Za-z0-9._/-]{0,159}$/), 'capture_candidate_invalid');
  const prepared = manifest.cases.filter(item => item.preparation === 'prepared');
  const expectedSamples = prepared.length * repetitions.length;
  requireThat(Array.isArray(capture.samples) && capture.samples.length <= expectedSamples, 'capture_sample_count_invalid');
  const byId = new Map(manifest.cases.map(item => [item.caseId, item]));
  const executions = new Set();
  const slots = new Set();
  // Validate the entire batch before calculating or reporting any successful sample.
  for (const sample of capture.samples) {
    requireThat(exact(sample, ['caseId', 'repetition', 'provider', 'model', 'executionId', 'requestDigest', 'promptDigest',
      'output', 'latencyMs', 'inputTokens', 'outputTokens', 'costBrl', 'costEvidence']), 'capture_sample_invalid');
    const item = byId.get(sample.caseId);
    requireThat(item !== undefined, 'capture_case_unknown');
    requireThat(item.preparation === 'prepared', 'capture_case_blocked');
    requireThat(sample.provider === capture.provider && sample.model === capture.model, 'capture_identity_mismatch');
    requireThat(sample.requestDigest === item.requestDigest && sample.promptDigest === item.promptDigest, 'capture_request_or_prompt_mismatch');
    requireThat(repetitions.includes(sample.repetition), 'capture_repetition_invalid');
    requireThat(matches(sample.executionId, /^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/), 'capture_execution_invalid');
    const slot = `${sample.caseId}:${sample.repetition}`;
    requireThat(!slots.has(slot) && !executions.has(sample.executionId), 'capture_duplicate');
    slots.add(slot); executions.add(sample.executionId);
    let encoded;
    try { encoded = JSON.stringify(sample.output); } catch { /* Rejected below, without echoing the input. */ }
    requireThat(typeof encoded === 'string' && Buffer.byteLength(encoded) <= MAX_OUTPUT_BYTES, 'capture_output_size_or_encoding_invalid');
    // Unknown measurements stay unknown; malformed measurements are not coerced to zero.
    requireThat(sample.latencyMs === null || (typeof sample.latencyMs === 'number' && Number.isFinite(sample.latencyMs) && sample.latencyMs >= 0), 'capture_latency_invalid');
    for (const key of ['inputTokens', 'outputTokens']) requireThat(sample[key] === null ||
      (Number.isSafeInteger(sample[key]) && sample[key] >= 0), 'capture_tokens_invalid');
    requireThat(sample.costBrl === null || (typeof sample.costBrl === 'number' && Number.isFinite(sample.costBrl) && sample.costBrl >= 0), 'capture_cost_invalid');
  }
  const benchmarkCorpus = { version: corpus.version, cases: corpus.cases.filter(item => item.request) };
  const results = capture.samples.map(sample => {
    const result = evaluateSample({ ...sample, promptVersion: capture.promptVersion }, benchmarkCorpus);
    return { ...result, provider: sample.provider, executionId: sample.executionId,
      requestDigest: sample.requestDigest, promptDigest: sample.promptDigest,
      latencyKnown: sample.latencyMs !== null,
      zeroCostPass: result.costKnown && result.costBrl === 0 };
  }).sort((a, b) => a.caseId.localeCompare(b.caseId, 'en') || a.repetition - b.repetition);
  const bySlot = new Map(results.map(item => [`${item.caseId}:${item.repetition}`, item]));
  const checksPass = item => item.schemaPass && item.mechanicalPass && item.latencyPass && item.tokenUsagePass && item.zeroCostPass;
  const cases = manifest.cases.map(item => {
    const rows = results.filter(row => row.caseId === item.caseId);
    return { ...item, samplesReceived: rows.length,
      missingRepetitions: item.preparation === 'prepared' ? repetitions.filter(rep => !bySlot.has(`${item.caseId}:${rep}`)) : [],
      schemaPasses: rows.filter(row => row.schemaPass).length,
      mechanicalPasses: rows.filter(row => row.mechanicalPass).length,
      checksComplete: item.preparation === 'prepared' && rows.length === repetitions.length && rows.every(checksPass),
      editorialReview: 'not-reviewed' };
  });
  const products = [...new Set(cases.map(item => item.productId))].map(productId => {
    const rows = cases.filter(item => item.productId === productId);
    return { productId, totalCases: rows.length, preparedCases: rows.filter(item => item.preparation === 'prepared').length,
      blockedCases: rows.filter(item => item.preparation !== 'prepared').length,
      sampledCases: rows.filter(item => item.samplesReceived > 0).length,
      checksCompleteCases: rows.filter(item => item.checksComplete).length };
  });
  return {
    ...manifest, status: 'diagnostic-only', candidate: { provider: capture.provider, model: capture.model },
    provenance: 'declared-not-authenticated', publication: 'blocked',
    summary: { totalCases: cases.length, preparedCases: prepared.length, blockedCases: cases.length - prepared.length,
      expectedSamples, receivedSamples: results.length, missingSamples: expectedSamples - results.length,
      schemaPasses: results.filter(row => row.schemaPass).length,
      mechanicalPasses: results.filter(row => row.mechanicalPass).length,
      latencyUnknown: results.filter(row => !row.latencyKnown).length,
      tokensUnknown: results.filter(row => !row.tokenUsageKnown).length,
      costUnknown: results.filter(row => !row.costKnown).length,
      // Completeness is only for prepared cases; blocked/unavailable products remain explicit.
      preparedChecksComplete: expectedSamples > 0 && results.length === expectedSamples && results.every(checksPass),
      unreviewedSamples: results.length, unreviewedPreparedCases: prepared.length },
    products, cases, results,
  };
}
