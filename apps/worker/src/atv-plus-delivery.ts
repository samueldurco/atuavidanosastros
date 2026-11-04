import { artifactUuid, type WorkflowInput } from "@atv/domain";
import { createSolarReturnCalculators } from "./solar-return-calculators.ts";
import type { ProductCalculator } from "./product-processing.ts";

export type AtvPlusRpc = (
  name: "atv_plus_dispatch_due" | "atv_plus_delivery_step",
  args: Record<string, unknown>,
  signal: AbortSignal,
) => Promise<unknown>;
export interface AtvPlusClaim {
  state: "PROCESSING";
  deliveryId: string;
  ownerId: string;
  profileId: string;
  kind: string;
  workflowProductId: string;
  periodStart: string;
  periodEnd: string;
  referenceYear: number | null;
  nextSolarReturnAfter: string | null;
  solarReturnLocation: unknown;
  idempotencyKey: string;
}
export interface AtvPlusDeliveryRuntime {
  rpc: AtvPlusRpc;
  /** Must create/request the existing product pipeline using deliveryId as request_key,
   * and persist a PDF through persistRenderedProductArtifact. Never approves content here. */
  approvedPdf: (
    claim: AtvPlusClaim,
    signal: AbortSignal,
  ) => Promise<{ artifactId: string }>;
  /** Implement only with an approved WhatsApp document adapter. Acceptance is not delivery. */
  whatsappDocument: (
    input: {
      recipient: string;
      bodyBase64: string;
      sha256: string;
      idempotencyKey: string;
    },
    signal: AbortSignal,
  ) => Promise<{ messageId: string }>;
}
const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const instant = (value: unknown): value is string =>
  typeof value === "string" && Number.isFinite(Date.parse(value));

/** Uses the existing deterministic solar-return calculator. A civil birthday is only
 * a search reference: the first calculated instant strictly after intake wins.
 * Experimental calculations retain their status and cannot pass SQL release gates. */
export async function selectAtvPlusNextSolarReturn(
  base: Pick<WorkflowInput, "birth" | "returnLocation" | "consent">,
  after: string,
  referenceYear: number,
  context: { deliveryId: string; signal: AbortSignal },
  calculate: ProductCalculator = createSolarReturnCalculators()[
    "solar-return"
  ]!,
) {
  if (
    !base.birth ||
    !base.returnLocation ||
    !instant(after) ||
    !artifactUuid(context.deliveryId) ||
    !Number.isInteger(referenceYear) ||
    referenceYear < 1901 ||
    referenceYear > 2099
  )
    throw new Error("next_solar_return_invalid");
  const month = Number(base.birth.localDateTime.slice(5, 7)),
    day = Number(base.birth.localDateTime.slice(8, 10));
  for (const year of [
    referenceYear - 1,
    referenceYear,
    referenceYear + 1,
  ].filter((year) => year >= 1901 && year <= 2099)) {
    context.signal.throwIfAborted();
    const targetDate = `${year}-${String(month).padStart(2, "0")}-${String(Math.min(day, new Date(Date.UTC(year, month, 0)).getUTCDate())).padStart(2, "0")}`;
    const input: WorkflowInput = {
      ...base,
      version: "atv-workflow/1.0.0",
      productId: "solar-return",
      targetDate,
      returnYear: year,
    };
    const calculation = await calculate(input, {
      runId: context.deliveryId,
      signal: context.signal,
    });
    if (
      !object(calculation) ||
      !object(calculation.data) ||
      !instant(calculation.data.returnInstant)
    )
      throw new Error("next_solar_return_invalid");
    if (Date.parse(calculation.data.returnInstant) > Date.parse(after)) {
      if (
        Date.parse(calculation.data.returnInstant) - Date.parse(after) >
        370 * 86400000
      )
        throw new Error("next_solar_return_invalid");
      return { input, calculation };
    }
  }
  throw new Error("next_solar_return_unavailable");
}

/** One bounded job, with safe retry before sending and reconciliation after an
 * uncertain send. Contains no credentials, provider URLs, PII logs or live defaults. */
