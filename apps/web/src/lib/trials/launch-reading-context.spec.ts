import { describe, expect, it } from 'vitest';
import { LAUNCH_INPUT_VERSION, type LaunchInput } from '@atv/domain';
import { calculateLaunchFacts } from '../server/launch-calculation';
import { composeLaunchReading, evaluateLaunchReading } from './launch-reading';

const consent = { storage: true, policyVersion: 'atv-launch-consent/1' } as const;
const executionId = '47c7a176-e0d3-4f61-b7cc-a272bfcb9cda';
const birth = {
	localDateTime: '1990-05-10T10:30:00',
	utcInstant: '1990-05-10T13:30:00Z',
	timezone: 'America/Sao_Paulo',
	latitude: -23.55,
	longitude: -46.63,
	locationSource: 'synthetic'
};
const ex = (observedActions: string): LaunchInput => ({
	version: LAUNCH_INPUT_VERSION,
	productId: 'ex-tarot',
	consent,
	answers: {
		episode: 'Recebi uma mensagem após meses sem contato.',
		observedActions,
		question: 'Quero responder a esta mensagem?',
		boundaries: 'Só converso quando eu quiser, durante o dia.'
	}
});
const restart = (situation: string, desiredChange: string): LaunchInput => ({
	version: LAUNCH_INPUT_VERSION,
	productId: 'love-restart-map',
	consent,
	birth,
	answers: {
		startDate: '2026-11-01',
		situation,
		desiredChange,
		boundaries: 'Preservar minhas noites de descanso.'
	}
});

async function reviewed(input: LaunchInput) {
	const facts = await calculateLaunchFacts(input, executionId);
	const reading = await composeLaunchReading(input, facts);
	const review = await evaluateLaunchReading(input, facts, reading);
	expect(review.status, JSON.stringify(review.reasons)).toBe('APPROVED_FOR_PRIVATE_TEST');
	return reading;
}

describe('P02 independent negative-context counterfactuals', () => {
	it('does not invent a repair offer from explicitly absent apologies or responsibility', async () => {
		const reading = await reviewed(
			ex('Não pediu desculpas, não assumiu responsabilidade e não propôs conversar.')
		);
		expect(reading.summary).toContain('esclarecer a intenção do contato');
		expect(reading.practicalAction).toContain('motivo do contato');
		expect(reading.practicalAction).not.toContain('qual atitude a pessoa se dispõe a sustentar');
	});
	it('does not turn respected boundaries and negated pressure into an incident of pressure', async () => {
		const reading = await reviewed(ex('Respeitou minha pausa, não insistiu nem pressionou.'));
		expect(reading.summary).toContain('esclarecer a intenção do contato');
		expect(reading.practicalAction).not.toContain('Pause a resposta');
	});
	it('still prioritizes an actual violation over an actual apology', async () => {
		const reading = await reviewed(
			ex('Pediu desculpas, mas não respeitou minha pausa e insistiu em uma resposta.')
		);
		expect(reading.summary).toContain('preservar o limite');
		expect(reading.practicalAction).toContain('Pause a resposta');
	});
	it('distinguishes actual silence from a negated disappearance', async () => {
		const silence = await reviewed(ex('Não respondeu à pergunta que enviei.'));
		const response = await reviewed(ex('Não sumiu; perguntou como estou.'));
		expect(silence.summary).toContain('ausência de resposta');
		expect(response.summary).toContain('esclarecer a intenção');
	});
	it('does not infer a repair offer from an uncertain report', async () => {
		const reading = await reviewed(ex('Talvez tenha pedido desculpas; não consigo confirmar.'));
		expect(reading.summary).toContain('esclarecer a intenção');
	});
	it('uses the affirmative new-meeting objective instead of the negated return', async () => {
		const reading = await reviewed(
			restart(
				'Não quero voltar para meu ex; quero conhecer novas pessoas.',
				'Conhecer novas pessoas sem voltar para meu ex.'
			)
		);
		expect(reading.summary).toContain('testar uma abertura nova');
		expect(reading.practicalAction).toContain('ambiente ou convite');
		expect(reading.practicalAction).not.toContain('numa retomada');
	});
	it('gives the present desired change precedence over a previous wish to reconcile', async () => {
		const reading = await reviewed(
			restart(
				'Depois do término, quis me reconciliar com meu ex.',
				'Quero encerrar essa relação e conhecer novas pessoas.'
			)
		);
		expect(reading.summary).toContain('testar uma abertura nova');
		expect(reading.practicalAction).not.toContain('numa retomada');
	});
	it('does not confuse resuming personal routine with resuming a relationship', async () => {
		const reading = await reviewed(
			restart(
				'Terminei uma relação e estou reorganizando a semana.',
				'Quero retomar minha vida e cuidar de mim.'
			)
		);
		expect(reading.summary).toContain('recuperar um ritmo próprio');
		expect(reading.practicalAction).not.toContain('numa retomada');
	});
	it('preserves the refusal of reconciliation even if the past situation suggests return', async () => {
		const reading = await reviewed(
			restart('Pensei em me reconciliar com meu ex.', 'Não quero voltar para meu ex.')
		);
		expect(reading.summary).toContain('recuperar um ritmo próprio');
		expect(reading.practicalAction).not.toContain('numa retomada');
	});
});
