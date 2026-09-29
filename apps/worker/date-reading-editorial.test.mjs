import test from "node:test";
import assert from "node:assert/strict";
import { createContextCalculators } from "./src/context-calculators.ts";
import { prepareProductFacts } from "./src/product-editorial.ts";
import {
  DATE_READING_EDITORIAL_VERSION,
  EditorialGateway,
  inspectReading,
  SCHEMA_VERSION,
  tierLimits,
  buildPrompt,
} from "../../packages/ai/src/index.ts";
import { dateReadingEditorialTestFixture } from "../../scripts/helpers/career-editorial-test-fixture.mjs";

test("persisted date base selects its own profile and fits unchanged free limits with maximum context", async () => {
  for (const context of [undefined, "😀".repeat(600)]) {
    const calculation = await createContextCalculators()["date-reading"](
      {
        version: "atv-workflow/1.0.0",
        productId: "date-reading",
        targetDate: "2026-09-29",
        birth: {
          localDateTime: "2000-01-01T09:00:00",
          utcInstant: "2000-01-01T12:00:00Z",
          timezone: "UTC-03:00",
          latitude: 70,
          longitude: -40,
          locationSource: "synthetic-editorial-test",
        },
        consent: {
          storage: true,
          policyVersion: "atv-input-consent/1",
          partner: false,
          continuity: false,
        },
        ...(context === undefined ? {} : { context }),
      },
      {
        runId: "00000000-0000-4000-8000-000000000151",
        signal: new AbortController().signal,
      },
    );
    const original = structuredClone(calculation);
    const prepared = prepareProductFacts("date-reading", calculation);
    assert.equal(prepared.status, "prepared");
    assert.equal(
      prepared.facts.editorialProfile,
      DATE_READING_EDITORIAL_VERSION,
    );
    assert.deepEqual(calculation, original);
    const output = {
      schemaVersion: SCHEMA_VERSION,
      capability: "cycle-context",
      scope: "partial",
      title: "Fixture estrutural, sem homologação",
      ...dateReadingEditorialTestFixture(prepared.facts),
    };
    assert.equal(
      inspectReading(output, prepared.facts).status,
      "needs_editorial_review",
    );
    const request = {
      correlationId: "date-editorial-free",
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
