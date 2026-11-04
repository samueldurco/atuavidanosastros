import { calculateCrossAspects, type NatalChart, type AspectPolicy } from '@atv/astrology';
import {
	launchProductIds,
	launchSpecs,
	parseLaunchInput,
	prepareLaunchEvidence,
	tarotDeck,
	tarotMethodContract,
	type LaunchInput,
	type LaunchCeremonyOption,
	type MethodCard
} from '@atv/domain';
import {
	LAUNCH_CALCULATION_VERSION,
	launchExTarotMethod,
	launchTransitAspectPolicy,
	type LaunchFactCalculation
} from '../server/launch-calculation';
import { CANON_VERSION, bodyNames } from './reconstruction/canon';
import {
	TAROT_CANON_VERSION,
	TAROT_CANON_SOURCE_SHA256,
	tarotCanon
} from './reconstruction/tarot-canon';
import { temporalPairMeaning, temporalTargets } from './current/temporal-canon';
import {
	formatLaunchDate,
	formatLaunchUtcInstant,
	formatLaunchUtcPeriod
} from './launch-reading-dates';
import {
	additionalLaunchProductIds,
	additionalLaunchSurface,
	additionalSourceVersions,
	composeAdditionalLaunchReading,
	evaluateAdditionalLaunchReading
} from './launch-reading-products';
import {
	composeWeddingLaunchReading,
	evaluateWeddingLaunchReading,
	weddingReadingSourceVersions
} from './launch-reading-wedding';

export const LAUNCH_READING_VERSION = 'atv-launch-reading/1' as const;
export const LAUNCH_REVIEW_VERSION = 'atv-launch-reading-review/1' as const;
export const LAUNCH_EDITORIAL_POLICY_VERSION = 'atv-launch-private-editorial-policy/1' as const;
export const launchReadingProductIds = launchProductIds;
export const canComposeLaunchReading = (id: string): boolean =>
	launchReadingProductIds.some((productId) => productId === id);

export type LaunchReadingSection = {
	id: string;
	title: string;
	paragraphs: string[];
	evidenceIds: string[];
	sourceIds: string[];
};
export type LaunchReadingClaim = {
	id: string;
	sectionId: string;
	rule: string;
	evidenceIds: string[];
	factors: Record<string, string | number | string[]>;
	interpretation: string;
};
export type LaunchReading = {
	version: typeof LAUNCH_READING_VERSION;
	executionId: string;
	productId: LaunchInput['productId'];
	inputDigest: string;
	title: string;
	summary: string;
	sections: LaunchReadingSection[];
	claims: LaunchReadingClaim[];
	practicalAction: string;
	reflection: string;
	limits: string[];
	provenance: {
		policyVersion: typeof LAUNCH_EDITORIAL_POLICY_VERSION;
		calculationVersion: typeof LAUNCH_CALCULATION_VERSION;
		calculation: LaunchFactCalculation['provenance']['calculation'];
		sources: { id: string; version: string; origin: string }[];
		composition: 'local-versioned-editorial-corpus';
		externalModelCalled: false;
		persistence: 'server-must-load-persisted-facts-before-composition';
	};
};
export type LaunchReadingReview = {
	version: typeof LAUNCH_REVIEW_VERSION;
	status: 'APPROVED_FOR_PRIVATE_TEST' | 'REJECTED';
	policyVersion: typeof LAUNCH_EDITORIAL_POLICY_VERSION;
	checks: { id: string; passed: boolean; detail: string }[];
	reasons: string[];
	digest: string;
	provenance: {
		scope: 'private-editorial-consistency';
		calculation: LaunchFactCalculation['provenance']['calculation'];
		commercialPrecisionApproved: false;
		commercialReleaseApproved: false;
		storageAndAccessVerifiedBy: 'separate-server-and-database-gates';
	};
};

