import {
	bodies,
	type AspectCalculation,
	type AspectPosition,
	type CrossAspectCalculation
} from '@atv/astrology';
import type { CalculationSnapshot, WorkflowInput } from '@atv/domain';
import type { TrialReading } from '../reading';
import { offerNames20261015 } from '../offer-names';
import { bodyNames } from '../reconstruction/canon';
import { aspectNames, assertDateProjection, DATE_VERSION } from '../reconstruction/date-facts';
import { normalizeFactGraph, type FactGraph, type Position } from '../reconstruction/fact-graph';
import {
	assertWeekProjection,
	WEEK_VERSION,
	type WeekContact,
	type WeekDay
} from '../reconstruction/week-facts';
import {
	assertCalendarProjection,
	PERIOD_VERSION,
	type CalendarWindow
} from '../reconstruction/calendar-facts';
import { thirtyDaySelection } from '../reconstruction/thirty-day';
import {
	assertSolarProjection,
	SOLAR_VERSION,
	solarHouseAt,
	type SolarMonth
} from '../reconstruction/solar-facts';
import {
	temporalNarrative,
	temporalContext,
	temporalPairMeaning,
	temporalSharedTarget,
	temporalTargets,
	temporalNatalModifier,
	type TemporalContact
} from './temporal-canon';
import { annualHouseInterplay } from './temporal-houses';
import { careerAspectNuance, careerContactMeaning, careerPeriodSynthesis } from './temporal-career';
import { temporalReadableLimits } from './temporal-limits';

export const CURRENT_TEMPORAL_VERSION = 'atv-current-reading/1.0.0';
type Evidence = { section: number; claim: string; factIds: string[]; relation: string };
type CurrentTemporalReading = TrialReading & {
	interpretation: {
		version: 'atv-interpretation-evidence/1';
		family: string;
		conclusions: Evidence[];
	};
};
type Meaning = { claim: string; factIds: string[]; relation: string };
const unique = (ids: string[]) => [...new Set(ids)];
const date = (value: string) => value.slice(0, 10).split('-').reverse().join('/');
const slow = new Set(['jupiter', 'saturn', 'uranus', 'neptune', 'pluto']);
const geometryAngles: Record<string, number> = {
	conjunction: 0,
	sextile: 60,
	square: 90,
	trine: 120,
	opposition: 180
};

function builder(input: WorkflowInput, calculation: CalculationSnapshot, opening: string) {
	const facts = new Map(calculation.facts.map((f) => [f.id, f]));
	const reading: CurrentTemporalReading = {
		version: CURRENT_TEMPORAL_VERSION,
		productId: input.productId,
		title: offerNames20261015[input.productId as keyof typeof offerNames20261015],
		opening,
		source:
			'Interpretação simbólica ATVNA a partir das posições e relações calculadas nesta edição. O mapa dá uma linguagem à dinâmica; não confirma acontecimentos da sua vida nem determina suas escolhas.',
		sections: [],
		questions: [],
		practice: '',
		limits: temporalReadableLimits(calculation.limits),
		interpretation: {
			version: 'atv-interpretation-evidence/1',
			family: 'temporal',
			conclusions: []
		}
	};
	const add = (title: string, text: string, ids: string[], meanings: Meaning[] = []) => {
		const factIds = unique([...ids, ...meanings.flatMap((m) => m.factIds)]);
		for (const id of factIds)
			if (!facts.has(id)) throw new Error(`Referência temporal ausente: ${id}`);
		const section = reading.sections.length;
		for (const meaning of meanings) {
			if (!text.includes(meaning.claim)) throw new Error('Conclusão temporal fora da seção.');
			reading.interpretation.conclusions.push({
				section,
				...meaning,
				factIds: unique(meaning.factIds)
			});
		}
		reading.sections.push({ title, text, factIds });
	};
	const references = () => {
		const ids = unique(reading.sections.flatMap((s) => s.factIds)).filter(
			(id) => facts.get(id)?.kind === 'calculated'
		);
		add('Referências desta leitura', ids.map((id) => facts.get(id)!.display).join('\n'), ids);
	};
	return { reading, add, references };
}