export async function processAtvPlusDelivery(
  deliveryId: string,
  runtime: AtvPlusDeliveryRuntime,
  options: { timeoutMs?: number } = {},
): Promise<"sent" | "duplicate" | "retry" | "reconcile" | "unavailable"> {
  const timeoutMs = options.timeoutMs ?? 25000;
  if (
    !artifactUuid(deliveryId) ||
    !Number.isInteger(timeoutMs) ||
    timeoutMs < 1 ||
    timeoutMs > 25000
  )
    throw new Error("delivery_input_invalid");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const signal = controller.signal;
  const call = (action: string, args: Record<string, unknown> = {}) =>
    runtime.rpc(
      "atv_plus_delivery_step",
      {
        p_delivery_id: deliveryId,
        p_action: action,
        ...args,
      },
      signal,
    );
  let claimed = false,
    sending = false;
  try {
    const task = async () => {
      const value = await call("CLAIM");
      if (object(value) && value.state === "DELIVERED")
        return "duplicate" as const;
      if (object(value) && value.state === "SENT") return "sent" as const;
      if (object(value) && value.state === "SENDING")
        return "reconcile" as const;
      if (
        !object(value) ||
        value.state !== "PROCESSING" ||
        value.deliveryId !== deliveryId ||
        !artifactUuid(value.ownerId) ||
        !artifactUuid(value.profileId) ||
        typeof value.kind !== "string" ||
        typeof value.workflowProductId !== "string" ||
        !instant(value.periodStart) ||
        !instant(value.periodEnd) ||
        value.idempotencyKey !== `atv-plus:${deliveryId}`
      )
        throw new Error("delivery_claim_invalid");
      claimed = true;
      signal.throwIfAborted();
      const artifact = await runtime.approvedPdf(
        value as unknown as AtvPlusClaim,
        signal,
      );
      signal.throwIfAborted();
      if (!artifactUuid(artifact.artifactId))
        throw new Error("approved_pdf_required");
      const attached = await call("ATTACH", {
        p_artifact_id: artifact.artifactId,
      });
      if (object(attached) && attached.state === "DUPLICATE")
        return "duplicate" as const;
      if (!object(attached) || attached.state !== "READY")
        throw new Error("approved_pdf_required");
      signal.throwIfAborted();
      // Even a lost BEGIN_SEND response is uncertain: the database may have committed.
      sending = true;
      const document = await call("BEGIN_SEND");
      if (
        !object(document) ||
        document.state !== "SENDING" ||
        typeof document.recipient !== "string" ||
        !/^\+[1-9][0-9]{7,14}$/.test(document.recipient) ||
        typeof document.bodyBase64 !== "string" ||
        !document.bodyBase64 ||
        typeof document.sha256 !== "string" ||
        !/^[0-9a-f]{64}$/.test(document.sha256) ||
        document.idempotencyKey !== `atv-plus:${deliveryId}`
      )
        throw new Error("delivery_document_invalid");
      signal.throwIfAborted();
      const accepted = await runtime.whatsappDocument(
        {
          recipient: document.recipient,
          bodyBase64: document.bodyBase64,
          sha256: document.sha256,
          idempotencyKey: String(document.idempotencyKey),
        },
        signal,
      );
      signal.throwIfAborted();
      if (!accepted.messageId || accepted.messageId.length > 255)
        throw new Error("delivery_acceptance_invalid");
      const receipt = await call("ACCEPTED", {
        p_provider_message_id: accepted.messageId,
      });
      if (!object(receipt) || receipt.state !== "SENT")
        throw new Error("delivery_acceptance_invalid");
      return "sent" as const;
    };
    return await Promise.race([
      task(),
      new Promise<never>((_, reject) => {
        signal.addEventListener(
          "abort",
          () => reject(new Error("delivery_deadline_exceeded")),
          { once: true },
        );
      }),
    ]);
  } catch {
    // Use a separate bounded signal to record the outcome after the job deadline.
    if (claimed) {
      const recovery = AbortSignal.timeout(2000);
      try {
        await Promise.race([
          runtime.rpc(
            "atv_plus_delivery_step",
            {
              p_delivery_id: deliveryId,
              p_action: sending ? "UNCERTAIN" : "FAIL",
            },
            recovery,
          ),
          new Promise<never>((_, reject) =>
            recovery.addEventListener(
              "abort",
              () => reject(new Error("delivery_recovery_deadline")),
              { once: true },
            ),
          ),
        ]);
      } catch {
        /* Database gates remain authoritative. */
      }
    }
    return sending ? "reconcile" : claimed ? "retry" : "unavailable";
  } finally {
    clearTimeout(timer);
  }
}

export async function dispatchAtvPlusDue(
  rpc: AtvPlusRpc,
  signal: AbortSignal,
): Promise<number> {
  const value = await rpc("atv_plus_dispatch_due", {}, signal);
  if (
    !object(value) ||
    !Number.isInteger(value.queued) ||
    Number(value.queued) < 0 ||
    Number(value.queued) > 100
  )
    throw new Error("delivery_dispatch_unavailable");
  return Number(value.queued);
}