const canonical = (value: unknown): string => {
	if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
	if (value && typeof value === 'object')
		return `{${Object.keys(value)
			.sort()
			.map((key) => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`)
			.join(',')}}`;
	return JSON.stringify(value) ?? 'null';
};
/** Binding only. Editorial approval is evaluated separately below. Binary key sorting matches the intake. */
export async function launchReadingDigest(value: unknown): Promise<string> {
	const bytes = new TextEncoder().encode(canonical(value));
	return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))]
		.map((byte) => byte.toString(16).padStart(2, '0'))
		.join('');
}

const quoted = (value: unknown) => `“${String(value)}”`;
const answer = (input: LaunchInput, key: string): string => String(input.answers[key] ?? '');
const sourceIds = {
	tarot: TAROT_CANON_VERSION,
	temporal: `${CANON_VERSION}:temporal-pair-meanings`,
	launch: LAUNCH_EDITORIAL_POLICY_VERSION
};
const safetyLimits = [
	'Leitura simbólica para teste privado. Não comprova sentimentos, intenção, reciprocidade ou acontecimentos futuros.',
	'A revisão automática confere consistência editorial; o aceite pessoal E5 e a liberação comercial são etapas separadas.'
];
const experimentalLimits = [
	'Motor astrológico experimental. A bateria independente de precisão continua pendente; esta revisão não homologa precisão comercial.',
	'Os horários são amostras UTC, não janelas favoráveis nem momentos exatos. Não foram avaliadas aplicação, separação ou recepções.'
];

type ObservedContact = {
	transit: string;
	natal: string;
	kind: string;
	orbDegrees: number;
	separationDegrees?: number;
	exactAngleDegrees?: number;
};
type Observation = {
	id: string;
	instant: string;
	positions: { body: string; longitude: number }[];
	contacts: ObservedContact[];
};
type RestartData = {
	natal: NatalChart;
	period: {
		startDate: string;
		endDateExclusive: string;
		timezone: string;
		stepHours: number;
		sampleCount: number;
	};
	observations: Observation[];
	policy: AspectPolicy;
};
type SelectedContact = ObservedContact & { sampleId: string; instant: string; meaning: string };
const aspectPt: Record<string, string> = {
	conjunction: 'conjunção',
	sextile: 'sextil',
	square: 'quadratura',
	trine: 'trígono',
	opposition: 'oposição'
};
const allowedBodies = [
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
];
const validLongitude = (value: unknown): value is number =>
	typeof value === 'number' && Number.isFinite(value) && value >= 0 && value < 360;

async function validateBinding(
	value: unknown,
	calculation: LaunchFactCalculation
): Promise<LaunchInput> {
	const input = parseLaunchInput(value);
	if (!input || !canComposeLaunchReading(input.productId))
		throw new Error('launch_reading_method_not_implemented');
	const prepared = await prepareLaunchEvidence(input, calculation.executionId);
	if (
		calculation.version !== LAUNCH_CALCULATION_VERSION ||
		calculation.state !== 'FACTS_READY_AWAITING_REVIEW' ||
		calculation.productId !== input.productId ||
		calculation.inputDigest !== prepared.inputDigest ||
		new Set(calculation.facts.map((fact) => fact.id)).size !== calculation.facts.length ||
		prepared.facts.some(
			(fact) => !calculation.facts.some((actual) => canonical(actual) === canonical(fact))
		)
	)
		throw new Error('launch_reading_calculation_binding_invalid');
	return input;
}

function validatedExCards(calculation: LaunchFactCalculation): MethodCard[] {
	const data = calculation.data;
	if (
		calculation.provenance.calculation !== 'deterministic-tarot' ||
		canonical(data.method) !== canonical(launchExTarotMethod) ||
		data.deckVersion !== tarotMethodContract.deckVersion ||
		data.drawAlgorithm !== tarotMethodContract.drawAlgorithm ||
		data.executionId !== calculation.executionId ||
		data.reversals !== false ||
		data.replacement !== false ||
		!Array.isArray(data.cards) ||
		data.cards.length !== 3
	)
		throw new Error('launch_ex_method_invalid');
	const cards = data.cards as MethodCard[];
	if (
		new Set(cards.map((card) => card.cardId)).size !== 3 ||
		cards.some((card, index) => {
			const deckCard = tarotDeck.find((candidate) => candidate.id === card.cardId);
			const position = launchExTarotMethod.positions[index]!;
			return (
				!deckCard ||
				deckCard.name !== card.name ||
				card.orientation !== 'upright' ||
				card.position !== index + 1 ||
				card.positionId !== position.id ||
				card.positionName !== position.name ||
				!tarotCanon[card.cardId] ||
				!calculation.facts.some(
					(fact) =>
						fact.id === `card-${index + 1}` &&
						fact.kind === 'drawn' &&
						fact.display === `${card.positionName}: ${card.name} (posição direta)`
				)
			);
		})
	)
		throw new Error('launch_ex_cards_invalid');
	return cards;
}

function validatedRestartData(calculation: LaunchFactCalculation): RestartData {
	const data = calculation.data as unknown as RestartData;
	if (
		calculation.provenance.calculation !== 'experimental-astrology' ||
		!data.natal ||
		!data.period ||
		canonical(data.policy) !== canonical(launchTransitAspectPolicy) ||
		data.period.timezone !== 'UTC' ||
		data.period.sampleCount !== 120 ||
		data.period.stepHours !== 6 ||
		!Array.isArray(data.observations) ||
		data.observations.length !== 120 ||
		data.natal.positions.length !== 10 ||
		new Set(data.natal.positions.map(({ body }) => body)).size !== 10 ||
		data.natal.positions.some(
			({ body, longitude }) => !allowedBodies.includes(body) || !validLongitude(longitude)
		)
	)
		throw new Error('launch_restart_period_invalid');
	const start = Date.parse(`${data.period.startDate}T00:00:00Z`);
	if (new Date(start + 30 * 86400000).toISOString().slice(0, 10) !== data.period.endDateExclusive)
		throw new Error('launch_restart_period_invalid');
	for (const [index, observation] of data.observations.entries()) {
		if (
			observation.id !== `transit-sample-${index + 1}` ||
			Date.parse(observation.instant) !== start + index * 21600000 ||
			observation.positions.length !== 10 ||
			new Set(observation.positions.map(({ body }) => body)).size !== 10 ||
			observation.positions.some(
				({ body, longitude }) => !allowedBodies.includes(body) || !validLongitude(longitude)
			) ||
			!calculation.facts.some((fact) => fact.id === observation.id && fact.kind === 'calculated')
		)
			throw new Error('launch_restart_sample_invalid');
		const checked = calculateCrossAspects(
			observation.positions as Parameters<typeof calculateCrossAspects>[0],
			data.natal.positions,
			data.policy
		);
		const expected = checked.aspects.map(({ first, second, ...contact }) => ({
			transit: first,
			natal: second,
			...contact
		}));
		if (canonical(expected) !== canonical(observation.contacts))
			throw new Error('launch_restart_geometry_invalid');
	}
	return data;
}

type ExContext = {
	id: 'pressure' | 'silence' | 'repair-offer' | 'ambiguous';
	priority: string;
	action: string;
	test: string;
};
function exContext(input: LaunchInput): ExContext {
	const observed = answer(input, 'observedActions').toLocaleLowerCase('pt-BR');
	// Only affirmative observations can establish an offer or pressure. A negated
	// word ("não insistiu", "não pediu desculpas") is not evidence of that act.
	const clauses = observed
		.split(/[.!?;,\n]+|\b(?:mas|porém|contudo|entretanto|e)\b/u)
		.map((value) => value.trim())
		.filter(Boolean);
	const uncertain =
		/\b(?:talvez|supostamente|não sei|não lembro|não tenho certeza|não consigo confirmar|teria|poderia)\b/u;
	const affirmative = clauses.filter(
		(clause) =>
			!uncertain.test(clause) &&
			!/\b(?:não|nunca|jamais|nem|sem|deixou de|parou de)\b/u.test(clause)
	);
	const disrespect = clauses.some(
		(clause) =>
			!uncertain.test(clause) &&
			/\bnão\s+(?:(?:me|nos)\s+)?respeit(?:ou|a|ava|aram|am)\b/u.test(clause)
	);
	if (
		disrespect ||
		affirmative.some((clause) => /(insist|pression|ameaç|cobranç|desrespeit|invadi)/u.test(clause))
	)
		return {
			id: 'pressure',
			priority: 'preservar o limite antes de ampliar o contato',
			action:
				'Pause a resposta e escreva uma frase que comunique seu limite; só considere enviá-la se houver espaço seguro e vontade sua.',
			test: 'a pessoa aceita uma pausa sem insistir nem cobrar uma resposta'
		};
	const missingResponse = clauses.some(
		(clause) =>
			!uncertain.test(clause) &&
			(/\b(?:não|nunca)\s+(?:(?:me|nos)\s+)?(?:respondeu|responde|retornou|retorna)\b/u.test(
				clause
			) ||
				(!/\b(?:não|nunca|jamais|nem)\b/u.test(clause) &&
					/\b(?:sem resposta|deixou de responder)\b/u.test(clause)))
	);
	if (missingResponse || affirmative.some((clause) => /\b(?:silêncio|sumiu)\b/u.test(clause)))
		return {
			id: 'silence',
			priority: 'não transformar ausência de resposta em tarefa de convencer',
			action:
				'Registre a pergunta que ficou sem resposta e suspenda uma nova tentativa por agora; use esse intervalo para decidir o que depende de você.',
			test: 'surge uma resposta espontânea e concreta, sem você repetir o pedido'
		};
	if (
		affirmative.some((clause) =>
			/(desculp|repar|reconhec|assum|responsabil|combinou|propôs conversar|pediu para conversar)/u.test(
				clause
			)
		)
	)
		return {
			id: 'repair-offer',
			priority: 'conferir se a fala ganha continuidade em uma atitude combinada',
			action:
				'Se quiser responder, proponha uma conversa curta sobre um ponto concreto e pergunte qual atitude a pessoa se dispõe a sustentar.',
			test: 'a proposta vira uma atitude específica, combinada e respeitosa'
		};
	return {
		id: 'ambiguous',
		priority: 'esclarecer a intenção do contato antes de interpretá-lo como reparação',
		action:
			'Se quiser responder, rascunhe uma pergunta curta sobre o motivo do contato; espere uma resposta clara antes de ampliar a conversa.',
		test: 'a resposta esclarece o motivo do contato e respeita o ritmo que você comunicar'
	};
}

type RestartContext = {
	id: 'reconnection' | 'new-meetings' | 'reorganization';
	priority: string;
	bodies: string[];
	action: string;
	experiment: string;
};
function restartContext(input: LaunchInput): RestartContext {
	const desired = answer(input, 'desiredChange').toLocaleLowerCase('pt-BR');
	const situation = answer(input, 'situation').toLocaleLowerCase('pt-BR');
	const affirmed = (text: string) =>
		text
			.split(/[.!?;,\n]+|\b(?:mas|porém|contudo|entretanto|e)\b|(?=\bsem\b)/u)
			.map((clause) => clause.trim())
			.filter((clause) => clause && !/\b(?:não|nunca|jamais|nem|sem|talvez)\b/u.test(clause))
			.join('. ');
	const reconnection =
		/\b(?:reaproxim\w*|reconcil\w*)\b|\b(?:retom\w*|volt\w*)\s+(?:(?:a|o|um|uma)\s+)?(?:relação|relacionamento|namoro|casamento|contato|conversa)\b|\b(?:volt\w*|retom\w*)\s+(?:com|para|pro|pra)\s+(?:(?:o|a|meu|minha)\s+)*(?:ex\b|ex-parceir\w*)/u;
	const newMeetings =
		/(conhecer|conhec(er|endo) alguém|nov[oa]s? (pessoas|relaç|amor|encontros)|aplicativo|encontrar alguém)/u;
	const reorganization =
		/\b(?:superar|encerrar|elaborar|processar)\b|\b(?:ficar|estar)\s+(?:só|sozinh\w*)\b|\b(?:cuidar de mim|tempo para mim|meu ritmo|minha rotina)\b/u;
	const goal = affirmed(desired);
	// The requested change outranks a past situation. Ambiguous or negated
	// objectives fall back to personal reorganization instead of assuming return.
	const hasGoal = newMeetings.test(goal) || reconnection.test(goal) || reorganization.test(goal);
	const text = hasGoal
		? goal
		: /\b(?:não|nunca|jamais|nem)\b/u.test(desired)
			? ''
			: affirmed(situation);
	const wantsReconnection = reconnection.test(text),
		wantsNewMeetings = newMeetings.test(text);
	if (!reorganization.test(text) && wantsReconnection && !wantsNewMeetings)
		return {
			id: 'reconnection',
			priority: 'separar desejo de retomar de sinais concretos de reciprocidade',
			bodies: ['mercury', 'moon', 'venus', 'saturn', 'mars', 'sun'],
			action:
				'Escreva uma pergunta sobre o que precisaria ser diferente numa retomada; decida antes se quer fazê-la e qual resposta seria suficiente para continuar.',
			experiment:
				'uma conversa delimitada, somente se houver disposição dos dois, seguida da observação de um acordo concreto'
		};
	if (wantsNewMeetings && !wantsReconnection)
		return {
			id: 'new-meetings',
			priority: 'testar uma abertura nova sem antecipar compromisso ou compatibilidade',
			bodies: ['venus', 'mars', 'mercury', 'moon', 'sun', 'saturn'],
			action:
				'Escolha um ambiente ou convite de baixo compromisso que você realmente queira experimentar; depois registre se houve curiosidade, conforto e respeito ao seu limite.',
			experiment:
				'uma primeira aproximação curta em ambiente escolhido por você, sem obrigação de transformar o encontro em relação'
		};
	return {
		id: 'reorganization',
		priority: 'recuperar um ritmo próprio antes de aumentar a disponibilidade afetiva',
		bodies: ['moon', 'saturn', 'sun', 'venus', 'mercury', 'mars'],
		action:
			'Reserve um intervalo curto na semana para uma atividade sua e observe se a vontade de contato muda depois; só acrescente um convite se houver vontade própria.',
		experiment:
			'um intervalo de rotina escolhido por você, com registro do que repõe energia e do que apenas ocupa o silêncio'
	};
}

function selectRestartContacts(data: RestartData, context: RestartContext): SelectedContact[] {
	const candidates: SelectedContact[] = [];
	for (const observation of data.observations)
		for (const contact of observation.contacts) {
			if (!context.bodies.includes(contact.natal)) continue;
			let meaning: string;
			try {
				meaning = temporalPairMeaning({
					id: observation.id,
					transit: contact.transit,
					natal: contact.natal,
					aspect: contact.kind,
					orb: contact.orbDegrees
				});
			} catch {
				continue;
			} // Unsupported pairs never receive an invented interpretation.
			candidates.push({
				...contact,
				sampleId: observation.id,
				instant: observation.instant,
				meaning
			});
		}
	candidates.sort(
		(a, b) =>
			context.bodies.indexOf(a.natal) - context.bodies.indexOf(b.natal) ||
			a.orbDegrees - b.orbDegrees ||
			a.instant.localeCompare(b.instant) ||
			a.transit.localeCompare(b.transit)
	);
	const selected: SelectedContact[] = [];
	for (const candidate of candidates) {
		if (selected.some((contact) => contact.natal === candidate.natal)) continue;
		selected.push(candidate);
		if (selected.length === 3) return selected;
	}
	throw new Error('launch_restart_insufficient_distinct_supported_contacts');
}

function contactLabel(contact: SelectedContact): string {
	return `${bodyNames[contact.transit]} em trânsito em ${aspectPt[contact.kind]} com ${bodyNames[contact.natal]} natal`;
}
const section = (
	id: string,
	title: string,
	paragraphs: string[],
	evidenceIds: string[],
	sources: string[]
): LaunchReadingSection => ({
	id,
	title,
	paragraphs,
	evidenceIds: [...new Set(evidenceIds)],
	sourceIds: [...new Set(sources)]
});

/** The caller must first recover the server's persisted factual result. This module grants no access. */
export async function composeLaunchReading(
	value: unknown,
	calculation: LaunchFactCalculation
): Promise<LaunchReading> {
	const input = await validateBinding(value, calculation);
	const sections: LaunchReadingSection[] = [],
		claims: LaunchReadingClaim[] = [];
	const additionalLimits: string[] = [];
	let summary: string, practicalAction: string, reflection: string;
	const sources: LaunchReading['provenance']['sources'] = [
		{
			id: sourceIds.launch,
			version: LAUNCH_EDITORIAL_POLICY_VERSION,
			origin:
				'Método editorial original ATVNA P02; avaliação de consistência privada, sem homologação comercial.'
		}
	];
	if (additionalLaunchProductIds.some((id) => id === input.productId)) {
		const draft = composeAdditionalLaunchReading(input, calculation);
		sections.push(...draft.sections);
		claims.push(...draft.claims);
		sources.push(...draft.sources);
		additionalLimits.push(...draft.limits);
		summary = draft.summary;
		practicalAction = draft.practicalAction;
		reflection = draft.reflection;
	} else if (input.productId === 'ex-tarot') {
		const cards = validatedExCards(calculation),
			context = exContext(input);
		const meanings = cards.map((card) => tarotCanon[card.cardId]!);
		sources.push({
			id: sourceIds.tarot,
			version: TAROT_CANON_VERSION,
			origin: `Cânone local compilado do Livro 19, capítulos 3–7; SHA256 ${TAROT_CANON_SOURCE_SHA256}. Somente os verbetes das cartas usadas.`
		});
		summary = `Diante de ${quoted(answer(input, 'episode'))}, a prioridade desta leitura é ${context.priority}. As cartas oferecem três hipóteses de reflexão; o sinal decisivo continua sendo uma atitude observável.`;
		const roleText = [
			`Na posição Episódio, ${cards[0]!.name} serve como espelho do relato: ${meanings[0]!.core}. No campo afetivo, ${meanings[0]!.relationship}. Isso convida a comparar o que aconteceu com a interpretação que você está dando ao contato, sem acrescentar acontecimentos.`,
			`Na posição Hipótese a examinar, ${cards[1]!.name} coloca em teste ${meanings[1]!.core}. A possível armadilha é ${meanings[1]!.excess}. É uma hipótese sobre a sua leitura do episódio; não descreve o que a outra pessoa sente.`,
			`Na posição Critério de reparação, ${cards[2]!.name} propõe um recurso a experimentar: ${meanings[2]!.resource}. A pergunta da carta é ${meanings[2]!.action}. Concretamente, observe se ${context.test}; isso ainda não é prova de mudança duradoura.`
		];
		for (const [index, card] of cards.entries()) {
			const id = `card-position-${index + 1}`;
			const contextText =
				index === 0
					? `O que você efetivamente relata como atitude foi ${quoted(answer(input, 'observedActions'))}. Esse é o dado que pode ser conferido; saudade e intenção continuam desconhecidas.`
					: index === 1
						? `A sua pergunta é ${quoted(answer(input, 'question'))}. Antes de responder a ela, a prioridade prática é ${context.priority}.`
						: `O limite declarado é ${quoted(answer(input, 'boundaries'))}. Use esse limite para decidir se a atitude observada é suficiente para uma próxima conversa.`;
			sections.push(
				section(
					id,
					`${card.positionName}: ${card.name}`,
					[roleText[index]!, contextText],
					[
						`card-${index + 1}`,
						index === 0
							? 'reported-observedActions-1'
							: index === 1
								? 'reported-question-1'
								: 'reported-boundaries-1'
					],
					[sourceIds.tarot, sourceIds.launch]
				)
			);
			claims.push({
				id: `claim-card-${index + 1}`,
				sectionId: id,
				rule: ['episode-mirror', 'self-hypothesis', 'observable-repair'][index]!,
				evidenceIds: [`card-${index + 1}`],
				factors: {
					cardId: card.cardId,
					positionId: card.positionId,
					contextClass: context.id,
					sourceLine: meanings[index]!.sourceLine
				},
				interpretation: roleText[index]!
			});
		}
		const synthesis = `A primeira carta oferece ${meanings[0]!.resource}; a segunda alerta para ${meanings[1]!.excess}. A combinação pede que a abertura do episódio passe pelo recurso da terceira, ${meanings[2]!.resource}, em vez de transformar uma mensagem em conclusão sobre a relação. O critério concreto é verificar se ${context.test}, preservando ${quoted(answer(input, 'boundaries'))}.`;
		sections.push(
			section(
				'joint-reading',
				'Saudade, hipótese e reparação',
				[
					synthesis,
					'Saudade, culpa e desejo de retomar são possibilidades diferentes. Uma mensagem isolada não permite escolher entre elas. Reparação exige reconhecer um ponto concreto, combinar uma atitude e observar sua continuidade; a sua vontade de participar também conta.'
				],
				['card-1', 'card-2', 'card-3', 'reported-episode-1', 'reported-boundaries-1'],
				[sourceIds.tarot, sourceIds.launch]
			)
		);
		claims.push({
			id: 'claim-joint',
			sectionId: 'joint-reading',
			rule: 'resource-risk-criterion',
			evidenceIds: ['card-1', 'card-2', 'card-3'],
			factors: { cards: cards.map((card) => card.cardId), contextClass: context.id },
			interpretation: synthesis
		});
		practicalAction = `${context.action} Preserve o limite que você declarou: ${quoted(answer(input, 'boundaries'))}.`;
		reflection = `Que atitude concreta, além de uma mensagem, seria suficiente para você reconsiderar ${quoted(answer(input, 'question'))} sem abandonar o seu limite?`;
	} else if (input.productId === 'love-restart-map') {
		const data = validatedRestartData(calculation),
			context = restartContext(input),
			selected = selectRestartContacts(data, context);
		sources.push({
			id: sourceIds.temporal,
			version: CANON_VERSION,
			origin:
				'Cânone local original de pares trânsito/natal em current/temporal-canon.ts; significados simbólicos, sem previsão de acontecimentos.'
		});
		summary = `${formatLaunchUtcPeriod(data.period.startDate, data.period.endDateExclusive)}, o foco é ${context.priority}. Os 30 dias oferecem observações do céu para confrontar com ${quoted(answer(input, 'situation'))}; não determinam quando uma relação começará ou voltará.`;
		for (const [index, contact] of selected.entries()) {
			const id = `movement-${index + 1}`;
			const text = `${contactLabel(contact)}, observado em ${formatLaunchUtcInstant(contact.instant)}, com orbe de ${contact.orbDegrees.toFixed(3)}°. ${contact.meaning}`;
			const contextual = `Em relação a ${quoted(answer(input, 'desiredChange'))}, a questão é ${temporalTargets[contact.natal]!.choice}. Observe uma decisão sua ligada a ${temporalTargets[contact.natal]!.subject}; não use o contato para atribuir intenção a outra pessoa.`;
			sections.push(
				section(
					id,
					`${bodyNames[contact.natal]} natal: um tema a acompanhar`,
					[text, contextual],
					[contact.sampleId, `natal-${contact.natal}`, 'reported-desiredChange-1'],
					[sourceIds.temporal, sourceIds.launch]
				)
			);
			claims.push({
				id: `claim-movement-${index + 1}`,
				sectionId: id,
				rule: 'observed-transit-natal-relation',
				evidenceIds: [contact.sampleId, `natal-${contact.natal}`],
				factors: {
					transit: contact.transit,
					natal: contact.natal,
					aspect: contact.kind,
					orbDegrees: contact.orbDegrees,
					instant: contact.instant,
					contextClass: context.id
				},
				interpretation: text
			});
		}
		const calendar = Array.from({ length: 30 }, (_, day) => {
			const rows = data.observations.slice(day * 4, day * 4 + 4);
			const relevant = rows.flatMap((row) =>
				row.contacts.filter((contact) => context.bodies.slice(0, 3).includes(contact.natal))
			);
			const themes = [...new Set(relevant.map((contact) => bodyNames[contact.natal]))];
			return `${formatLaunchDate(rows[0]!.instant.slice(0, 10))} — quatro amostras às 00h, 06h, 12h e 18h UTC; ${relevant.length} contatos observados com ${themes.length ? themes.join(', ') : 'nenhum dos três fatores prioritários dentro do orbe adotado'}. Use o dia para registrar o que você escolheu e percebeu; a contagem não mede oportunidade amorosa.`;
		});
		sections.push(
			section(
				'thirty-day-calendar',
				'Calendário de observação: 30 dias',
				calendar,
				data.observations.map((row) => row.id),
				[sourceIds.launch]
			)
		);
		const scenarioDefinitions = [
			{
				id: 'silence',
				title: 'Se houver silêncio',
				condition: 'Se não houver contato ou se você preferir um intervalo',
				direction: `não preencha a ausência de informação com uma conclusão sobre a outra pessoa. Observe ${temporalTargets[selected[0]!.natal]!.subject} e preserve uma atividade que dependa da sua escolha`,
				evidence: selected[0]!
			},
			{
				id: 'contact',
				title: 'Se houver um primeiro contato',
				condition: 'Se surgir uma conversa ou você quiser fazer uma aproximação',
				direction: `comece com uma pergunta ou convite pequeno e confira se a resposta deixa espaço para você escolher. O experimento proposto é ${context.experiment}`,
				evidence: selected[1]!
			},
			{
				id: 'reapproach',
				title: 'Se houver reaproximação',
				condition: 'Se os dois demonstrarem vontade de retomar contato',
				direction: `conversem sobre uma diferença concreta em relação ao passado e observem se ela se sustenta em atitude. Compare o desejo de continuar com ${temporalTargets[selected[2]!.natal]!.choice}, sem tomar intensidade por acordo`,
				evidence: selected[2]!
			}
		];
		for (const scenario of scenarioDefinitions) {
			const paragraph = `${scenario.condition}, ${scenario.direction}. Esse cenário é uma possibilidade de postura, não uma ocorrência prevista por ${contactLabel(scenario.evidence)}. O limite a respeitar é ${quoted(answer(input, 'boundaries'))}.`;
			sections.push(
				section(
					`scenario-${scenario.id}`,
					scenario.title,
					[paragraph],
					[scenario.evidence.sampleId, 'reported-boundaries-1', 'reported-situation-1'],
					[sourceIds.temporal, sourceIds.launch]
				)
			);
			claims.push({
				id: `claim-scenario-${scenario.id}`,
				sectionId: `scenario-${scenario.id}`,
				rule: 'conditional-personal-scenario',
				evidenceIds: [scenario.evidence.sampleId, 'reported-boundaries-1'],
				factors: {
					scenario: scenario.id,
					natal: scenario.evidence.natal,
					contextClass: context.id
				},
				interpretation: paragraph
			});
		}
		const synthesis = `O tema de ${bodyNames[selected[0]!.natal]} pede atenção a ${temporalTargets[selected[0]!.natal]!.subject}; o de ${bodyNames[selected[1]!.natal]} acrescenta ${temporalTargets[selected[1]!.natal]!.subject}. Em vez de deixar uma só necessidade decidir tudo, confronte as duas com o desejo declarado de ${quoted(answer(input, 'desiredChange'))}. A prioridade prática é ${context.priority}; uma resposta diferente da esperada não invalida seu limite.`;
		sections.push(
			section(
				'integration',
				'Como se posicionar e o que observar',
				[
					synthesis,
					`Ao final de cada semana, registre uma escolha, uma resposta efetivamente recebida e uma informação que continua desconhecida. Para este contexto, experimente ${context.experiment}. No fim dos 30 dias, compare esses registros com o que você queria mudar; não use a passagem do período como prazo para outra pessoa responder.`
				],
				selected
					.flatMap((contact) => [contact.sampleId, `natal-${contact.natal}`])
					.concat('reported-desiredChange-1'),
				[sourceIds.temporal, sourceIds.launch]
			)
		);
		claims.push({
			id: 'claim-integration',
			sectionId: 'integration',
			rule: 'two-functions-context-integration',
			evidenceIds: selected.slice(0, 2).map((contact) => contact.sampleId),
			factors: {
				functions: selected.slice(0, 2).map((contact) => contact.natal),
				contextClass: context.id
			},
			interpretation: synthesis
		});
		practicalAction = `${context.action} Respeite o limite declarado: ${quoted(answer(input, 'boundaries'))}.`;
		reflection = `Que mudança observável em suas escolhas mostraria avanço em ${quoted(answer(input, 'desiredChange'))}, mesmo se não houver contato nestes 30 dias?`;
	} else {
		const draft = await composeWeddingLaunchReading(input, calculation);
		sections.push(...draft.sections);
		claims.push(...draft.claims);
		sources.push(...draft.sources);
		additionalLimits.push(...draft.limits);
		summary = draft.summary;
		practicalAction = draft.practicalAction;
		reflection = draft.reflection;
	}
	return {
		version: LAUNCH_READING_VERSION,
		executionId: calculation.executionId,
		productId: input.productId,
		inputDigest: calculation.inputDigest,
		title: launchSpecs[input.productId].title,
		summary,
		sections,
		claims,
		practicalAction,
		reflection,
		limits: [
			...safetyLimits,
			...additionalLimits,
			...(calculation.provenance.calculation === 'experimental-astrology'
				? experimentalLimits.slice(
						0,
						input.productId === 'love-restart-map' || input.productId === 'conversation-timing'
							? 2
							: 1
					)
				: []),
			...(input.productId === 'ex-tarot'
				? [
						'A tiragem considera o episódio e as cartas diretas; astrologia do episódio não foi calculada.'
					]
				: []),
			...(input.productId === 'wedding-date-map'
				? [
						'A comparação restrita ao início da cerimônia admite empate e trocas; não força uma data nem promete o resultado do casamento.'
					]
				: [])
		],
		provenance: {
			policyVersion: LAUNCH_EDITORIAL_POLICY_VERSION,
			calculationVersion: LAUNCH_CALCULATION_VERSION,
			calculation: calculation.provenance.calculation,
			sources,
			composition: 'local-versioned-editorial-corpus',
			externalModelCalled: false,
			persistence: 'server-must-load-persisted-facts-before-composition'
		}
	};
}

const includesAll = (text: string, clauses: string[]) =>
	clauses.every((clause) => text.includes(clause));
const asText = (reading: LaunchReading) =>
	[
		reading.summary,
		...reading.sections.flatMap((part) => part.paragraphs),
		reading.practicalAction,
		reading.reflection,
		...reading.limits
	].join('\n');

/** Rule-based semantic checks inspect meaning, roles, context, geometry and contract independently of composition equality. */
export async function evaluateLaunchReading(
	value: unknown,
	calculation: LaunchFactCalculation,
	reading: LaunchReading
): Promise<LaunchReadingReview> {
	const checks: LaunchReadingReview['checks'] = [];
	const check = (id: string, passed: boolean, detail: string) =>
		checks.push({ id, passed, detail });
	let input: LaunchInput | null = null;
	try {
		input = await validateBinding(value, calculation);
		check(
			'server-factual-binding',
			true,
			'Entrada consentida e relatos vinculados aos fatos do servidor.'
		);
	} catch {
		check(
			'server-factual-binding',
			false,
			'Entrada, cálculo, fatos relatados ou método sem vínculo válido.'
		);
	}
	const strings = (value: unknown): value is string[] =>
		Array.isArray(value) && value.every((item) => typeof item === 'string');
	const shape =
		!!reading &&
		reading.version === LAUNCH_READING_VERSION &&
		reading.executionId === calculation.executionId &&
		reading.productId === calculation.productId &&
		reading.inputDigest === calculation.inputDigest &&
		Array.isArray(reading.sections) &&
		reading.sections.every(
			(part) =>
				part &&
				typeof part.id === 'string' &&
				typeof part.title === 'string' &&
				strings(part.paragraphs) &&
				strings(part.evidenceIds) &&
				strings(part.sourceIds)
		) &&
		Array.isArray(reading.claims) &&
		reading.claims.every(
			(claim) =>
				claim &&
				typeof claim.id === 'string' &&
				typeof claim.sectionId === 'string' &&
				typeof claim.rule === 'string' &&
				typeof claim.interpretation === 'string' &&
				strings(claim.evidenceIds) &&
				claim.factors &&
				typeof claim.factors === 'object'
		) &&
		strings(reading.limits) &&
		reading.provenance &&
		Array.isArray(reading.provenance.sources) &&
		typeof reading.summary === 'string' &&
		typeof reading.practicalAction === 'string' &&
		typeof reading.reflection === 'string';
	check(
		'document-contract',
		shape,
		'Documento e identidade da edição devem corresponder ao produto e à execução.'
	);
	if (shape && input) {
		try {
			const authorized = await composeLaunchReading(input, calculation);
			check(
				'authorized-content-integrity',
				(await launchReadingDigest(authorized)) === (await launchReadingDigest(reading)),
				'Vínculo com a edição autorizada; este teste de integridade não substitui os critérios semânticos abaixo.'
			);
		} catch {
			check(
				'authorized-content-integrity',
				false,
				'Os fatos não permitem compor esta edição autorizada.'
			);
		}
		const facts = new Set(calculation.facts.map((fact) => fact.id));
		const declaredSources = new Set(reading.provenance?.sources?.map((source) => source.id));
		const productSources: [string, string][] =
			input.productId === 'ex-tarot'
				? [[sourceIds.tarot, TAROT_CANON_VERSION]]
				: input.productId === 'love-restart-map'
					? [[sourceIds.temporal, CANON_VERSION]]
					: input.productId === 'wedding-date-map'
						? []
						: additionalSourceVersions(input.productId);
		const permittedSources = new Map<string, string>([
			[sourceIds.launch, LAUNCH_EDITORIAL_POLICY_VERSION],
			...productSources,
			...(input.productId === 'wedding-date-map' ? weddingReadingSourceVersions : [])
		]);
		check(
			'finite-source-allowlist',
			reading.provenance.sources.length === permittedSources.size &&
				new Set(reading.provenance.sources.map((source) => source.id)).size ===
					permittedSources.size &&
				reading.provenance.sources.every(
					(source) => permittedSources.get(source.id) === source.version
				),
			'Somente o método local e os verbetes realmente usados podem ser fontes desta edição. Declarar uma fonte inventada não a torna válida.'
		);
		check(
			'evidence-and-sources',
			reading.sections.every(
				(part) =>
					part.evidenceIds.length > 0 &&
					part.evidenceIds.every((id) => facts.has(id)) &&
					part.sourceIds.length > 0 &&
					part.sourceIds.every((id) => declaredSources.has(id))
			) &&
				reading.claims.every(
					(claim) =>
						claim.evidenceIds.length > 0 &&
						claim.evidenceIds.every((id) => facts.has(id)) &&
						reading.sections.some(
							(part) =>
								part.id === claim.sectionId && part.paragraphs.includes(claim.interpretation)
						)
				),
			'Cada relação interpretada precisa de fatos existentes, fonte declarada e texto efetivamente visível.'
		);
		const paragraphs = reading.sections.flatMap((part) => part.paragraphs);
		check(
			'distinct-sections',
			new Set(reading.sections.map((part) => part.id)).size === reading.sections.length &&
				new Set(paragraphs).size === paragraphs.length &&
				paragraphs.every((text) => typeof text === 'string' && text.length > 40),
			'Capítulos devem acrescentar conteúdo próprio e não repetir um bloco para preencher o contrato.'
		);
		let expectedSurface: Record<string, number> = {};
		try {
			expectedSurface = additionalLaunchProductIds.some((id) => id === input.productId)
				? additionalLaunchSurface(input, calculation)
				: input.productId === 'ex-tarot'
					? { 'card-position-1': 2, 'card-position-2': 2, 'card-position-3': 2, 'joint-reading': 2 }
					: input.productId === 'love-restart-map'
						? {
								'movement-1': 2,
								'movement-2': 2,
								'movement-3': 2,
								'thirty-day-calendar': 30,
								'scenario-silence': 1,
								'scenario-contact': 1,
								'scenario-reapproach': 1,
								integration: 2
							}
						: Object.fromEntries(
								(input.answers.ceremonies as LaunchCeremonyOption[])
									.map((_, index) => [`option-${index + 1}`, 2])
									.concat([['declared-comparison', 2]])
							);
		} catch {
			/* Invalid facts receive a failed finite-surface check. */
		}
		check(
			'finite-editorial-surface',
			reading.sections.length === Object.keys(expectedSurface).length &&
				reading.sections.every((part) => expectedSurface[part.id] === part.paragraphs.length),
			'A edição tem superfície editorial finita; novos capítulos ou parágrafos livres exigem nova política e revisão.'
		);
		const text = asText(reading);
		check(
			'conditional-and-safe-language',
			!/(ele|ela|seu ex|sua ex) (te ama|sente saudade|vai voltar|se arrependeu)|garant(e|ido|ida) (o|a|que|renda)|destino inevitável|é certo que|data perfeita|melhor data|probabilidade de \d|ignore (todas|as) (as )?instruções|system prompt/iu.test(
				text
			),
			'Sem leitura de mente, certeza de evento, promessa de resultado ou execução de instruções dos relatos.'
		);
		check(
			'private-scope-and-precision',
			reading.provenance?.policyVersion === LAUNCH_EDITORIAL_POLICY_VERSION &&
				reading.provenance.calculationVersion === LAUNCH_CALCULATION_VERSION &&
				reading.provenance.calculation === calculation.provenance.calculation &&
				reading.provenance.externalModelCalled === false &&
				reading.provenance.composition === 'local-versioned-editorial-corpus' &&
				includesAll(text, safetyLimits) &&
				(calculation.provenance.calculation !== 'experimental-astrology' ||
					includesAll(
						text,
						experimentalLimits.slice(
							0,
							input.productId === 'love-restart-map' || input.productId === 'conversation-timing'
								? 2
								: 1
						)
					)),
			'Proveniência explícita: consistência privada não equivale a precisão comercial, deploy ou aceite E5.'
		);
		check(
			'contextual-usefulness',
			reading.practicalAction.includes(answer(input, 'boundaries')) ||
				input.productId === 'wedding-date-map',
			'A ação deve preservar o limite efetivamente relatado.'
		);
		check(
			'reflection',
			reading.reflection.endsWith('?') && reading.reflection.length > 40,
			'Pergunta concreta de reflexão, sem decidir pela pessoa.'
		);
		if (additionalLaunchProductIds.some((id) => id === input.productId)) {
			checks.push(...evaluateAdditionalLaunchReading(input, calculation, reading));
		} else if (input.productId === 'ex-tarot') {
			try {
				const cards = validatedExCards(calculation),
					context = exContext(input),
					meanings = cards.map((card) => tarotCanon[card.cardId]!);
				check(
					'thematic-tarot-method',
					true,
					'Três cartas únicas, diretas, nas posições temáticas corretas e com identidades preservadas.'
				);
				const required = cards.every((card, index) => {
					const claim = reading.claims.find(
						(candidate) => candidate.id === `claim-card-${index + 1}`
					);
					const part = reading.sections.find(
						(candidate) => candidate.id === `card-position-${index + 1}`
					);
					const role = ['episode-mirror', 'self-hypothesis', 'observable-repair'][index]!;
					const semanticClauses =
						index === 0
							? [meanings[index]!.core, meanings[index]!.relationship, 'espelho do relato']
							: index === 1
								? [
										meanings[index]!.core,
										meanings[index]!.excess,
										'não descreve o que a outra pessoa sente'
									]
								: [meanings[index]!.resource, meanings[index]!.action, context.test];
					return (
						!!claim &&
						!!part &&
						claim.rule === role &&
						claim.factors.cardId === card.cardId &&
						claim.factors.positionId === card.positionId &&
						claim.factors.contextClass === context.id &&
						claim.factors.sourceLine === meanings[index]!.sourceLine &&
						includesAll(claim.interpretation, semanticClauses) &&
						part.paragraphs.some((paragraph) =>
							paragraph.includes(
								index === 0
									? answer(input, 'observedActions')
									: index === 1
										? answer(input, 'question')
										: answer(input, 'boundaries')
							)
						)
					);
				});
				check(
					'positional-semantic-dependency',
					required,
					'Cada carta deve alterar a hipótese na função correta, com mecanismo próprio e confronto com o relato.'
				);
				const joint = reading.claims.find((claim) => claim.id === 'claim-joint');
				check(
					'joint-resource-risk-criterion',
					!!joint &&
						joint.rule === 'resource-risk-criterion' &&
						canonical(joint.factors.cards) === canonical(cards.map((card) => card.cardId)) &&
						includesAll(joint.interpretation, [
							meanings[0]!.resource,
							meanings[1]!.excess,
							meanings[2]!.resource,
							context.test,
							answer(input, 'boundaries')
						]),
					'Síntese contrasta recurso da primeira, risco da segunda e critério observável da terceira; IDs sozinhos não bastam.'
				);
				check(
					'context-changes-decision',
					includesAll(reading.summary, [context.priority, answer(input, 'episode')]) &&
						reading.practicalAction.includes(context.action) &&
						reading.reflection.includes(answer(input, 'question')),
					'Relatos diferentes precisam mudar a prioridade e a ação, preservando cartas e geometria.'
				);
				check(
					'consulted-canon',
					reading.provenance.sources.some(
						(source) =>
							source.id === sourceIds.tarot &&
							source.version === TAROT_CANON_VERSION &&
							source.origin.includes(TAROT_CANON_SOURCE_SHA256)
					),
					'Verbetes das cartas e fonte local consultada, sem alegação de pesquisa no runtime.'
				);
			} catch {
				check(
					'thematic-tarot-method',
					false,
					'Cartas, posições ou sorteio incompatíveis com o método.'
				);
			}
		} else if (input.productId === 'love-restart-map') {
			try {
				const data = validatedRestartData(calculation),
					context = restartContext(input),
					selected = selectRestartContacts(data, context);
				check(
					'normalized-temporal-geometry',
					true,
					'120 amostras reais de seis horas; todos os contatos conferidos geometricamente contra o natal.'
				);
				check(
					'exact-utc-observation-period',
					reading.summary.startsWith(
						`${formatLaunchUtcPeriod(data.period.startDate, data.period.endDateExclusive)},`
					),
					'O intervalo exibido preserva o início e o fim exclusivo à meia-noite UTC.'
				);
				const dependent = selected.every((contact, index) => {
					const claim = reading.claims.find(
						(candidate) => candidate.id === `claim-movement-${index + 1}`
					);
					const part = reading.sections.find(
						(candidate) => candidate.id === `movement-${index + 1}`
					);
					return (
						!!claim &&
						!!part &&
						claim.rule === 'observed-transit-natal-relation' &&
						claim.factors.transit === contact.transit &&
						claim.factors.natal === contact.natal &&
						claim.factors.aspect === contact.kind &&
						claim.factors.orbDegrees === contact.orbDegrees &&
						claim.factors.instant === contact.instant &&
						claim.factors.contextClass === context.id &&
						includesAll(claim.interpretation, [
							contactLabel(contact),
							formatLaunchUtcInstant(contact.instant),
							contact.orbDegrees.toFixed(3),
							contact.meaning
						]) &&
						part.paragraphs.some((paragraph) =>
							includesAll(paragraph, [
								answer(input, 'desiredChange'),
								temporalTargets[contact.natal]!.choice
							])
						)
					);
				});
				check(
					'transit-semantic-dependency',
					dependent,
					'Trânsito, alvo natal, aspecto e momento precisam sustentar a hipótese correta; retirar um fator retira a conclusão.'
				);
				const calendar = reading.sections.find((part) => part.id === 'thirty-day-calendar');
				check(
					'complete-thirty-day-calendar',
					!!calendar &&
						calendar.paragraphs.length === 30 &&
						calendar.evidenceIds.length === 120 &&
						calendar.paragraphs.every(
							(paragraph, index) =>
								paragraph.includes(
									formatLaunchDate(data.observations[index * 4]!.instant.slice(0, 10))
								) && paragraph.includes('contagem não mede oportunidade amorosa')
						),
					'Cada dia do intervalo tem quatro observações sem prometer janelas exatas ou favorecer contagens maiores.'
				);
				check(
					'three-conditional-scenarios',
					['silence', 'contact', 'reapproach'].every((id, index) => {
						const claim = reading.claims.find(
							(candidate) => candidate.id === `claim-scenario-${id}`
						);
						return (
							!!claim &&
							claim.factors.scenario === id &&
							claim.factors.natal === selected[index]!.natal &&
							claim.factors.contextClass === context.id &&
							includesAll(claim.interpretation, [
								contactLabel(selected[index]!),
								answer(input, 'boundaries'),
								'não uma ocorrência prevista'
							]) &&
							claim.interpretation.startsWith('Se ')
						);
					}),
					'Silêncio, contato e reaproximação são cenários de postura condicionais, nunca três previsões.'
				);
				const integration = reading.claims.find((claim) => claim.id === 'claim-integration');
				check(
					'multifactor-context-integration',
					!!integration &&
						canonical(integration.factors.functions) ===
							canonical(selected.slice(0, 2).map((contact) => contact.natal)) &&
						includesAll(integration.interpretation, [
							temporalTargets[selected[0]!.natal]!.subject,
							temporalTargets[selected[1]!.natal]!.subject,
							context.priority,
							answer(input, 'desiredChange')
						]) &&
						reading.practicalAction.includes(context.action) &&
						reading.summary.includes(context.priority),
					'Duas funções distintas alteram a síntese e a escolha prática conforme o contexto.'
				);
				check(
					'consulted-canon',
					reading.provenance.sources.some(
						(source) => source.id === sourceIds.temporal && source.version === CANON_VERSION
					),
					'Pares suportados pelo cânone temporal local; combinações sem fonte não são inventadas.'
				);
			} catch {
				check(
					'normalized-temporal-geometry',
					false,
					'Período, geometria ou variedade dos fatores não sustentam esta entrega.'
				);
			}
		} else {
			checks.push(...(await evaluateWeddingLaunchReading(input, calculation, reading)));
		}
	}
	const reasons = checks.filter((item) => !item.passed).map((item) => `${item.id}: ${item.detail}`);
	return {
		version: LAUNCH_REVIEW_VERSION,
		status: reasons.length ? 'REJECTED' : 'APPROVED_FOR_PRIVATE_TEST',
		policyVersion: LAUNCH_EDITORIAL_POLICY_VERSION,
		checks,
		reasons,
		digest: await launchReadingDigest(reading),
		provenance: {
			scope: 'private-editorial-consistency',
			calculation: calculation.provenance.calculation,
			commercialPrecisionApproved: false,
			commercialReleaseApproved: false,
			storageAndAccessVerifiedBy: 'separate-server-and-database-gates'
		}
	};
}
