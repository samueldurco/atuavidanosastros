import { parseWorkflowInput, type CalculationSnapshot, type WorkflowInput } from '@atv/domain';
import { validDirectionJourneyProjection } from '../../../../../worker/src/direction-journey-calculators';
import { canonical } from '../reading';

export const DIRECTION_VERSION = 'atv-private-direction-journey/4.0.0';
export const directionMethod = Object.freeze({
	version: 'atv-direction-experiments/1.0.0',
	duration: 30,
	days: [0, 7, 14, 30],
	selection: 'declared-goal-first-context-second',
	expense: 0,
	maximumMinutesPerExperiment: 45,
	synthesis: 'reported-observation-comparison',
	astrology: 'not-used',
	continuity: 'existing-atv-plus-module'
});
export type DirectionData = {
	native: CalculationSnapshot;
	method: typeof directionMethod;
	goal: string;
	startDate: string;
	milestones: { day: number; date: string }[];
};
export function projectDirectionReading(
	input: WorkflowInput,
	native: CalculationSnapshot
): CalculationSnapshot {
	if (
		!parseWorkflowInput(input) ||
		input.productId !== 'direction-journey' ||
		!input.journey ||
		!validDirectionJourneyProjection(native)
	)
		throw Error('Base civil da Jornada inválida.');
	const d = native.data as {
		goal: string;
		startDate: string;
		milestones: { day: number; date: string }[];
	};
	if (
		d.goal !== input.journey.goal ||
		d.startDate !== input.journey.startDate ||
		native.facts.find((f) => f.id === 'reported-context')?.display !== input.context
	)
		throw Error('Objetivo, início ou contexto não correspondem à base.');
	if (d.goal.trim().length < 12 || d.goal.trim().split(/\s+/).length < 3)
		throw Error('Descreva uma ação que deseja testar e uma condição que precisa preservar.');
	return {
		version: DIRECTION_VERSION,
		kind: 'purpose',
		status: 'experimental',
		facts: native.facts.map((f) => ({ ...f })),
		data: {
			native,
			method: directionMethod,
			goal: d.goal,
			startDate: d.startDate,
			milestones: d.milestones
		},
		limits: [
			'Objetivo e contexto são relatos consentidos; datas são civis, sem céu natal ou prognóstico.',
			'Trinta dias com início inclusivo; revisões nos dias 7, 14 e 30. Datas orientam o percurso, sem presumir execução.',
			'Experimentos propostos: custo financeiro zero, até 45 minutos cada, sem abandonar compromissos ou expor dados privados.',
			'Registros e síntese usam somente respostas salvas pela pessoa; etapas ausentes permanecem pendentes.',
			'Formação, território, classe, saúde, oportunidade e escolha condicionam as possibilidades.',
			'Sem prescrição de profissão, emprego, renda, prosperidade ou destino. Não substitui orientação profissional.',
			'Continuidade é um módulo do ATV+ existente; não cria assinatura ou cobrança.'
		]
	};
}
export function assertDirectionProjection(
	input: WorkflowInput,
	calc: CalculationSnapshot
): asserts calc is CalculationSnapshot & { data: DirectionData } {
	if (
		calc.version !== DIRECTION_VERSION ||
		!calc.data.native ||
		canonical(calc) !==
			canonical(projectDirectionReading(input, calc.data.native as CalculationSnapshot))
	)
		throw Error('Projeção da Jornada adulterada ou incompatível.');
}
