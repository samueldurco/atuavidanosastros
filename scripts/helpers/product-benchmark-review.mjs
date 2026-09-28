import { dimensions, editorialDecision, RUBRIC_VERSION } from '../../packages/ai/src/director.ts';
import { corpusDigest } from './product-lab-corpus.mjs';
import { evaluateProductBenchmark, MAX_CAPTURE_BYTES } from './product-benchmark.mjs';

export const PRODUCT_REVIEW_VERSION = 'atv-product-review/1.0.0';
const exact = (value, keys) => value !== null && typeof value === 'object' && !Array.isArray(value) &&
  Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const slot = row => `${row.caseId}:${row.repetition}`;
function requireThat(condition, code) { if (!condition) throw new Error(code); }
const note = value => value === null || (typeof value === 'string' && value.length <= 2000 &&
  value.trim().length > 0 && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value));

function context(capture, corpus) {
  // Revalidate the capture against the current trusted corpus before accepting any annotations.
  const benchmark = evaluateProductBenchmark(capture, corpus);
  return { benchmark, binding: {
    captureDigest: corpusDigest(capture), corpusVersion: benchmark.corpusVersion,
    corpusFingerprint: benchmark.corpusFingerprint, promptVersion: benchmark.promptVersion,
    schemaVersion: benchmark.schemaVersion, rubricVersion: benchmark.rubricVersion,
    benchmarkPolicy: benchmark.benchmarkPolicy,
    // Criteria and tier are part of the review contract, not just the input/prompt hashes.
    reviewContractDigest: corpusDigest(corpus.cases.map(item => ({ caseId: item.id,
      criteria: item.criteria, tier: item.request?.tier ?? null }))),
  } };
}

function blankRows(benchmark, corpus) {
  const cases = new Map(corpus.cases.map(item => [item.id, item]));
  return benchmark.results.map(result => {
    const item = cases.get(result.caseId);
    return { caseId: result.caseId, repetition: result.repetition,
      outputDigest: result.digest, tier: item.request.tier,
      source: null, reviewer: null, reviewedAt: null,
      dimensions: Object.fromEntries(dimensions.map(key => [key, { score: null, evidence: null }])),
      criteria: item.criteria.map((text, index) => ({ index, text, verdict: null, evidence: null })),
    };
  });
}

/** Blank offline handoff. Never fabricates reviewers, scores, evidence or approval. */
export function productReviewTemplate(capture, corpus) {
  const { benchmark, binding } = context(capture, corpus);
  return { version: PRODUCT_REVIEW_VERSION, dataClass: 'synthetic', binding,
    annotations: blankRows(benchmark, corpus) };
}

