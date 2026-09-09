import {
  PROMPT_VERSION,
  SCHEMA_VERSION,
  tierLimits,
  validateFacts,
  hasInterpretiveBasis,
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
  thoughtTokens?: number | null;
  resolvedModel?: string | null;
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
    maxTokens?: number,
  ): Promise<boolean>;
}
/** Process-local laboratory ledger. Not safe as a distributed production quota store. */
export class LabBudgetLedger implements BudgetLedger {
  private windows = new Map<string, { calls: number; tokens: number }>();
  async reserve(window: string, maxCalls: number, reservedTokens = 0, maxTokens = 200_000): Promise<boolean> {
    if (![maxCalls, reservedTokens, maxTokens].every((n) => Number.isSafeInteger(n) && n >= 0)) return false;
    const used = this.windows.get(window) ?? { calls: 0, tokens: 0 };
    if (used.calls >= maxCalls || used.tokens + reservedTokens > maxTokens) return false;
    this.windows.set(window, { calls: used.calls + 1, tokens: used.tokens + reservedTokens });
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
  resolvedModel: string | null;
  thoughtTokens: number | null;
  totalDurationMs: number;
  costBrl: 0;
}
export interface GatewayConfig {
  enabled?: boolean;
  mode?: "lab" | "production";
  freeTierConfirmed?: boolean;
  providers: readonly EditorialProvider[];
  ledger: BudgetLedger;
  maxCallsPerDay?: number;
  maxReservedTokensPerDay?: number;
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
    if (!hasInterpretiveBasis(input.facts))
      return unavailable("insufficient_facts");
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
    const startedAt = performance.now();
    const timeoutMs =
      this.config.timeoutMs ?? tierLimits[request.tier].timeoutMs;
    const maxCalls = this.config.maxCallsPerDay ?? 20;
    const maxTokens = this.config.maxReservedTokensPerDay ?? 200_000;
    if (
      !Number.isInteger(maxCalls) ||
      maxCalls < 1 ||
      maxCalls > 100 ||
      !Number.isFinite(timeoutMs) ||
      timeoutMs <= 0 ||
      timeoutMs > tierLimits[request.tier].timeoutMs ||
      !Number.isSafeInteger(maxTokens) || maxTokens < 1 || maxTokens > 2_000_000
    )
      return unavailable("invalid_limits");
    // At most two attempts; fallback is only for transport failure, never poor editorial quality.
    for (const [attempt, provider] of this.config.providers
      .slice(0, 2)
      .entries()) {
      let remainingMs = timeoutMs - (performance.now() - startedAt);
      if (remainingMs <= 0) return unavailable("timeout");
      if (
        !/^[a-z0-9._-]{1,80}$/.test(provider.id) ||
        !/^[a-z0-9._-]{1,80}$/.test(provider.model) ||
        /latest|preview/i.test(provider.model)
      )
        return unavailable("model_not_pinned");
      if (provider.kind === "remote" && !this.config.freeTierConfirmed)
        return unavailable("free_tier_unconfirmed");
      let reserved: boolean;
      let quotaTimer: ReturnType<typeof setTimeout> | undefined;
      try {
        reserved = await Promise.race([this.config.ledger.reserve(
          new Date().toISOString().slice(0, 10),
          maxCalls,
          // UTF-8 bytes conservatively upper-bound text tokens; include system instructions.
          new TextEncoder().encode(payload.system + payload.prompt).length + payload.maxOutputTokens,
          maxTokens,
        ), new Promise<false>((resolve) => { quotaTimer = setTimeout(() => resolve(false), remainingMs); })]);
      } catch {
        return unavailable("quota_unavailable");
      } finally { if (quotaTimer !== undefined) clearTimeout(quotaTimer); }
      remainingMs = timeoutMs - (performance.now() - startedAt);
      if (remainingMs <= 0) return unavailable("timeout");
      if (!reserved) return unavailable("quota_exhausted");
      const controller = new AbortController();
      const start = performance.now();
      let timer: ReturnType<typeof setTimeout> | undefined;
      let eventStatus = "unavailable";
      let resolvedModel: string | null = null;
      let thoughtTokens: number | null = null;
      let usage: Pick<ProviderOutput, "inputTokens" | "outputTokens"> = {
        inputTokens: null,
        outputTokens: null,
      };
      try {
        const timeout = new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            controller.abort();
            reject(new ProviderFailure("timeout"));
          }, remainingMs);
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
        resolvedModel = typeof response.resolvedModel === "string" && /^[a-z0-9._-]{1,100}$/.test(response.resolvedModel) ? response.resolvedModel : null;
        thoughtTokens = response.thoughtTokens ?? null;
        if (thoughtTokens !== null && (!Number.isSafeInteger(thoughtTokens) || thoughtTokens < 0))
          throw new ProviderFailure("invalid_response");
        if (
          response.outputTokens !== null &&
          response.outputTokens + (thoughtTokens ?? 0) > payload.maxOutputTokens
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
        if (eventStatus === "invalid_response" || eventStatus === "timeout") return unavailable(eventStatus);
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
            totalDurationMs: Math.round(performance.now() - startedAt),
            resolvedModel, thoughtTokens, costBrl: 0,
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