function receiver(graph: FactGraph, c: TemporalContact) {
	const p = graph.positions.find((p) => p.body === c.natal);
	if (!p) throw new Error(`Alvo natal indisponível: ${c.natal}`);
	return p;
}
function score(c: TemporalContact, graph: FactGraph, input: WorkflowInput) {
	const context = temporalContext(input.context, input.productId === 'career-forecast-30d');
	const p = receiver(graph, c);
	return (
		(context.bodies.includes(p.body) ? 4 : 0) +
		(context.houses.includes(p.house ?? 0) ? 3 : 0) +
		(slow.has(c.transit) ? 2 : 0) +
		Math.max(0, 2 - c.orb)
	);
}
function rank(contacts: TemporalContact[], graph: FactGraph, input: WorkflowInput, count = 5) {
	return [...contacts]
		.sort((a, b) => score(b, graph, input) - score(a, graph, input) || a.id.localeCompare(b.id))
		.slice(0, count);
}
function declaredContext(
	input: WorkflowInput,
	graph: FactGraph,
	lead: TemporalContact | undefined
) {
	// A product focus is not evidence that the person declared that same concern.
	const context = temporalContext(input.context);
	if (!context.declared || !graph.contextFactId || !lead) return null;
	if (
		input.productId === 'career-forecast-30d' &&
		!['money', 'routine', 'career'].includes(context.key)
	)
		return null;
	const p = receiver(graph, lead);
	const claim = `Ao dar prioridade a ${context.topic}, este contato ganha uma aplicação particular: ${temporalTargets[p.body].subject} participa da escolha que você trouxe.`;
	return {
		claim,
		text: `${claim} ${context.application || 'O relato orienta a prioridade da leitura, enquanto a dinâmica descrita vem do encontro entre o trânsito e o mapa natal.'} ${temporalPairMeaning(lead).split(/(?<=[.!?])\s+/)[0]}`,
		factIds: [graph.contextFactId, lead.id, p.factId],
		relation: `Contexto declarado muda a prioridade e a aplicação de ${lead.transit}→${lead.natal}; não modifica o cálculo.`
	};
}

/** Checks shared presence on the preserved grid; a first/last range alone proves no simultaneity. */
export function temporalCommonSampleCount(
	a: TemporalContact,
	b: TemporalContact,
	natal: Position,
	rows: number[][],
	rowBodies: readonly string[]
) {
	if (a.natal !== b.natal || a.natal !== natal.body) return 0;
	const ai = rowBodies.indexOf(a.transit) + 1,
		bi = rowBodies.indexOf(b.transit) + 1;
	if (!ai || !bi) return 0;
	const inside = (longitude: number, aspect: string) => {
		const distance = Math.abs(longitude - natal.longitude);
		return Math.abs(Math.min(distance, 360 - distance) - geometryAngles[aspect]) <= 2;
	};
	return rows.filter((row) => inside(row[ai], a.aspect) && inside(row[bi], b.aspect)).length;
}

function addShared(
	b: ReturnType<typeof builder>,
	selected: TemporalContact[],
	graph: FactGraph,
	proof: (
		a: TemporalContact,
		c: TemporalContact,
		p: Position
	) => { count: number; ids: string[]; label: string }
) {
	const used = new Set<string>();
	for (const [i, a] of selected.entries()) {
		if (used.has(a.natal)) continue;
		const c = selected
			.slice(i + 1)
			.find(
				(c) =>
					c.natal === a.natal &&
					c.transit !== a.transit &&
					proof(a, c, receiver(graph, a)).count > 0
			);
		if (!c) continue;
		const p = receiver(graph, a),
			meaning = temporalSharedTarget(a, c, p)!;
		const observed = proof(a, c, p);
		meaning.factIds.push(...observed.ids);
		meaning.relation += ` ${observed.label}; ${observed.count} amostra(s) comum(ns).`;
		b.add(
			`Quando duas influências chegam a ${bodyNames[a.natal]}`,
			`${meaning.claim}\n\n${observed.label}. Essa convergência ajuda a compreender por que a mesma área pode pedir movimentos diferentes ao mesmo tempo.`,
			meaning.factIds,
			[meaning]
		);
		used.add(a.natal);
		if (used.size === 2) break;
	}
}