/** Untrusted declarations are diagnostics only; this is NOT a ReviewAuthority or promotion input. */
export function evaluateProductReview(capture, annotations, corpus) {
  const { benchmark, binding } = context(capture, corpus);
  let encoded;
  try { encoded = JSON.stringify(annotations); } catch { /* Sanitized rejection below. */ }
  requireThat(typeof encoded === 'string' && Buffer.byteLength(encoded) <= MAX_CAPTURE_BYTES, 'review_size_invalid');
  requireThat(exact(annotations, ['version', 'dataClass', 'binding', 'annotations']) &&
    annotations.version === PRODUCT_REVIEW_VERSION && annotations.dataClass === 'synthetic', 'review_envelope_invalid');
  requireThat(exact(annotations.binding, Object.keys(binding)) &&
    Object.entries(binding).every(([key, value]) => annotations.binding[key] === value), 'review_binding_mismatch');
  requireThat(Array.isArray(annotations.annotations) && annotations.annotations.length <= benchmark.results.length, 'review_count_invalid');
  const expected = new Map(blankRows(benchmark, corpus).map(row => [slot(row), row]));
  const indexed = new Map();
  // Reject the whole file before producing any apparently successful diagnostic.
  for (const row of annotations.annotations) {
    requireThat(exact(row, ['caseId', 'repetition', 'outputDigest', 'tier', 'source', 'reviewer', 'reviewedAt', 'dimensions', 'criteria']), 'review_row_invalid');
    requireThat(typeof row.caseId === 'string' && Number.isSafeInteger(row.repetition), 'review_slot_invalid');
    const key = slot(row);
    const reference = expected.get(key);
    requireThat(reference && !indexed.has(key), 'review_slot_unknown_or_duplicate');
    requireThat(row.outputDigest === reference.outputDigest && row.tier === reference.tier, 'review_output_or_tier_mismatch');
    requireThat(row.source === null || row.source === 'human', 'review_source_invalid');
    requireThat(row.reviewer === null || (typeof row.reviewer === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/.test(row.reviewer)), 'review_reviewer_invalid');
    requireThat(row.reviewedAt === null || (typeof row.reviewedAt === 'string' &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(row.reviewedAt) &&
      Number.isFinite(Date.parse(row.reviewedAt)) && new Date(row.reviewedAt).toISOString() === row.reviewedAt), 'review_time_invalid');
    requireThat(exact(row.dimensions, dimensions), 'review_dimensions_invalid');
    for (const dimension of dimensions) {
      const entry = row.dimensions[dimension];
      requireThat(exact(entry, ['score', 'evidence']) &&
        (entry.score === null || (typeof entry.score === 'number' && Number.isFinite(entry.score) && entry.score >= 0 && entry.score <= 10)) &&
        note(entry.evidence), 'review_dimension_invalid');
    }
    requireThat(Array.isArray(row.criteria) && row.criteria.length === reference.criteria.length, 'review_criteria_invalid');
    row.criteria.forEach((criterion, index) => {
      requireThat(exact(criterion, ['index', 'text', 'verdict', 'evidence']) && criterion.index === index &&
        criterion.text === reference.criteria[index].text && [null, 'pass', 'fail'].includes(criterion.verdict) &&
        note(criterion.evidence), 'review_criterion_invalid');
    });
    indexed.set(key, row);
  }
  const results = benchmark.results.map(result => {
    const row = indexed.get(slot(result));
    const complete = row && row.source === 'human' && row.reviewer !== null && row.reviewedAt !== null &&
      dimensions.every(key => row.dimensions[key].score !== null && row.dimensions[key].evidence !== null) &&
      row.criteria.every(item => item.verdict !== null && item.evidence !== null);
    let declaredDecision = 'not-assessed';
    if (complete) {
      // Reuse the existing rubric floors, without granting trust to the declared human identity.
      const decision = editorialDecision({ status: result.schemaPass && result.mechanicalPass ? 'needs_editorial_review' : 'rejected',
        findings: [], rubricVersion: RUBRIC_VERSION }, {
        rubricVersion: RUBRIC_VERSION, outputDigest: row.outputDigest, reviewer: row.reviewer,
        source: 'human', calibrationId: null,
        scores: Object.fromEntries(dimensions.map(key => [key, row.dimensions[key].score])),
        evidence: Object.fromEntries(dimensions.map(key => [key, row.dimensions[key].evidence])),
      }, result.digest, row.tier);
      declaredDecision = decision === 'approved' && row.criteria.every(item => item.verdict === 'pass')
        ? 'meets-local-checks' : 'does-not-meet-local-checks';
    }
    return { caseId: result.caseId, repetition: result.repetition,
      annotationStatus: !row ? 'missing' : complete ? 'complete' : 'incomplete', declaredDecision,
      schemaPass: result.schemaPass, mechanicalPass: result.mechanicalPass,
      declaredFailedCriteria: row ? row.criteria.filter(item => item.verdict === 'fail').map(item => item.index) : [],
    };
  });
  return { version: PRODUCT_REVIEW_VERSION, status: 'diagnostic-only', binding,
    provenance: 'declared-not-authenticated', editorialReview: 'not-authenticated',
    promotionEligible: false, publication: 'blocked', trustedReviews: 0,
    summary: { expectedSamples: benchmark.summary.expectedSamples, receivedSamples: results.length,
      missingSamples: benchmark.summary.missingSamples, blockedCases: benchmark.summary.blockedCases,
      missingAnnotations: results.filter(row => row.annotationStatus === 'missing').length,
      incompleteAnnotations: results.filter(row => row.annotationStatus === 'incomplete').length,
      completeAnnotations: results.filter(row => row.annotationStatus === 'complete').length,
      declaredMeetsLocalChecks: results.filter(row => row.declaredDecision === 'meets-local-checks').length,
      declaredDoesNotMeetLocalChecks: results.filter(row => row.declaredDecision === 'does-not-meet-local-checks').length,
      preparedDiagnosticsComplete: benchmark.summary.preparedChecksComplete &&
        results.every(row => row.declaredDecision === 'meets-local-checks'),
    },
    unavailableProducts: benchmark.unavailableProducts,
    products: benchmark.products.map(product => ({ ...product,
      completeAnnotations: results.filter(row => row.annotationStatus === 'complete' &&
        benchmark.cases.some(item => item.caseId === row.caseId && item.productId === product.productId)).length,
    })), results,
  };
}
