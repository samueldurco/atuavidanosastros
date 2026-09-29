import {
  calculateTarot,
  calculateDreamRecord,
  symbolicContract,
  tarotDeck,
  type CalculationSnapshot,
} from "@atv/domain";
import type { ProductCalculator } from "./product-processing.ts";

const dailyLimits = [
  "Registro de sorteio, não previsão nem interpretação homologada.",
  "Uma carta por pergunta; cartas sem reposição, somente na posição direta. Política candidata sujeita à revisão editorial.",
  "Reprocessar preserva as cartas registradas. Nova consulta cria uma nova execução.",
] as const;
function exactKeys(
  value: unknown,
  keys: readonly string[],
): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key))
  );
}

/** Coherence of a persisted daily draw, not seed authentication or editorial approval.
 * Pure inspection: never changes cards, draws again or calls a provider. */
export function validDailyCardProjection(
  calculation: CalculationSnapshot,
): boolean {
  return validTarotProjection(calculation, "daily-card");
}

/** Saved Foco Agora coherence only; never returns a verdict or approval. */
export function validTarotFocusProjection(
  calculation: CalculationSnapshot,
): boolean {
  return validTarotProjection(calculation, "tarot-focus");
}

/** Saved Sim/Não coherence only: no binary decision, recommendation or approval. */
export function validTarotYesNoProjection(
  calculation: CalculationSnapshot,
): boolean {
  return validTarotProjection(calculation, "tarot-yes-no");
}

/** Three saved question/card pairs; no redraw, seed authentication or editorial approval. */
export function validThreeQuestionsProjection(
  calculation: CalculationSnapshot,
): boolean {
  return validTarotProjection(calculation, "three-questions");
}

function validTarotProjection(
  calculation: CalculationSnapshot,
  productId: "daily-card" | "tarot-focus" | "tarot-yes-no" | "three-questions",
): boolean {
  const data = calculation.data;
  const count = productId === "three-questions" ? 3 : 1;
  const hasPolicy = productId === "tarot-focus" || productId === "tarot-yes-no";
  if (
    calculation.version !== symbolicContract.version ||
    calculation.kind !== "tarot" ||
    calculation.status !== "recorded" ||
    !exactKeys(data, [
      "deckVersion",
      "spreadVersion",
      "drawAlgorithm",
      "seedSource",
      "replacement",
      "reversals",
      "cards",
      "questions",
      "reviewStatus",
      ...(hasPolicy ? ["productPolicy"] : []),
    ]) ||
    data.deckVersion !== symbolicContract.deckVersion ||
    data.spreadVersion !== symbolicContract.spreadVersion ||
    data.drawAlgorithm !== symbolicContract.drawAlgorithm ||
    data.seedSource !== "server-run-uuid" ||
    data.replacement !== false ||
    data.reversals !== false ||
    data.reviewStatus !== "candidate" ||
    !Array.isArray(data.cards) ||
    data.cards.length !== count ||
    !Array.isArray(data.questions) ||
    data.questions.length !== count
  )
    return false;
  if (
    hasPolicy &&
    (!exactKeys(data.productPolicy, [
      "version",
      "productId",
      "interpretationStatus",
      "binaryVerdict",
    ]) ||
      data.productPolicy.version !== "atv-tarot-question-products/1.0.0" ||
      data.productPolicy.productId !== productId ||
      data.productPolicy.interpretationStatus !== "not-evaluated" ||
      data.productPolicy.binaryVerdict !== null)
  )
    return false;
  const source = `${symbolicContract.deckVersion};${symbolicContract.drawAlgorithm};${symbolicContract.spreadVersion}`;
  if (
    calculation.facts.length !== count * 2 &&
    calculation.facts.length !== count * 2 + 1
  )
    return false;
  const seen = new Set<string>();
  for (let index = 0; index < count; index++) {
    const card: unknown = data.cards[index],
      question: unknown = data.questions[index];
    if (
      !exactKeys(card, [
        "position",
        "questionIndex",
        "cardId",
        "name",
        "orientation",
      ]) ||
      card.position !== index + 1 ||
      card.questionIndex !== index ||
      card.orientation !== "upright" ||
      typeof question !== "string" ||
      !question.trim() ||
      question.length > 400
    )
      return false;
    const canonicalCard = tarotDeck.find(
      (candidate) => candidate.id === card.cardId,
    );
    if (
      !canonicalCard ||
      card.name !== canonicalCard.name ||
      seen.has(canonicalCard.id)
    )
      return false;
    seen.add(canonicalCard.id);
    const reported = calculation.facts[index * 2],
      drawn = calculation.facts[index * 2 + 1];
    if (
      reported?.id !== `question-${index + 1}` ||
      reported.kind !== "reported" ||
      reported.display !== question ||
      reported.source !== `input.questions[${index}]` ||
      drawn?.id !== `card-${index + 1}` ||
      drawn.kind !== "drawn" ||
      drawn.display !==
        `Posição ${index + 1}: ${canonicalCard.name} (posição direta)` ||
      drawn.source !== source
    )
      return false;
  }
  const context = calculation.facts[count * 2];
  if (
    context &&
    (context.id !== "tarot-context" ||
      context.kind !== "reported" ||
      context.source !== "input.context" ||
      !context.display.trim() ||
      context.display.length > 1200)
  )
    return false;
  const limits = hasPolicy
    ? [
        ...dailyLimits,
        "Nenhuma resposta sim/não, recomendação de decisão ou interpretação foi calculada. A carta não decide por você.",
      ]
    : dailyLimits;
  return (
    calculation.limits.length === limits.length &&
    limits.every((limit, index) => calculation.limits[index] === limit)
  );
}

/** Explicit capabilities. Does not enable releases, call a model or register a hosted scheduler. */
export function createSymbolicCalculators(): Readonly<
  Record<string, ProductCalculator>
> {
  const tarot: ProductCalculator = async (input, { runId, signal }) =>
    calculateTarot(input, runId, signal);
  const dream: ProductCalculator = async (input, { signal }) => {
    signal.throwIfAborted();
    return calculateDreamRecord(input);
  };
  return Object.freeze({
    "daily-card": tarot,
    "three-questions": tarot,
    "tarot-focus": tarot,
    "tarot-yes-no": tarot,
    "dream-reading": dream,
    "dream-journal": dream,
  });
}
