import test from "node:test";
import assert from "node:assert/strict";
import { createContextCalculators } from "./src/context-calculators.ts";
import { prepareProductFacts } from "./src/product-editorial.ts";
import {
  prepareProductDelivery,
  PRODUCT_DELIVERY_VERSION,
} from "./src/product-delivery.ts";
import { SCHEMA_VERSION } from "../../packages/ai/src/contracts.ts";
import { pairPreviewEditorialTestFixture } from "../../scripts/helpers/career-editorial-test-fixture.mjs";

async function fixture(context) {
  const runId = "00000000-0000-4000-8000-000000000155";
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
        locationSource: "synthetic-delivery-test",
      },
      partner: {
        localDateTime: "2001-07-03T14:00:00",
        utcInstant: "2001-07-03T12:00:00Z",
        timezone: "UTC+02:00",
        latitude: 40,
        longitude: 15,
        locationSource: "synthetic-delivery-test",
      },
      consent: {
        storage: true,
        policyVersion: "atv-input-consent/1",
        partner: true,
        continuity: false,
      },
      ...(context === undefined ? {} : { context }),
    },
    { runId, signal: new AbortController().signal },
  );
  const prepared = prepareProductFacts("pair-preview", calculation);
  assert.equal(prepared.status, "prepared");
  const output = {
    schemaVersion: SCHEMA_VERSION,
    capability: "relationship-dynamics",
    scope: "partial",
    title: "Preview sintético, sem aprovação",
    ...pairPreviewEditorialTestFixture(prepared.facts),
  };
  output.claims.reverse();
  return {
    runId,
    revision: 4,
    productId: "pair-preview",
    tier: "free",
    calculation,
    output,
  };
}

test("pair delivery separates original A/B facts, context, ordered hypotheses and exploratory questions", async () => {
  for (const context of [
    undefined,
    "Contexto sintético consentido.",
    "😀".repeat(600),
  ]) {
    const input = await fixture(context),
      before = structuredClone(input.calculation);
    const result = await prepareProductDelivery(input);
    assert.equal(result.status, "prepared_for_review");
    assert.equal(result.publication, "blocked");
    assert.equal(result.content.version, PRODUCT_DELIVERY_VERSION);
    assert.deepEqual(input.calculation, before);
    const sections = result.content.sections,
      groups = context === undefined ? 2 : 3;
    assert.equal(sections.length, groups + 4);
    for (const [index, role] of ["a", "b"].entries()) {
      const facts = before.facts.filter((f) =>
        f.id.startsWith(`person-${role}-`),
      );
      assert.equal(
        sections[index].title,
        `Pessoa ${role.toUpperCase()} — Fatos registrados`,
      );
      assert.deepEqual(
        sections[index].evidence,
        facts.map((f) => f.id),
      );
      assert.equal(
        sections[index].text,
        facts.map((f) => f.display).join("\n\n"),
      );
    }
    if (context === undefined) {
      assert.ok(
        result.content.limits.includes(
          "Nenhum contexto adicional foi informado para este par.",
        ),
      );
      assert.ok(
        sections.every((s) => !s.evidence.includes("personal-context")),
      );
    } else {
      assert.equal(sections[2].title, "Contexto informado — Fatos registrados");
      assert.deepEqual(sections[2].evidence, ["personal-context"]);
      assert.equal(sections[2].text, context);
    }
    for (const [index, id] of [
      "pair-person-a",
      "pair-person-b",
      "pair-negotiation",
    ].entries()) {
      const claim = input.output.claims.find((c) => c.id === id);
      assert.ok(sections[groups + index].title.endsWith(`Hipótese [${id}]`));
      assert.equal(sections[groups + index].text, claim.text);
      assert.deepEqual(sections[groups + index].evidence, claim.evidence);
    }
    const last = sections.at(-1);
    assert.equal(
      last.title,
      "Síntese do Preview do Par (1) e três perguntas práticas",
    );
    for (const question of input.output.reflections)
      assert.ok(last.text.includes(question));
    assert.ok(
      last.text.includes(
        "Perguntas exploratórias (não são afirmações factuais",
      ),
    );
    assert.deepEqual(
      [...last.evidence].sort(),
      before.facts.map((f) => f.id).sort(),
    );
    for (const limit of input.output.limits)
      assert.ok(result.content.limits.includes(limit));
    assert.ok(
      result.content.limits.some((s) =>
        s.includes("sem aspectos entre mapas, score de compatibilidade"),
      ),
    );
    assert.ok(
      result.content.limits.some((s) =>
        s.includes("não autoriza compartilhar a leitura"),
      ),
    );
    assert.equal(Object.hasOwn(result.content, "promotionId"), false);
    assert.equal(Object.hasOwn(result.content, "reviewDigest"), false);
  }
});

test("pair delivery captures trusted input before asynchronous assessment and rejects damaged original facts", async () => {
  const input = await fixture("Contexto sintético."),
    before = structuredClone(input.calculation);
  const pending = prepareProductDelivery(input);
  input.calculation.facts[0].display = "Changed after call";
  input.calculation.data.second.positions[0].longitude = 1;
  const result = await pending;
  assert.equal(result.status, "prepared_for_review");
  assert.equal(
    result.content.sections[0].text,
    before.facts
      .filter((f) => f.id.startsWith("person-a-"))
      .map((f) => f.display)
      .join("\n\n"),
  );
  const damaged = await fixture(undefined);
  damaged.calculation.facts.reverse();
  assert.equal((await prepareProductDelivery(damaged)).status, "rejected");
});
