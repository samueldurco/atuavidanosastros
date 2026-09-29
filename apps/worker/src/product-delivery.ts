import type { CalculationSnapshot, EditorialSnapshot } from "@atv/domain";
import {
  parseReading,
  tierLimits,
  synastryRoles,
  coupleDossierRoles,
  horoscopeRoles,
  weekReadingRoles,
  weekReadingAreas,
  WEEK_TEMPORAL_EDITORIAL_VERSION,
  weekTemporalRoles,
  type Reading,
} from "@atv/ai";
import {
  evaluateProductDraft,
  prepareProductFacts,
  type ProductDraft,
} from "./product-editorial.ts";

export const PRODUCT_DELIVERY_VERSION = "atv-product-delivery/1.18.0";
const synastryBodies: Record<string, string> = {
  sun: "Sol",
  moon: "Lua",
  mercury: "Mercúrio",
  venus: "Vênus",
  mars: "Marte",
  jupiter: "Júpiter",
  saturn: "Saturno",
  uranus: "Urano",
  neptune: "Netuno",
  pluto: "Plutão",
};
const synastryThemes: Record<string, string> = {
  communication: "Comunicação",
  bonding: "Vínculo",
  desire: "Desejo",
  security: "Segurança",
  autonomy: "Autonomia",
  conflict: "Conflito",
  repair: "Reparação",
  negotiation: "Negociação",
  growth: "Crescimento",
};
/** Deliberately lacks promotionId/reviewDigest: this cannot be published as a receipt. */
export type ProductDeliveryContent = Omit<
  EditorialSnapshot,
  "promotionId" | "reviewDigest"
>;
type Preparation =
  | {
      status: "prepared_for_review";
      publication: "blocked";
      reason: "delivery_review_and_promotion_required";
      basisDigest: string;
      outputDigest: string;
      deliveryDigest: string;
      content: ProductDeliveryContent;
    }
  | { status: "rejected"; publication: "blocked"; reason: string };

