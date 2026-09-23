import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { SCHEMA_VERSION } from "@atv/ai";
import {
  prepareProductDelivery,
  PRODUCT_DELIVERY_VERSION,
} from "./src/product-delivery.ts";

function draft() {
  return {
    runId: "00000000-0000-4000-8000-000000000001",
    revision: 3,
    productId: "daily-card",
    tier: "free",
    calculation: {
      version: "synthetic/1",
      kind: "tarot",
      status: "recorded",
      data: { provenance: "fixture" },
      limits: ["Base sintética, não homologada."],
      facts: [
        {
          id: "card-a",
          kind: "drawn",
          display: "Carta sintética A",
          source: "fixture",
        },
        {
          id: "context",
          kind: "reported",
          display: "Contexto sintético B",
          source: "fixture",
        },
      ],
    },
    output: {
      schemaVersion: SCHEMA_VERSION,
      capability: "tarot-reflection",
      scope: "partial",
      title: "Um recorte sintético",
      claims: [
        {
          id: "c1",
          kind: "fact",
          text: "Carta sintética A",
          evidence: ["card-a"],
        },
        {
          id: "c2",
          kind: "interpretation",
          text: "Uma interpretação sintética para observar.",
          evidence: ["context"],
        },
        {
          id: "c3",
          kind: "hypothesis",
          text: "Uma hipótese a explorar, sem certeza.",
          evidence: ["card-a", "context"],
        },
      ],
      relations: [
        {
          kind: "tension",
          claimIds: ["c1", "c2"],
          text: "Relação sintética entre os dois recortes.",
        },
      ],
      synthesis: [
        {
          claimIds: ["c1", "c3"],
          text: "A síntese mantém abertas alternativas pessoais.",
        },
      ],
      reflections: [
        "Que possibilidade merece atenção?",
        "Qual pequeno experimento você escolheria?",
      ],
      limits: ["Fixture de projeção, não leitura aprovada."],
    },
  };
}
function contentTexts(content) {
  return content.sections.map((section) => section.text).join("\n");
}

test("projects every Lab passage, semantic type, claim link and fact reference without granting publication", async () => {
  const input = draft(),
    result = await prepareProductDelivery(input);
  assert.equal(result.status, "prepared_for_review");
  assert.equal(result.publication, "blocked");
  assert.equal(result.reason, "delivery_review_and_promotion_required");
  const { content } = result;
  assert.equal(content.version, PRODUCT_DELIVERY_VERSION);
  assert.equal(content.title, input.output.title);
  assert.equal(content.sections.length, 5);
  assert.deepEqual(
    content.sections.slice(0, 3).map((s) => s.title),
    ["Fato [c1]", "Interpretação [c2]", "Hipótese [c3]"],
  );
  assert.deepEqual(
    content.sections.slice(0, 3).map((s) => s.text),
    input.output.claims.map((c) => c.text),
  );
  assert.deepEqual(
    content.sections.map((s) => s.evidence),
    [
      ["card-a"],
      ["context"],
      ["card-a", "context"],
      ["card-a", "context"],
      ["card-a", "context"],
    ],
  );
  const all = contentTexts(content);
  for (const text of [
    ...input.output.claims.map((c) => c.text),
    ...input.output.relations.map((r) => r.text),
    ...input.output.synthesis.map((s) => s.text),
    ...input.output.reflections,
  ])
    assert.equal(all.split(text).length, 2);
  assert.match(all, /Tensão entre afirmações: c1, c2/);
  assert.match(all, /Afirmações de base: c1, c3/);
  assert.match(all, /referências desta seção correspondem somente à síntese/);
  assert.deepEqual(content.limits, [
    "Escopo declarado: parcial.",
    ...input.output.limits,
  ]);
  assert.equal("promotionId" in content, false);
  assert.equal("reviewDigest" in content, false);
  assert.equal(
    result.deliveryDigest,
    createHash("sha256")
      .update(
        JSON.stringify({
          version: PRODUCT_DELIVERY_VERSION,
          basisDigest: result.basisDigest,
          outputDigest: result.outputDigest,
          content,
        }),
      )
      .digest("hex"),
  );
});

test("invalid schemas, unsafe passages and false references never produce delivery content", async () => {
  for (const mutate of [
    (d) => (d.output.extra = true),
    (d) => (d.output.claims[0].text = "Fato alterado"),
    (d) => (d.output.claims[1].evidence = ["unknown"]),
    (d) => (d.output.relations[0].claimIds = ["c1", "unknown"]),
    (d) => (d.output.synthesis[0].claimIds = ["unknown"]),
    (d) => (d.output.claims[1].id = "c1"),
    (d) => (d.output.scope = "integrated"),
    (d) => (d.output.reflections[0] = "<script>ação</script>"),
    (d) => (d.output.limits[0] = "Seu futuro está garantido"),
    (d) => (d.tier = "__proto__"),
    (d) => (d.productId = "unknown"),
    (d) => (d.revision = -1),
  ]) {
    const input = draft();
    mutate(input);
    const result = await prepareProductDelivery(input);
    assert.equal(result.status, "rejected");
    assert.equal(result.publication, "blocked");
    assert.equal("content" in result, false);
  }
  assert.equal((await prepareProductDelivery(null)).reason, "invalid_input");
});

