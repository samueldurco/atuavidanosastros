import { ProviderFailure, type EditorialProvider, type ProviderOutput } from "./gateway.ts";
import type { buildPrompt } from "./prompt.ts";

/** Server-only adapter. Construction does not enable a capability or authorize network spending. */
export class GeminiEditorialProvider implements EditorialProvider {
  readonly id = "google-gemini";
  readonly kind = "remote" as const;
  readonly model: string;
  private readonly credential: () => string;
  private readonly transport: typeof fetch;
  constructor(config: { model: string; credential: () => string; fetch?: typeof fetch }) {
    if (!/^[a-z0-9._-]{1,80}$/.test(config.model) || /latest|preview/i.test(config.model))
      throw new ProviderFailure("invalid_response");
    this.model = config.model;
    this.credential = config.credential;
    this.transport = config.fetch ?? fetch;
  }
  async generate(input: ReturnType<typeof buildPrompt>, signal: AbortSignal): Promise<ProviderOutput> {
    try {
      signal.throwIfAborted();
      const key = this.credential();
      if (!key) throw new ProviderFailure("unavailable");
      const response = await this.transport(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`, {
          method: "POST", signal, redirect: "error",
          headers: { "content-type": "application/json", "x-goog-api-key": key },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: input.system }] },
            contents: [{ role: "user", parts: [{ text: input.prompt }] }],
            generationConfig: { temperature: input.temperature, maxOutputTokens: input.maxOutputTokens,
              candidateCount: 1, responseMimeType: "application/json", responseJsonSchema: input.schema },
          }),
        });
      if (!response.ok) {
        await response.body?.cancel();
        throw new ProviderFailure(response.status === 429 ? "rate_limit" : response.status >= 500 ? "unavailable" : "invalid_response");
      }
      // Bound untrusted HTTP output before decoding; never log provider bodies or credentials.
      const reader = response.body?.getReader();
      if (!reader) throw new ProviderFailure("invalid_response");
      const chunks: Uint8Array[] = [];
      let size = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.length;
          if (size > 256_000) { await reader.cancel(); throw new ProviderFailure("invalid_response"); }
          chunks.push(value);
        }
      } finally { reader.releaseLock(); }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
      const body = JSON.parse(new TextDecoder().decode(bytes));
      const candidate = body.candidates?.[0];
      if (body.candidates?.length !== 1 || candidate?.finishReason !== "STOP" || !Array.isArray(candidate.content?.parts))
        throw new ProviderFailure("invalid_response");
      const parts = candidate.content.parts.filter((part: { thought?: boolean }) => !part.thought);
      if (!parts.length || parts.some((part: { text?: unknown }) => typeof part.text !== "string" || Object.keys(part).some((key) => key !== "text")))
        throw new ProviderFailure("invalid_response");
      const usage = body.usageMetadata;
      const tokens = (value: unknown): number | null => {
        if (value === undefined) return null;
        if (!Number.isSafeInteger(value) || (value as number) < 0) throw new ProviderFailure("invalid_response");
        return value as number;
      };
      const resolvedModel = typeof body.modelVersion === "string" && /^[a-z0-9._-]{1,100}$/.test(body.modelVersion) ? body.modelVersion : null;
      return {
        output: JSON.parse(parts.map((part: { text: string }) => part.text).join("")),
        inputTokens: tokens(usage?.promptTokenCount), outputTokens: tokens(usage?.candidatesTokenCount),
        thoughtTokens: tokens(usage?.thoughtsTokenCount), resolvedModel,
      };
    } catch (error) {
      if (signal.aborted) throw new ProviderFailure("timeout");
      if (error instanceof ProviderFailure) throw error;
      throw new ProviderFailure(error instanceof SyntaxError ? "invalid_response" : "unavailable");
    }
  }
}