const labels = {
  fact: "Fato",
  interpretation: "Interpretação",
  hypothesis: "Hipótese",
};
const unique = (values: string[]) => [...new Set(values)];
const careerTitles = new Map([
  ["public-direction", "Direção pública e contribuição"],
  ["work-possibilities", "Ambientes e modos de trabalhar"],
  ["tension-or-excess", "Tensão ou excesso possível"],
]);
const ascendantTitles = new Map([
  ["ascendant-approach", "Abordagem e primeiro contato"],
  ["ascendant-possibilities", "Possibilidades de expressão"],
  ["ascendant-tension", "Tensão ou excesso possível"],
]);
const midheavenTitles = new Map([
  ["midheaven-contribution", "Direção pública e contribuição"],
  ["midheaven-possibilities", "Ambientes e modos de trabalhar"],
  ["midheaven-tension", "Tensão ou excesso possível"],
]);
const tarotYesNoTitles = new Map([
  ["yes-no-conditions", "Possibilidades, limites e alternativas"],
  ["yes-no-question", "Sua pergunta e o que verificar"],
  ["yes-no-autonomy", "Sua escolha e um passo reversível"],
]);
const tarotFocusTitles = new Map([
  ["focus-symbol", "Possibilidade, tensão e alternativa"],
  ["focus-question", "Conexão com sua pergunta"],
  ["focus-practice", "Um pequeno experimento"],
]);
const dailyCardTitles = new Map([
  ["daily-observation", "Possibilidade e observação do dia"],
  ["daily-question", "Conexão com sua pergunta"],
  ["daily-practice", "Um pequeno experimento"],
]);
const dailyCardFacts = new Map([
  ["card-1", "Carta registrada"],
  ["question-1", "Pergunta relatada"],
]);
const threePillarsTitles = new Map([
  ["sun-moon-dynamics", "Sol e Lua: intenção e necessidade"],
  ["ascendant-expression", "Ascendente: abordagem e expressão"],
]);
const threePillarsFacts = new Map([
  ["position-sun", "Seu Sol"],
  ["position-moon", "Sua Lua"],
  ["angle-ascendant", "Seu Ascendente"],
]);
const birthChartTitles = new Map([
  ["solar-identity", "Sol: identidade e intenção"],
  ["lunar-needs", "Lua: necessidades e acolhimento"],
  ["personal-resources", "Mercúrio, Vênus e Marte: recursos pessoais"],
  ["social-resources", "Júpiter e Saturno: expansão e estrutura"],
  ["collective-symbols", "Urano, Netuno e Plutão: símbolos coletivos"],
  ["ascendant-approach", "Ascendente: abordagem e expressão"],
  ["midheaven-contribution", "Meio do Céu: direção e contribuição"],
  ["house-sectors-1-3", "Casas 1 a 3: presença, recursos e trocas"],
  ["house-sectors-4-6", "Casas 4 a 6: raízes, criação e cotidiano"],
  ["house-sectors-7-9", "Casas 7 a 9: vínculos, partilhas e horizontes"],
  ["house-sectors-10-12", "Casas 10 a 12: contribuição, redes e recolhimento"],
]);
function claimTitle(
  claim: Reading["claims"][number],
  productId: string,
): string {
  if (productId === "week-reading") {
    const temporalTitles: Record<string, string> = {
      "week-temporal-frame": "Panorama dos registros temporais",
      "week-temporal-near": "Sol a Marte: observação simbólica",
      "week-temporal-far": "Júpiter a Plutão: observação simbólica",
    };
    if (Object.hasOwn(temporalTitles, claim.id))
      return `${temporalTitles[claim.id]} — ${labels[claim.kind]} [${claim.id}]`;
    const day = /^week-day-([1-7])$/.exec(claim.id)?.[1];
    return `${day ? `Amostra ${day}: possibilidade simbólica` : "Base natal: possibilidade simbólica"} — ${labels[claim.kind]} [${claim.id}]`;
  }
  if (productId === "horoscope") {
    const body = synastryBodies[claim.id.slice("horoscope-base-".length)];
    const themes: Record<string, string> = {
      affection: "Amor e vínculo",
      work: "Trabalho",
      rhythm: "Ritmo",
      attention: "Atenção",
    };
    const title = body
      ? `${body} da amostra em contraste com a base natal`
      : themes[claim.id.slice("horoscope-".length)];
    return `${title ?? claim.id} — ${labels[claim.kind]} [${claim.id}]`;
  }
  if (["synastry", "couple-dossier"].includes(productId)) {
    const prefix = productId === "couple-dossier" ? "dossier" : "synastry";
    const body = synastryBodies[claim.id.slice(`${prefix}-base-`.length)];
    const title = body
      ? `${body} de A em contraste com B`
      : synastryThemes[claim.id.slice(`${prefix}-`.length)];
    return `${title ?? claim.id} — ${labels[claim.kind]} [${claim.id}]`;
  }
  if (productId === "dream-journal")
    return `Observação breve — ${labels[claim.kind]} [${claim.id}]`;
  if (productId === "dream-reading")
    return `${claim.id === "dream-elements" ? "Elementos do relato: possibilidade simbólica" : "Emoções e associações: sentido pessoal"} — ${labels[claim.kind]} [${claim.id}]`;
  if (productId === "pair-preview") {
    const titles: Record<string, string> = {
      "pair-person-a": "Pessoa A: possibilidades individuais",
      "pair-person-b": "Pessoa B: possibilidades individuais",
      "pair-negotiation": "Possibilidades de conversa e negociação",
    };
    return `${titles[claim.id] ?? claim.id} — ${labels[claim.kind]} [${claim.id}]`;
  }
  if (productId === "date-reading") {
    const titles: Record<string, string> = {
      "date-natal-basis": "Base natal: possibilidade simbólica",
      "date-sample": "Amostra da data: possibilidade simbólica",
      "date-contrast": "Contraste entre base natal e amostra",
    };
    return `${titles[claim.id] ?? claim.id} — ${labels[claim.kind]} [${claim.id}]`;
  }
  if (productId === "three-questions") {
    const index = /^question-([1-3])-reading$/.exec(claim.id)?.[1];
    return `${index ? `Leitura da pergunta ${index} — ` : ""}${labels[claim.kind]} [${claim.id}]`;
  }
  const subject =
    productId === "career-compass"
      ? (careerTitles.get(claim.id) ??
        (claim.kind === "fact" &&
        claim.evidence.length === 1 &&
        claim.evidence[0] === "angle-midheaven"
          ? "Seu Meio do Céu"
          : ""))
      : productId === "three-pillars"
        ? (threePillarsTitles.get(claim.id) ??
          (claim.kind === "fact" && claim.evidence.length === 1
            ? (threePillarsFacts.get(claim.evidence[0] ?? "") ?? "")
            : ""))
        : productId === "ascendant"
          ? (ascendantTitles.get(claim.id) ??
            (claim.kind === "fact" &&
            claim.evidence.length === 1 &&
            claim.evidence[0] === "angle-ascendant"
              ? "Seu Ascendente"
              : ""))
          : productId === "midheaven"
            ? (midheavenTitles.get(claim.id) ??
              (claim.kind === "fact" &&
              claim.evidence.length === 1 &&
              claim.evidence[0] === "angle-midheaven"
                ? "Seu Meio do Céu"
                : ""))
            : ["daily-card", "tarot-focus", "tarot-yes-no"].includes(productId)
              ? ((productId === "tarot-yes-no"
                  ? tarotYesNoTitles
                  : productId === "tarot-focus"
                    ? tarotFocusTitles
                    : dailyCardTitles
                ).get(claim.id) ??
                (claim.kind === "fact" && claim.evidence.length === 1
                  ? (dailyCardFacts.get(claim.evidence[0] ?? "") ?? "")
                  : ""))
              : productId === "birth-chart"
                ? (birthChartTitles.get(claim.id) ?? "")
                : "";
  return `${subject ? subject + " — " : ""}${labels[claim.kind]} [${claim.id}]`;
}

