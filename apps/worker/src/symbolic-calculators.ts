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
  const data = calculation.data;
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
    ]) ||
    data.deckVersion !== symbolicContract.deckVersion ||
    data.spreadVersion !== symbolicContract.spreadVersion ||
    data.drawAlgorithm !== symbolicContract.drawAlgorithm ||
    data.seedSource !== "server-run-uuid" ||
    data.replacement !== false ||
    data.reversals !== false ||
    data.reviewStatus !== "candidate" ||
    !Array.isArray(data.cards) ||
    data.cards.length !== 1 ||
    !Array.isArray(data.questions) ||
    data.questions.length !== 1
  )
    return false;
  const card: unknown = data.cards[0],
    question: unknown = data.questions[0];
  if (
    !exactKeys(card, [
      "position",
      "questionIndex",
      "cardId",
      "name",
      "orientation",
    ]) ||
    card.position !== 1 ||
    card.questionIndex !== 0 ||
    card.orientation !== "upright" ||
    typeof question !== "string" ||
    !question.trim() ||
    question.length > 400
  )
    return false;
  const canonicalCard = tarotDeck.find(
    (candidate) => candidate.id === card.cardId,
  );
  if (!canonicalCard || card.name !== canonicalCard.name) return false;
  const source = `${symbolicContract.deckVersion};${symbolicContract.drawAlgorithm};${symbolicContract.spreadVersion}`;
  const [reported, drawn, context] = calculation.facts;
  if (
    (calculation.facts.length !== 2 && calculation.facts.length !== 3) ||
    reported?.id !== "question-1" ||
    reported.kind !== "reported" ||
    reported.display !== question ||
    reported.source !== "input.questions[0]" ||
    drawn?.id !== "card-1" ||
    drawn.kind !== "drawn" ||
    drawn.display !== `Posição 1: ${canonicalCard.name} (posição direta)` ||
    drawn.source !== source ||
    (context &&
      (context.id !== "tarot-context" ||
        context.kind !== "reported" ||
        context.source !== "input.context" ||
        !context.display.trim() ||
        context.display.length > 1200))
  )
    return false;
  return (
    calculation.limits.length === dailyLimits.length &&
    dailyLimits.every((limit, index) => calculation.limits[index] === limit)
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
