import type { CalculationSnapshot, WorkflowInput } from '@atv/domain';
import type { TrialReading } from '../reading';
import { RECONSTRUCTION_VERSION, type EditorialTrace } from './career';
import { CANON_VERSION, bodyNames, functions, signs } from './canon';
import { houseAreas } from './natal-canon';
import { normalizeFactGraph } from './fact-graph';
import { aspectNames } from './date-facts';
import {
	assertCalendarProjection,
	CALENDAR_POLICY,
	type CalendarData,
	type CalendarEvent,
	type CalendarWindow
} from './calendar-facts';

const unique = (ids: string[]) => [...new Set(ids)];
const date = (d: string) => d.slice(0, 10).split('-').reverse().join('/');
const personal = new Set(['sun', 'moon', 'mercury', 'venus', 'mars']);
const relations: Record<string, string> = {
	conjunction:
		'As funções se aproximam: diferencie a necessidade de cada uma antes de tratá-las como uma só.',
	sextile:
		'A cooperação depende de uma iniciativa possível e de uma resposta que você consiga observar.',
	square:
		'Exigências em atrito podem pedir ajuste de ritmo, recurso ou prioridade. Aumentar a cobrança não resolve necessariamente a diferença.',
	trine:
		'Uma passagem familiar entre as funções pode servir de apoio. Confira também qual hábito ela ajuda a manter.',
	opposition:
		'Dois polos pedem espaço. Explicitar a necessidade de cada lado pode tornar um acordo mais viável.'
};
const actions: Record<string, string> = {
	sun: 'Escolha uma contribuição pequena que tenha sua assinatura e um critério para reconhecer participação suficiente.',
	moon: 'Observe a necessidade de descanso, segurança ou proximidade antes de responder. Experimente um cuidado concreto.',
	mercury:
		'Separe informação confirmada de interpretação. Reformule uma pergunta e confira o entendimento.',
	venus: 'Explicite o que torna uma troca satisfatória e pergunte pelas condições da outra pessoa.',
	mars: 'Divida a iniciativa em um passo reversível e combine um limite de esforço.',
	jupiter:
		'Compare a possibilidade de ampliação com os recursos disponíveis antes de assumir mais.',
	saturn:
		'Dê a um compromisso prazo, apoio e critério de suficiência; observe a diferença entre responsabilidade e cobrança.',
	uranus:
		'Teste uma alternativa pequena e preserve o que ainda funciona enquanto avalia a mudança.',
	neptune:
		'Acolha a impressão inicial e procure fatos para examiná-la antes de atribuir certeza à situação.',
	pluto:
		'Distinga a escolha que é sua da resposta que pertence ao outro e procure um limite negociável.'
};
function contextFor(input: WorkflowInput) {
	const text = (input.context ?? '')
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.toLowerCase();
	if (/relacion|casal|parceir|amor|vinculo/.test(text))
		return {
			key: 'relationships' as const,
			bodies: ['moon', 'venus', 'mercury'],
			houses: [5, 7, 8],
			focus: 'reciprocidade e condições dos acordos'
		};
	if (/estud|aprend|curso|formacao|prova/.test(text))
		return {
			key: 'study' as const,
			bodies: ['mercury', 'jupiter', 'saturn'],
			houses: [3, 9],
			focus: 'aprendizagem aplicada e continuidade do estudo'
		};
	if (/trabalh|carreira|prazo|renda|dinheiro|financeir|carga|taref/.test(text))
		return {
			key: 'workload' as const,
			bodies: ['sun', 'mars', 'saturn', 'mercury'],
			houses: [2, 6, 10],
			focus: 'capacidade de trabalho, recursos e compromissos sustentáveis'
		};
	return {
		key: 'general' as const,
		bodies: ['sun', 'moon', 'mercury', 'venus', 'mars'],
		houses: [1, 4, 7, 10],
		focus: 'um assunto concreto que você deseja acompanhar'
	};
}
export function calendarSelection(input: WorkflowInput, calculation: CalculationSnapshot) {
	const d = calculation.data as unknown as CalendarData,
		graph = normalizeFactGraph(d.natal),
		context = contextFor(input);
	const score = (w: CalendarWindow) => {
		const receiver = graph.positions.find((p) => p.body === w.natal)!;
		return (
			(context.bodies.includes(w.natal) ? 8 : 0) +
			(context.houses.includes(receiver.house ?? 0) ? 6 : 0) +
			(personal.has(w.transit) && personal.has(w.natal) ? 3 : 0) +
			(2 - w.minOrb) / 2
		);
	};
	const days = d.days.map((day) => {
		const candidates = d.events
			.filter((e) => e.date === day.date)
			.map((event) => ({ event, window: d.windows.find((w) => w.id === event.windowId)! }));
		candidates.sort(
			(a, b) =>
				score(b.window) -
					score(a.window) +
					({ peak: 2, entry: 1, exit: 0 }[b.event.kind] -
						{ peak: 2, entry: 1, exit: 0 }[a.event.kind]) ||
				a.event.instant.localeCompare(b.event.instant) ||
				a.event.id.localeCompare(b.event.id)
		);
		const seen = new Set<string>();
		const signals = candidates
			.filter((x) => {
				if (score(x.window) < 3 || seen.has(x.window.id)) return false;
				seen.add(x.window.id);
				return true;
			})
			.slice(0, 3);
		return { day, signals };
	});
	const background = d.windows
		.filter((w) => w.entireMonth)
		.sort((a, b) => score(b) - score(a) || a.id.localeCompare(b.id))
		.slice(0, 4);
	return { days, background, graph, context, score };
}
const eventName: Record<CalendarEvent['kind'], string> = {
	entry: 'Entrada observada',
	peak: 'Pico observado',
	exit: 'Saída observada'
};
export function composeReconstructedCalendar(
	input: WorkflowInput,
	calculation: CalculationSnapshot
): TrialReading {
	assertCalendarProjection(input, calculation);
	const d = calculation.data as unknown as CalendarData,
		{ days, background, graph, context, score } = calendarSelection(input, calculation);
	const sections: TrialReading['sections'] = [],
		plan: EditorialTrace['plan'] = [],
		selection: EditorialTrace['selection'] = [];
	const add = (title: string, text: string, ids: string[], role: string) => {
		const factIds = unique(ids);
		sections.push({ title, text, factIds });
		plan.push({ title, factIds, role });
	};
	const receiver = (w: CalendarWindow) => graph.positions.find((p) => p.body === w.natal)!;
	const describe = (w: CalendarWindow) => {
		const p = receiver(w),
			area = p.house ? houseAreas[p.house] : 'a função natal indicada';
		return `${bodyNames[w.transit]} em trânsito encontra ${bodyNames[w.natal]} natal por ${aspectNames[w.aspect]}. A lente aproxima ${functions[w.transit]} de ${functions[w.natal]}, em ${signs[p.sign]}${p.house ? `, casa ${p.house}` : ''}. O campo de observação é ${area}. ${relations[w.aspect]}`;
	};
	add(
		'Como usar seu mês',
		`Este calendário cobre ${date(d.samples.startDate)} até ${date(d.samples.endDateExclusive)}, com a última data excluída. Cada dia corresponde a 00h–24h UTC; confira a diferença para o horário do seu local. A grade observa o céu a cada seis horas e seleciona até três mudanças por data, relacionadas a ${context.focus}. Um pico é o menor afastamento encontrado na grade, sem certificação da hora exata. Datas sem sinal selecionado ficam disponíveis para seus próprios registros. Os marcos que você informou são relatos e não alteram o cálculo.`,
		['calendar-period', ...(graph.contextFactId ? [graph.contextFactId] : [])],
		'calendar-guide'
	);
	add(
		'Movimentos que atravessam o mês',
		background.length
			? background
					.map(
						(w) =>
							`${describe(w)}\nA relação permaneceu dentro de 2° nas ${w.observations} observações do mês, entre ${date(w.firstInstant)} e ${date(w.lastInstant)}. Ela serve como pano de fundo e não será repetida para preencher as datas. ${actions[w.natal]}`
					)
					.join('\n\n')
			: 'Nenhuma relação permaneceu dentro do limite de 2° em todas as observações deste mês. Acompanhe as mudanças selecionadas nas datas, sem transformar essa ausência de continuidade em previsão.',
		['calendar-period', ...background.flatMap((w) => [w.id, receiver(w).factId])],
		'calendar-background'
	);
	const firstAppearance = new Map<string, string>();
	for (const { day, signals } of days) {
		const marks = input.calendarMarks?.entries.filter((m) => m.date === day.date) ?? [];
		const signalText = signals
			.map(({ event: e, window: w }) => {
				selection.push({
					factId: e.id,
					score: score(w) + { peak: 2, entry: 1, exit: 0 }[e.kind],
					reason: `Mudança em ${day.date}; relevância de função/casa natal ao contexto ${context.key}, pico e afastamento observado; uma relação por dia.`
				});
				const firstDate = firstAppearance.get(w.id);
				firstAppearance.set(w.id, firstDate ?? day.date);
				const stage = {
					entry:
						'Antes de associar uma situação a este movimento, registre como ela está agora. Esse ponto de partida permitirá comparar a experiência depois.',
					peak: 'Compare o que observou com o registro inicial: a hipótese ajudou a perceber algo concreto ou não encontrou apoio na experiência? A proximidade geométrica não mede a intensidade do seu dia.',
					exit: 'Reveja o que mudou desde o primeiro registro e o que seguiu igual. Encerrar esta faixa do cálculo não determina o fim de uma situação; decida o próximo passo pelas condições reais.'
				}[e.kind];
				return `${eventName[e.kind]} — ${bodyNames[w.transit]} / ${bodyNames[w.natal]} natal, ${aspectNames[w.aspect]}, às ${e.instant.slice(11, 16)} UTC. ${e.kind === 'exit' ? 'Esta é a primeira amostra fora de 2°; a última dentro do limite foi ' + w.lastInstant.replace('T', ' às ').replace('.000Z', ' UTC') + '.' : 'Afastamento observado: ' + e.orb.toFixed(2) + '°.'}\n${firstDate ? `Retomada do movimento apresentado em ${date(firstDate)}. ${stage}` : `${describe(w)} ${actions[w.natal]} ${stage} Relacione a hipótese a ${context.focus}; registre o que a confirma ou contraria.`}`;
			})
			.join('\n\n');
		const reported = marks
			.map(
				(m) =>
					`Marco que você trouxe: ${m.label}. É um relato seu; observe as condições reais da situação antes de relacioná-lo a uma hipótese.`
			)
			.join('\n');
		const ids = [
			`calendar-day-${day.date}`,
			...day.positions.map((p) => `calendar-position-${day.date}-${p.body}`),
			...signals.flatMap((x) => [x.event.id, x.window.id, receiver(x.window).factId]),
			...calculation.facts
				.filter(
					(f) =>
						f.kind === 'reported' &&
						f.id.startsWith('reported-mark-') &&
						f.display.includes(day.date)
				)
				.map((f) => f.id),
			...(graph.contextFactId ? [graph.contextFactId] : [])
		];
		add(
			`${date(day.date)} · ${signals.length} ${signals.length === 1 ? 'sinal' : 'sinais'}`,
			`${signalText || `${date(day.date)}: sem mudança selecionada. Use o espaço para registrar o que foi relevante na sua experiência; a grade não descreve todos os acontecimentos do dia.`}${reported ? '\n\n' + reported : ''}`,
			ids,
			`calendar-day-${day.date}`
		);
	}
	add(
		'Revisão do mês e dos seus marcos',
		`Retome um sinal que decidiu acompanhar e um dia em que a experiência foi diferente da hipótese. Compare o ajuste feito, o esforço necessário e a resposta observada. Para ${context.focus}, qual condição real merece orientar sua próxima escolha? Se um marco informado mudou, registre a diferença: a leitura salva conserva o contexto usado na geração. Corrigir nascimento, fuso, mês, contexto ou marcos exige uma nova leitura, sem sobrescrever esta edição. Uma falha ou amostra ausente impede gerar o mês inteiro.`,
		[
			'calendar-period',
			...(graph.contextFactId ? [graph.contextFactId] : []),
			...calculation.facts
				.filter((f) => f.kind === 'reported' && f.id.startsWith('reported-mark-'))
				.map((f) => f.id)
		],
		'calendar-review'
	);
	const covered = new Set(sections.flatMap((s) => s.factIds));
	add(
		'Referências desta leitura',
		`A base conserva ${d.days.length} datas e ${d.samples.rows.length} observações geocêntricas, com origem ${d.samples.source}, licença ${d.samples.license}, em graus de longitude tropical. Os cinco aspectos maiores são observados até 2°. A seleção mostra até três entradas, picos ou saídas por data; relações persistentes ficam no panorama. Parte dos contatos calculados fica fora da seleção, sem receber interpretação adicional. Entre observações, um contato breve pode passar despercebido. Casas e signos citados pertencem ao mapa natal. O contexto declarado orienta a seleção e não muda a geometria. A versão salva preserva insumos, política e proveniência; não atualiza silenciosamente. O motor é experimental.`,
		['calendar-period', ...calculation.facts.filter((f) => !covered.has(f.id)).map((f) => f.id)],
		'calendar-reference'
	);
	return {
		version: RECONSTRUCTION_VERSION,
		productId: input.productId,
		title: 'Calendário Pessoal',
		opening: `Um mês para acompanhar mudanças e escolhas, de ${date(d.samples.startDate)} a ${date(d.days.at(-1)!.date)}, com espaço para dias sem sinal selecionado.`,
		source: `${CANON_VERSION}; ${CALENDAR_POLICY}; síntese original com observações de seis horas e contexto consentido.`,
		sections,
		questions: [
			'Qual mudança teve correspondência com uma situação concreta?',
			'O que aconteceu de forma diferente da hipótese?',
			'Que ajuste depende de você e merece continuidade?'
		],
		practice: `Escolha um assunto ligado a ${context.focus}. Em uma data com sinal selecionado, anote a situação, um ajuste reversível e a resposta observada. Faça também um registro em uma data sem sinal; compare ambos ao final do mês, incluindo o que contrariou sua expectativa.`,
		limits: [
			...calculation.limits,
			'A interpretação é uma hipótese simbólica. Não define dias favoráveis, resultados ou decisões obrigatórias.'
		],
		editorial: {
			version: RECONSTRUCTION_VERSION,
			canon: CANON_VERSION,
			graph: CALENDAR_POLICY,
			selection,
			patterns: background.map((w) => ({ kind: 'monthly-background', factIds: [w.id] })),
			themes: [{ id: context.key, factIds: unique(selection.map((s) => s.factId)) }],
			context: { key: context.key, factId: graph.contextFactId },
			plan
		}
	};
}
export function reviewReconstructedCalendar(
	input: WorkflowInput,
	calculation: CalculationSnapshot,
	r: TrialReading
): string[] {
	try {
		assertCalendarProjection(input, calculation);
	} catch {
		return ['Grade ou origem mensal adulterada.'];
	}
	const errors: string[] = [],
		{ days } = calendarSelection(input, calculation),
		known = new Set(calculation.facts.map((f) => f.id));
	if (r.editorial?.canon !== CANON_VERSION || r.editorial?.graph !== CALENDAR_POLICY)
		errors.push('Autoridade editorial mensal divergente.');
	for (const { day, signals } of days) {
		const p = r.editorial?.plan.filter((p) => p.role === `calendar-day-${day.date}`) || [];
		if (
			p.length !== 1 ||
			!p[0].title.startsWith(date(day.date)) ||
			!p[0].factIds.includes(`calendar-day-${day.date}`) ||
			signals.some((s) => !p[0].factIds.includes(s.event.id)) ||
			signals.length > 3
		)
			errors.push('Data sem seleção correspondente.');
	}
	if (r.sections.some((s) => !s.factIds.length || s.factIds.some((id) => !known.has(id))))
		errors.push('Capítulo sem origem.');
	if (
		r.editorial?.selection.map((s) => s.factId).join('|') !==
		days.flatMap((d) => d.signals.map((s) => s.event.id)).join('|')
	)
		errors.push('Sinais fora de suas datas.');
	if (
		r.sections.some((s) =>
			/(?:vai|irá) (?:acontecer|receber|conquistar)|dia (?:garantido|favorável)|exatidão certificada/i.test(
				s.text
			)
		)
	)
		errors.push('Promessa sem base.');
	return errors;
}
