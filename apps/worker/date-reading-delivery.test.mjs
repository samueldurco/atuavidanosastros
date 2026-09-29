import test from "node:test";
import assert from "node:assert/strict";
import { createContextCalculators } from "./src/context-calculators.ts";
import { prepareProductFacts } from "./src/product-editorial.ts";
import {
  prepareProductDelivery,
  PRODUCT_DELIVERY_VERSION,
} from "./src/product-delivery.ts";
import { SCHEMA_VERSION } from "../../packages/ai/src/contracts.ts";
import { dateReadingEditorialTestFixture } from "../../scripts/helpers/career-editorial-test-fixture.mjs";

async function fixture(withContext) {
  const runId = "00000000-0000-4000-8000-000000000152";
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
        locationSource: "synthetic-delivery-test",
      },
      consent: {
        storage: true,
        policyVersion: "atv-input-consent/1",
        partner: false,
        continuity: false,
      },
      ...(withContext ? { context: "Contexto sintético consentido." } : {}),
    },
    { runId, signal: new AbortController().signal },
  );
  const prepared = prepareProductFacts("date-reading", calculation);
  assert.equal(prepared.status, "prepared");
  const output = {
    schemaVersion: SCHEMA_VERSION,
    capability: "cycle-context",
    scope: "partial",
    title: "Amostra sintética, sem aprovação",
    ...dateReadingEditorialTestFixture(prepared.facts),
  };
  output.claims.reverse();
  return {
    runId,
    revision: 4,
    productId: "date-reading",
    tier: "free",
    calculation,
    output,
  };
}
test("date delivery preserves natal, noon sample and optional reported context before ordered hypotheses", async () => {
  for (const withContext of [true, false]) {
    const input = await fixture(withContext),
      before = structuredClone(input.calculation);
    const result = await prepareProductDelivery(input);
    assert.equal(result.status, "prepared_for_review");
    assert.equal(result.publication, "blocked");
    assert.equal(result.content.version, PRODUCT_DELIVERY_VERSION);
    assert.deepEqual(input.calculation, before);
    const sections = result.content.sections,
      groups = withContext ? 3 : 2;
    assert.equal(sections.length, groups + 4);
    assert.equal(sections[0].title, "Base natal — Fatos registrados");
    assert.deepEqual(
      sections[0].evidence,
      before.facts.filter((f) => f.id.startsWith("natal-")).map((f) => f.id),
    );
    assert.equal(
      sections[0].text,
      before.facts
        .filter((f) => f.id.startsWith("natal-"))
        .map((f) => f.display)
        .join("\n\n"),
    );
    assert.equal(
      sections[1].title,
      "Amostra da data (12h UTC) — Fatos registrados",
    );
    assert.deepEqual(
      sections[1].evidence,
      before.facts.filter((f) => f.id.startsWith("sample-")).map((f) => f.id),
    );
    assert.ok(sections[1].text.includes("2026-09-29T12:00:00.000Z"));
    if (withContext) {
      assert.deepEqual(sections[2].evidence, ["personal-context"]);
      assert.equal(sections[2].text, "Contexto sintético consentido.");
    } else
      assert.ok(
        result.content.limits.includes(
          "Nenhum contexto adicional foi informado para esta data.",
        ),
      );
    assert.ok(sections[groups].title.endsWith("[date-natal-basis]"));
    assert.ok(sections[groups + 1].title.endsWith("[date-sample]"));
    assert.ok(sections[groups + 2].title.endsWith("[date-contrast]"));
    const last = sections.at(-1);
    assert.equal(
      last.title,
      "Síntese da Leitura da Data (1) e três perguntas práticas",
    );
    for (const question of input.output.reflections)
      assert.ok(last.text.includes(question));
    assert.equal(last.evidence.length, before.facts.length);
    assert.ok(
      result.content.limits.some((s) =>
        s.startsWith("Base parcial: amostra única das 12h UTC;"),
      ),
    );
  }
});
test("date delivery captures original trusted facts before asynchronous assessment and rejects damaged input", async () => {
  const input = await fixture(true),
    before = structuredClone(input.calculation);
  const pending = prepareProductDelivery(input);
  input.calculation.facts[0].display = "Changed after call";
  input.calculation.data.first.positions[0].longitude = 1;
  const result = await pending;
  assert.equal(result.status, "prepared_for_review");
  assert.equal(
    result.content.sections[0].text,
    before.facts
      .filter((f) => f.id.startsWith("natal-"))
      .map((f) => f.display)
      .join("\n\n"),
  );
  const damaged = await fixture(true);
  damaged.calculation.facts.reverse();
  assert.equal((await prepareProductDelivery(damaged)).status, "rejected");
});
