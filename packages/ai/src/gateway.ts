import {
  PROMPT_VERSION,
  SCHEMA_VERSION,
  tierLimits,
  validateFacts,
  type EditorialRequest,
  type Reading,
} from "./contracts.ts";
import { buildPrompt } from "./prompt.ts";
import { parseReading } from "./schema.ts";
import { inspectReading, type MechanicalReview } from "./director.ts";

export interface ProviderOutput {
  output: unknown;
  inputTokens: number | null;
  outputTokens: number | null;
}
export interface EditorialProvider {
  id: string;
  model: string;
  kind: "fixture" | "remote";
  generate(
    input: ReturnType<typeof buildPrompt>,
    signal: AbortSignal,
  ): Promise<ProviderOutput>;
}
export class ProviderFailure extends Error {
  readonly code: "unavailable" | "rate_limit" | "timeout" | "invalid_response";
  constructor(code: ProviderFailure["code"]) {
    super(code);
    this.code = code;
  }
}
export interface BudgetLedger {
  /** Must atomically reserve before external calls; never refund attempts after timeout. */
  reserve(
    window: string,
    maxCalls: number,
    reservedTokens: number,
  ): Promise<boolean>;
}
/** Process-local laboratory ledger. Not safe as a distributed production quota store. */
export class LabBudgetLedger implements BudgetLedger {
  private windows = new Map<string, number>();
  async reserve(window: string, maxCalls: number): Promise<boolean> {
    const used = this.windows.get(window) ?? 0;
    if (used >= maxCalls) return false;
    this.windows.set(window, used + 1);
    return true;
  }
}
export interface GatewayEvent {
  correlationId: string;
  capability: string;
  provider: string;
  model: string;
  promptVersion: string;
  schemaVersion: string;
  status: string;
  attempt: number;
  durationMs: number;
  inputTokens: number | null;
  outputTokens: number | null;
}
export interface GatewayConfig {
  enabled?: boolean;
  mode?: "lab" | "production";
  freeTierConfirmed?: boolean;
  providers: readonly EditorialProvider[];
  ledger: BudgetLedger;
  maxCallsPerDay?: number;
  timeoutMs?: number;
  observe?: (event: GatewayEvent) => void;
}
export type GatewayResult =
  | { status: "unavailable"; reason: string }
  | {
      status: "candidate";
      reading: Reading;
      review: MechanicalReview;
      model: string;
      degraded: boolean;
    };

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

