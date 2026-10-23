import type { FreeToolResult } from './free-tools';

/** Facts already presented by the map or card need not interrupt the reading a second time. */
export function freeToolReadingFacts(result: FreeToolResult | null) {
	if (!result) return [];
	const mapFacts = new Set(result.chart?.positions.map((position) => position.body) ?? []);
	if (result.chart?.ascendant != null) mapFacts.add('ascendant');
	if (result.chart?.midheaven != null) mapFacts.add('midheaven');
	return result.facts.filter(
		(fact) =>
			!(result.draw && fact.label === 'Carta sorteada') &&
			!(fact.kind === 'calculated' && mapFacts.has(fact.id))
	);
}
