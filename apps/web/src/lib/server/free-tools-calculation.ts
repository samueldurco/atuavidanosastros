import {
	CaelusEphemerisProvider,
	calculateAspects,
	engineContract,
	type CalculationInput,
	type EphemerisProvider,
	type NatalChart
} from '@atv/astrology';
import { tarotDeck, validDate } from '@atv/domain';
import type {
	FreeToolChart,
	FreeToolDreamInput,
	FreeToolFact,
	FreeToolId,
	FreeToolResult
} from '../free-tools';
import { FreeToolInputError, isFreeToolId } from '../free-tools';
export { FreeToolInputError, isFreeToolId } from '../free-tools';
import { buildNatalChartScene, chartSceneSvg } from '../trials/chart-engine-v2';
import { birthAspectPolicy } from '../natal-aspect-policy';
import { CANON_VERSION, signs, modernRulers } from '../trials/reconstruction/canon';
import {
	freeNatalPortrait,
	freeNatalSynthesis,
	freeRulerSection,
	freePairSection,
	freeCareerSections,
	freeMoneySections,
	FREE_INTERPRETATION_VERSION
} from './free-tool-interpretation';
import { TAROT_CANON_VERSION, tarotCanon } from '../trials/reconstruction/tarot-canon';
import { parseCalculationInput } from './midheaven';
import { composeCurrentSingleCard } from '../trials/current/symbolic-tarot';

const VERSION = 'atv-free-tool-result/1.0.0' as const;
const NATAL_METHOD = FREE_INTERPRETATION_VERSION;
const PAIR_METHOD = 'atv-public-pair-three-factors/2.0.0';
const TAROT_METHOD = 'atv-public-single-card/1.0.0';
const DREAM_METHOD = 'atv-public-dream-record/1.0.0';
const DECK_VERSION = 'atv-tarot-78/1.0.0';
const DRAW_ALGORITHM = 'sha256-counter-rejection-fisher-yates/1';
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const natalKeys = [
	'utcInstant',
	'localDateTime',
	'timezone',
	'latitude',
	'longitude',
	'locationSource'
];
const names: Record<string, string> = {
	sun: 'Sol',
	moon: 'Lua',
	mercury: 'Mercúrio',
	venus: 'Vênus',
	mars: 'Marte',
	jupiter: 'Júpiter',
	saturn: 'Saturno',
	uranus: 'Urano',
	neptune: 'Netuno',
	pluto: 'Plutão',
	ascendant: 'Ascendente',
	midheaven: 'Meio do Céu'
};
const titles: Record<FreeToolId, string> = {
	ascendente: 'Seu Ascendente',
	'mapa-astral': 'Seu mapa astral grátis',
	'meio-do-ceu': 'Seu Meio do Céu',
	'dinheiro-no-mapa': 'Dinheiro no seu mapa',
	'carta-do-dia': 'Sua Carta do Dia',
	'carta-do-amor': 'Sua Carta do Amor',
	'tarot-sim-ou-nao': 'Tarot para uma pergunta',
	'combinacao-do-casal': 'Combinação do casal',
	'registro-de-sonho': 'Seu registro de sonho'
};
const record = (value: unknown): value is Record<string, unknown> =>
	!!value && typeof value === 'object' && !Array.isArray(value);
const keysOnly = (value: Record<string, unknown>, allowed: readonly string[]) =>
	Object.keys(value).every((key) => allowed.includes(key));
const text = (value: unknown, max: number): value is string =>
	typeof value === 'string' &&
	!!value.trim() &&
	value.length <= max &&
	// eslint-disable-next-line no-control-regex -- Intentionally reject C0/C1 controls while allowing tabs and line breaks.
	!/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/.test(value) &&
	value.isWellFormed();
const angle = (value: unknown): value is number =>
	typeof value === 'number' && Number.isFinite(value) && value >= 0 && value < 360;