function composeDate(input: WorkflowInput, calculation: CalculationSnapshot): TrialReading {
	const contactReading = temporalNarrative();
	assertDateProjection(input, calculation);
	const graph = normalizeFactGraph(calculation.data.natal as CalculationSnapshot);
	const geometry = calculation.data.transitGeometry as CrossAspectCalculation;
	const positions = (calculation.data.second as { positions: AspectPosition[] }).positions;
	const contacts: TemporalContact[] = geometry.aspects.map((a, i) => {
		const longitude = positions.find((p) => p.body === a.first)!.longitude;
		return {
			id: `date-transit-${i}`,
			transit: a.first,
			natal: a.second,
			aspect: a.kind,
			orb: a.orbDegrees,
			transitSign: {
				sign: Math.floor(longitude / 30),
				factId: `sample-${a.first}`,
				instant: String(calculation.data.sampleInstant)
			}
		};
	});
	const selected = rank(contacts, graph, input, 6);
	const b = builder(
		input,
		calculation,
		`O que merece atenção em ${date(input.targetDate!)}? Esta leitura aproxima o retrato celeste das 12h UTC do seu mapa natal, para compreender como diferentes necessidades podem se encontrar nessa amostra.`
	);
	if (!selected.length) {
		const absence: Meaning = {
			claim:
				'Nenhuma relação entre os dez corpos da amostra e os dez corpos natais entrou no orbe de 2° dos cinco aspectos considerados.',
			factIds: [
				'sample-instant',
				...positions.map((position) => `sample-${position.body}`),
				...graph.positions.map((position) => position.factId)
			],
			relation:
				'A projeção validada compara as vinte posições preservadas com a política da data e retorna zero contatos. A conclusão se limita a essa ausência no instante da amostra.'
		};
		b.add(
			'Uma amostra sem contatos no recorte escolhido',
			`${absence.claim} Essa ausência limita a interpretação desta amostra; não descreve como será a data nem permite preenchê-la com uma previsão genérica.`,
			absence.factIds,
			[absence]
		);
	}
	for (const c of selected) {
		const meaning = contactReading(c, receiver(graph, c));
		b.add(meaning.title, meaning.text, ['sample-instant', ...meaning.factIds], [meaning]);
	}
	addShared(b, selected, graph, () => ({
		count: 1,
		ids: ['sample-instant'],
		label: `Os dois contatos estão presentes na mesma amostra de ${date(input.targetDate!)} às 12h UTC`
	}));
	const context = declaredContext(input, graph, selected[0]);
	if (context) b.add('A data e o motivo que você trouxe', context.text, context.factIds, [context]);
	b.reading.practice = selected.length
		? `Ao pensar nessa data, a leitura destaca ${temporalTargets[selected[0].natal].subject}. A interpretação descreve uma dinâmica; a importância da ocasião e os compromissos envolvidos pertencem à sua história.`
		: '';
	b.references();
	return b.reading;
}