/** Fixed text projection, not summarization. Claim references remain visible as well as resolved
 * fact evidence. Reflections share the final synthesis section, but are explicitly not evidence.
 * Oversized content fails closed instead of disappearing from the delivered representation. */
function project(
  reading: Reading,
  productId: string,
  facts: readonly CalculationSnapshot["facts"][number][] = [],
  editorialProfile?: string,
): ProductDeliveryContent | null {
  if (reading.limits.some((limit) => limit.length > 1200)) return null;
  const claims = new Map(reading.claims.map((claim) => [claim.id, claim]));
  const evidence = (ids: string[]) =>
    unique(ids.flatMap((id) => claims.get(id)!.evidence));
  const sections: EditorialSnapshot["sections"] = [];
  const missingDreamFields: string[] = [];
  const missingDateFields: string[] = [];
  const missingPairFields: string[] = [];
  const missingWeekFields: string[] = [];
  const temporalWeek =
    productId === "week-reading" &&
    editorialProfile === WEEK_TEMPORAL_EDITORIAL_VERSION;
  if (productId === "week-reading") {
    const groups: [string, RegExp][] = temporalWeek
      ? [
          ["Panorama da busca em sete dias UTC", /^week-temporal-summary$/],
          ["Contagens nominais por corpo", /^week-temporal-(?!summary$)/],
          ["Contexto informado", /^personal-context$/],
        ]
      : [
          ["Intervalo das sete amostras", /^week-range$/],
          ["Base natal compartilhada", /^natal-/],
          ...Array.from({ length: 7 }, (_, i): [string, RegExp] => [
            `Amostra ${i + 1} (12h UTC)`,
            new RegExp(`^day-${i + 1}-sample-`),
          ]),
          ["Contexto informado", /^personal-context$/],
        ];
    for (const [title, pattern] of groups) {
      const recorded = facts.filter((fact) => pattern.test(fact.id));
      if (recorded.length)
        sections.push({
          title: `${title} — Fatos registrados`,
          text: recorded.map((fact) => fact.display).join("\n\n"),
          evidence: recorded.map((fact) => fact.id),
        });
    }
    if (!facts.some((fact) => fact.id === "personal-context"))
      missingWeekFields.push(
        "Nenhum contexto adicional foi informado para esta semana.",
      );
  }
  if (["pair-preview", "synastry", "couple-dossier"].includes(productId)) {
    for (const [title, pattern] of [
      ["Pessoa A", /^person-a-/],
      ["Pessoa B", /^person-b-/],
      ["Contexto informado", /^personal-context$/],
    ] as const) {
      const recorded = facts.filter((fact) => pattern.test(fact.id));
      if (recorded.length)
        sections.push({
          title: `${title} — Fatos registrados`,
          text: recorded.map((fact) => fact.display).join("\n\n"),
          evidence: recorded.map((fact) => fact.id),
        });
    }
    if (!facts.some((fact) => fact.id === "personal-context"))
      missingPairFields.push(
        "Nenhum contexto adicional foi informado para este par.",
      );
  }
  if (["synastry", "couple-dossier"].includes(productId)) {
    for (const [body, label] of Object.entries(synastryBodies)) {
      const recorded = facts.filter((fact) =>
        fact.id.startsWith(`cross-${body}-`),
      );
      sections.push({
        title: `${label} de A × corpos de B — Pares registrados`,
        text: recorded.map((fact) => fact.display).join("\n\n"),
        evidence: recorded.map((fact) => fact.id),
      });
    }
  }
  if (["date-reading", "horoscope"].includes(productId)) {
    for (const [title, pattern] of [
      ["Base natal", /^natal-/],
      ["Amostra da data (12h UTC)", /^sample-/],
      ["Contexto informado", /^personal-context$/],
    ] as const) {
      const recorded = facts.filter((fact) => pattern.test(fact.id));
      if (recorded.length)
        sections.push({
          title: `${title} — Fatos registrados`,
          text: recorded.map((fact) => fact.display).join("\n\n"),
          evidence: recorded.map((fact) => fact.id),
        });
    }
    if (!facts.some((fact) => fact.id === "personal-context"))
      missingDateFields.push(
        "Nenhum contexto adicional foi informado para esta data.",
      );
  }
  if (productId === "horoscope") {
    for (const [body, label] of Object.entries(synastryBodies)) {
      const recorded = facts.filter((fact) =>
        fact.id.startsWith(`transit-${body}-natal-`),
      );
      sections.push({
        title: `${label} da amostra × corpos natais — Pares registrados`,
        text: recorded.map((fact) => fact.display).join("\n\n"),
        evidence: recorded.map((fact) => fact.id),
      });
    }
  }
  if (["dream-journal", "dream-reading"].includes(productId)) {
    const groups = [
      ["Data registrada", /^dream-date$/],
      ["Relato registrado", /^dream-narrative-\d+$/],
      ["Emoções informadas", /^dream-emotion-\d+$/],
      ["Associações pessoais", /^dream-association-\d+$/],
      ["Contexto informado", /^dream-context$/],
    ] as const;
    for (const [title, pattern] of groups) {
      const recorded = facts.filter((fact) => pattern.test(fact.id));
      if (recorded.length)
        sections.push({
          title: `${title} — Fatos registrados`,
          text: recorded.map((fact) => fact.display).join("\n\n"),
          evidence: recorded.map((fact) => fact.id),
        });
    }
    if (!facts.some((fact) => /^dream-emotion-\d+$/.test(fact.id)))
      missingDreamFields.push("Nenhuma emoção foi informada neste registro.");
    if (!facts.some((fact) => /^dream-association-\d+$/.test(fact.id)))
      missingDreamFields.push(
        "Nenhuma associação pessoal foi informada neste registro.",
      );
    if (!facts.some((fact) => fact.id === "dream-context"))
      missingDreamFields.push(
        "Nenhum contexto adicional foi informado neste registro.",
      );
  }
  const orderedClaims =
    productId === "week-reading"
      ? (temporalWeek ? weekTemporalRoles : weekReadingRoles).map((id) =>
          claims.get(id)!,
        )
      : productId === "three-questions"
        ? [...reading.claims].sort((a, b) => a.id.localeCompare(b.id))
        : productId === "horoscope"
          ? horoscopeRoles.map((id) => claims.get(id)!)
          : productId === "couple-dossier"
            ? coupleDossierRoles.map((id) => claims.get(id)!)
            : productId === "synastry"
              ? synastryRoles.map((id) => claims.get(id)!)
              : productId === "pair-preview"
                ? ["pair-person-a", "pair-person-b", "pair-negotiation"].map(
                    (id) => claims.get(id)!,
                  )
                : productId === "date-reading"
                  ? ["date-natal-basis", "date-sample", "date-contrast"].map(
                      (id) => claims.get(id)!,
                    )
                  : productId === "dream-reading"
                    ? [...reading.claims].sort((a, b) =>
                        a.id.localeCompare(b.id),
                      )
                    : reading.claims;
  for (const claim of orderedClaims) {
    if (productId === "three-questions") {
      const index = /^question-([1-3])-reading$/.exec(claim.id)?.[1];
      const question = facts.find((fact) => fact.id === `question-${index}`);
      const card = facts.find((fact) => fact.id === `card-${index}`);
      if (!index || !question || !card) return null;
      sections.push({
        title: `Pergunta ${index} e carta registrada — Fatos registrados`,
        text: `${question.display}\n\n${card.display}`,
        evidence: [question.id, card.id],
      });
    }
    sections.push({
      title: claimTitle(claim, productId),
      text: claim.text,
      evidence: [...claim.evidence],
    });
  }
  // Group adjacent relations within the reader's text/forty-section bounds.
  // A relation is never split, shortened, reordered or given new factual references.
  let relationText = "",
    relationEvidence: string[] = [],
    group = 0;
  const flush = () => {
    if (relationText)
      sections.push({
        title: `${productId === "three-questions" ? "Convergências e tensões entre as três perguntas" : productId === "couple-dossier" ? "Conexões possíveis do Dossiê" : "Relações"} (${++group})`,
        text: relationText,
        evidence: unique(relationEvidence),
      });
    relationText = "";
    relationEvidence = [];
  };
  for (const relation of reading.relations) {
    const text = `${relation.kind === "convergence" ? "Convergência" : "Tensão"} entre afirmações: ${relation.claimIds.join(", ")}\n\n${relation.text}`;
    if (text.length > 20000) return null;
    if (relationText && relationText.length + text.length + 2 > 20000) flush();
    relationText += (relationText ? "\n\n" : "") + text;
    relationEvidence.push(...evidence(relation.claimIds));
  }
  flush();
  for (const [index, synthesis] of reading.synthesis.entries()) {
    const last = index === reading.synthesis.length - 1;
    const questions = last
      ? "\n\nPerguntas exploratórias (não são afirmações factuais; as referências desta seção correspondem somente à síntese):\n\n" +
        reading.reflections.map((text, i) => `${i + 1}. ${text}`).join("\n\n")
      : "";
    sections.push({
      title:
        productId === "week-reading" && temporalWeek
          ? `${index === 0 ? "Panorama dos registros" : "Escolha reversível"} — Possibilidade simbólica`
          : productId === "week-reading" && index < weekReadingAreas.length
            ? `Resumo por área: ${weekReadingAreas[index]} — Possibilidade simbólica`
            : `${productId === "three-pillars" ? "Síntese dos Três Pilares" : productId === "birth-chart" ? "Síntese do Mapa Astral" : productId === "ascendant" ? "Síntese do Ascendente" : productId === "midheaven" ? "Síntese do Meio do Céu" : productId === "daily-card" ? "Síntese da Carta do Dia" : productId === "tarot-focus" ? "Síntese do Foco Agora" : productId === "tarot-yes-no" ? "Síntese do Sim/Não responsável" : productId === "three-questions" ? "Síntese das Três Perguntas" : productId === "dream-journal" ? "Síntese do Registro de Sonho" : productId === "dream-reading" ? "Síntese da Leitura Essencial de Sonhos" : productId === "date-reading" ? "Síntese da Leitura da Data" : productId === "pair-preview" ? "Síntese do Preview do Par" : productId === "synastry" ? "Síntese da Sinastria" : productId === "couple-dossier" ? "Síntese do Dossiê do Casal" : productId === "horoscope" ? "Síntese do Horóscopo" : productId === "week-reading" ? "Síntese da Semana" : "Síntese"} (${index + 1})${last ? (productId === "dream-journal" ? " e uma pergunta exploratória" : productId === "dream-reading" ? " e duas perguntas exploratórias" : ["daily-card", "tarot-focus", "tarot-yes-no"].includes(productId) ? " e uma pergunta prática" : ["career-compass", "three-pillars", "birth-chart", "ascendant", "midheaven", "three-questions", "date-reading", "pair-preview", "synastry", "couple-dossier", "horoscope", "week-reading"].includes(productId) ? " e três perguntas práticas" : " e perguntas") : ""}`,
      text: `Afirmações de base: ${synthesis.claimIds.join(", ")}\n\n${synthesis.text}${questions}`,
      evidence: evidence(synthesis.claimIds),
    });
  }
  if (
    sections.length > 40 ||
    sections.some(
      (section) =>
        section.title.length > 240 ||
        section.text.length > 20000 ||
        !section.evidence.length ||
        section.evidence.length >
          (productId === "horoscope"
            ? 122
            : ["synastry", "couple-dossier"].includes(productId)
              ? 121
              : 100),
    )
  )
    return null;
  return {
    version: PRODUCT_DELIVERY_VERSION,
    title: reading.title,
    sections,
    limits: [
      `Escopo declarado: ${reading.scope === "partial" ? "parcial" : "integrado"}.`,
      ...reading.limits,
      ...missingDreamFields,
      ...missingDateFields,
      ...missingPairFields,
      ...missingWeekFields,
    ],
  };
}

