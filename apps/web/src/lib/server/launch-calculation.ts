import {
	bodies,
	CaelusEphemerisProvider,
	calculateAspects,
	calculateCrossAspects,
	type AspectPolicy,
	type AspectPosition,
	type CelestialBody,
	type NatalChart
} from '@atv/astrology';
import {
	launchProductIds,
	parseLaunchInput,
	prepareLaunchEvidence,
	tarotDeck,
	tarotMethodContract,
	type BirthInput,
	type LaunchCeremonyOption,
	type LaunchPreparedEvidence,
	type MethodCard
} from '@atv/domain';
import { calculateValidatedChart } from '../../../../worker/src/natal-calculators';
import {
	calculateCalendarSamples,
	type CalendarSamples
} from '../../../../worker/src/personal-calendar-samples';
import { buildLaunchWeddingProfile } from './launch-wedding-profile';

export const LAUNCH_CALCULATION_VERSION = 'atv-launch-calculation/1' as const;
export const launchFactualProductIds = launchProductIds;
export type LaunchFactualProductId = (typeof launchFactualProductIds)[number];
export const canCalculateLaunchFacts = (id: string): id is LaunchFactualProductId =>
	launchFactualProductIds.some((productId) => productId === id);

/** Candidate geometry policies. Neither assigns benefic/malefic weights or a success score. */
export const launchEventAspectPolicy: AspectPolicy = Object.freeze({
	id: 'atv-launch-event-major-aspects',
	version: '1.0.0',
	aspects: ['conjunction', 'sextile', 'square', 'trine', 'opposition'].map((kind) => ({
		kind: kind as AspectPolicy['aspects'][number]['kind'],
		orbDegrees: 3
	}))
});
export const launchTransitAspectPolicy: AspectPolicy = Object.freeze({
	id: 'atv-launch-thirty-day-observed-major-aspects',
	version: '1.0.0',
	aspects: ['conjunction', 'sextile', 'square', 'trine', 'opposition'].map((kind) => ({
		kind: kind as AspectPolicy['aspects'][number]['kind'],
		orbDegrees: 2
	}))
});
export const launchConversationAspectPolicy: AspectPolicy = Object.freeze({
	id: 'atv-launch-seven-day-observed-major-aspects',
	version: '1.0.0',
	aspects: launchTransitAspectPolicy.aspects.map((rule) => ({ ...rule }))
});
export const launchNatalAspectPolicy: AspectPolicy = Object.freeze({
	id: 'atv-launch-natal-selected-major-aspects',
	version: '1.0.0',
	aspects: ['conjunction', 'sextile', 'square', 'trine', 'opposition'].map((kind) => ({
		kind: kind as AspectPolicy['aspects'][number]['kind'],
		orbDegrees: 3
	}))
});
export const launchExTarotMethod = Object.freeze({
	id: 'ex-tarot',
	version: 'atv-launch-ex-tarot-method/1.0.0',
	positions: [
		{
			id: 'episode',
			name: 'Episódio',
			function: 'Examinar o episódio relatado sem criar acontecimentos.'
		},
		{
			id: 'hypothesis',
			name: 'Hipótese a examinar',
			function: 'Distinguir uma hipótese simbólica de sentimentos conhecidos de outra pessoa.'
		},
		{
			id: 'repair-criterion',
			name: 'Critério de reparação',
			function: 'Reconhecer atitude observável e um limite para o próximo contato.'
		}
	]
});
export const launchFinancialTarotMethod = Object.freeze({
	id: 'financial-blocks-tarot',
	version: 'atv-launch-financial-blocks-tarot-method/1.0.0',
	positions: [
		{
			id: 'impasse',
			name: 'Impasse',
			function: 'Examinar o impasse concreto declarado, sem inventar condição financeira.'
		},
		{
			id: 'possible-block',
			name: 'Possível bloqueio',
			function: 'Formular uma hipótese simbólica a conferir nas ações relatadas.'
		},
		{
			id: 'first-step',
			name: 'Primeiro passo',
			function: 'Relacionar um passo observável aos recursos e limites declarados.'
		}
	]
});

