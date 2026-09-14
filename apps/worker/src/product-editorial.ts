import { workflowFor, type CalculationSnapshot, type WorkflowKind } from '@atv/domain';
import { CONSTITUTION_VERSION, PROMPT_VERSION, SCHEMA_VERSION, RUBRIC_VERSION, tierLimits,
  validateFacts, hasInterpretiveBasis, parseReading, inspectReading, editorialDecision, revisionStrategy,
  type Capability, type FactsEnvelope, type Tier, type ScoredReview, type Finding } from '@atv/ai';
import { validateCalculation } from './product-processing.ts';

export const PRODUCT_EDITORIAL_VERSION = 'atv-product-editorial-evidence/1.0.0';
const capability: Record<WorkflowKind, Capability> = {
  natal: 'natal-synthesis', cycles: 'cycle-context', relationship: 'relationship-dynamics',
  tarot: 'tarot-reflection', purpose: 'purpose-direction', dream: 'dream-exploration'
};
type Preparation = { status: 'prepared'; calculation: CalculationSnapshot; facts: FactsEnvelope } |
  { status: 'blocked'; reason: 'calculation_invalid' | 'facts_not_representable' | 'insufficient_facts' };

/** Trusted persisted calculation only. No raw input, history, inference, truncation or re-draw.
 * Partial is deliberate: today's experimental/recorded snapshots have no approved complete scope. */
export function prepareProductFacts(productId: string, value: unknown): Preparation {
  const calculation = validateCalculation(value, productId);
  const kind = workflowFor(productId)?.kind;
  if (!calculation || !kind) return { status: 'blocked', reason: 'calculation_invalid' };
  const facts: FactsEnvelope = { version: 'atv-facts/1.0.0', capability: capability[kind],
    completeness: 'partial', facts: structuredClone(calculation.facts) };
  // The Lab has tighter limits than storage. Never silently omit, split or relabel evidence.
  if (!validateFacts(facts)) return { status: 'blocked', reason: 'facts_not_representable' };
  if (!hasInterpretiveBasis(facts)) return { status: 'blocked', reason: 'insufficient_facts' };
  return { status: 'prepared', calculation, facts };
}

export interface ProductDraft {
  runId: string; revision: number; productId: string; tier: Tier;
  calculation: unknown; output: unknown;
}
export interface BoundProductReview { basisDigest: string; review: ScoredReview }
/** Server-owned identity allowlists, NOT client claims. Authentication lives at the calling boundary. */
export interface ProductReviewAuthority { reviewers: readonly string[]; calibrations: readonly string[] }
export interface ProductDraftAssessment {
  version: typeof PRODUCT_EDITORIAL_VERSION;
  status: 'rejected' | 'needs_editorial_review' | 'reviewed_candidate';
  publication: 'blocked';
  reason: string;
  basisDigest: string | null;
  outputDigest: string | null;
  findings: Finding[];
  strategy: ReturnType<typeof revisionStrategy>;
}

// Only validated JSON enters here. Sorting makes provenance object key order irrelevant;
// arrays, numeric values, limits, fact order and text remain significant.
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') return `{${Object.keys(value).sort()
    .map((key) => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
async function digest(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Offline Director bridge. Never calls a model, writes a run, creates a promotion or returns READY.
 * A digest is an integrity binding, not a signature/authentication mechanism. */
export async function evaluateProductDraft(input: ProductDraft, bound?: BoundProductReview,
  authority: ProductReviewAuthority = { reviewers: [], calibrations: [] }): Promise<ProductDraftAssessment> {
  const result: ProductDraftAssessment = { version: PRODUCT_EDITORIAL_VERSION, status: 'rejected',
    publication: 'blocked', reason: 'invalid_input', basisDigest: null, outputDigest: null,
    findings: [], strategy: 'none' };
  if (!input || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.runId) ||
      !Number.isSafeInteger(input.revision) || input.revision < 0 || !tierLimits[input.tier]) return result;
  const prepared = prepareProductFacts(input.productId, input.calculation);
  if (prepared.status === 'blocked') return { ...result, reason: prepared.reason };
  const reading = parseReading(input.output, input.tier);
  if (!reading) return { ...result, reason: 'invalid_schema', findings: [{code:'invalid_schema',location:'root'}] };
  const mechanical = inspectReading(reading, prepared.facts);
  // Capture all caller-owned fields before the first await; no mutable request can change this basis.
  const tier = input.tier;
  const review = bound ? structuredClone(bound) : undefined;
  const trusted = structuredClone(authority);
  const outputJson = JSON.stringify(reading);
  const basisJson = canonical({ version: PRODUCT_EDITORIAL_VERSION, runId: input.runId.toLowerCase(),
    revision: input.revision, productId: input.productId, tier,
    versions: { constitution: CONSTITUTION_VERSION, prompt: PROMPT_VERSION, schema: SCHEMA_VERSION, rubric: RUBRIC_VERSION },
    calculation: prepared.calculation, facts: prepared.facts, reading });
  const [basisDigest, outputDigest] = await Promise.all([digest(basisJson), digest(outputJson)]);
  const assessed = { ...result, basisDigest, outputDigest, findings: mechanical.findings,
    strategy: revisionStrategy(mechanical.findings) };
  if (mechanical.status === 'rejected') return { ...assessed, reason: 'mechanical_rejected' };
  const pending = { ...assessed, status: 'needs_editorial_review' as const };
  if (!review) return { ...pending, reason: 'review_required' };
  if (review.basisDigest !== basisDigest) return { ...pending, reason: 'review_basis_mismatch' };
  if (!review.review || !trusted.reviewers.includes(review.review.reviewer) ||
      (review.review.source === 'calibrated-reviewer' && !trusted.calibrations.includes(review.review.calibrationId ?? '')))
    return { ...pending, reason: 'reviewer_not_authorized' };
  if (!review.review.scores || typeof review.review.scores !== 'object' ||
      !review.review.evidence || typeof review.review.evidence !== 'object' ||
      Object.values(review.review.evidence).some((value) => typeof value !== 'string'))
    return { ...pending, reason: 'invalid_review' };
  const decision = editorialDecision(mechanical, review.review, outputDigest, tier);
  if (decision !== 'approved') return { ...assessed, status: decision, reason: 'editorial_review_not_approved' };
  return { ...assessed, status: 'reviewed_candidate', reason: 'promotion_required' };
}
