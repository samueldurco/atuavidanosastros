import { describe, expect, it } from 'vitest';
import { LAUNCH_INPUT_VERSION, launchProductIds, type LaunchInput } from '@atv/domain';
import {
	calculateLaunchFacts,
	canCalculateLaunchFacts,
	launchFactualProductIds,
	launchExTarotMethod,
	launchFinancialTarotMethod,
	launchNatalScopes
} from './launch-calculation';

const birth = {
	localDateTime: '1990-05-10T10:30:00',
	utcInstant: '1990-05-10T13:30:00Z',
	timezone: 'America/Sao_Paulo',
	latitude: -23.55,
	longitude: -46.63,
	locationSource: 'synthetic'
};
const base = {
	version: LAUNCH_INPUT_VERSION,
	consent: { storage: true, policyVersion: 'atv-launch-consent/1' }
} as const;
const executionId = '8c6d9da2-d296-4b63-a30c-42ec8762f48f';
const exInput: LaunchInput = {
	...base,
	productId: 'ex-tarot',
	answers: {
		episode: 'Uma mensagem depois de meses.',
		observedActions: 'Perguntou como estou.',
		question: 'Responder ou esperar?',
		boundaries: 'Não aceitar insistência.'
	}
};
const ceremony = (label: string, date: string) => ({
	...birth,
	label,
	city: 'Cidade fictícia',
	localDateTime: `${date}T10:30:00`,
	utcInstant: `${date}T13:30:00Z`
});

