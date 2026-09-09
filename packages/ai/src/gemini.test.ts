import test from "node:test";
import assert from "node:assert/strict";
import { GeminiEditorialProvider, buildPrompt, LabBudgetLedger, EditorialGateway } from "./index.ts";
import { goldenSeed, labCases } from "./lab/dataset.ts";

const request = labCases[0]!.request;
test("Gemini envia schema nativo, preserva signal e expõe metadados sem segredo", async () => {
  const signal = new AbortController().signal;
  const provider = new GeminiEditorialProvider({ model: "gemini-fixture-001", credential: () => "synthetic-test-key", fetch: async (url, init) => {
    assert.ok(String(url).startsWith("https://generativelanguage.googleapis.com/"));
    assert.ok(!String(url).includes("synthetic-test-key"));
    assert.equal(init?.signal, signal);
    const payload = JSON.parse(init!.body as string);
    assert.equal(payload.generationConfig.responseMimeType, "application/json");
    assert.ok(payload.generationConfig.responseJsonSchema);
    assert.equal(payload.tools, undefined);
    return Response.json({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify(goldenSeed) }] } }],
      modelVersion: "gemini-fixture-001", usageMetadata: { promptTokenCount: 1500, candidatesTokenCount: 800, thoughtsTokenCount: 0 } });
  } });
  const result = await provider.generate(buildPrompt(request), signal);
  assert.deepEqual(result.output, goldenSeed);
  assert.equal(result.resolvedModel, "gemini-fixture-001");
  assert.equal(result.inputTokens, 1500);
});
test("Gemini rejeita erro, truncamento, function call e resposta acima do teto", async () => {
  for (const response of [
    new Response("sensitive error", { status: 429 }),
    Response.json({ candidates: [{ finishReason: "MAX_TOKENS" }] }),
    Response.json({ candidates: [{ finishReason: "STOP", content: { parts: [{ functionCall: {} }] } }] }),
    new Response("x".repeat(256_001)),
  ]) {
    const provider = new GeminiEditorialProvider({ model: "fixture-001", credential: () => "test", fetch: async () => response });
    await assert.rejects(provider.generate(buildPrompt(request), new AbortController().signal), (error: Error) => !error.message.includes("sensitive"));
  }
});
test("orçamento reserva tokens atomicamente e timeout do ledger impede chamadas", async () => {
  const ledger = new LabBudgetLedger();
  assert.deepEqual(await Promise.all([ledger.reserve("day", 5, 800, 1000), ledger.reserve("day", 5, 800, 1000)]), [true, false]);
  let calls = 0;
  const gateway = new EditorialGateway({ enabled: true, mode: "lab", timeoutMs: 10,
    ledger: { reserve: () => new Promise(() => {}) }, providers: [{ id: "fixture", model: "fixture", kind: "fixture", generate: async () => {
      calls++; return { output: goldenSeed, inputTokens: 1, outputTokens: 1 };
    } }] });
  assert.equal((await gateway.generate(request)).status, "unavailable");
  assert.equal(calls, 0);
});
