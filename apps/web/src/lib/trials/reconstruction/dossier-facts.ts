import type { BirthInput, CalculationSnapshot, WorkflowInput } from '@atv/domain';
import { canonical } from '../reading';
import { projectSynastry } from './synastry-facts';

export const DOSSIER_VERSION = 'atv-private-couple-dossier-synthesis/4.0.0';
export function dossierSynastryInput(input: WorkflowInput): WorkflowInput {
	const { questions: _questions, ...rest } = input;
	void _questions;
	return { ...rest, productId: 'synastry' };
}
export function projectDossier(
	input: WorkflowInput,
	sources: [CalculationSnapshot, CalculationSnapshot],
	sourceInputs: [BirthInput, BirthInput]
): CalculationSnapshot {
	if (
		input.productId !== 'couple-dossier' ||
		!input.context?.trim() ||
		!input.questions?.length ||
		input.questions.length > 3 ||
		input.questions.some((q) => !q.trim() || q.length > 400) ||
		new Set(input.questions.map((q) => q.trim().normalize('NFKC').toLocaleLowerCase('pt-BR')))
			.size !== input.questions.length
	)
		throw Error('O Dossiê precisa de contexto e de uma a três perguntas diferentes.');
	const base = projectSynastry(dossierSynastryInput(input), sources, sourceInputs);
	return {
		...base,
		version: DOSSIER_VERSION,
		facts: [
			...base.facts,
			...input.questions.map((q, i) => ({
				id: `couple-question-${i + 1}`,
				kind: 'reported' as const,
				display: q,
				source: `input.questions[${i}]`
			}))
		],
		data: {
			...base.data,
			productId: input.productId,
			reportedQuestions: structuredClone(input.questions)
		},
		limits: [
			...base.limits,
			'As perguntas e o contexto são relatos de quem fez o pedido; não representam respostas ou consenso da outra pessoa.',
			'O Dossiê não consulta história do casal, mensagens, leituras anteriores ou continuidade ATV+ sem um vínculo consentido específico.',
			'Prioridades, acordos e experiências são propostas voluntárias e reversíveis; o mapa não decide pela relação.'
		]
	};
}
export function assertDossierProjection(input: WorkflowInput, calculation: CalculationSnapshot) {
	if (
		calculation.version !== DOSSIER_VERSION ||
		canonical(
			projectDossier(
				input,
				calculation.data.sources as [CalculationSnapshot, CalculationSnapshot],
				calculation.data.sourceInputs as [BirthInput, BirthInput]
			)
		) !== canonical(calculation)
	)
		throw Error('Dossiê divergente dos mapas, contexto ou perguntas informadas.');
}
