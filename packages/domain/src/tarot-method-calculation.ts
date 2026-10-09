import { parseWorkflowInput, type CalculationSnapshot } from './workflows.ts';
import { tarotDeck } from './symbolic-calculations.ts';
import { tarotMethodFor } from './tarot-methods.ts';

export const tarotMethodContract = Object.freeze({
  version: 'atv-tarot-method-calculation/2.0.0',
  deckVersion: 'atv-tarot-78/1.0.0',
  drawAlgorithm: 'sha256-counter-rejection-fisher-yates/1',
  reversals: false,
  replacement: false,
  seedSource: 'persisted-server-execution-uuid'
});
export interface MethodCard {
  position: number;
  positionId: string;
  positionName: string;
  cardId: string;
  name: string;
  orientation: 'upright';
}
/** Future purchase binding is an inbox-confirmed authority, never an input from a browser. */
export type TarotExecutionBinding =
  | { scope: 'private-free-test'; ownerId: string; requestKey: string }
  | { scope: 'confirmed-purchase'; ownerId: string; orderId: string; inboxEventId: string };

/** The caller must persist the server execution UUID and the returned draw before delivery. */
export async function calculateTarotMethod(
  value: unknown, executionId: string, signal: AbortSignal
): Promise<CalculationSnapshot> {
  const input = parseWorkflowInput(value);
  const method = input && tarotMethodFor(input.productId);
  if (!input || !method || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(executionId))
    throw new TypeError('invalid_tarot_method_input');
  const seed = [tarotMethodContract.version, tarotMethodContract.drawAlgorithm,
    tarotMethodContract.deckVersion, method.version, method.id, executionId.toLowerCase()].join('|');
  let block = new Uint32Array(0), cursor = 0, counter = 0;
  async function next(bound: number): Promise<number> {
    const limit = Math.floor(0x100000000 / bound) * bound;
    for (let attempts = 0; attempts < 4096; attempts++) {
      signal.throwIfAborted();
      if (cursor >= block.length) {
        const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${seed}|${counter++}`));
        const bytes = new DataView(hash);
        block = Uint32Array.from({ length: 8 }, (_, i) => bytes.getUint32(i * 4, false));
        cursor = 0;
      }
      const candidate = block[cursor++]!;
      if (candidate < limit) return candidate % bound;
    }
    throw new Error('draw_exhausted');
  }
  const deck = [...tarotDeck];
  const cards: MethodCard[] = [];
  for (let i = 0; i < method.positions.length; i++) {
    const selected = i + await next(deck.length - i);
    [deck[i], deck[selected]] = [deck[selected]!, deck[i]!];
    const position = method.positions[i]!;
    cards.push({ position: i + 1, positionId: position.id, positionName: position.name,
      cardId: deck[i]!.id, name: deck[i]!.name, orientation: 'upright' });
  }
  signal.throwIfAborted();
  const source = `${tarotMethodContract.deckVersion};${tarotMethodContract.drawAlgorithm};${method.version};${method.id}`;
  return {
    version: tarotMethodContract.version, kind: 'tarot', status: 'recorded',
    facts: [
      ...cards.map((card) => ({ id: `card-${card.position}`, kind: 'drawn' as const,
        display: `${card.positionName}: ${card.name} (posição direta)`, source })),
      ...(input.focus ? [{ id: 'tarot-focus', kind: 'reported' as const, display: input.focus, source: 'input.focus' }] : []),
      ...(input.context ? [{ id: 'tarot-context', kind: 'reported' as const, display: input.context, source: 'input.context' }] : [])
    ],
    data: { ...tarotMethodContract, executionId: executionId.toLowerCase(), methodId: method.id,
      methodVersion: method.version, cards, focus: input.focus ?? null, context: input.context ?? null },
    limits: [
      'Leitura simbólica para reflexão; as cartas não comprovam acontecimentos nem determinam decisões.',
      'Baralho Rider-Waite-Smith com 78 cartas, sem reposição, todas na posição direta. O recurso e o excesso são lidos pelo contexto da posição.',
      'Reabrir, repetir a solicitação ou baixar o PDF conserva esta execução e suas cartas. Uma nova consulta exige uma nova solicitação explícita.',
      ...(method.id === 'tarot-aphrodite-temple' ? ['A perspectiva sobre outra pessoa é uma hipótese para diálogo, sem afirmar sentimentos, fidelidade ou intenções.'] : []),
      ...(method.id === 'tarot-astrological-mandala' ? ['As doze áreas da mandala são simbólicas; nenhuma casa natal foi calculada.'] : [])
    ]
  };
}