function composeWeek(input: WorkflowInput, calculation: CalculationSnapshot): TrialReading {
	const contactReading = temporalNarrative();
	assertWeekProjection(input, calculation);
	const graph = normalizeFactGraph(calculation.data.natal as CalculationSnapshot);
	const contacts = calculation.data.contacts as WeekContact[],
		days = calculation.data.days as WeekDay[];
	const normalized = contacts.map((c) => ({
		id: c.id,
		transit: c.transit,
		natal: c.natal,
		aspect: c.aspect,
		orb: c.minOrb
	}));
	const selected = rank(normalized, graph, input, 6);
	const source = (c: TemporalContact) => contacts.find((w) => w.id === c.id)!;
	const b = builder(
		input,
		calculation,
		`Entre ${date(days[0].date)} e ${date(days.at(-1)!.date)}, a leitura acompanha o que insiste e o que muda de acento. A diferença entre uma presença repetida e uma passagem breve ajuda a dar proporção às decisões da semana.`
	);
	const persistent = selected.filter((c) => source(c).observedHours >= 120);
	const brief = selected.filter((c) => source(c).observedHours < 120);
	for (const c of [...persistent, ...brief]) {
		const w = source(c),
			p = receiver(graph, c),
			meaning = contactReading(c, p);
		const lastDate =
			w.lastObserved.slice(0, 10) > days.at(-1)!.date ? days.at(-1)!.date : w.lastObserved;
		const interval =
			date(w.firstObserved) === date(lastDate)
				? `em ${date(w.firstObserved)}`
				: `entre ${date(w.firstObserved)} e ${date(lastDate)}`;
		const timing =
			w.observedHours >= 120
				? 'A presença deste contato ao longo de boa parte da semana dá continuidade ao tema: há espaço para elaborá-lo em mais de uma situação.'
				: `Este contato se concentra ${interval} nos registros da semana. Ele acrescenta um acento mais breve ao período, sem definir sozinho o sentido dos demais dias.`;
		const timingMeaning = {
			claim: timing,
			factIds: [w.id, 'week-period'],
			relation: 'Persistência observada na grade horária, sem extrapolação de duração contínua.'
		};
		b.add(
			`${w.observedHours >= 120 ? 'O que permanece em pauta' : 'Uma mudança de acento'} — ${bodyNames[c.transit]} e ${bodyNames[c.natal]}`,
			`${meaning.text}\n\n${timing}`,
			meaning.factIds,
			[meaning, timingMeaning]
		);
	}
	if (!selected.length)
		b.add(
			'O alcance desta semana',
			'A grade não encontrou contatos no recorte de aspectos e orbe adotado. Não há base para atribuir uma dinâmica temporal específica à semana a partir deste cálculo.',
			['week-period']
		);
	const base = calculation.data.base as CalculationSnapshot;
	const rows = (base.data.rows as [number, number[], string, number][])
		.filter((row) => row[0] % 3_600_000 === 0)
		.map((row) => [row[0], ...row[1]]);
	addShared(b, selected, graph, (a, c, p) => {
		const count = temporalCommonSampleCount(a, c, p, rows, bodies);
		return {
			count,
			ids: ['week-period'],
			label:
				count >= 120
					? 'Os dois contatos acompanham juntos boa parte da semana'
					: 'Os dois contatos coincidem em parte dos registros desta semana'
		};
	});
	const phases = [days.slice(0, 2), days.slice(2, 5), days.slice(5)];
	const phaseGroups: {
		indexes: number[];
		days: typeof days;
		focus: TemporalContact[];
		key: string;
	}[] = [];
	for (const [index, phase] of phases.entries()) {
		const ranked = selected
			.map((c) => ({
				c,
				observations: source(c)
					.days.filter((day) => phase.some((p) => p.date === day.date))
					.reduce((sum, day) => sum + day.observedHours, 0)
			}))
			.filter((v) => v.observations > 0)
			.sort((a, c) => c.observations - a.observations || a.c.id.localeCompare(c.c.id));
		const focus = ranked.slice(0, 2).map(({ c }) => c);
		const key = focus
			.map((c) => c.id)
			.sort()
			.join('|');
		const previous = phaseGroups.at(-1);
		if (previous?.key === key) {
			previous.indexes.push(index);
			previous.days.push(...phase);
		} else phaseGroups.push({ indexes: [index], days: [...phase], focus, key });
	}
	const presentedPhases = new Set<string>();
	for (const group of phaseGroups) {
		const { focus } = group;
		const phase = group.days;
		const phaseName =
			group.indexes.length === 3
				? 'Ao longo da semana'
				: group.indexes.map((index) => ['Começo', 'Meio', 'Fechamento'][index]).join(' e ') +
					' da semana';
		const returning = presentedPhases.has(group.key);
		presentedPhases.add(group.key);
		const texts = focus.map((c) =>
			returning
				? `Neste trecho, ${bodyNames[c.transit]} com ${bodyNames[c.natal]} volta ao centro da seleção. A leitura retoma ${temporalTargets[c.natal].subject}, depois da mudança de ênfase dos dias anteriores.`
				: `${bodyNames[c.transit]} com ${bodyNames[c.natal]} mantém em pauta ${temporalTargets[c.natal].subject}. ${temporalPairMeaning(c).split(/(?<=[.!?])\s+/)[0]}`
		);
		b.add(
			`${phaseName} — ${date(phase[0].date)} a ${date(phase.at(-1)!.date)}`,
			texts.length
				? texts.join('\n\n')
				: 'Os contatos selecionados não entram no orbe nas observações deste trecho. O recorte não sustenta atribuir a ele um novo tema ou acontecimento.',
			phase
				.map((d) => `week-day-${days.indexOf(d) + 1}`)
				.concat(focus.flatMap((c) => [c.id, receiver(graph, c).factId]))
		);
	}
	const context = declaredContext(input, graph, selected[0]);
	if (context)
		b.add('Onde a semana encontra sua prioridade', context.text, context.factIds, [context]);
	b.reading.practice =
		persistent.length && brief.length
			? `A presença repetida de ${bodyNames[persistent[0].transit]} com ${bodyNames[persistent[0].natal]} dá continuidade ao tema, enquanto ${bodyNames[brief[0].transit]} com ${bodyNames[brief[0].natal]} acrescenta um acento mais concentrado. Um momento mais urgente não precisa decidir sozinho o rumo que você está construindo.`
			: selected.length
				? `A leitura desta semana destaca ${temporalTargets[selected[0].natal].subject}. A continuidade da escolha pode importar mais do que responder com a mesma urgência a cada variação do período.`
				: '';
	b.references();
	return b.reading;
}

