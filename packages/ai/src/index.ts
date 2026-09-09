export interface AiRequest {
  promptVersion: string;
  schemaVersion: string;
  approvedFacts: Readonly<Record<string, unknown>>;
  purpose: "interpretation" | "summary" | "audio-script";
}
export interface AiResponse<T> {
  value: T;
  model: string;
  promptVersion: string;
  schemaVersion: string;
  degraded: boolean;
}
export interface AiProvider {
  generate<T>(request: AiRequest): Promise<AiResponse<T>>;
}
export class DisabledAiProvider implements AiProvider {
  async generate<T>(): Promise<AiResponse<T>> {
    throw new Error("A síntese por IA está desativada com degradação segura.");
  }
}

export * from "./contracts.ts";
export * from "./constitutions.ts";
export * from "./schema.ts";
export * from "./director.ts";
export * from "./prompt.ts";
export * from "./gateway.ts";
export * from "./memory.ts";
export * from "./gemini.ts";