type NatalScope = {
	version: string;
	bodies: readonly CelestialBody[];
	angles: readonly ('ascendant' | 'midheaven')[];
	houseCusps: readonly number[];
	contextKeys: readonly string[];
};
/** Candidate factual scopes, not a claim that these factors prove the thematic interpretation. */
export const launchNatalScopes: Readonly<
	Record<
		| 'sexuality-map'
		| 'intimacy-map'
		| 'emotional-reactions-map'
		| 'hidden-talent-map'
		| 'ascendant-style'
		| 'cohabitation-map',
		NatalScope
	>
> = {
	'sexuality-map': {
		version: 'atv-launch-sexuality-natal-factors/1.0.0',
		bodies: ['venus', 'mars'],
		angles: [],
		houseCusps: [],
		contextKeys: ['situations', 'preferences']
	},
	'intimacy-map': {
		version: 'atv-launch-intimacy-natal-factors/1.0.0',
		bodies: ['venus', 'mars'],
		angles: [],
		houseCusps: [],
		contextKeys: ['wish', 'boundaries', 'situation']
	},
	'emotional-reactions-map': {
		version: 'atv-launch-emotional-reactions-natal-factors/1.0.0',
		bodies: ['moon'],
		angles: [],
		houseCusps: [],
		contextKeys: ['trigger', 'reaction', 'effect']
	},
	'hidden-talent-map': {
		version: 'atv-launch-hidden-talent-natal-factors/1.0.0',
		bodies: ['sun', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'],
		angles: ['midheaven'],
		houseCusps: [2, 6, 10],
		contextKeys: ['favors', 'resources']
	},
	'ascendant-style': {
		version: 'atv-launch-ascendant-style-natal-factors/1.0.0',
		bodies: [],
		angles: ['ascendant'],
		houseCusps: [],
		contextKeys: ['occasion', 'wardrobe', 'comfort']
	},
	'cohabitation-map': {
		version: 'atv-launch-cohabitation-natal-factors/1.0.0',
		bodies: ['moon', 'mercury', 'venus', 'saturn'],
		angles: [],
		houseCusps: [4, 6],
		contextKeys: ['habits', 'expectation', 'friction']
	}
};

export type LaunchCalculatedFact = {
	id: string;
	kind: 'reported' | 'calculated' | 'drawn';
	display: string;
	source: string;
};
export type LaunchFactCalculation = {
	version: typeof LAUNCH_CALCULATION_VERSION;
	executionId: string;
	productId: LaunchFactualProductId;
	inputDigest: string;
	state: 'FACTS_READY_AWAITING_REVIEW';
	facts: LaunchCalculatedFact[];
	data: Record<string, unknown>;
	limits: string[];
	provenance: {
		calculation: 'experimental-astrology' | 'deterministic-tarot';
		persistence: 'required-before-reading';
		editorial: 'not-reviewed';
	};
};

const normalizedBirth = (birth: BirthInput): BirthInput => ({
	localDateTime:
		birth.localDateTime.length === 16 ? `${birth.localDateTime}:00` : birth.localDateTime,
	utcInstant: birth.utcInstant,
	timezone: birth.timezone,
	latitude: birth.latitude,
	longitude: birth.longitude,
	locationSource: birth.locationSource
});
const sourceFor = (chart: NatalChart) =>
	`${chart.provenance.provider}@${chart.provenance.providerVersion};${chart.provenance.algorithmVersion};${LAUNCH_CALCULATION_VERSION}`;
const chartFacts = (chart: NatalChart, prefix: string): LaunchCalculatedFact[] => [
	...chart.positions.map((position) => ({
		id: `${prefix}-${position.body}`,
		kind: 'calculated' as const,
		display: `${position.body}: longitude tropical ${position.longitude.toFixed(6)}°`,
		source: sourceFor(chart)
	})),
	...[
		{
			id: `${prefix}-ascendant`,
			kind: 'calculated' as const,
			display: `Ascendente: longitude tropical ${chart.houses.ascendant.toFixed(6)}°`,
			source: sourceFor(chart)
		}
	]
];

/** Same unbiased, bounded algorithm as the existing Tarot, with its own thematic method identity. */
async function drawLaunchTarot(
	method: typeof launchExTarotMethod | typeof launchFinancialTarotMethod,
	executionId: string,
	signal: AbortSignal
): Promise<MethodCard[]> {
	const seed = [
		LAUNCH_CALCULATION_VERSION,
		tarotMethodContract.drawAlgorithm,
		tarotMethodContract.deckVersion,
		method.version,
		method.id,
		executionId
	].join('|');
	let block = new Uint32Array(0),
		cursor = 0,
		counter = 0;
	const next = async (bound: number): Promise<number> => {
		const limit = Math.floor(0x100000000 / bound) * bound;
		for (let attempt = 0; attempt < 4096; attempt++) {
			signal.throwIfAborted();
			if (cursor === block.length) {
				const hash = await crypto.subtle.digest(
					'SHA-256',
					new TextEncoder().encode(`${seed}|${counter++}`)
				);
				const bytes = new DataView(hash);
				block = Uint32Array.from({ length: 8 }, (_, index) => bytes.getUint32(index * 4, false));
				cursor = 0;
			}
			const candidate = block[cursor++]!;
			if (candidate < limit) return candidate % bound;
		}
		throw new Error('launch_draw_exhausted');
	};
	const deck = [...tarotDeck];
	const cards: MethodCard[] = [];
	for (const [index, position] of method.positions.entries()) {
		const selected = index + (await next(deck.length - index));
		[deck[index], deck[selected]] = [deck[selected]!, deck[index]!];
		cards.push({
			position: index + 1,
			positionId: position.id,
			positionName: position.name,
			cardId: deck[index]!.id,
			name: deck[index]!.name,
			orientation: 'upright'
		});
	}
	signal.throwIfAborted();
	return cards;
}

async function calculateSevenDaySamples(
	startDate: string,
	signal: AbortSignal,
	provider: CaelusEphemerisProvider
): Promise<
	Omit<CalendarSamples, 'version'> & { version: 'atv-launch-seven-day-six-hour-samples/1.0.0' }
> {
	const version = 'atv-launch-seven-day-six-hour-samples/1.0.0';
	const first = Date.parse(`${startDate}T00:00:00.000Z`),
		end = first + 7 * 86400000;
	const inputTemplate = {
		timezone: 'UTC' as const,
		latitude: 0 as const,
		longitude: 0 as const,
		locationSource: 'internal-geocentric-reference/no-local-houses'
	};
	const rows: number[][] = [];
	let firstChart: NatalChart | undefined;
	for (let at = first; at < end; at += 21600000) {
		signal.throwIfAborted();
		const utcInstant = new Date(at).toISOString();
		const chart = await calculateValidatedChart(
			provider,
			{ ...inputTemplate, utcInstant, localDateTime: utcInstant.slice(0, 19) },
			signal
		);
		firstChart ??= chart;
		if (
			chart.provenance.provider !== firstChart.provenance.provider ||
			chart.provenance.providerVersion !== firstChart.provenance.providerVersion ||
			chart.provenance.algorithmVersion !== firstChart.provenance.algorithmVersion ||
			chart.provenance.referenceFrame !== firstChart.provenance.referenceFrame ||
			chart.provenance.zodiac !== firstChart.provenance.zodiac
		)
			throw new Error('launch_incompatible_sample_provenance');
		rows.push([
			at,
			...bodies.map((body) => chart.positions.find((position) => position.body === body)!.longitude)
		]);
	}
	if (!firstChart || rows.length !== 28) throw new Error('launch_incomplete_seven_day_samples');
	return {
		version,
		startDate,
		endDateExclusive: new Date(end).toISOString().slice(0, 10),
		stepHours: 6,
		timezone: 'UTC',
		bodies: [...bodies],
		source: `${sourceFor(firstChart)};${version}`,
		license: 'caelus@0.24.1/MIT',
		provenance: structuredClone(firstChart.provenance),
		inputTemplate,
		rows
	};
}

const signs = [
	'aries',
	'taurus',
	'gemini',
	'cancer',
	'leo',
	'virgo',
	'libra',
	'scorpio',
	'sagittarius',
	'capricorn',
	'aquarius',
	'pisces'
] as const;
const coordinate = (longitude: number) => ({
	longitude,
	sign: signs[Math.floor(longitude / 30)]!,
	degreeWithinSign: longitude % 30
});

/** Server-only factual E1. Persist the reserved UUID and result before any reading/delivery. */
export async function calculateLaunchFacts(
	value: unknown,
	executionId: string,
	signal: AbortSignal = AbortSignal.timeout(25000)
): Promise<LaunchFactCalculation> {
	signal.throwIfAborted();
	const input = parseLaunchInput(value);
	if (!input) throw new TypeError('invalid_launch_calculation_input');
	if (!canCalculateLaunchFacts(input.productId))
		throw new Error('launch_calculation_not_implemented');
	const prepared: LaunchPreparedEvidence = await prepareLaunchEvidence(input, executionId);
	const facts: LaunchCalculatedFact[] = [...prepared.facts];
	let data: Record<string, unknown>,
		limits: string[],
		calculation: LaunchFactCalculation['provenance']['calculation'];
	if (input.productId === 'ex-tarot' || input.productId === 'financial-blocks-tarot') {
		const method =
			input.productId === 'ex-tarot' ? launchExTarotMethod : launchFinancialTarotMethod;
		const cards = await drawLaunchTarot(method, prepared.executionId, signal);
		const source = `${tarotMethodContract.deckVersion};${tarotMethodContract.drawAlgorithm};${method.version};${method.id}`;
		facts.push(
			...cards.map((card) => ({
				id: `card-${card.position}`,
				kind: 'drawn' as const,
				display: `${card.positionName}: ${card.name} (posição direta)`,
				source
			}))
		);
		data = {
			method: structuredClone(method),
			deckVersion: tarotMethodContract.deckVersion,
			drawAlgorithm: tarotMethodContract.drawAlgorithm,
			executionId: prepared.executionId,
			reversals: false,
			replacement: false,
			drawStatus: 'UNPERSISTED',
			cards
		};
		limits = [
			'Sorteio ainda não persistido; não constitui leitura ou entrega.',
			...(input.productId === 'ex-tarot'
				? [
						'As cartas não comprovam sentimentos, intenções, acontecimentos ou arrependimento de outra pessoa.',
						'Astrologia do episódio não foi calculada; esta base contém somente Tarot e os relatos.'
					]
				: [
						'As cartas não comprovam a existência ou a causa de um bloqueio financeiro.',
						'Não prevê renda, retorno, resultado financeiro ou investimento; a hipótese e o passo ainda exigem revisão.'
					])
		];
		calculation = 'deterministic-tarot';
	} else {
		const provider = new CaelusEphemerisProvider({ requestCache: true });
		calculation = 'experimental-astrology';
		if (input.productId === 'wedding-date-map') {
			const options = input.answers.ceremonies as LaunchCeremonyOption[];
			const events = [];
			for (const [index, option] of options.entries()) {
				const chart = await calculateValidatedChart(provider, normalizedBirth(option), signal);
				const aspects = calculateAspects(chart.positions, launchEventAspectPolicy);
				const prefix = `option-${index + 1}`;
				facts.push(...chartFacts(chart, prefix));
				facts.push(
					...aspects.aspects.map((aspect, aspectIndex) => ({
						id: `${prefix}-aspect-${aspectIndex + 1}`,
						kind: 'calculated' as const,
						display: `${aspect.first} ${aspect.kind} ${aspect.second}; orbe ${aspect.orbDegrees.toFixed(6)}°`,
						source: `${sourceFor(chart)};${aspects.algorithmVersion};${launchEventAspectPolicy.id}/${launchEventAspectPolicy.version}`
					}))
				);
				events.push({ label: option.label, city: option.city, chart, aspects });
			}
			const declaredProfile = await buildLaunchWeddingProfile({
				executionId: prepared.executionId,
				inputDigest: prepared.inputDigest,
				options,
				events
			});
			facts.push(...declaredProfile.derivedFacts);
			data = {
				method: 'atv-launch-event-comparison/1.0.0',
				events,
				comparison: events.map(({ label, chart, aspects }) => ({
					label,
					utcInstant: chart.input.utcInstant,
					housesAvailable: chart.houses.status === 'ok',
					aspectsByKind: Object.fromEntries(
						launchEventAspectPolicy.aspects.map(({ kind }) => [
							kind,
							aspects.aspects.filter((aspect) => aspect.kind === kind).length
						])
					)
				})),
				declaredProfile,
				selectionStatus: declaredProfile.outcome,
				preferredOption: declaredProfile.preferredOptionId
			};
			limits = [
				...new Set(events.flatMap(({ chart }) => chart.provenance.warnings)),
				'Comparação geométrica experimental; contagens de aspectos não são notas de qualidade da data.',
				'Perfil simbólico original restrito ao início da cerimônia; a relação parcial permite empate e trocas sem inventar desempate.',
				'Casas indisponíveis não foram substituídas. Não há promessa sobre o resultado do casamento.'
			];
		} else if (
			input.productId === 'love-restart-map' ||
			input.productId === 'conversation-timing'
		) {
			const natal = await calculateValidatedChart(provider, normalizedBirth(input.birth!), signal);
			const startDate = input.answers.startDate as string;
			const sevenDays = input.productId === 'conversation-timing';
			const transitPolicy = sevenDays ? launchConversationAspectPolicy : launchTransitAspectPolicy;
			const samples = sevenDays
				? await calculateSevenDaySamples(startDate, signal, provider)
				: await calculateCalendarSamples(startDate, signal, provider, true);
			if (
				samples.provenance.referenceFrame !== natal.provenance.referenceFrame ||
				samples.provenance.zodiac !== natal.provenance.zodiac
			)
				throw new Error('launch_incompatible_chart_frames');
			const observations = samples.rows.map(([at, ...longitudes], index) => {
				signal.throwIfAborted();
				const positions: AspectPosition[] = bodies.map((body, positionIndex) => ({
					body,
					longitude: longitudes[positionIndex]!
				}));
				const geometry = calculateCrossAspects(positions, natal.positions, transitPolicy);
				const instant = new Date(at!).toISOString();
				return {
					id: `transit-sample-${index + 1}`,
					instant,
					positions,
					contacts: geometry.aspects.map(({ first, second, ...aspect }) => ({
						transit: first,
						natal: second,
						...aspect
					}))
				};
			});
			facts.push(...chartFacts(natal, 'natal'));
			for (const observation of observations)
				facts.push({
					id: observation.id,
					kind: 'calculated',
					display: `${observation.instant}: ${observation.contacts.length} contatos geométricos observados; política ${transitPolicy.id}/${transitPolicy.version}`,
					source: `${samples.source};atv-cross-major-aspects/1;data.observations.${observation.id}`
				});
			data = {
				method: sevenDays
					? 'atv-launch-conversation-seven-day-transit-observations/1.0.0'
					: 'atv-launch-thirty-day-transit-observations/1.0.0',
				natal,
				period: {
					startDate,
					endDateExclusive: samples.endDateExclusive,
					timezone: 'UTC',
					stepHours: 6,
					sampleCount: observations.length
				},
				samplesVersion: samples.version,
				sampleProvenance: samples.provenance,
				policy: structuredClone(transitPolicy),
				observations,
				motion: 'not-evaluated',
				exactEventSearch: 'not-performed',
				scenarios: 'not-produced',
				...(sevenDays
					? { selectionStatus: 'AWAITING_EDITORIAL_COMPARISON', preferredWindow: null }
					: {})
			};
			limits = [
				...new Set([...natal.provenance.warnings, ...samples.provenance.warnings]),
				`${sevenDays ? 'Sete' : 'Trinta'} dias civis UTC com amostras a cada seis horas; contatos entre amostras podem não aparecer.`,
				'Não calcula instantes exatos, aplicação/separação, probabilidades ou acontecimentos pessoais.',
				sevenDays
					? 'Nenhum horário foi recomendado; comparar falar e esperar exige método editorial e os limites reais declarados.'
					: 'Os três cenários e a interpretação do contexto ainda exigem composição e revisão próprias.'
			];
		} else {
			const scope = launchNatalScopes[input.productId];
			const natal = await calculateValidatedChart(provider, normalizedBirth(input.birth!), signal);
			const positions = natal.positions.filter(({ body }) => scope.bodies.includes(body));
			const selected = new Set(scope.bodies);
			const allAspects = calculateAspects(natal.positions, launchNatalAspectPolicy);
			const aspects = allAspects.aspects.filter(
				({ first, second }) => selected.has(first) || selected.has(second)
			);
			const angles = scope.angles.map((angle) => ({ angle, ...coordinate(natal.houses[angle]) }));
			const houseCusps =
				natal.houses.status === 'ok'
					? scope.houseCusps.map((house) => ({
							house,
							...coordinate(natal.houses.cusps[house - 1]!)
						}))
					: [];
			facts.push(
				...positions.map((position) => ({
					id: `natal-${position.body}`,
					kind: 'calculated' as const,
					display: `${position.body}: longitude tropical ${position.longitude.toFixed(6)}°`,
					source: `${sourceFor(natal)};${scope.version}`
				}))
			);
			facts.push(
				...angles.map(({ angle, longitude }) => ({
					id: `natal-${angle}`,
					kind: 'calculated' as const,
					display: `${angle}: longitude tropical ${longitude.toFixed(6)}°`,
					source: `${sourceFor(natal)};${scope.version}`
				}))
			);
			facts.push(
				...houseCusps.map(({ house, longitude }) => ({
					id: `natal-house-${house}`,
					kind: 'calculated' as const,
					display: `Cúspide da casa ${house}: longitude tropical ${longitude.toFixed(6)}°`,
					source: `${sourceFor(natal)};${scope.version}`
				}))
			);
			facts.push(
				...aspects.map((aspect, index) => ({
					id: `natal-selected-aspect-${index + 1}`,
					kind: 'calculated' as const,
					display: `${aspect.first} ${aspect.kind} ${aspect.second}; orbe ${aspect.orbDegrees.toFixed(6)}°`,
					source: `${sourceFor(natal)};${allAspects.algorithmVersion};${launchNatalAspectPolicy.id}/${launchNatalAspectPolicy.version};${scope.version}`
				}))
			);
			data = {
				method: scope.version,
				natal,
				scope: structuredClone(scope),
				factors: {
					positions: positions.map((position) => ({
						...position,
						...coordinate(position.longitude)
					})),
					angles,
					houseCusps
				},
				aspects: {
					algorithmVersion: allAspects.algorithmVersion,
					policy: allAspects.policy,
					pairsEvaluated: allAspects.pairsEvaluated,
					selection: 'at-least-one-declared-body',
					aspects,
					motion: allAspects.motion,
					inputPrecision: allAspects.inputPrecision
				},
				contextReferences: prepared.facts
					.filter((fact) =>
						scope.contextKeys.some((key) => fact.source.startsWith(`input.answers.${key}`))
					)
					.map((fact) => fact.id),
				interpretation: 'not-produced'
			};
			limits = [
				...natal.provenance.warnings,
				'O escopo temático seleciona coordenadas e geometria; não comprova preferências, habilidades, reações ou hábitos.',
				'Casas indisponíveis não são substituídas; ângulos calculados são preservados separadamente.',
				'Relacionar estes fatores aos relatos e produzir a entrega específica exige método editorial e revisão próprios.'
			];
		}
	}
	signal.throwIfAborted();
	return {
		version: LAUNCH_CALCULATION_VERSION,
		executionId: prepared.executionId,
		productId: input.productId as LaunchFactualProductId,
		inputDigest: prepared.inputDigest,
		state: 'FACTS_READY_AWAITING_REVIEW',
		facts,
		data,
		limits,
		provenance: { calculation, persistence: 'required-before-reading', editorial: 'not-reviewed' }
	};
}