test("a Lab-valid limit that cannot fit the reader is rejected, never truncated or relabelled", async () => {
  const input = draft();
  input.output.limits = ["x".repeat(1201)];
  const before = structuredClone(input);
  assert.equal(
    (await prepareProductDelivery(input)).reason,
    "delivery_not_representable",
  );
  assert.deepEqual(input, before);
});

function premium() {
  const input = draft();
  input.tier = "premium";
  input.output.claims = Array.from({ length: 24 }, (_, i) => ({
    id: `c${i}`,
    kind: "interpretation",
    text: `Recorte ${i}: possibilidade contextual.`,
    evidence: [i % 2 ? "context" : "card-a"],
  }));
  input.output.relations = Array.from({ length: 16 }, (_, i) => ({
    kind: i % 2 ? "tension" : "convergence",
    claimIds: ["c0", "c1"],
    text: `Relação ${i}: ${"a".repeat(1250)}`,
  }));
  input.output.synthesis = Array.from({ length: 6 }, (_, i) => ({
    claimIds: ["c0", "c1"],
    text: `Síntese ${i}: observação aberta.`,
  }));
  input.output.reflections = Array.from(
    { length: 6 },
    (_, i) => `Pergunta ${i}: ${"b".repeat(1600)}?`,
  );
  return input;
}

test("maximum premium counts fit bounded groups with all ordered relations and reflections intact", async () => {
  const input = premium(),
    result = await prepareProductDelivery(input);
  assert.equal(result.status, "prepared_for_review");
  const { content } = result;
  assert.ok(content.sections.length <= 40);
  assert.ok(content.sections.every((s) => s.text.length <= 20000));
  const all = contentTexts(content);
  let previous = -1;
  for (const relation of input.output.relations) {
    const at = all.indexOf(relation.text);
    assert.ok(at > previous);
    previous = at;
  }
  for (const question of input.output.reflections)
    assert.ok(content.sections.at(-1).text.includes(question));
  assert.ok(
    content.sections.filter((s) => s.title.startsWith("Relações")).length > 1,
  );
});

test("UTF-8 byte budget is independent of the Lab character limit and refuses oversized delivery", async () => {
  const input = premium();
  input.output.claims.forEach(
    (claim, i) => (claim.text = `Recorte ${i}: ${"界".repeat(1000)}`),
  );
  input.output.relations.forEach(
    (relation, i) => (relation.text = `Relação ${i}: ${"語".repeat(500)}`),
  );
  input.output.reflections = ["Qual associação aparece?"];
  assert.ok(JSON.stringify(input.output).length < 40000);
  assert.equal(
    (await prepareProductDelivery(input)).reason,
    "delivery_not_representable",
  );
});

test("digest binds exact delivery and original run, calculation provenance, revision and tier", async () => {
  const original = await prepareProductDelivery(draft());
  for (const mutate of [
    (d) => (d.runId = "00000000-0000-4000-8000-000000000002"),
    (d) => d.revision++,
    (d) => (d.tier = "premium"),
    (d) => (d.calculation.data.provenance = "changed"),
    (d) => d.calculation.limits.push("Outro limite do cálculo."),
    (d) => (d.output.claims[1].text += " Outro ponto."),
    (d) => (d.output.relations[0].kind = "convergence"),
    (d) => d.output.reflections.reverse(),
    (d) => d.output.limits.push("Outro limite editorial."),
  ]) {
    const input = draft();
    mutate(input);
    const result = await prepareProductDelivery(input);
    assert.equal(result.status, "prepared_for_review");
    assert.notEqual(result.deliveryDigest, original.deliveryDigest);
  }
});

test("caller mutation during hashing and returned-content mutation cannot change the captured source", async () => {
  const input = draft(),
    baseline = await prepareProductDelivery(input),
    pending = prepareProductDelivery(input);
  input.revision++;
  input.calculation.data.provenance = "changed";
  input.output.claims[0].text = "changed";
  const result = await pending;
  assert.deepEqual(result, baseline);
  result.content.sections[0].text = "changed";
  result.content.limits.push("changed");
  assert.deepEqual(await prepareProductDelivery(draft()), baseline);
});