function composePeriod(input: WorkflowInput, calculation: CalculationSnapshot): TrialReading {
	assertCalendarProjection(input, calculation);
	const selection = thirtyDaySelection(input, calculation);
	const { data, graph, days, background, career } = selection;
	const natalIntroduced = new Set<string>();
	const houseIntroduced = new Set<number>();
	const aspectIntroduced = new Set<string>();
	const contactReading = career
		? (c: TemporalContact, p: Position) => {
				const meaning = careerContactMeaning(c, p);
				const nuance = aspectIntroduced.has(c.aspect) ? '' : careerAspectNuance(c.aspect);
				aspectIntroduced.add(c.aspect);
				const claim = `${meaning.claim}${nuance ? ` ${nuance}` : ''}`;
				const key = `${p.body}:${c.aspect === 'square' || c.aspect === 'opposition' ? 'tension' : 'connection'}`;
				const showNatal = !natalIntroduced.has(key);
				const showHouse = p.house !== null && !houseIntroduced.has(p.house);
				natalIntroduced.add(key);
				if (p.house !== null) houseIntroduced.add(p.house);
				return {
					...meaning,
					claim,
					text: `${showHouse ? meaning.text.replace(meaning.claim, claim) : claim}${showNatal ? `\n\n${temporalNatalModifier(p, c.aspect, false)}` : ''}`
				};
			}
		: temporalNarrative();
	const selectedWindows = unique([
		...background.map((w) => w.id),
		...days.flatMap((d) => d.signals.map((s) => s.window.id))
	]).map((id) => data.windows.find((w) => w.id === id)!);
	const normalize = (w: CalendarWindow): TemporalContact => ({
		id: w.id,
		transit: w.transit,
		natal: w.natal,
		aspect: w.aspect,
		orb: w.minOrb
	});
	const selected = selectedWindows.map(normalize);
	const b = builder(
		input,
		calculation,
		career
			? `De ${date(data.days[0].date)} a ${date(data.days.at(-1)!.date)}, o foco é a relação entre ambição, recursos e capacidade de sustentar o trabalho. Os contatos com o mapa natal ajudam a compreender onde ampliar, negociar ou dar medida ao esforço.`
			: `De ${date(data.days[0].date)} a ${date(data.days.at(-1)!.date)}, esta leitura acompanha a relação entre suas prioridades e os movimentos que mudam de acento. O calendário distingue temas presentes ao longo do período de passagens que concentram atenção em algumas datas.`
	);
	for (const w of background) {
		const c = normalize(w),
			meaning = contactReading(c, receiver(graph, c));
		const claim = `${bodyNames[w.transit]} com ${bodyNames[w.natal]} acompanha os 30 dias nos registros calculados. A continuidade desse contato coloca em pauta ${temporalTargets[w.natal].subject}: uma decisão pode ganhar clareza à medida que você a amadurece, em vez de depender de uma única data.`;
		b.add(
			career
				? `Um compromisso que acompanha o trabalho — ${bodyNames[w.transit]} em ${aspectNames[w.aspect]} com ${bodyNames[w.natal]}`
				: `Um tema que atravessa os 30 dias — ${bodyNames[w.transit]} em ${aspectNames[w.aspect]} com ${bodyNames[w.natal]}`,
			`${claim}\n\n${meaning.text}`,
			['calendar-period', ...meaning.factIds],
			[
				meaning,
				{
					claim,
					factIds: [w.id, receiver(graph, c).factId, 'calendar-period'],
					relation:
						'Presença em todas as 120 amostras; continuidade editorial limitada ao período observado.'
				}
			]
		);
	}
	if (!background.length)
		b.add(
			'O ritmo deste período',
			'Nenhum contato com destaque suficiente para o tema aparece em todas as 120 amostras. A leitura ganha forma pelas passagens datadas abaixo; não há um único trânsito selecionado que justifique dar o mesmo tom aos 30 dias.',
			['calendar-period']
		);
	const themeKey = (w: CalendarWindow) => `${w.transit}:${w.natal}:${w.aspect}`;
	const introduced = new Set(background.map(themeKey));
	const observedWindows = new Set(background.map((w) => w.id));
	const stages = {
		entry: 'Entrada observada',
		peak: 'Menor distância angular observada',
		exit: 'Saída observada'
	};
	for (const { day, signals } of days) {
		if (!signals.length) continue;
		const meanings: Meaning[] = [];
		const ids: string[] = [`calendar-day-${day.date}`];
		const paragraphs = signals.map(({ event, window: w }) => {
			const c = normalize(w),
				p = receiver(graph, c),
				meaning = contactReading(c, p);
			ids.push(...meaning.factIds, event.id);
			const phase = `${stages[event.kind]} de ${bodyNames[w.transit]} em ${aspectNames[w.aspect]} com ${bodyNames[w.natal]} natal.`;
			const returningWindow = !observedWindows.has(w.id);
			observedWindows.add(w.id);
			if (!introduced.has(themeKey(w))) {
				introduced.add(themeKey(w));
				meanings.push(meaning);
				return `${phase}\n${meaning.text}`;
			}
			const reminder = (career ? meaning.claim : temporalPairMeaning(c, false)).split(
				/(?<=[.!?])\s+/
			)[0];
			const callback = `${returningWindow ? 'Uma nova passagem retoma a dinâmica já apresentada. ' : ''}${reminder} ${
				event.kind === 'exit'
					? 'A passagem chega ao fim do recorte calculado; aquilo que ganhou forma pode continuar nas escolhas e nos acordos construídos durante esses dias.'
					: event.kind === 'entry'
						? 'O tema volta a aparecer no calendário: a continuidade está na questão que ele coloca, e não na suposição de que os mesmos acontecimentos se repetirão.'
						: 'A data marca a maior aproximação observada nesta passagem. Vale situá-la dentro do tema em desenvolvimento, sem exigir que uma decisão inteira se resolva neste dia.'
			}`;
			meanings.push({
				claim: callback,
				factIds: [w.id, p.factId, event.id],
				relation:
					'Retomada da combinação já interpretada, situada na fase e na janela calculadas, sem repetir sua exposição integral.'
			});
			return `${phase}\n${callback}`;
		});
		b.add(
			`${date(day.date)} — ${career ? 'trabalho, recursos e decisões' : 'contatos em destaque'}`,
			paragraphs.join('\n\n'),
			ids,
			meanings
		);
	}
	addShared(b, selected, graph, (a, c, p) => {
		const count = temporalCommonSampleCount(a, c, p, data.samples.rows, data.samples.bodies);
		return {
			count,
			ids: ['calendar-period'],
			label: 'Os dois contatos se encontram em parte deste período'
		};
	});
	const context = declaredContext(input, graph, rank(selected, graph, input, 1)[0]);
	if (context)
		b.add(
			career ? 'O sentido profissional dessa combinação' : 'O período e a questão que você trouxe',
			context.text,
			context.factIds,
			[context]
		);
	const quiet = days.filter((d) => !d.signals.length).map((d) => date(d.day.date));
	if (quiet.length)
		b.add(
			'Datas sem um novo destaque selecionado',
			`${quiet.join(', ')}. A seleção não acrescenta um novo sinal nessas datas; isso não significa ausência de experiências ou fim dos temas de continuidade.`,
			[
				'calendar-period',
				...days.filter((d) => !d.signals.length).map((d) => `calendar-day-${d.day.date}`)
			]
		);
	const marks = input.calendarMarks?.entries ?? [];
	if (marks.length)
		b.add(
			'As datas que você marcou',
			marks.map((mark) => `${date(mark.date)} — ${mark.label}`).join('\n') +
				'\nEssas ocasiões foram informadas por você. Sua presença no calendário organiza a consulta e não aumenta o peso astrológico da data.',
			marks.map((_, i) => `reported-mark-${i + 1}`)
		);
	const careerSynthesis = career
		? careerPeriodSynthesis(
				(background.length ? background.map(normalize) : selected).map((contact) => ({
					contact,
					natal: receiver(graph, contact)
				}))
			)
		: null;
	if (careerSynthesis)
		b.add(
			'O que essa combinação acrescenta às decisões de trabalho',
			careerSynthesis.text,
			careerSynthesis.factIds,
			[careerSynthesis]
		);
	b.reading.practice = careerSynthesis
		? ''
		: 'O calendário pode acompanhar suas escolhas sem ocupar o lugar delas. Uma passagem concentrada oferece um acento; os temas recorrentes ajudam a compreender o que merece tempo para amadurecer.';
	b.references();
	return b.reading;
}

