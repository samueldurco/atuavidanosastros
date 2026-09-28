import { parseContinuitySelection, workflowFor, type ContinuitySelection } from '@atv/domain';
import { continuityUuid } from './continuity-management';
import type { ProductRunView } from './product-run';

export type ReaderContinuityReference = {
	runId: string;
	key: string;
	label: string;
	selection: Extract<ContinuitySelection, { kind: 'hypothesis' | 'cycle' }>;
};
const boundedText = (text: string) =>
	text.trim().length > 0 &&
	text.length <= 1200 &&
	![...text].some((character) => {
		const code = character.charCodeAt(0);
		return code === 127 || (code < 32 && ![9, 10, 13].includes(code));
	});

/** Candidates only. The server must re-read the source, release, consent and experimental status. */
export function readerContinuityReferences(run: ProductRunView): ReaderContinuityReference[] {
	const product = workflowFor(run.productId);
	if (
		!product ||
		!continuityUuid(run.id) ||
		!run.released ||
		run.state !== 'READY' ||
		!run.editorial ||
		!run.calculation
	)
		return [];
	const refs: ReaderContinuityReference[] = [];
	run.editorial.sections.slice(0, 64).forEach((section, sectionIndex) => {
		if (boundedText(section.text))
			refs.push({
				runId: run.id,
				key: `hypothesis-${sectionIndex}`,
				label: `Hipótese · seção ${sectionIndex + 1} · ${section.title}`,
				selection: { kind: 'hypothesis', sectionIndex }
			});
	});
	if (product.kind === 'cycles') {
		for (const fact of run.calculation.facts) {
			const selection = { kind: 'cycle' as const, factId: fact.id };
			if (
				fact.kind !== 'calculated' ||
				!boundedText(fact.display) ||
				!parseContinuitySelection(selection) ||
				run.calculation.facts.filter((candidate) => candidate.id === fact.id).length !== 1
			)
				continue;
			refs.push({
				runId: run.id,
				key: `cycle-${fact.id}`,
				label: `Ciclo · ${fact.id} · ${fact.display}`,
				selection
			});
		}
	}
	return refs;
}