function natalInput(value: unknown): CalculationInput {
	const parsed = record(value) && keysOnly(value, natalKeys) ? parseCalculationInput(value) : null;
	if (!parsed) throw new FreeToolInputError('invalid_input');
	return parsed;
}
function houseAvailability(chart: NatalChart, input: CalculationInput) {
	return (
		chart.houses.status === 'ok' &&
		Math.abs(input.latitude) < engineContract.placidusAbsoluteLatitudeExclusive
	);
}
function longitude(chart: NatalChart, body: string): number {
	const found = chart.positions.find((position) => position.body === body);
	if (!found || !angle(found.longitude)) throw new Error('invalid_chart_position');
	return found.longitude;
}
function ascendant(chart: NatalChart, input: CalculationInput): number | null {
	if (!houseAvailability(chart, input)) return null;
	if (!angle(chart.houses.ascendant)) throw new Error('invalid_chart_ascendant');
	return chart.houses.ascendant;
}
function zodiac(longitude: number) {
	const sign = Math.floor(longitude / 30);
	// Truncate display only; rounding near a cusp could incorrectly label 30° within the previous sign.
	const displayedDegrees = Math.floor((longitude % 30) * 100) / 100;
	return { sign, name: signs[sign], position: `${signs[sign]} · ${displayedDegrees.toFixed(2)}°` };
}
function source(chart: NatalChart, method = NATAL_METHOD) {
	return `${chart.provenance.provider}@${chart.provenance.providerVersion};${chart.provenance.algorithmVersion};${method}`;
}
function natalFact(
	chart: NatalChart,
	body: string,
	value: number,
	prefix = '',
	method = NATAL_METHOD
): FreeToolFact {
	return {
		id: `${prefix}${body}`,
		label: `${prefix === 'person-a-' ? 'Pessoa A · ' : prefix === 'person-b-' ? 'Pessoa B · ' : ''}${names[body]}`,
		value: zodiac(value).position,
		kind: 'calculated',
		source: source(chart, method)
	};
}
const styleSection = freeNatalPortrait;
function natalLimits(chart: NatalChart) {
	return [
		...chart.provenance.warnings,
		`Zodíaco tropical; posições experimentais de ${chart.provenance.provider}@${chart.provenance.providerVersion}. Graus de exibição não garantem precisão.`,
		'O Ascendente depende da hora, do lugar e do fuso informados. Confira o offset histórico; este formulário não infere horário de verão.',
		`Reflexão simbólica introdutória do cânone ${CANON_VERSION}; não constitui diagnóstico nem descreve toda a personalidade.`
	];
}

/** Shared vector scene, built only from calculated positions and the natal aspect policy. */
function renderChart(chart: NatalChart, input: CalculationInput): FreeToolChart {
	const available = houseAvailability(chart, input);
	const positions = chart.positions.map((position) => ({
		body: position.body,
		name: names[position.body]!,
		longitude: longitude(chart, position.body)
	}));
	if (positions.length !== 10 || new Set(positions.map((position) => position.body)).size !== 10)
		throw new Error('invalid_chart_positions');
	const cusps = available ? [...chart.houses.cusps] : [];
	if (available && (cusps.length !== 12 || cusps.some((cusp) => !angle(cusp))))
		throw new Error('invalid_chart_houses');
	const asc = ascendant(chart, input);
	const mc = chart.houses.midheaven;
	if (!angle(mc)) throw new Error('invalid_chart_midheaven');
	const aspects = calculateAspects(chart.positions, birthAspectPolicy).aspects;
	const scene = buildNatalChartScene(
		{
			positions,
			angles: { ascendant: asc, midheaven: mc },
			houses: { status: available ? 'ok' : 'not-applicable', cusps },
			aspects: [...aspects],
			tracks: new Map()
		},
		{},
		{ title: 'Seu mapa astral', subtitle: 'Signos, planetas, casas e aspectos · zodíaco tropical' }
	);
	const svg = chartSceneSvg(scene);
	return {
		svg,
		positions,
		ascendant: asc,
		midheaven: mc,
		cusps,
		status: available ? 'ok' : 'not-applicable'
	};
}