function composeSolar(input: WorkflowInput, calculation: CalculationSnapshot): TrialReading {
	const contactReading = temporalNarrative();
	assertSolarProjection(input, calculation);
	const graph = normalizeFactGraph(calculation.data.natal as CalculationSnapshot);
	const annual = calculation.data.annualGeometry as AspectCalculation;
	const overlay = calculation.data.natalGeometry as CrossAspectCalculation;
	const positions = calculation.data.returnPositions as AspectPosition[];
	const houses = calculation.data.returnHouses as { status: string; cusps: number[] };
	const months = calculation.data.months as SolarMonth[];
	const b = builder(
		input,
		calculation,
		`O ano do retorno solar é lido em duas escalas: a carta calculada para o seu aniversário astronômico organiza os temas do ciclo; as observações ao longo dos meses mostram como alguns contatos mudam de presença. Uma escala dá sentido à outra sem transformar cada mês em um destino.`
	);
	const annualPosition = (body: string): Position => {
		const p = positions.find((p) => p.body === body)!;
		return {
			...p,
			sign: Math.floor(p.longitude / 30),
			house: houses.status === 'ok' ? solarHouseAt(p.longitude, houses.cusps) : null,
			retrograde: false,
			factId: `return-${body}`
		};
	};
	const sun = annualPosition('sun'),
		moon = annualPosition('moon');
	const annualIds = (p: Position) => [p.factId, ...(p.house ? [`return-house-${p.house}`] : [])];
	const introducedHousePassages = new Set<string>();
	const annualTheme = annualHouseInterplay(sun, moon, undefined, introducedHousePassages);
	const claim =
		annualTheme?.claim ??
		'Sem casas anuais disponíveis, o ciclo não pode ser localizado em áreas específicas da vida. A leitura se apoia nos signos e nas relações calculadas entre os corpos, sem deduzir uma casa para completar o texto.';
	const moonDescription = temporalNatalModifier(moon, 'conjunction').replace(
		'Lua natal',
		'Lua do retorno'
	);
	b.add(
		'O que você quer desenvolver e o que precisa sustentar',
		`${claim}\n\nO Sol retorna por definição à longitude solar natal; repetir seu signo não distingue este ano de todos os outros. ${moonDescription}`,
		['solar-cycle', ...annualIds(sun), ...annualIds(moon)],
		[
			{
				claim,
				factIds: [...annualIds(sun), ...annualIds(moon)],
				relation:
					'Casa anual solar × casa anual lunar: direção e sustentação emocional, sem confundir casas anuais e natais.'
			}
		]
	);
	const annualAspects = annual.aspects
		.map((a, i) => ({ a, i }))
		.sort((a, c) => {
			const relevance = (v: typeof a) =>
				[v.a.first, v.a.second].filter((body) =>
					['sun', 'moon', ...temporalContext(input.context).bodies].includes(body)
				).length;
			return relevance(c) - relevance(a) || a.a.orbDegrees - c.a.orbDegrees;
		})
		.slice(0, 4);
	for (const { a, i } of annualAspects) {
		const c: TemporalContact = {
			id: `solar-annual-${i}`,
			transit: a.first,
			natal: a.second,
			aspect: a.kind,
			orb: a.orbDegrees
		};
		const p = annualPosition(a.second),
			claim = temporalPairMeaning(c),
			houseMeaning = annualHouseInterplay(
				annualPosition(a.first),
				p,
				a.kind,
				introducedHousePassages
			);
		const text = `${bodyNames[a.first]} e ${bodyNames[a.second]} pertencem aqui à própria carta do retorno, em ${aspectNames[a.kind]}. ${claim}\n\n${temporalNatalModifier(p, a.kind).replace(`${bodyNames[p.body]} natal`, `${bodyNames[p.body]} do retorno`)}${houseMeaning ? `\n\n${houseMeaning.claim}` : ''}`;
		const ids = [c.id, ...annualIds(annualPosition(a.first)), ...annualIds(p)];
		b.add(
			`Uma relação interna do ano — ${bodyNames[a.first]} e ${bodyNames[a.second]}`,
			text,
			ids,
			[
				{
					claim,
					factIds: ids,
					relation: `Relação ${a.kind} interna à carta anual; signo e casa anuais do segundo corpo modificam a expressão, sem atribuir duração de trânsito.`
				},
				...(houseMeaning ? [{ ...houseMeaning, factIds: [c.id, ...houseMeaning.factIds] }] : [])
			]
		);
	}
	const overlays: TemporalContact[] = overlay.aspects
		.map((a, i) => ({
			id: `solar-natal-${i}`,
			transit: a.first,
			natal: a.second,
			aspect: a.kind,
			orb: a.orbDegrees
		}))
		.filter((c) => !(c.transit === 'sun' && c.natal === 'sun'));
	const selected = rank(overlays, graph, input, 3);
	for (const c of selected) {
		const p = receiver(graph, c),
			meaning = contactReading(c, p);
		b.add(
			`O ano encontra seu mapa natal — ${bodyNames[c.transit]} em ${aspectNames[c.aspect]} com ${bodyNames[c.natal]}`,
			`${bodyNames[c.transit]} da carta anual encontra ${bodyNames[c.natal]} do nascimento. ${meaning.text}`,
			[`return-${c.transit}`, ...meaning.factIds],
			[
				{
					...meaning,
					factIds: [`return-${c.transit}`, ...meaning.factIds],
					relation: `Contato retorno→natal, sem confundir com trânsito presente durante todo o ano. ${meaning.relation}`
				}
			]
		);
	}
	addShared(b, selected, graph, () => ({
		count: 1,
		ids: ['solar-cycle'],
		label:
			'Os contatos coexistem no instante da carta anual, sem implicar presença durante todos os meses'
	}));
	const repeated = new Set<string>();
	for (const month of months) {
		const contacts = month.contacts.map((c) => ({
			id: c.id,
			transit: c.transit,
			natal: c.natal,
			aspect: c.aspect,
			orb: c.minOrb
		}));
		const chosen = [...contacts]
			.sort((a, c) => {
				const n = (v: TemporalContact) => month.contacts.find((w) => w.id === v.id)!.observedDates;
				return (
					score(c, graph, input) +
						(n(c) / month.sampleCount) * 3 -
						score(a, graph, input) -
						(n(a) / month.sampleCount) * 3 || a.id.localeCompare(c.id)
				);
			})
			.slice(0, 2);
		const meanings: Meaning[] = [],
			ids = [`solar-month-${month.number}`];
		const paragraphs = chosen.map((c) => {
			const source = month.contacts.find((w) => w.id === c.id)!,
				p = receiver(graph, c);
			const key = `${c.transit}:${c.natal}:${c.aspect}`;
			const interval =
				date(source.firstDate) === date(source.lastDate)
					? `em ${date(source.firstDate)}`
					: `entre ${date(source.firstDate)} e ${date(source.lastDate)}`;
			const count = `${bodyNames[c.transit]} em ${aspectNames[c.aspect]} com ${bodyNames[c.natal]} natal ${source.observedDates >= month.sampleCount * 0.75 ? 'acompanha boa parte deste mês' : `concentra sua presença ${interval} nos registros deste mês`}.`;
			const meaning = contactReading(c, p);
			ids.push(...meaning.factIds);
			if (!repeated.has(key)) {
				repeated.add(key);
				meanings.push(meaning);
				return `${count}\n${meaning.text}`;
			}
			const claim = `Essa combinação volta a destacar ${temporalTargets[p.body].subject}. ${temporalPairMeaning(c).split(/(?<=[.!?])\s+/)[0]}`;
			meanings.push({
				claim,
				factIds: [c.id, p.factId],
				relation:
					'Retomada da mesma combinação em novo mês civil, apoiada no contato mensal próprio; nenhuma duração contínua inferida.'
			});
			return `${count}\n${claim}`;
		});
		if (month.importantDateIds.length) {
			ids.push(...month.importantDateIds);
			const occasions = month.importantDateIds
				.map((id) => calculation.facts.find((fact) => fact.id === id)!.display)
				.join('; ');
			paragraphs.push(
				`Você marcou neste trecho: ${occasions}. Essas ocasiões organizam a consulta ao mês; não tornam os contatos mais intensos nem confirmam um acontecimento.`
			);
		}
		b.add(
			`Mês ${month.number} — ${date(month.startDate)} até ${date(month.endDateExclusive)} (fim excluído)`,
			paragraphs.length
				? paragraphs.join('\n\n')
				: 'Nenhum contato entra no recorte da grade diária deste mês. A carta anual continua como referência do ciclo; a ausência de um sinal mensal não permite concluir que nada acontecerá.',
			ids,
			meanings
		);
	}
	const context = declaredContext(input, graph, selected[0]);
	if (context) b.add('Sua pergunta dentro do ciclo', context.text, context.factIds, [context]);
	b.reading.practice =
		annualTheme?.closure ??
		'O fio do ciclo se apoia nas relações da carta anual e nas variações observadas ao longo dos meses. O sentido da leitura se constrói pela articulação entre esses temas, sem exigir que cada data produza uma confirmação.';
	b.references();
	return b.reading;
}

/** Only new editions of the five current temporal offers. Saved or older schemas remain untouched. */
export function composeCurrentTemporal(
	input: WorkflowInput,
	calculation: CalculationSnapshot
): TrialReading | null {
	if (input.productId === 'date-reading' && calculation.version === DATE_VERSION)
		return composeDate(input, calculation);
	if (input.productId === 'week-reading' && calculation.version === WEEK_VERSION)
		return composeWeek(input, calculation);
	if (input.productId === 'solar-return' && calculation.version === SOLAR_VERSION)
		return composeSolar(input, calculation);
	if (
		['personal-calendar', 'career-forecast-30d'].includes(input.productId) &&
		input.forecastPeriod === 'rolling-30-days' &&
		calculation.version === PERIOD_VERSION
	)
		return composePeriod(input, calculation);
	return null;
}