export class EditorialGateway {
  private readonly config: GatewayConfig;
  constructor(config: GatewayConfig) {
    this.config = config;
  }
  async generate(input: EditorialRequest): Promise<GatewayResult> {
    const unavailable = (reason: string): GatewayResult => ({
      status: "unavailable",
      reason,
    });
    if (!this.config.enabled) return unavailable("disabled");
    // No model is promoted yet. Neither feature flags nor successful schema checks bypass this gate.
    if (this.config.mode !== "lab") return unavailable("promotion_required");
    if (
      !input ||
      !tierLimits[input.tier] ||
      !validateFacts(input.facts) ||
      !/^[a-zA-Z0-9_-]{1,80}$/.test(input.correlationId)
    )
      return unavailable("invalid_input");
    if (
      !["synthetic", "personal"].includes(input.dataClass) ||
      !input.consentToProcess
    )
      return unavailable("consent_required");
    if (input.dataClass !== "synthetic")
      return unavailable("personal_data_not_approved");
    if (
      input.context !== undefined &&
      (typeof input.context !== "string" || input.context.length > 1200)
    )
      return unavailable("input_limit");
    let request: EditorialRequest;
    try {
      // Select fields, do not copy arbitrary request properties into a provider payload.
      request = deepFreeze(
        JSON.parse(
          JSON.stringify({
            correlationId: input.correlationId,
            tier: input.tier,
            dataClass: input.dataClass,
            consentToProcess: input.consentToProcess,
            facts: {
              version: input.facts.version,
              capability: input.facts.capability,
              completeness: input.facts.completeness,
              facts: input.facts.facts.map((f) => ({
                id: f.id,
                kind: f.kind,
                display: f.display,
                source: f.source,
              })),
            },
            ...(input.context ? { context: input.context } : {}),
          }),
        ),
      );
    } catch {
      return unavailable("invalid_input");
    }
    const payload = deepFreeze(buildPrompt(request));
    if (payload.prompt.length > tierLimits[request.tier].maxInputChars)
      return unavailable("input_limit");
    const timeoutMs =
      this.config.timeoutMs ?? tierLimits[request.tier].timeoutMs;
    const maxCalls = this.config.maxCallsPerDay ?? 20;
    if (
      !Number.isInteger(maxCalls) ||
      maxCalls < 1 ||
      maxCalls > 100 ||
      !Number.isFinite(timeoutMs) ||
      timeoutMs <= 0 ||
      timeoutMs > 45000
    )
      return unavailable("invalid_limits");
    // At most two attempts; fallback is only for transport failure, never poor editorial quality.
    for (const [attempt, provider] of this.config.providers
      .slice(0, 2)
      .entries()) {
      if (
        !/^[a-z0-9._-]{1,80}$/.test(provider.model) ||
        /latest|preview/i.test(provider.model)
      )
        return unavailable("model_not_pinned");
      if (provider.kind === "remote" && !this.config.freeTierConfirmed)
        return unavailable("free_tier_unconfirmed");
      let reserved: boolean;
      try {
        reserved = await this.config.ledger.reserve(
          new Date().toISOString().slice(0, 10),
          maxCalls,
          payload.maxOutputTokens,
        );
      } catch {
        return unavailable("quota_unavailable");
      }
      if (!reserved) return unavailable("quota_exhausted");
      const controller = new AbortController();
      const start = performance.now();
      let timer: ReturnType<typeof setTimeout> | undefined;
      let eventStatus = "unavailable";
      let usage: Pick<ProviderOutput, "inputTokens" | "outputTokens"> = {
        inputTokens: null,
        outputTokens: null,
      };
      try {
        const timeout = new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            controller.abort();
            reject(new ProviderFailure("timeout"));
          }, timeoutMs);
        });
        const response = await Promise.race([
          provider.generate(payload, controller.signal),
          timeout,
        ]);
        for (const tokens of [response.inputTokens, response.outputTokens])
          if (tokens !== null && (!Number.isInteger(tokens) || tokens < 0))
            throw new ProviderFailure("invalid_response");
        usage = {
          inputTokens: response.inputTokens,
          outputTokens: response.outputTokens,
        };
        if (
          response.outputTokens !== null &&
          response.outputTokens > payload.maxOutputTokens
        ) {
          eventStatus = "output_limit";
          return unavailable(eventStatus);
        }
        const reading = parseReading(response.output, request.tier);
        if (!reading) {
          eventStatus = "invalid_schema";
          return unavailable(eventStatus);
        }
        const review = inspectReading(reading, request.facts);
        if (review.status === "rejected") {
          eventStatus = "quality_rejected";
          return unavailable(eventStatus);
        }
        eventStatus = "candidate";
        return {
          status: "candidate",
          reading,
          review,
          model: provider.model,
          degraded: attempt > 0,
        };
      } catch (error) {
        eventStatus =
          error instanceof ProviderFailure ? error.code : "unavailable";
        if (eventStatus === "invalid_response") return unavailable(eventStatus);
      } finally {
        if (timer !== undefined) clearTimeout(timer);
        controller.abort();
        try {
          this.config.observe?.({
            correlationId: request.correlationId,
            capability: request.facts.capability,
            provider: provider.id,
            model: provider.model,
            promptVersion: PROMPT_VERSION,
            schemaVersion: SCHEMA_VERSION,
            status: eventStatus,
            attempt: attempt + 1,
            durationMs: Math.round(performance.now() - start),
            ...usage,
          });
        } catch {
          /* Telemetry must not change the domain outcome or leak content. */
        }
      }
    }
    return unavailable("providers_unavailable");
  }
}
