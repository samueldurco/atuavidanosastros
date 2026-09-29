import test from "node:test";
import assert from "node:assert/strict";
import { calculateDreamRecord } from "@atv/domain";
import { SCHEMA_VERSION } from "@atv/ai";
import { prepareProductFacts } from "./src/product-editorial.ts";
import { prepareProductDelivery } from "./src/product-delivery.ts";
import { dreamReadingEditorialTestFixture } from "../../scripts/helpers/career-editorial-test-fixture.mjs";

function draft(full = true) {
  const calculation = calculateDreamRecord({
    version: "atv-workflow/1.0.0",
    productId: "dream-reading",
    dream: {
      date: "2026-09-29",
      narrative:
        "Uma porta azul. " + "Uma caminhada. ".repeat(160) + "Fim do relato.",
      emotions: full ? ["curiosidade", "calma"] : [],
      associations: full ? ["Casa antiga", "Mudança"] : [],
    },
    context: full ? "Contexto sintético." : undefined,
    consent: {
      storage: true,
      policyVersion: "atv-input-consent/1",
      partner: false,
      continuity: true,
    },
  });
  const prepared = prepareProductFacts("dream-reading", calculation);
  assert.equal(prepared.status, "prepared");
  return {
    runId: "00000000-0000-4000-8000-000000000149",
    revision: 3,
    productId: "dream-reading",
    tier: "free",
    calculation,
    output: {
      schemaVersion: SCHEMA_VERSION,
      capability: "dream-exploration",
      scope: "partial",
      title: "Exemplo sintético",
      limits: ["Cobertura sintética; sem aprovação legítima."],
      ...dreamReadingEditorialTestFixture(prepared.facts),
    },
  };
}

test("Essential reader preserves full report, distinct hypotheses and all evidence in stable order", async () => {
  const input = draft();
  input.output.claims.reverse();
  const result = await prepareProductDelivery(input);
  assert.equal(result.status, "prepared_for_review");
  assert.equal(result.publication, "blocked");
  assert.equal("promotionId" in result.content, false);
  assert.equal("reviewDigest" in result.content, false);
  const sections = result.content.sections;
  assert.equal(sections.length, 8);
  const patterns = [
    /^dream-date$/,
    /^dream-narrative-\d+$/,
    /^dream-emotion-\d+$/,
    /^dream-association-\d+$/,
    /^dream-context$/,
  ];
  patterns.forEach((pattern, i) => {
    const facts = input.calculation.facts.filter((f) => pattern.test(f.id));
    assert.equal(sections[i].text, facts.map((f) => f.display).join("\n\n"));
    assert.deepEqual(
      sections[i].evidence,
      facts.map((f) => f.id),
    );
    assert.match(sections[i].title, /Fatos registrados$/);
  });
  for (const [i, id] of [
    "dream-elements",
    "dream-personal-meaning",
  ].entries()) {
    const claim = input.output.claims.find((c) => c.id === id);
    assert.match(
      sections[5 + i].title,
      new RegExp("Hipótese \\[" + id + "\\]$"),
    );
    assert.equal(sections[5 + i].text, claim.text);
    assert.deepEqual(sections[5 + i].evidence, claim.evidence);
  }
  assert.equal(
    sections[7].title,
    "Síntese da Leitura Essencial de Sonhos (1) e duas perguntas exploratórias",
  );
  for (const question of input.output.reflections)
    assert.ok(sections[7].text.includes(question));
  assert.deepEqual(sections[7].evidence, [
    ...new Set(
      input.output.synthesis[0].claimIds.flatMap(
        (id) => input.output.claims.find((c) => c.id === id).evidence,
      ),
    ),
  ]);
  assert.equal(input.calculation.data.continuity.historyLoaded, false);
  assert.equal(input.calculation.data.continuity.recurrenceAssessed, false);
});

test("Essential reader leaves optional fields absent and explicitly bounded", async () => {
  const result = await prepareProductDelivery(draft(false));
  assert.equal(result.status, "prepared_for_review");
  assert.equal(result.content.sections.length, 5);
  for (const text of [
    "Nenhuma emoção foi informada",
    "Nenhuma associação pessoal foi informada",
    "Nenhum contexto adicional foi informado",
  ])
    assert.ok(result.content.limits.some((l) => l.includes(text)));
  assert.ok(
    result.content.sections.every(
      (s) =>
        !s.evidence.some((id) =>
          /dream-emotion|dream-association|dream-context/.test(id),
        ),
    ),
  );
});

test("Essential delivery captures the recorded base before awaiting and rejects adulteration", async () => {
  const input = draft(),
    captured = structuredClone(input),
    pending = prepareProductDelivery(input);
  input.calculation.facts[1].display = "Adulteração após o início";
  input.calculation.data.entry.narrative = "Adulteração após o início";
  const result = await pending;
  assert.equal(result.status, "prepared_for_review");
  assert.equal(
    result.content.sections[1].text,
    captured.calculation.facts
      .filter((f) => /^dream-narrative-/.test(f.id))
      .map((f) => f.display)
      .join("\n\n"),
  );
  assert.equal((await prepareProductDelivery(input)).status, "rejected");
});
