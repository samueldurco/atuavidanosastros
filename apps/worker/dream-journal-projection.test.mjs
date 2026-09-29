import test from "node:test";
import assert from "node:assert/strict";
import { calculateDreamRecord } from "@atv/domain";
import {
  validDreamJournalProjection,
  validDreamReadingProjection,
} from "./src/symbolic-calculators.ts";
import { prepareProductFacts } from "./src/product-editorial.ts";

const baseInput = {
  version: "atv-workflow/1.0.0",
  productId: "dream-journal",
  consent: {
    storage: true,
    policyVersion: "atv-input-consent/1",
    partner: false,
    continuity: false,
  },
  dream: {
    date: "2026-09-29",
    narrative: "Sonhei com uma porta azul.",
    emotions: ["curiosidade"],
    associations: ["Casa antiga"],
  },
  context: "Relato sintético consentido.",
};

for (const [productId, validProjection] of [
  ["dream-journal", validDreamJournalProjection],
  ["dream-reading", validDreamReadingProjection],
]) {
  const input = { ...baseInput, productId };
  test(`${productId} retains the exact owned report and optional context without history or interpretation`, () => {
    for (const value of [
      input,
      {
        ...input,
        context: undefined,
        dream: { ...input.dream, emotions: [], associations: [] },
      },
      { ...input, consent: { ...input.consent, continuity: true } },
    ]) {
      const c = calculateDreamRecord(value),
        before = JSON.stringify(c);
      assert.equal(validProjection(c), true);
      const p = prepareProductFacts(productId, c);
      assert.equal(p.status, "prepared");
      assert.deepEqual(p.facts.facts, c.facts);
      assert.equal(p.facts.completeness, "partial");
      assert.ok(p.facts.facts.every((f) => f.kind === "reported"));
      assert.equal(c.data.continuity.historyLoaded, false);
      assert.equal(c.data.continuity.recurrenceAssessed, false);
      assert.deepEqual(c.data.symbolicHypotheses, []);
      assert.equal(JSON.stringify(c), before);
    }
  });

  test(`${productId} rejects drift in facts, declared input, provenance, continuity and projection shape`, () => {
    const changes = {
      inferredEmotion: (c) => {
        c.facts.find((f) => f.id === "dream-emotion-1").display =
          "medo inferido";
      },
      association: (c) => {
        c.data.entry.associations[0] = "Outra casa";
      },
      narrative: (c) => {
        c.data.entry.narrative += " Texto acrescentado.";
      },
      date: (c) => {
        c.data.entry.date = "2026-02-30";
      },
      context: (c) => {
        c.data.context = "Outro contexto";
      },
      provenance: (c) => {
        c.facts[0].source = "model.inference";
      },
      computed: (c) => {
        c.facts[0].kind = "computed";
      },
      reordered: (c) => {
        c.facts.reverse();
      },
      missing: (c) => {
        c.facts.pop();
      },
      duplicate: (c) => {
        c.facts.push(structuredClone(c.facts[0]));
      },
      unknownFact: (c) => {
        c.facts[0].confidence = 1;
      },
      history: (c) => {
        c.data.continuity.historyLoaded = true;
      },
      recurrence: (c) => {
        c.data.continuity.recurrenceAssessed = true;
      },
      consent: (c) => {
        c.data.continuity.consent = "true";
      },
      hypothesis: (c) => {
        c.data.symbolicHypotheses.push(
          "Porta significa oportunidade universal.",
        );
      },
      extraEntry: (c) => {
        c.data.entry.inferredEmotion = "medo";
      },
      extraData: (c) => {
        c.data.history = [];
      },
      extraContinuity: (c) => {
        c.data.continuity.entries = [];
      },
      controls: (c) => {
        c.data.entry.narrative = "Relato\u0000";
      },
      limits: (c) => {
        c.limits.pop();
      },
      version: (c) => {
        c.version = "atv-symbolic-calculation/99.0.0";
      },
      status: (c) => {
        c.status = "experimental";
      },
    };
    for (const [name, change] of Object.entries(changes)) {
      const c = calculateDreamRecord(input);
      change(c);
      const before = JSON.stringify(c);
      assert.equal(validProjection(c), false, name);
      assert.deepEqual(
        prepareProductFacts(productId, c),
        { status: "blocked", reason: "calculation_invalid" },
        name,
      );
      assert.equal(JSON.stringify(c), before, name);
    }
  });

  test(`${productId} checks every long narrative chunk without truncation or surrogate splitting`, () => {
    const narrative = "a".repeat(1799) + "🌙" + "b".repeat(1800);
    const c = calculateDreamRecord({
      ...input,
      dream: { ...input.dream, narrative },
    });
    assert.equal(validProjection(c), true);
    assert.equal(
      c.facts
        .filter((f) => f.id.startsWith("dream-narrative-"))
        .map((f) => f.display.replace(/^Relato \(trecho \d+\): /, ""))
        .join(""),
      narrative,
    );
    c.facts.find((f) => f.id === "dream-narrative-2").display += " Extra";
    assert.equal(validProjection(c), false);
    assert.equal(
      prepareProductFacts(productId, c).reason,
      "calculation_invalid",
    );
  });
}

test("dream-reading inspection preserves valid independent preparation", () => {
  const c = calculateDreamRecord({ ...baseInput, productId: "dream-reading" });
  assert.equal(prepareProductFacts("dream-reading", c).status, "prepared");
});
