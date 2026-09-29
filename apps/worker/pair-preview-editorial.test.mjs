import test from "node:test";
import assert from "node:assert/strict";
import { createContextCalculators } from "./src/context-calculators.ts";
import { prepareProductFacts } from "./src/product-editorial.ts";
import {
  PAIR_PREVIEW_EDITORIAL_VERSION,
  EditorialGateway,
  inspectReading,
  SCHEMA_VERSION,
  tierLimits,
  buildPrompt,
} from "../../packages/ai/src/index.ts";
import { pairPreviewEditorialTestFixture } from "../../scripts/helpers/career-editorial-test-fixture.mjs";

test("persisted pair base selects its own profile and fits unchanged free limits with maximum context", async () => {
  for (const context of [undefined, "😀".repeat(600)]) {
    const calculation = await createContextCalculators()["pair-preview"](
      {
        version: "atv-workflow/1.0.0",
        productId: "pair-preview",
        birth: {
          localDateTime: "2000-01-01T09:00:00",
          utcInstant: "2000-01-01T12:00:00Z",
          timezone: "UTC-03:00",
          latitude: 70,
          longitude: -40,
          locationSource: "synthetic-editorial-test",
        },
        partner: {
          localDateTime: "2001-07-03T14:00:00",
          utcInstant: "2001-07-03T12:00:00Z",
          timezone: "UTC+02:00",
          latitude: 40,
          longitude: 15,
          locationSource: "synthetic-editorial-test",
        },
        consent: {
          storage: true,
          policyVersion: "atv-input-consent/1",
          partner: true,
          continuity: false,
        },
        ...(context === undefined ? {} : { context }),
      },
      {
        runId: "00000000-0000-4000-8000-000000000154",
        signal: new AbortController().signal,
      },
    );
    const original = structuredClone(calculation);
    const prepared = prepareProductFacts("pair-preview", calculation);
    assert.equal(prepared.status, "prepared");
    assert.equal(
      prepared.facts.editorialProfile,
      PAIR_PREVIEW_EDITORIAL_VERSION,
    );
    assert.deepEqual(calculation, original);
    const output = {
      schemaVersion: SCHEMA_VERSION,
      capability: "relationship-dynamics",
      scope: "partial",
      title: "Fixture estrutural, sem homologação",
      ...pairPreviewEditorialTestFixture(prepared.facts),
    };
    assert.equal(
      inspectReading(output, prepared.facts).status,
      "needs_editorial_review",
    );
    const request = {
      correlationId: "pair-editorial-free",
      tier: "free",
      facts: prepared.facts,
      dataClass: "synthetic",
      consentToProcess: true,
    };
    assert.ok(
      buildPrompt(request).prompt.length <= tierLimits.free.maxInputChars,
    );
    assert.ok(JSON.stringify(output).length <= tierLimits.free.maxOutputChars);
    let calls = 0;
    const gateway = new EditorialGateway({
      enabled: true,
      mode: "lab",
      providers: [
        {
          id: "synthetic",
          model: "fixture-v1",
          kind: "fixture",
          async generate() {
            calls++;
            return { output, inputTokens: 1, outputTokens: 1 };
          },
        },
      ],
      ledger: {
        async reserve() {
          return true;
        },
      },
    });
    assert.equal((await gateway.generate(request)).status, "candidate");
    assert.equal(calls, 1);
  }
});