/** Offline input to an independent final-delivery review. Does not accept scores, issue receipts,
 * authenticate reviewers, call providers, verify promotions or change any release state.
 * Hashes bind content, not authority; an issuer must reconstruct this candidate from trusted data. */
export async function prepareProductDelivery(
  input: ProductDraft,
): Promise<Preparation> {
  const reject = (reason: string): Preparation => ({
    status: "rejected",
    publication: "blocked",
    reason,
  });
  if (!input || !Object.hasOwn(tierLimits, input.tier))
    return reject("invalid_input");
  // These products have a trusted transport profile, derived from the
  // validated snapshot. A caller-supplied tier/profile cannot broaden it.
  const profiledPreparation = ["horoscope", "week-reading"].includes(
    input.productId,
  )
    ? prepareProductFacts(input.productId, input.calculation)
    : undefined;
  if (profiledPreparation?.status === "blocked")
    return reject(profiledPreparation.reason);
  const reading = parseReading(
    input.output,
    input.tier,
    profiledPreparation?.facts.editorialProfile,
  );
  if (!reading) return reject("invalid_schema");
  const productId = input.productId;
  const recordedPreparation =
    profiledPreparation ??
    ([
      "three-questions",
      "dream-journal",
      "dream-reading",
      "date-reading",
      "pair-preview",
      "synastry",
      "couple-dossier",
    ].includes(productId)
      ? prepareProductFacts(productId, input.calculation)
      : undefined);
  if (recordedPreparation?.status === "blocked")
    return reject(recordedPreparation.reason);
  // Recorded fields and assessment share a captured calculation before the first await.
  const assessment = await evaluateProductDraft({
    ...input,
    calculation: recordedPreparation?.calculation ?? input.calculation,
    output: reading,
  });
  if (
    assessment.status !== "needs_editorial_review" ||
    !assessment.basisDigest ||
    !assessment.outputDigest
  )
    return reject(assessment.reason);
  const content = project(
    reading,
    productId,
    recordedPreparation?.facts.facts,
    recordedPreparation?.facts.editorialProfile,
  );
  if (!content) return reject("delivery_not_representable");
  const encoded = JSON.stringify({
    version: PRODUCT_DELIVERY_VERSION,
    basisDigest: assessment.basisDigest,
    outputDigest: assessment.outputDigest,
    content,
  });
  if (new TextEncoder().encode(JSON.stringify(content)).length > 90000)
    return reject("delivery_not_representable");
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(encoded),
  );
  const deliveryDigest = Array.from(new Uint8Array(bytes), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  return {
    status: "prepared_for_review",
    publication: "blocked",
    reason: "delivery_review_and_promotion_required",
    basisDigest: assessment.basisDigest,
    outputDigest: assessment.outputDigest,
    deliveryDigest,
    content,
  };
}
