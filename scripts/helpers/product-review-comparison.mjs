import { dimensions } from '../../packages/ai/src/director.ts';
import { compareProductBenchmarks } from './product-benchmark-comparison.mjs';
import { evaluateProductReview } from './product-benchmark-review.mjs';

export const PRODUCT_REVIEW_COMPARISON_VERSION = 'atv-product-review-comparison/1.0.0';
const slot = row => `${row.caseId}:${row.repetition}`;
const index = rows => new Map(rows.map(row => [slot(row), row]));

/** Compare declarations, never reviewer authority, semantic quality or release eligibility. */
export function compareProductReviews(baselineCapture, baselineAnnotations, candidateCapture, candidateAnnotations, corpus) {
  // Reuse current-corpus validation and the cross-capture execution reuse guard.
  const mechanical = compareProductBenchmarks(baselineCapture, candidateCapture, corpus);
  const baseline = evaluateProductReview(baselineCapture, baselineAnnotations, corpus);
  const candidate = evaluateProductReview(candidateCapture, candidateAnnotations, corpus);
  const beforeResults = index(baseline.results), afterResults = index(candidate.results);
  const beforeAnnotations = index(baselineAnnotations.annotations), afterAnnotations = index(candidateAnnotations.annotations);
  const cases = new Map(corpus.cases.map(item => [item.id, item]));
  const rows = mechanical.rows.map(row => {
    const key = slot(row), before = beforeResults.get(key), after = afterResults.get(key);
    // Partial declarations do not supply comparable scores, even when some fields have values.
    const beforeComplete = before?.annotationStatus === 'complete';
    const afterComplete = after?.annotationStatus === 'complete';
    const paired = beforeComplete && afterComplete;
    const left = beforeComplete ? beforeAnnotations.get(key) : null;
    const right = afterComplete ? afterAnnotations.get(key) : null;
    const scores = Object.fromEntries(dimensions.map(dimension => {
      const b = left?.dimensions[dimension].score ?? null, c = right?.dimensions[dimension].score ?? null;
      return [dimension, { baseline: b, candidate: c, delta: paired ? c - b : null }];
    }));
    const criteria = cases.get(row.caseId).criteria.map((_, i) => ({ index: i,
      baseline: left?.criteria[i].verdict ?? null, candidate: right?.criteria[i].verdict ?? null }));
    return { caseId: row.caseId, productId: row.productId, repetition: row.repetition,
      coverage: row.coverage, baselineDigest: row.baselineDigest, candidateDigest: row.candidateDigest,
      baselineAnnotation: before?.annotationStatus ?? 'sample-missing',
      candidateAnnotation: after?.annotationStatus ?? 'sample-missing',
      baselineDecision: before?.declaredDecision ?? 'not-assessed',
      candidateDecision: after?.declaredDecision ?? 'not-assessed',
      pairedCompleteDeclarations: paired,
      evidenceLost: beforeComplete && !afterComplete, evidenceRecovered: !beforeComplete && afterComplete,
      scores, criteria,
      declaredScoreDecreases: dimensions.filter(key => scores[key].delta !== null && scores[key].delta < 0),
      declaredScoreIncreases: dimensions.filter(key => scores[key].delta !== null && scores[key].delta > 0),
      declaredCriterionRegressions: paired ? criteria.filter(item => item.baseline === 'pass' && item.candidate === 'fail').map(item => item.index) : [],
      declaredCriterionImprovements: paired ? criteria.filter(item => item.baseline === 'fail' && item.candidate === 'pass').map(item => item.index) : [],
    };
  });
  const summarize = values => ({ expectedSlots: values.length,
    pairedCompleteDeclarations: values.filter(row => row.pairedCompleteDeclarations).length,
    evidenceLostSlots: values.filter(row => row.evidenceLost).length,
    evidenceRecoveredSlots: values.filter(row => row.evidenceRecovered).length,
    declaredScoreDecreaseSlots: values.filter(row => row.declaredScoreDecreases.length).length,
    declaredScoreIncreaseSlots: values.filter(row => row.declaredScoreIncreases.length).length,
    declaredCriterionRegressionSlots: values.filter(row => row.declaredCriterionRegressions.length).length,
    declaredCriterionImprovementSlots: values.filter(row => row.declaredCriterionImprovements.length).length,
  });
  return { version: PRODUCT_REVIEW_COMPARISON_VERSION, status: 'diagnostic-only',
    provenance: 'declared-not-authenticated', editorialReview: 'not-authenticated', trustedReviews: 0,
    promotionEligible: false, publication: 'blocked',
    baseline: { binding: baseline.binding, summary: baseline.summary },
    candidate: { binding: candidate.binding, summary: candidate.summary },
    summary: { ...summarize(rows), preparedDiagnosticsComplete:
      baseline.summary.preparedDiagnosticsComplete && candidate.summary.preparedDiagnosticsComplete },
    mechanical, products: mechanical.products.map(item => ({ productId: item.productId,
      ...summarize(rows.filter(row => row.productId === item.productId)) })), rows,
  };
}