describe('P02 factual E1 with real deterministic methods', () => {
	it('draws a thematic Tarot with immutable positions and no claim of persistence or approval', async () => {
		const result = await calculateLaunchFacts(exInput, executionId);
		const reopened = await calculateLaunchFacts(exInput, executionId.toUpperCase());
		expect(result).toEqual(reopened);
		expect(result.state).toBe('FACTS_READY_AWAITING_REVIEW');
		expect(result.provenance).toEqual({
			calculation: 'deterministic-tarot',
			persistence: 'required-before-reading',
			editorial: 'not-reviewed'
		});
		expect(result.data).toMatchObject({
			method: { id: 'ex-tarot', version: 'atv-launch-ex-tarot-method/1.0.0' },
			deckVersion: 'atv-tarot-78/1.0.0',
			drawStatus: 'UNPERSISTED',
			replacement: false,
			reversals: false
		});
		const cards = result.data.cards as {
			cardId: string;
			positionId: string;
			orientation: string;
		}[];
		expect(cards).toHaveLength(3);
		expect(new Set(cards.map((card) => card.cardId)).size).toBe(3);
		expect(cards.map((card) => card.positionId)).toEqual(
			launchExTarotMethod.positions.map((position) => position.id)
		);
		expect(cards.every((card) => card.orientation === 'upright')).toBe(true);
		expect(result.facts.filter((fact) => fact.kind === 'drawn')).toHaveLength(3);
		expect(result).not.toHaveProperty('reading');
		expect(result).not.toHaveProperty('approval');
		const other = await calculateLaunchFacts(exInput, '3ebd7f8e-f42a-4221-81ce-c5a620bb92b2');
		expect(other.data.cards).not.toEqual(cards);
	});

	it('calculates two real event charts and a factual comparison without selecting a marriage date', async () => {
		const result = await calculateLaunchFacts(
			{
				...base,
				productId: 'wedding-date-map',
				answers: {
					ceremonies: [ceremony('A', '2027-05-10'), ceremony('B', '2027-05-11')],
					priorities: 'Acolhimento e tempo.'
				}
			},
			executionId
		);
		const events = result.data.events as {
			label: string;
			chart: {
				input: { utcInstant: string };
				positions: { body: string; longitude: number }[];
				provenance: { provider: string; accuracyStatus: string };
			};
			aspects: { pairsEvaluated: number };
		}[];
		expect(events).toHaveLength(2);
		expect(events.map((event) => event.label)).toEqual(['A', 'B']);
		expect(events[0].chart.input.utcInstant).toBe('2027-05-10T13:30:00Z');
		for (const event of events) {
			expect(event.chart.positions).toHaveLength(10);
			expect(event.chart.provenance).toMatchObject({
				provider: 'caelus',
				accuracyStatus: 'experimental'
			});
			expect(event.aspects.pairsEvaluated).toBe(45);
		}
		const sun = (index: number) =>
			events[index].chart.positions.find((position) => position.body === 'sun')!.longitude;
		expect(sun(1) - sun(0)).toBeGreaterThan(0.9);
		expect(sun(1) - sun(0)).toBeLessThan(1.1);
		expect([
			'PREFERENCE_IN_DECLARED_PROFILE',
			'TRADEOFF_NO_SINGLE_PREFERENCE',
			'TIED_IN_DECLARED_PROFILE'
		]).toContain(result.data.selectionStatus);
		expect(result.data.declaredProfile).toMatchObject({
			methodVersion: 'atv-wedding-declared-profile/1.0.0',
			provenance: { commercialPrecisionApproved: false, commercialReleaseApproved: false }
		});
		expect(result.data.comparison).toHaveLength(2);
		expect(result.facts.filter((fact) => fact.kind === 'calculated').length).toBeGreaterThan(20);
		expect(result.provenance.calculation).toBe('experimental-astrology');
		expect(result.limits.some((limit) => limit.includes('Gauntlet integral pendente'))).toBe(true);
	}, 60000);

	it('calculates natal and all 120 six-hour transit samples across exactly thirty UTC days', async () => {
		const result = await calculateLaunchFacts(
			{
				...base,
				productId: 'love-restart-map',
				birth,
				answers: {
					startDate: '2027-05-10',
					situation: 'Ainda conversamos.',
					desiredChange: 'Definir o contato.',
					boundaries: 'Preservar meu tempo.'
				}
			},
			executionId,
			AbortSignal.timeout(60000)
		);
		expect(result.data.period).toEqual({
			startDate: '2027-05-10',
			endDateExclusive: '2027-06-09',
			timezone: 'UTC',
			stepHours: 6,
			sampleCount: 120
		});
		const observations = result.data.observations as {
			instant: string;
			positions: unknown[];
			contacts: { transit: string; natal: string; orbDegrees: number }[];
		}[];
		expect(observations).toHaveLength(120);
		expect(observations[0].instant).toBe('2027-05-10T00:00:00.000Z');
		expect(observations.at(-1)!.instant).toBe('2027-06-08T18:00:00.000Z');
		expect(observations.every((observation) => observation.positions.length === 10)).toBe(true);
		expect(observations.flatMap((observation) => observation.contacts).length).toBeGreaterThan(0);
		expect(
			observations.every((observation) =>
				observation.contacts.every((contact) => contact.orbDegrees >= 0 && contact.orbDegrees <= 2)
			)
		).toBe(true);
		expect(result.data).toMatchObject({
			motion: 'not-evaluated',
			exactEventSearch: 'not-performed',
			scenarios: 'not-produced'
		});
		expect(result.data.sampleProvenance).toMatchObject({
			provider: 'caelus',
			accuracyStatus: 'experimental',
			referenceFrame: 'geocentric-apparent-ecliptic-of-date'
		});
		expect(result.facts.filter((fact) => fact.id.startsWith('transit-sample-'))).toHaveLength(120);
		expect(result).not.toHaveProperty('reading');
	}, 90000);

	it('draws financial cards in its own positions and method seed without making financial claims', async () => {
		const input = {
			...base,
			productId: 'financial-blocks-tarot',
			answers: {
				impasse: 'Não separo tempo para organizar contas.',
				attemptedAction: 'Abri uma planilha.',
				availableStep: 'Reservar quinze minutos.'
			}
		};
		const result = await calculateLaunchFacts(input, executionId);
		const cards = result.data.cards as { cardId: string; positionId: string }[];
		expect(result.data.method).toEqual(launchFinancialTarotMethod);
		expect(cards.map((card) => card.positionId)).toEqual([
			'impasse',
			'possible-block',
			'first-step'
		]);
		expect(new Set(cards.map((card) => card.cardId)).size).toBe(3);
		expect(result).toEqual(await calculateLaunchFacts(input, executionId));
		expect(result.data.cards).not.toEqual(
			(await calculateLaunchFacts(exInput, executionId)).data.cards
		);
		expect(result.limits.some((limit) => limit.includes('Não prevê renda'))).toBe(true);
	});

	const natalCases = [
		{
			productId: 'sexuality-map',
			answers: {
				adult: true,
				situations: ['Uma aproximação respeitosa.'],
				preferences: 'Ter tempo e confiança.'
			}
		},
		{
			productId: 'intimacy-map',
			answers: {
				adult: true,
				wish: 'Conversar sobre aproximação.',
				boundaries: 'Poder dizer não.',
				situation: 'Precisamos combinar o ritmo.'
			}
		},
		{
			productId: 'emotional-reactions-map',
			answers: { trigger: 'Mudança de plano.', reaction: 'Silêncio.', effect: 'Demoro a falar.' }
		},
		{
			productId: 'hidden-talent-map',
			answers: {
				favors: ['Revisar mensagens.', 'Organizar uma atividade.'],
				resources: 'Duas horas por semana.'
			}
		},
		{
			productId: 'ascendant-style',
			answers: {
				occasion: 'Uma reunião.',
				wardrobe: ['Camisa azul.', 'Calça cinza.', 'Tênis confortável.'],
				comfort: 'Caminhar sem desconforto.'
			}
		},
		{
			productId: 'cohabitation-map',
			answers: {
				habits: ['Cozinho cedo.', 'Preciso de silêncio ao dormir.'],
				expectation: 'Dividir tarefas.',
				friction: 'Combinar horários.'
			}
		}
	] as const;

	it.each(natalCases)(
		'calculates the declared natal scope for $productId and preserves its own reported context',
		async ({ productId, answers }) => {
			const result = await calculateLaunchFacts(
				{ ...base, productId, birth, answers },
				executionId
			);
			const scope = launchNatalScopes[productId];
			const factors = result.data.factors as {
				positions: { body: string; longitude: number; sign: string; degreeWithinSign: number }[];
				angles: { angle: string; longitude: number }[];
				houseCusps: { house: number }[];
			};
			expect(result.data.method).toBe(scope.version);
			expect(factors.positions.map((position) => position.body).sort()).toEqual(
				[...scope.bodies].sort()
			);
			expect(factors.angles.map((angle) => angle.angle)).toEqual(scope.angles);
			expect(factors.houseCusps.map((cusp) => cusp.house)).toEqual(scope.houseCusps);
			expect(
				factors.positions.every(
					(position) =>
						position.longitude >= 0 &&
						position.longitude < 360 &&
						position.degreeWithinSign >= 0 &&
						position.degreeWithinSign < 30
				)
			).toBe(true);
			const geometry = result.data.aspects as {
				aspects: { first: string; second: string; orbDegrees: number }[];
			};
			expect(
				geometry.aspects.every(
					(aspect) =>
						(scope.bodies as readonly string[]).includes(aspect.first) ||
						(scope.bodies as readonly string[]).includes(aspect.second)
				)
			).toBe(true);
			expect(result.data.contextReferences).not.toHaveLength(0);
			expect(result.data.interpretation).toBe('not-produced');
			expect(result.facts.filter((fact) => fact.kind === 'calculated').length).toBeGreaterThan(0);
			expect(result.provenance.calculation).toBe('experimental-astrology');
			expect(result).not.toHaveProperty('reading');
			expect(result).not.toHaveProperty('approval');
		}
	);

	it('calculates exactly seven UTC days for a conversation, without recommending a window', async () => {
		const result = await calculateLaunchFacts(
			{
				...base,
				productId: 'conversation-timing',
				birth,
				answers: {
					startDate: '2099-12-25',
					subject: 'Rotina.',
					objective: 'Combinar responsabilidades.',
					constraints: 'Evitar o horário de trabalho.'
				}
			},
			executionId
		);
		expect(result.data.period).toEqual({
			startDate: '2099-12-25',
			endDateExclusive: '2100-01-01',
			timezone: 'UTC',
			stepHours: 6,
			sampleCount: 28
		});
		const observations = result.data.observations as {
			instant: string;
			positions: unknown[];
			contacts: { orbDegrees: number }[];
		}[];
		expect(observations).toHaveLength(28);
		expect(observations[0].instant).toBe('2099-12-25T00:00:00.000Z');
		expect(observations.at(-1)!.instant).toBe('2099-12-31T18:00:00.000Z');
		expect(
			observations.every(
				(sample) =>
					sample.positions.length === 10 &&
					sample.contacts.every((contact) => contact.orbDegrees <= 2)
			)
		).toBe(true);
		expect(result.data).toMatchObject({
			method: 'atv-launch-conversation-seven-day-transit-observations/1.0.0',
			preferredWindow: null,
			selectionStatus: 'AWAITING_EDITORIAL_COMPARISON',
			policy: { id: 'atv-launch-seven-day-observed-major-aspects' }
		});
		expect(result).not.toHaveProperty('reading');
	}, 60000);

	it('rejects wrong identity, client facts, unknown products and aborted calculation without a fallback', async () => {
		expect(launchFactualProductIds).toEqual(launchProductIds);
		expect(canCalculateLaunchFacts('sexuality-map')).toBe(true);
		expect(canCalculateLaunchFacts('not-a-product')).toBe(false);
		await expect(calculateLaunchFacts(exInput, 'client-seed')).rejects.toThrow(
			'invalid_launch_preparation'
		);
		await expect(
			calculateLaunchFacts({ ...exInput, calculation: { status: 'approved' } }, executionId)
		).rejects.toThrow('invalid_launch_calculation_input');
		await expect(
			calculateLaunchFacts({ ...exInput, productId: 'not-a-product' }, executionId)
		).rejects.toThrow('invalid_launch_calculation_input');
		const abort = new AbortController();
		abort.abort();
		await expect(calculateLaunchFacts(exInput, executionId, abort.signal)).rejects.toThrow();
	});
});
