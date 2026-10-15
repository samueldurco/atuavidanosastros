import { type FactsEnvelope } from "@atv/ai";
import { parseWorkflowInput, type BirthInput, type CalculationSnapshot,
  type WorkflowInput } from "@atv/domain";
import { CAREER_COMPASS_BIRTH_BINDING_VERSION, careerCompassBirthBinding,
  validCareerCompassProjection } from "./purpose-calculators.ts";
import { createCareerCompassFullBasisCalculator } from "./career-compass-full-basis.ts";
import { prepareCareerCompassFullFacts } from "./career-compass-full-editorial.ts";
import { prepareCareerCompassFullDelivery } from "./career-compass-full-delivery.ts";
import { evaluateCareerCompassFullDraft } from "./product-editorial.ts";

export const CAREER_COMPASS_FULL_CANDIDATE_VERSION =
  "atv-career-compass-full-candidate/1.0.1";

type RpcName = "select_next_career_compass_full_candidate" |
  "save_career_compass_full_candidate" | "read_career_compass_full_candidate";
export type CareerCompassFullCandidateRpc = (
  name: RpcName, args: Record<string, unknown>, signal: AbortSignal,
) => Promise<unknown>;
type Producer = (facts: FactsEnvelope, signal: AbortSignal) => Promise<unknown>;
type Calculator = ReturnType<typeof createCareerCompassFullBasisCalculator>;
type Claim = { runId: string; revision: number; contractVersion: string;
  workflowInput: Record<string, unknown>; sourceCalculation: Record<string, unknown>;
  candidateVersion: typeof CAREER_COMPASS_FULL_CANDIDATE_VERSION };
type Blocked = { version: typeof CAREER_COMPASS_FULL_CANDIDATE_VERSION;
  status: "blocked"; publication: "blocked"; reason: string };
type Prepared = { version: typeof CAREER_COMPASS_FULL_CANDIDATE_VERSION;
  status: "prepared_for_review"; publication: "blocked";
  reason: "delivery_review_and_promotion_required";
  fullCalculation: CalculationSnapshot; output: unknown;
  assessment: { status: "needs_editorial_review"; publication: "blocked";
    reason: string; basisDigest: string; outputDigest: string };
  delivery: Extract<Awaited<ReturnType<typeof prepareCareerCompassFullDelivery>>,
    { status: "prepared_for_review" }> };
type Candidate = Blocked | Prepared;
type Outcome = "idle" | "blocked" | "prepared_for_review" | "unavailable";

const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const uuid = (value: unknown): value is string => typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const digest = (value: unknown): value is string =>
  typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const canonical = (value: unknown): string => JSON.stringify(value, (_key, part: unknown) =>
  record(part) ? Object.fromEntries(Object.entries(part).sort(([a], [b]) =>
    a.localeCompare(b))) : part);
const blocked = (reason: string): Blocked => ({
  version: CAREER_COMPASS_FULL_CANDIDATE_VERSION,
  status: "blocked", publication: "blocked", reason,
});

function claimFromRpc(value: unknown): Claim | null {
  if (value === null) return null;
  if (!record(value) || !uuid(value.runId) ||
      !Number.isInteger(value.revision) || Number(value.revision) < 1 ||
      Number(value.revision) > 8 ||
      typeof value.contractVersion !== "string" ||
      value.contractVersion.length < 1 || value.contractVersion.length > 100 ||
      !record(value.workflowInput) || !record(value.sourceCalculation) ||
      value.candidateVersion !== CAREER_COMPASS_FULL_CANDIDATE_VERSION)
    throw new Error("invalid_full_candidate_claim");
  return value as Claim;
}

type CareerInput = WorkflowInput & { birth: BirthInput };

async function sourceProjectionIssue(claim: Claim, workflowInput: CareerInput): Promise<string | null> {
  let sourceValid = false;
  try { sourceValid = validCareerCompassProjection(
    claim.sourceCalculation as unknown as CalculationSnapshot); }
  catch { /* A malformed persisted snapshot fails closed. */ }
  if (!sourceValid) return "source_calculation_invalid";
  const sourceCalculation = claim.sourceCalculation as unknown as CalculationSnapshot;
  const sourceBinding = sourceCalculation.data.birthBinding;
  if (!record(sourceBinding) ||
      sourceBinding.version !== CAREER_COMPASS_BIRTH_BINDING_VERSION ||
      sourceBinding.sha256 !== await careerCompassBirthBinding(workflowInput.birth, claim.runId))
    return "source_birth_or_engine_mismatch";
  const reportedContext = sourceCalculation.facts.filter(fact =>
    fact.id === "personal-context");
  if (workflowInput.context
    ? reportedContext.length !== 1 ||
      reportedContext[0]?.display !== workflowInput.context
    : reportedContext.length !== 0)
    return "source_context_mismatch";
  return null;
}

