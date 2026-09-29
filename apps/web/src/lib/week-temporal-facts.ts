import type { ProductRunView } from './product-run';

const version = 'atv-week-reading-calculation/1.2.0';
const bodies = [
	'sun',
	'moon',
	'mercury',
	'venus',
	'mars',
	'jupiter',
	'saturn',
	'uranus',
	'neptune',
	'pluto'
] as const;

/** Presentation of the released, persisted facts; no new calculation or approval. */
export function weekTemporalFacts(run: ProductRunView) {
	if (
		run.productId !== 'week-reading' ||
		!run.released ||
		!run.editorial ||
		run.calculation?.version !== version
	)
		return null;
	const facts = run.calculation.facts;
	if (
		facts.length !== 11 ||
		facts[0]?.id !== 'week-temporal-summary' ||
		!bodies.every((body, i) => facts[i + 1]?.id === `week-temporal-${body}`) ||
		facts.some((fact) => fact.kind !== 'calculated' || !fact.source.endsWith(`;${version}`)) ||
		new Set(facts.map((fact) => fact.source)).size !== 1
	)
		return null;
	return {
		summary: facts[0].display,
		bodies: facts.slice(1),
		detail: run.calculation.temporal ?? null
	};
}
