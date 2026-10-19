import {
  CAREER_COMPASS_CANDIDATE_VERSION,
  prepareCareerCompassCandidate,
} from "./career-compass-candidate.ts";

type CandidateRpcName =
  | "select_next_career_compass_candidate"
  | "save_career_compass_candidate";
export type CareerCompassCandidateRpc = (
  name: CandidateRpcName,
  args: Record<string, unknown>,
  signal: AbortSignal,
) => Promise<unknown>;

type Claim = {
  runId: string;
  revision: number;
  contractVersion: string;
  calculation: Record<string, unknown>;
  candidateVersion: string;
};
type Outcome = "idle" | "prepared_for_review" | "blocked" | "unavailable";
export type CareerCompassCandidateEvent = {
  event: "product.career_compass_candidate";
  outcome: Outcome;
  durationMs: number;
};

const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const uuid = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

function claimFromRpc(value: unknown): Claim | null {
  if (value === null) return null;
  if (
    !record(value) ||
    !uuid(value.runId) ||
    !Number.isInteger(value.revision) ||
    Number(value.revision) < 1 ||
    Number(value.revision) > 8 ||
    typeof value.contractVersion !== "string" ||
    value.contractVersion.length < 1 ||
    value.contractVersion.length > 100 ||
    !record(value.calculation) ||
    value.candidateVersion !== CAREER_COMPASS_CANDIDATE_VERSION
  ) throw new Error("invalid_candidate_claim");
  return {
    runId: value.runId,
    revision: Number(value.revision),
    contractVersion: value.contractVersion,
    calculation: value.calculation,
    candidateVersion: value.candidateVersion,
  };
}

function savedOutcome(
  value: unknown,
  claim: Claim,
  candidate: Awaited<ReturnType<typeof prepareCareerCompassCandidate>>,
): Outcome {
  const expected = candidate.status;
  if (
    !record(value) ||
    value.runId !== claim.runId ||
    value.revision !== claim.revision ||
    value.candidateVersion !== claim.candidateVersion ||
    value.status !== expected ||
    value.publication !== "blocked" ||
    (expected === "prepared_for_review" &&
      value.candidateDigest !== candidate.candidateDigest) ||
    (expected === "blocked" && value.candidateDigest !== null)
  ) throw new Error("invalid_candidate_receipt");
  return expected;
}

/** One private E3 step. The database fences run revision and calculation at save. */
export async function processNextCareerCompassCandidate(
  rpc: CareerCompassCandidateRpc,
  options: {
    timeoutMs?: number;
    emit?: (event: CareerCompassCandidateEvent) => void;
  } = {},
): Promise<Outcome> {
  const timeoutMs = options.timeoutMs ?? 20000;
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 25000)
    throw new Error("invalid_processing_deadline");
  if (typeof rpc !== "function" || (options.emit && typeof options.emit !== "function"))
    throw new Error("invalid_product_configuration");
  const started = performance.now();
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let outcome: Outcome = "unavailable";
  try {
    outcome = await Promise.race([
      (async () => {
        const claim = claimFromRpc(
          await rpc("select_next_career_compass_candidate", {
            p_candidate_version: CAREER_COMPASS_CANDIDATE_VERSION,
          }, controller.signal),
        );
        controller.signal.throwIfAborted();
        if (!claim) return "idle" as const;
        // This producer receives only the persisted calculation. It has no
        // owner profile or raw input with which to infer additional facts.
        const candidate = await prepareCareerCompassCandidate({
          runId: claim.runId,
          revision: claim.revision,
          tier: "free",
          calculation: claim.calculation,
        });
        controller.signal.throwIfAborted();
        const receipt = await rpc("save_career_compass_candidate", {
          p_run_id: claim.runId,
          p_revision: claim.revision,
          p_contract_version: claim.contractVersion,
          p_calculation: claim.calculation,
          p_candidate_version: claim.candidateVersion,
          p_candidate: candidate,
        }, controller.signal);
        controller.signal.throwIfAborted();
        return savedOutcome(receipt, claim, candidate);
      })(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new Error("candidate_deadline_exceeded"));
        }, timeoutMs);
      }),
    ]);
  } catch {
    // No raw RPC/provider errors, calculation or personal context in telemetry.
    // A missing row remains eligible for a later idempotent retry.
    outcome = "unavailable";
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
  try {
    options.emit?.({
      event: "product.career_compass_candidate",
      outcome,
      durationMs: Math.max(0, Math.round(performance.now() - started)),
    });
  } catch { /* Metrics never decide workflow state. */ }
  return outcome;
}