function sourceFullBasisIssue(claim: Claim, workflowInput: CareerInput,
  fullCalculation: CalculationSnapshot): string | null {
  const sourceCalculation = claim.sourceCalculation as unknown as CalculationSnapshot;
  const sourceAngles = sourceCalculation.data.angles;
  const basisAngles = fullCalculation.data.angles;
  const sourceProvenance = sourceCalculation.data.provenance;
  const basisProvenance = fullCalculation.data.provenance;
  if (!record(sourceAngles) || !record(basisAngles) ||
      !record(sourceProvenance) || !record(basisProvenance) ||
      !record(sourceProvenance.temporal) || !record(basisProvenance.temporal) ||
      sourceProvenance.temporal.utcInstant !==
        new Date(workflowInput.birth.utcInstant).toISOString() ||
      canonical(sourceProvenance.temporal) !== canonical(basisProvenance.temporal) ||
      sourceAngles.midheaven !== basisAngles.midheaven ||
      sourceProvenance.provider !== basisProvenance.provider ||
      sourceProvenance.providerVersion !== basisProvenance.providerVersion ||
      sourceProvenance.algorithmVersion !== basisProvenance.algorithmVersion)
    return "source_birth_or_engine_mismatch";
  return null;
}

/** Builds only a private candidate. Producer failures remain retryable. */
export async function prepareCareerCompassFullCandidate(
  claim: Claim, produce: Producer, signal: AbortSignal,
  calculate: Calculator = createCareerCompassFullBasisCalculator(),
): Promise<Candidate> {
  const workflowInput = parseWorkflowInput(claim.workflowInput);
  if (!workflowInput?.birth || workflowInput.productId !== "career-compass")
    return blocked("workflow_input_invalid");
  const sourceIssue = await sourceProjectionIssue(claim, workflowInput as CareerInput);
  if (sourceIssue) return blocked(sourceIssue);
  signal.throwIfAborted();
  const fullBasis = await calculate(workflowInput, { runId: claim.runId, signal });
  signal.throwIfAborted();
  const prepared = prepareCareerCompassFullFacts(workflowInput, fullBasis);
  if (prepared.status !== "prepared_for_review") return blocked(prepared.reason);
  const fullCalculation = prepared.calculation;
  const fullBasisIssue = sourceFullBasisIssue(claim, workflowInput as CareerInput, fullCalculation);
  if (fullBasisIssue) return blocked(fullBasisIssue);
  const output = await produce(prepared.facts, signal);
  signal.throwIfAborted();
  const draft = { runId: claim.runId, revision: claim.revision,
    productId: "career-compass", tier: "premium" as const,
    workflowInput, calculation: fullCalculation, output };
  const delivery = await prepareCareerCompassFullDelivery(draft);
  if (delivery.status !== "prepared_for_review") return blocked(delivery.reason);
  const assessment = await evaluateCareerCompassFullDraft(draft);
  if (assessment.status !== "needs_editorial_review" ||
      !digest(assessment.basisDigest) || !digest(assessment.outputDigest) ||
      assessment.basisDigest !== delivery.basisDigest ||
      assessment.outputDigest !== delivery.outputDigest)
    return blocked("assessment_digest_mismatch");
  return {
    version: CAREER_COMPASS_FULL_CANDIDATE_VERSION,
    status: "prepared_for_review", publication: "blocked",
    reason: "delivery_review_and_promotion_required",
    fullCalculation, output,
    assessment: { status: "needs_editorial_review", publication: "blocked",
      reason: assessment.reason, basisDigest: assessment.basisDigest,
      outputDigest: assessment.outputDigest },
    delivery,
  };
}

function validReceipt(value: unknown, claim: Claim, candidate: Candidate): boolean {
  return record(value) && value.runId === claim.runId &&
    value.revision === claim.revision &&
    value.candidateVersion === claim.candidateVersion &&
    value.status === candidate.status && value.publication === "blocked" &&
    value.basisDigest === (candidate.status === "prepared_for_review"
      ? candidate.delivery.basisDigest : null) &&
    value.outputDigest === (candidate.status === "prepared_for_review"
      ? candidate.delivery.outputDigest : null) &&
    value.deliveryDigest === (candidate.status === "prepared_for_review"
      ? candidate.delivery.deliveryDigest : null);
}

