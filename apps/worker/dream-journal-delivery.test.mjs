import test from "node:test";
import assert from "node:assert/strict";
import { calculateDreamRecord } from "@atv/domain";
import { SCHEMA_VERSION } from "@atv/ai";
import { prepareProductFacts } from "./src/product-editorial.ts";
import {
  prepareProductDelivery,
  PRODUCT_DELIVERY_VERSION,
} from "./src/product-delivery.ts";
import { dreamJournalEditorialTestFixture } from "../../scripts/helpers/career-editorial-test-fixture.mjs";

async function prepare(dream, context) {
  const calculation = calculateDreamRecord({
    version: "atv-workflow/1.0.0",
    productId: "dream-journal",
    consent: {
      storage: true,
      policyVersion: "atv-input-consent/1",
      partner: false,
      continuity: true,
    },
    dream,
    ...(context ? { context } : {}),
  });
  const prepared = prepareProductFacts("dream-journal", calculation);
  assert.equal(prepared.status, "prepared");
  const output = {
    schemaVersion: SCHEMA_VERSION,
    capability: "dream-exploration",
    scope: "partial",
    title: "Registro sintético",
    limits: ["Fixture sem aprovação editorial."],
    ...dreamJournalEditorialTestFixture(prepared.facts),
  };
  const input = {
    runId: "00000000-0000-4000-8000-000000000146",
    revision: 3,
    productId: "dream-journal",
    tier: "free",
    calculation,
    output,
  };
  const result = await prepareProductDelivery(input);
  assert.equal(result.status, "prepared_for_review");
  assert.equal(result.publication, "blocked");
  return { result, calculation, input };
}
test("dream journal delivery separates all reported fields from the brief hypothesis and question", async () => {
  const { result, calculation, input } = await prepare(
    {
      date: "2026-09-29",
      narrative: "Uma porta azul <script>fixture</script>.",
      emotions: ["curiosidade", "calma"],
      associations: ["Casa antiga", "mudança"],
    },
    "Contexto pessoal informado.",
  );
  assert.equal(result.content.version, PRODUCT_DELIVERY_VERSION);
  assert.deepEqual(
    result.content.sections.map((s) => s.title),
    [
      "Data registrada — Fatos registrados",
      "Relato registrado — Fatos registrados",
      "Emoções informadas — Fatos registrados",
      "Associações pessoais — Fatos registrados",
      "Contexto informado — Fatos registrados",
      "Observação breve — Hipótese [dream-observation]",
      "Síntese do Registro de Sonho (1) e uma pergunta exploratória",
    ],
  );
  for (const [index, pattern] of [
    /^dream-date$/,
    /^dream-narrative-/,
    /^dream-emotion-/,
    /^dream-association-/,
    /^dream-context$/,
  ].entries()) {
    const facts = calculation.facts.filter((f) => pattern.test(f.id));
    assert.deepEqual(
      result.content.sections[index].evidence,
      facts.map((f) => f.id),
    );
    assert.equal(
      result.content.sections[index].text,
      facts.map((f) => f.display).join("\n\n"),
    );
  }
  assert.equal(result.content.sections[5].text, input.output.claims[0].text);
  assert.ok(
    result.content.sections[6].text.includes(input.output.reflections[0]),
  );
  assert.deepEqual(
    result.content.sections[5].evidence,
    calculation.facts.map((f) => f.id),
  );
  const pending = prepareProductDelivery(input);
  const original = calculation.facts[1].display;
  calculation.facts[1].display = "Mutação posterior à captura";
  assert.deepEqual((await pending).content, result.content);
  calculation.facts[1].display = original;
  input.output.claims[0].evidence.pop();
  assert.equal((await prepareProductDelivery(input)).status, "rejected");
});
test("empty optional dream fields are explicit, without invented emotions, associations or evidence", async () => {
  const { result } = await prepare({
    date: "2026-09-29",
    narrative: "Uma porta azul.",
    emotions: [],
    associations: [],
  });
  assert.equal(result.content.sections.length, 4);
  for (const limit of [
    "Nenhuma emoção foi informada neste registro.",
    "Nenhuma associação pessoal foi informada neste registro.",
    "Nenhum contexto adicional foi informado neste registro.",
  ])
    assert.ok(result.content.limits.includes(limit));
  assert.deepEqual(result.content.sections[2].evidence, [
    "dream-date",
    "dream-narrative-1",
  ]);
});
test("maximum journal report and lists retain every saved segment in order without truncation", async () => {
  const narrative = "a".repeat(1799) + "🌙" + "b".repeat(4199);
  const { result, calculation } = await prepare(
    {
      date: "2026-09-29",
      narrative,
      emotions: Array.from({ length: 8 }, (_, i) => `emoção ${i}`),
      associations: Array.from({ length: 8 }, (_, i) => `associação ${i}`),
    },
    "contexto",
  );
  const section = result.content.sections[1];
  const parts = calculation.facts.filter((f) =>
    f.id.startsWith("dream-narrative-"),
  );
  assert.equal(parts.length, 4);
  assert.equal(
    parts
      .map((f) => f.display.replace(/^Relato \(trecho \d+\): /, ""))
      .join(""),
    narrative,
  );
  assert.equal(section.text, parts.map((f) => f.display).join("\n\n"));
  assert.deepEqual(
    section.evidence,
    parts.map((f) => f.id),
  );
  assert.equal(result.content.sections[2].evidence.length, 8);
  assert.equal(result.content.sections[3].evidence.length, 8);
  assert.ok(result.content.sections.every((s) => s.text.length <= 20000));
});
