import test from "node:test";
import assert from "node:assert/strict";
import { createHoroscopeCalculators } from "./src/horoscope-calculators.ts";
import { prepareProductFacts } from "./src/product-editorial.ts";
import {
  prepareProductDelivery,
  PRODUCT_DELIVERY_VERSION,
} from "./src/product-delivery.ts";
import { horoscopeEditorialTestFixture } from "../../scripts/helpers/horoscope-editorial-test-fixture.mjs";
const birth = {
  localDateTime: "2000-01-01T12:00:00",
  utcInstant: "2000-01-01T12:00:00Z",
  timezone: "UTC",
  latitude: 0,
  longitude: 0,
  locationSource: "synthetic-delivery-test",
};
async function draft(withContext = true) {
  const calculation = await createHoroscopeCalculators({
    id: "synthetic-horoscope-delivery-not-approved",
    version: "qa-fixture-1",
    aspects: [
      { kind: "conjunction", orbDegrees: 5 },
      { kind: "square", orbDegrees: 5 },
    ],
  })["horoscope"](
    {
      version: "atv-workflow/1.0.0",
      productId: "horoscope",
      birth,
      targetDate: "2026-09-29",
      consent: {
        storage: true,
        partner: false,
        continuity: false,
        policyVersion: "atv-input-consent/1",
      },
      ...(withContext
        ? { context: "Relato sintético de autonomia e reparação." }
        : {}),
    },
    {
      runId: "00000000-0000-4000-8000-000000000176",
      signal: new AbortController().signal,
    },
  );
  const prepared = prepareProductFacts("horoscope", calculation);
  assert.equal(prepared.status, "prepared");
  return {
    runId: "00000000-0000-4000-8000-000000000170",
    revision: 4,
    productId: "horoscope",
    tier: "free",
    calculation,
    output: horoscopeEditorialTestFixture(prepared.facts),
  };
}
for (const withContext of [true, false])
  test(
    "horoscope free preview preserves full recorded geometry and fourteen claims: " +
      withContext,
    async () => {
      const input = await draft(withContext),
        original = structuredClone(input),
        result = await prepareProductDelivery(input);
      assert.equal(result.status, "prepared_for_review", result.reason);
      assert.equal(result.publication, "blocked");
      assert.deepEqual(input, original);
      const sections = result.content.sections;
      assert.equal(sections.length, withContext ? 28 : 27);
      assert.equal(sections[0].title, "Base natal — Fatos registrados");
      assert.equal(
        sections[1].title,
        "Amostra da data (12h UTC) — Fatos registrados",
      );
      const pairs = sections.filter((s) =>
        s.title.endsWith("— Pares registrados"),
      );
      assert.equal(pairs.length, 10);
      assert.deepEqual(
        pairs.flatMap((s) => s.evidence),
        input.calculation.facts
          .filter((f) => f.id.startsWith("transit-"))
          .map((f) => f.id),
      );
      for (const row of pairs) {
        assert.equal(row.evidence.length, 10);
        assert.equal(
          row.text,
          input.calculation.facts
            .filter((f) => row.evidence.includes(f.id))
            .map((f) => f.display)
            .join("\n\n"),
        );
      }
      const hypotheses = sections.filter((s) => s.title.includes("— Hipótese"));
      assert.equal(hypotheses.length, 14);
      input.output.claims.forEach((c, i) => {
        assert.equal(hypotheses[i].text, c.text);
        assert.deepEqual(hypotheses[i].evidence, c.evidence);
      });
      const synthesis = sections.at(-1);
      assert.equal(
        synthesis.title,
        "Síntese do Horóscopo (1) e três perguntas práticas",
      );
      assert.equal(synthesis.evidence.length, withContext ? 122 : 121);
      input.output.reflections.forEach((q) =>
        assert.ok(synthesis.text.includes(q)),
      );
      input.output.limits.forEach((l) =>
        assert.ok(result.content.limits.includes(l)),
      );
      assert.equal(
        result.content.limits.some((l) =>
          l.includes("Nenhum contexto adicional"),
        ),
        !withContext,
      );
      assert.equal(Object.hasOwn(result.content, "promotionId"), false);
      assert.equal(Object.hasOwn(result.content, "reviewDigest"), false);
    },
  );
test("horoscope delivery rejects forged geometry, references, extra claims and relations", async () => {
  const input = await draft();
  for (const mutate of [
    (d) => d.calculation.facts.pop(),
    (d) => (d.calculation.facts[21].display += " forged"),
    (d) => d.output.claims[0].evidence.pop(),
    (d) => d.output.claims.push({ ...d.output.claims[0], id: "extra" }),
    (d) =>
      d.output.relations.push({
        kind: "tension",
        claimIds: ["horoscope-base-sun", "horoscope-base-moon"],
        text: "Untrusted relation",
      }),
  ]) {
    const d = structuredClone(input);
    mutate(d);
    assert.equal((await prepareProductDelivery(d)).status, "rejected");
  }
});
