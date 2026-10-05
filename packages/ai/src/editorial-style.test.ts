import test from "node:test";
import assert from "node:assert/strict";
import {
  inspectEditorialStyle,
  editorialStyleRules,
} from "./editorial-style.ts";
import { buildPrompt } from "./prompt.ts";

test("rejects decorative padding and repeated disclaimers with precise locations", () => {
  assert.deepEqual(
    inspectEditorialStyle([
      { text: "Sua cartografia celeste", location: "title" },
      {
        text: "Observe os trânsitos sem transformar tendência em sentença.",
        location: "summary",
      },
      { text: "Não substitui orientação profissional.", location: "limits.0" },
      {
        text: "Esta leitura não substitui orientação profissional.",
        location: "limits.1",
      },
    ]),
    [
      { code: "decorative_language", location: "title" },
      { code: "editorial_padding", location: "summary" },
      { code: "repeated_disclaimer", location: "limits.1" },
    ],
  );
});
test("allows persuasive topics, ordinary negation and concrete uncertainty", () => {
  assert.deepEqual(
    inspectEditorialStyle([
      {
        text: "Previsões para 2027: carreira e sua relação com dinheiro.",
        location: "title",
      },
      { text: "Atração e sensualidade de Gêmeos", location: "section" },
      {
        text: "Sem a hora de nascimento, não podemos determinar seu Ascendente.",
        location: "limits.0",
      },
      {
        text: "Não foi possível carregar os dados. Tente novamente.",
        location: "error",
      },
    ]),
    [],
  );
});
test("the actual provider prompt includes the humanized editorial policy", () => {
  const prompt = buildPrompt({
    correlationId: "style-test",
    tier: "free",
    dataClass: "synthetic",
    consentToProcess: true,
    facts: {
      version: "atv-facts/1.0.0",
      capability: "purpose-direction",
      completeness: "partial",
      facts: [
        {
          id: "angle-midheaven",
          kind: "calculated",
          display: "Meio do Céu em Capricórnio.",
          source: "fixture",
        },
      ],
    },
  });
  for (const rule of editorialStyleRules)
    assert.ok(prompt.system.includes(rule));
});