async function drawCard(tool: 'carta-do-dia' | 'carta-do-amor' | 'tarot-sim-ou-nao', id: string) {
	// Same bounded rejection sampler as the existing Tarot method, with its own public method namespace.
	// UUID is server-created; focus, client IDs and card names never participate in the seed.
	const seed = [DRAW_ALGORITHM, DECK_VERSION, TAROT_METHOD, tool, id.toLowerCase()].join('|');
	const bound = tarotDeck.length;
	const limit = Math.floor(0x100000000 / bound) * bound;
	for (let counter = 0; counter < 512; counter++) {
		const digest = new DataView(
			await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${seed}|${counter}`))
		);
		for (let offset = 0; offset < digest.byteLength; offset += 4) {
			const candidate = digest.getUint32(offset, false);
			if (candidate < limit) return tarotDeck[candidate % bound]!;
		}
	}
	throw new Error('draw_exhausted');
}
function dreamInput(value: unknown): FreeToolDreamInput {
	const strings = (v: unknown, max: number): v is string[] =>
		Array.isArray(v) && v.length <= 8 && v.every((item) => text(item, max));
	if (
		!record(value) ||
		!keysOnly(value, ['date', 'narrative', 'emotions', 'associations']) ||
		!validDate(value.date) ||
		!text(value.narrative, 6000) ||
		!strings(value.emotions, 80) ||
		!strings(value.associations, 200)
	)
		throw new FreeToolInputError('invalid_input');
	return {
		date: value.date,
		narrative: value.narrative,
		emotions: [...value.emotions],
		associations: [...value.associations]
	};
}

/** Anonymous computation only. No database, private test runtime, model call, storage grant or paid product state. */
export async function calculateFreeToolResult(
	tool: string,
	value: unknown,
	options: { provider?: EphemerisProvider; uuid?: () => string; now?: () => Date } = {}
): Promise<FreeToolResult> {
	if (!isFreeToolId(tool)) throw new FreeToolInputError('invalid_tool');
	const id = (options.uuid ?? (() => crypto.randomUUID()))();
	if (!uuidPattern.test(id)) throw new Error('invalid_server_execution_id');
	const result: FreeToolResult = {
		version: VERSION,
		id: id.toLowerCase(),
		tool,
		createdAt: (options.now ?? (() => new Date()))().toISOString(),
		title: titles[tool],
		summary: '',
		facts: [],
		sections: [],
		limits: []
	};
	if (tool === 'registro-de-sonho') {
		const dream = dreamInput(value);
		result.summary =
			'Seu relato está organizado com a data, as emoções e as associações que você informou.';
		result.facts = [
			{
				id: 'dream-date',
				label: 'Data do sonho',
				value: dream.date,
				kind: 'reported',
				source: 'input.date'
			},
			...dream.emotions.map((value, i): FreeToolFact => ({
				id: `emotion-${i + 1}`,
				label: 'Emoção relatada',
				value,
				kind: 'reported',
				source: `input.emotions[${i}]`
			})),
			...dream.associations.map((value, i): FreeToolFact => ({
				id: `association-${i + 1}`,
				label: 'Associação pessoal',
				value,
				kind: 'reported',
				source: `input.associations[${i}]`
			}))
		];
		result.sections = [
			{ id: 'narrative', title: 'Seu relato', body: dream.narrative },
			{
				id: 'emotions',
				title: 'Emoções que você relatou',
				body: dream.emotions.length ? dream.emotions.join('\n') : 'Nenhuma emoção foi informada.'
			},
			{
				id: 'associations',
				title: 'Suas associações pessoais',
				body: dream.associations.length
					? dream.associations.join('\n')
					: 'Nenhuma associação foi informada.'
			}
		];
		result.limits = [
			`Registro fiel ao relato (${DREAM_METHOD}); nenhum significado, emoção ou diagnóstico foi calculado.`,
			'Esta leitura não analisa seu histórico nem identifica recorrências. As associações são as que você informou.',
			'O registro e os dados informados ficam associados à sua identificação para releitura e controle das utilizações gratuitas, sem publicação ou compartilhamento.'
		];
		return result;
	}
	if (tool === 'carta-do-dia' || tool === 'carta-do-amor' || tool === 'tarot-sim-ou-nao') {
		if (
			!record(value) ||
			!keysOnly(value, ['focus']) ||
			(value.focus !== undefined && !text(value.focus, 400)) ||
			(tool === 'tarot-sim-ou-nao' && !text(value.focus, 400))
		)
			throw new FreeToolInputError('invalid_input');
		const card = await drawCard(tool, result.id);
		const meaning = tarotCanon[card.id];
		if (!meaning || meaning.name !== card.name) throw new Error('invalid_card_canon');
		const interpretation = composeCurrentSingleCard(
			card.id,
			value.focus as string | undefined,
			tool === 'carta-do-dia' ? 'day' : tool === 'carta-do-amor' ? 'love' : 'question'
		);
		result.summary = interpretation.summary;
		result.facts = [
			{
				id: 'card-1',
				label: 'Carta sorteada',
				value: `${card.name} · posição direta`,
				kind: 'drawn',
				source: `${DECK_VERSION};${DRAW_ALGORITHM};${TAROT_METHOD}`
			},
			...(value.focus === undefined
				? []
				: [
						{
							id: 'focus',
							label: tool === 'tarot-sim-ou-nao' ? 'Sua pergunta' : 'Seu foco',
							value: value.focus as string,
							kind: 'reported' as const,
							source: 'input.focus'
						}
					])
		];
		result.sections = interpretation.sections;
		result.draw = {
			cardId: card.id,
			name: card.name,
			orientation: 'upright',
			deckVersion: DECK_VERSION,
			algorithmVersion: DRAW_ALGORITHM
		};
		result.limits = [
			`Cânone ${TAROT_CANON_VERSION}. Leitura simbólica para reflexão; não comprova acontecimentos.`,
			...(tool === 'carta-do-amor'
				? [
						'A carta não revela sentimentos ou intenções de outra pessoa. Considere seus próprios relatos e o que foi conversado entre vocês.'
					]
				: []),
			'A carta não decide por você e não calcula uma resposta binária. O resultado não afirma um sim ou um não.',
			'Uma carta de um baralho de 78, sorteada no servidor, sem carta invertida. Sua pergunta não altera o sorteio.',
			'Esta ferramenta conserva a mesma carta durante o dia, no horário de Brasília. Você pode reler sem novo sorteio. Carta do Dia e Carta do Amor têm limites diários independentes.'
		];
		return result;
	}
	if (tool === 'combinacao-do-casal') {
		if (
			!record(value) ||
			!keysOnly(value, ['first', 'second', 'consent']) ||
			value.consent !== true
		)
			throw new FreeToolInputError('invalid_input');
		// Validate both civil inputs before any provider work.
		const first = natalInput(value.first),
			second = natalInput(value.second);
		const provider = options.provider ?? new CaelusEphemerisProvider();
		const charts = [await provider.calculate(first), await provider.calculate(second)] as const;
		const a = ascendant(charts[0], first),
			b = ascendant(charts[1], second);
		if (a === null || b === null) throw new FreeToolInputError('ascendant_unavailable');
		result.summary =
			'Uma primeira comparação do Sol, da Lua e do Ascendente para conversar sobre direção, cuidado e aproximação.';
		const factors = ['sun', 'moon', 'ascendant'] as const;
		for (const [i, chart] of charts.entries()) {
			for (const factor of factors)
				result.facts.push(
					natalFact(
						chart,
						factor,
						factor === 'ascendant' ? (i === 0 ? a : b) : longitude(chart, factor),
						i === 0 ? 'person-a-' : 'person-b-',
						PAIR_METHOD
					)
				);
		}
		result.sections = factors.map((factor) =>
			freePairSection(
				factor,
				factor === 'ascendant' ? a : longitude(charts[0], factor),
				factor === 'ascendant' ? b : longitude(charts[1], factor)
			)
		);
		result.limits = [
			...new Set(charts.flatMap(natalLimits)),
			'Esta comparação introdutória não calcula aspectos entre mapas nem uma pontuação de compatibilidade e não afirma sentimentos, intenções ou destino da relação.',
			'Sua declaração não verifica a identidade das pessoas. Os dados e a leitura ficam associados à sua identificação para releitura e controle das utilizações gratuitas, sem publicação ou compartilhamento.'
		];
		return result;
	}
	const input = natalInput(value);
	const chart = await (options.provider ?? new CaelusEphemerisProvider()).calculate(input);
	const asc = ascendant(chart, input);
	result.limits = natalLimits(chart);
	if (tool === 'meio-do-ceu') {
		const mc = chart.houses.midheaven;
		if (!angle(mc)) throw new Error('invalid_chart_midheaven');
		const { name } = zodiac(mc);
		result.summary = `Seu Meio do Céu está em ${name}.`;
		result.facts = [natalFact(chart, 'midheaven', mc)];
		result.sections = freeCareerSections(mc);
		result.limits.push(
			'Esta introdução considera o Meio do Céu por signo. Não determina uma profissão; o mapa completo reúne outros fatores.'
		);
		return result;
	}
	if (tool === 'dinheiro-no-mapa') {
		if (!houseAvailability(chart, input)) throw new FreeToolInputError('houses_unavailable');
		const cusp = chart.houses.cusps[1];
		if (!angle(cusp)) throw new Error('invalid_chart_second_house');
		const { name, sign } = zodiac(cusp);
		const ruler = modernRulers[sign]!;
		result.summary = `Sua Casa 2 começa em ${name}.`;
		result.facts = [
			{
				id: 'house-2',
				label: 'Início da Casa 2',
				value: zodiac(cusp).position,
				kind: 'calculated',
				source: source(chart)
			},
			{
				...natalFact(chart, ruler, longitude(chart, ruler)),
				label: `${names[ruler]} · regente moderno de ${name}`
			}
		];
		result.sections = freeMoneySections(cusp, names[ruler]!, longitude(chart, ruler));
		result.limits.push(
			'Esta introdução à Casa 2 não prevê renda, ganhos ou perdas e não orienta investimentos. O mapa completo reúne outros fatores.'
		);
		return result;
	}
	if (tool === 'ascendente') {
		if (asc === null) throw new FreeToolInputError('ascendant_unavailable');
		result.summary = `Seu Ascendente está em ${zodiac(asc).name}.`;
		const ruler = modernRulers[zodiac(asc).sign]!;
		result.facts = [
			natalFact(chart, 'ascendant', asc),
			natalFact(chart, ruler, longitude(chart, ruler))
		];
		result.sections = [
			styleSection('ascendant', asc),
			freeRulerSection(asc, names[ruler]!, longitude(chart, ruler))
		];
		return result;
	}
	const sun = longitude(chart, 'sun'),
		moon = longitude(chart, 'moon');
	result.summary = `Sol em ${zodiac(sun).name}, Lua em ${zodiac(moon).name}${asc === null ? '; Ascendente indisponível para estas coordenadas' : ` e Ascendente em ${zodiac(asc).name}`}.`;
	result.facts = chart.positions.map((position) =>
		natalFact(chart, position.body, position.longitude)
	);
	if (asc !== null) result.facts.push(natalFact(chart, 'ascendant', asc));
	result.facts.push(natalFact(chart, 'midheaven', chart.houses.midheaven));
	result.sections = [
		freeNatalSynthesis(sun, moon),
		styleSection('sun', sun),
		styleSection('moon', moon),
		...(asc === null
			? [
					{
						id: 'ascendant-unavailable',
						title: 'Ascendente e casas indisponíveis',
						body: 'O contrato não disponibiliza casas Placidus e Ascendente para estes dados. Nenhum sistema alternativo foi usado. Sol, Lua e demais posições permanecem na mandala.'
					}
				]
			: [styleSection('ascendant', asc)])
	];
	result.chart = renderChart(chart, input);
	return result;
}
