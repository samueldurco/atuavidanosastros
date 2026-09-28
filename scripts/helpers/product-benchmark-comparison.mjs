import { evaluateProductBenchmark } from './product-benchmark.mjs';

export const PRODUCT_COMPARISON_VERSION = 'atv-product-comparison/1.0.0';
const checks = ['schemaPass', 'mechanicalPass', 'latencyPass', 'tokenUsagePass', 'zeroCostPass'];
const slot = row => `${row.caseId}:${row.repetition}`;
const metricKnowledge = { latencyPass: 'latencyKnown', tokenUsagePass: 'tokenUsageKnown', zeroCostPass: 'costKnown' };
const checkStates = row => row ? Object.fromEntries(checks.map(check => [check,
  metricKnowledge[check] && !row[metricKnowledge[check]] ? 'unknown' : row[check] ? 'pass' : 'fail',
])) : null;

/** Re-evaluate both captures against one trusted current corpus; never trust supplied reports. */
export function compareProductBenchmarks(baselineCapture, candidateCapture, corpus) {
  const baseline = evaluateProductBenchmark(baselineCapture, corpus);
  const candidate = evaluateProductBenchmark(candidateCapture, corpus);
  const executions = new Set(baseline.results.map(row => `${row.provider}:${row.executionId}`));
  if (candidate.results.some(row => executions.has(`${row.provider}:${row.executionId}`)))
    throw new Error('capture_comparison_reused_execution');
  const baselineSlots = new Map(baseline.results.map(row => [slot(row), row]));
  const candidateSlots = new Map(candidate.results.map(row => [slot(row), row]));
  const deltas = (before, after) => Object.fromEntries(
    ['latencyMs', 'inputTokens', 'outputTokens', 'costBrl'].map(key => {
      const known = typeof before?.[key] === 'number' && typeof after?.[key] === 'number';
      const delta = known ? after[key] - before[key] : null;
      return [key, Number.isFinite(delta) ? delta : null];
    })
  );
  const rows = baseline.cases.filter(item => item.preparation === 'prepared').flatMap(item =>
    baseline.repetitions.map(repetition => {
      const key = `${item.caseId}:${repetition}`;
      const before = baselineSlots.get(key);
      const after = candidateSlots.get(key);
      const paired = !!before && !!after;
      const baselineChecks = checkStates(before);
      const candidateChecks = checkStates(after);
      const changed = (from, to) => paired ? checks.filter(check => baselineChecks[check] === from && candidateChecks[check] === to) : [];
      return {
        caseId: item.caseId, productId: item.productId, repetition,
        coverage: paired ? 'paired' : before ? 'missing-candidate' : after ? 'added-candidate' : 'missing-both',
        baselineDigest: before?.digest ?? null, candidateDigest: after?.digest ?? null,
        // A missing sample is a coverage gap, never a passing or failing model output.
        baselineChecks, candidateChecks,
        regressions: changed('pass', 'fail'),
        improvements: changed('fail', 'pass'),
        unchangedFailures: changed('fail', 'fail'),
        evidenceLost: paired ? checks.filter(check => baselineChecks[check] !== 'unknown' && candidateChecks[check] === 'unknown') : [],
        evidenceRecovered: paired ? checks.filter(check => baselineChecks[check] === 'unknown' && candidateChecks[check] !== 'unknown') : [],
        metricDelta: deltas(before, after),
      };
    })
  );
  const summarize = values => ({
    expectedSlots: values.length,
    pairedSlots: values.filter(row => row.coverage === 'paired').length,
    missingCandidateSlots: values.filter(row => row.coverage === 'missing-candidate').length,
    addedCandidateSlots: values.filter(row => row.coverage === 'added-candidate').length,
    missingBothSlots: values.filter(row => row.coverage === 'missing-both').length,
    regressedSlots: values.filter(row => row.regressions.length > 0).length,
    improvedSlots: values.filter(row => row.improvements.length > 0).length,
    unchangedFailingSlots: values.filter(row => row.unchangedFailures.length > 0).length,
    evidenceLostSlots: values.filter(row => row.evidenceLost.length > 0).length,
    evidenceRecoveredSlots: values.filter(row => row.evidenceRecovered.length > 0).length,
  });
  return {
    version: PRODUCT_COMPARISON_VERSION, status: 'diagnostic-only',
    corpusVersion: baseline.corpusVersion, corpusFingerprint: baseline.corpusFingerprint,
    promptVersion: baseline.promptVersion, benchmarkPolicy: baseline.benchmarkPolicy,
    schemaVersion: baseline.schemaVersion, rubricVersion: baseline.rubricVersion,
    provenance: 'declared-not-authenticated', editorialReview: 'not-reviewed',
    promotionEligible: false, publication: 'blocked',
    baseline: { identity: baseline.candidate, summary: baseline.summary },
    candidate: { identity: candidate.candidate, summary: candidate.summary },
    summary: { ...summarize(rows),
      preparedChecksComplete: baseline.summary.preparedChecksComplete && candidate.summary.preparedChecksComplete },
    blockedCases: baseline.cases.filter(item => item.preparation !== 'prepared').map(item => ({ caseId: item.caseId, blockReason: item.blockReason })),
    unavailableProducts: baseline.unavailableProducts,
    products: baseline.products.map(item => ({ productId: item.productId, ...summarize(rows.filter(row => row.productId === item.productId)) })),
    rows,
  };
}