/** Manual private E3/E4 step; not registered in the public worker runtime. */
export async function processNextCareerCompassFullCandidate(
  rpc: CareerCompassFullCandidateRpc, produce: Producer,
  options: { timeoutMs?: number; calculate?: Calculator } = {},
): Promise<Outcome> {
  if (typeof rpc !== "function" || typeof produce !== "function")
    throw new Error("invalid_full_candidate_configuration");
  const timeoutMs = options.timeoutMs ?? 60000;
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 120000)
    throw new Error("invalid_full_candidate_deadline");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const claim = claimFromRpc(await rpc("select_next_career_compass_full_candidate",
      { p_candidate_version: CAREER_COMPASS_FULL_CANDIDATE_VERSION }, controller.signal));
    controller.signal.throwIfAborted();
    if (!claim) return "idle";
    const candidate = await prepareCareerCompassFullCandidate(
      claim, produce, controller.signal, options.calculate);
    controller.signal.throwIfAborted();
    const receipt = await rpc("save_career_compass_full_candidate", {
      p_run_id: claim.runId, p_revision: claim.revision,
      p_contract_version: claim.contractVersion,
      p_workflow_input: claim.workflowInput,
      p_source_calculation: claim.sourceCalculation,
      p_candidate_version: claim.candidateVersion, p_candidate: candidate,
    }, controller.signal);
    controller.signal.throwIfAborted();
    if (!validReceipt(receipt, claim, candidate)) throw new Error("invalid_full_candidate_receipt");
    return candidate.status;
  } catch {
    // Do not leak the persisted context, provider text or RPC details.
    return "unavailable";
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}

/** Private JSON export revalidates all digests. Never returns a public snapshot. */
export async function readCareerCompassFullCandidate(
  rpc: CareerCompassFullCandidateRpc, runId: string, revision: number,
  signal: AbortSignal,
): Promise<Candidate | null> {
  if (!uuid(runId) || !Number.isInteger(revision) || revision < 1)
    throw new Error("invalid_full_candidate_identity");
  const row = await rpc("read_career_compass_full_candidate", {
    p_run_id: runId, p_revision: revision,
    p_candidate_version: CAREER_COMPASS_FULL_CANDIDATE_VERSION,
  }, signal);
  signal.throwIfAborted();
  if (row === null) return null;
  const claim = claimFromRpc(row);
  if (!claim || claim.runId !== runId || claim.revision !== revision ||
      !record(row) || !record(row.candidate))
    throw new Error("invalid_full_candidate_row");
  const candidate = row.candidate;
  if (candidate.version !== CAREER_COMPASS_FULL_CANDIDATE_VERSION ||
      candidate.publication !== "blocked" || candidate.status !== row.status)
    throw new Error("invalid_full_candidate_row");
  if (candidate.status === "blocked") {
    if (typeof candidate.reason !== "string" ||
        candidate.reason !== row.blockedReason ||
        row.basisDigest !== null || row.outputDigest !== null ||
        row.deliveryDigest !== null || "assessment" in candidate ||
        "output" in candidate || "delivery" in candidate ||
        "fullCalculation" in candidate)
      throw new Error("invalid_full_candidate_row");
    return candidate as Blocked;
  }
  if (candidate.status !== "prepared_for_review" ||
      !record(candidate.fullCalculation) || !record(candidate.output) ||
      !record(candidate.assessment) || !record(candidate.delivery))
    throw new Error("invalid_full_candidate_row");
  const workflowInput = parseWorkflowInput(claim.workflowInput);
  if (!workflowInput?.birth || workflowInput.productId !== "career-compass" ||
      await sourceProjectionIssue(claim, workflowInput as CareerInput) ||
      !record(candidate.fullCalculation.data) ||
      sourceFullBasisIssue(claim, workflowInput as CareerInput,
        candidate.fullCalculation as unknown as CalculationSnapshot))
    throw new Error("full_candidate_source_integrity_failed");
  const draft = { runId, revision, productId: "career-compass",
    tier: "premium" as const, workflowInput: claim.workflowInput,
    calculation: candidate.fullCalculation, output: candidate.output };
  const delivery = await prepareCareerCompassFullDelivery(draft);
  const assessment = await evaluateCareerCompassFullDraft(draft);
  if (delivery.status !== "prepared_for_review" ||
      assessment.status !== "needs_editorial_review" ||
      assessment.publication !== "blocked" ||
      canonical(candidate.assessment) !== canonical({
        status: assessment.status, publication: assessment.publication,
        reason: assessment.reason, basisDigest: assessment.basisDigest,
        outputDigest: assessment.outputDigest,
      }) ||
      candidate.reason !== "delivery_review_and_promotion_required" ||
      canonical(delivery) !== canonical(candidate.delivery) ||
      delivery.basisDigest !== row.basisDigest ||
      delivery.outputDigest !== row.outputDigest ||
      delivery.deliveryDigest !== row.deliveryDigest ||
      candidate.assessment.basisDigest !== row.basisDigest ||
      candidate.assessment.outputDigest !== row.outputDigest)
    throw new Error("full_candidate_integrity_failed");
  return candidate as Prepared;
}
