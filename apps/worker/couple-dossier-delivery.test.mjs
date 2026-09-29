import test from "node:test";
import assert from "node:assert/strict";
import { createCoupleDossierCalculators } from "./src/couple-dossier-calculators.ts";
import { prepareProductFacts } from "./src/product-editorial.ts";
import {
  prepareProductDelivery,
  PRODUCT_DELIVERY_VERSION,
} from "./src/product-delivery.ts";
import { coupleDossierEditorialTestFixture } from "../../scripts/helpers/couple-dossier-editorial-test-fixture.mjs";
const birth = {
  localDateTime: "2000-01-01T12:00:00",
  utcInstant: "2000-01-01T12:00:00Z",
  timezone: "UTC",
  latitude: 0,
  longitude: 0,
  locationSource: "synthetic-delivery-test",
};
async function draft(withContext = true) {
  const calculation = await createCoupleDossierCalculators({
    id: "synthetic-couple-dossier-delivery-not-approved",
    version: "qa-fixture-1",
    aspects: [
      { kind: "conjunction", orbDegrees: 5 },
      { kind: "square", orbDegrees: 5 },
    ],
  })["couple-dossier"](
    {
      version: "atv-workflow/1.0.0",
      productId: "couple-dossier",
      birth,
      partner: {
        ...birth,
        localDateTime: "2001-07-03T12:00:00",
        utcInstant: "2001-07-03T12:00:00Z",
      },
      consent: {
        storage: true,
        partner: true,
        continuity: false,
        policyVersion: "atv-input-consent/1",
      },
      ...(withContext
        ? { context: "Relato sintético de autonomia e reparação." }
        : {}),
    },
    {
      runId: "00000000-0000-4000-8000-000000000170",
      signal: new AbortController().signal,
    },
  );
  const prepared = prepareProductFacts("couple-dossier", calculation);
  assert.equal(prepared.status, "prepared");
  return {
    runId: "00000000-0000-4000-8000-000000000170",
    revision: 4,
    productId: "couple-dossier",
    tier: "premium",
    calculation,
    output: coupleDossierEditorialTestFixture(prepared.facts),
  };
}
for (const withContext of [true, false])
  test(`full couple-dossier delivery preserves 100 ordered pairs, A/B, 19 claims and consent (${withContext})`, async () => {
    const input = await draft(withContext),
      original = structuredClone(input);
    const result = await prepareProductDelivery(input);
    assert.equal(result.status, "prepared_for_review", result.reason);
    assert.equal(result.publication, "blocked");
    assert.equal(result.content.version, PRODUCT_DELIVERY_VERSION);
    assert.deepEqual(input, original);
    const sections = result.content.sections;
    assert.equal(sections.length, withContext ? 35 : 34);
    assert.equal(sections[0].title, "Pessoa A — Fatos registrados");
    assert.equal(sections[1].title, "Pessoa B — Fatos registrados");
    const pairs = sections.filter((s) =>
      s.title.endsWith("— Pares registrados"),
    );
    assert.equal(pairs.length, 10);
    assert.deepEqual(
      pairs.flatMap((s) => s.evidence),
      input.calculation.facts
        .filter((f) => f.id.startsWith("cross-"))
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
    assert.equal(hypotheses.length, 19);
    for (let i = 0; i < 19; i++) {
      assert.equal(hypotheses[i].text, input.output.claims[i].text);
      assert.deepEqual(hypotheses[i].evidence, input.output.claims[i].evidence);
    }
    const synthesis = sections.at(-1);
    assert.equal(
      synthesis.title,
      "Síntese do Dossiê do Casal (2) e três perguntas práticas",
    );
    assert.equal(sections.at(-2).evidence.length, withContext ? 121 : 120);
    assert.equal(synthesis.evidence.length, withContext ? 41 : 40);
    assert.equal(sections.at(-2).title, "Síntese do Dossiê do Casal (1)");
    const connection = sections.find(
      (s) => s.title === "Conexões possíveis do Dossiê (1)",
    );
    for (const relation of input.output.relations)
      assert.ok(connection.text.includes(relation.text));
    assert.equal(new Set(synthesis.evidence).size, synthesis.evidence.length);
    for (const question of input.output.reflections)
      assert.ok(synthesis.text.includes(question));
    for (const limit of input.output.limits)
      assert.ok(result.content.limits.includes(limit));
    assert.equal(
      result.content.limits.some((l) =>
        l.includes("Nenhum contexto adicional"),
      ),
      !withContext,
    );
    assert.equal(Object.hasOwn(result.content, "promotionId"), false);
    assert.equal(Object.hasOwn(result.content, "reviewDigest"), false);
  });
test("delivery authenticates original geometry, coverage and explicit premium profile", async () => {
  const input = await draft();
  for (const mutate of [
    (d) => {
      d.calculation.facts.pop();
    },
    (d) => {
      d.calculation.data.base.data.crossAspectStability.pairs.pop();
    },
    (d) => {
      d.output.claims[0].evidence.pop();
    },
    (d) => {
      d.tier = "free";
    },
  ]) {
    const bad = structuredClone(input);
    mutate(bad);
    assert.equal((await prepareProductDelivery(bad)).status, "rejected");
  }
});
