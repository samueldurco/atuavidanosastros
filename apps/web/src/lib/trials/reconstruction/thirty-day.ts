import type { CalculationSnapshot, WorkflowInput } from '@atv/domain';
import type { TrialReading } from '../reading';
import { RECONSTRUCTION_VERSION, type EditorialTrace } from './career';
import { CANON_VERSION, bodyNames, functions, signs } from './canon';
import { normalizeFactGraph } from './fact-graph';
import { aspectNames } from './date-facts';
import {
	assertCalendarProjection,
	PERIOD_POLICY,
	type CalendarData,
	type CalendarWindow
} from './calendar-facts';

const unique = (ids: string[]) => [...new Set(ids)];
const date = (value: string) => value.slice(0, 10).split('-').reverse().join('/');
const stageNames = {
	entry: 'Entrada observada',
	peak: 'Maior aproximação observada',
	exit: 'Saída observada'
};
const relations = {
	conjunction: 'Observe como as duas funções se combinam, sem presumir que uma substitui a outra.',
	sextile:
		'Uma aproximação entre essas funções pode ser experimentada com um ajuste pequeno e reversível.',
	square:
		'Observe onde as duas exigências competem pelo mesmo tempo ou recurso; explicite a escolha necessária.',
	trine: 'Observe uma facilidade já disponível e se ela ajuda a sustentar uma ação concreta.',
	opposition:
		'Compare os dois lados da situação antes de escolher; reconhecer uma necessidade não elimina a outra.'
};

/** Scores rank symbolic attention, never luck, intensity, expected return or event probability. */
export function thirtyDaySelection(input: WorkflowInput, calculation: CalculationSnapshot) {
	const data = calculation.data as unknown as CalendarData;
	const graph = normalizeFactGraph(data.natal);
	const career = input.productId === 'career-forecast-30d';
	const context = (input.context ?? '')
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase();
	const theme: 'resources' | 'routine' | 'career' | 'relationship' | 'work' | 'personal' = career
		? /dinheiro|renda|orcamento|custo|recurso|remunera/.test(context)
			? 'resources'
			: /rotina|equipe|prazo|carga|tarefa/.test(context)
				? 'routine'
				: 'career'
		: /amor|relacion|parceir|casal/.test(context)
			? 'relationship'
			: /trabalho|carreira|renda|dinheiro|prazo/.test(context)
				? 'work'
				: 'personal';
	const houses = (
		{
			resources: [2],
			routine: [6],
			career: [10],
			relationship: [5, 7, 8],
			work: [2, 6, 10],
			personal: [1, 4, 7, 10]
		} as Record<string, number[]>
	)[theme];
	const bodies = (
		{
			resources: ['venus', 'saturn'],
			routine: ['mercury', 'mars', 'saturn'],
			career: ['sun', 'saturn', 'jupiter'],
			relationship: ['moon', 'venus'],
			work: ['sun', 'mercury', 'saturn'],
			personal: ['sun', 'moon', 'mercury']
		} as Record<string, string[]>
	)[theme];
	const receiver = (w: CalendarWindow) => graph.positions.find((p) => p.body === w.natal)!;
	// Career scope is fixed before contextual ranking: natal houses 2/6/10 or explicit work/resource functions.
	const eligible = (w: CalendarWindow) =>
		!career ||
		[2, 6, 10].includes(receiver(w).house ?? 0) ||
		['sun', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'].includes(w.natal);
	const score = (w: CalendarWindow) =>
		(houses.includes(receiver(w).house ?? 0) ? 4 : 0) +
		(bodies.includes(w.natal) ? 3 : 0) +
		(w.transit === 'moon' ? 0 : 1) +
		(2 - w.minOrb) / 2;
	const candidates = data.events
		.map((event) => ({ event, window: data.windows.find((w) => w.id === event.windowId)! }))
		.filter((s) => eligible(s.window));
	const prominence = ({ event, window }: (typeof candidates)[number]) =>
		score(window) + (event.kind === 'peak' ? 2 : 0);
	const rankedScores = candidates.map(prominence).sort((a, b) => a - b);
	const threshold = Math.max(5, rankedScores[Math.floor(rankedScores.length * 0.75)] ?? 5);
	const days = data.days.map((day) => {
		const seen = new Set<string>();
		const signals = candidates
			.filter((s) => s.event.date === day.date && prominence(s) >= threshold)
			.sort(
				(a, b) =>
					prominence(b) - prominence(a) ||
					a.event.instant.localeCompare(b.event.instant) ||
					a.event.id.localeCompare(b.event.id)
			)
			.filter((s) => {
				if (seen.has(s.window.id)) return false;
				seen.add(s.window.id);
				return true;
			})
			.slice(0, 2);
		return { day, signals };
	});
	const background = data.windows
		.filter((w) => w.entireMonth && eligible(w) && score(w) >= 5)
		.sort((a, b) => score(b) - score(a) || a.id.localeCompare(b.id))
		.slice(0, 3);
	return { data, graph, career, theme, receiver, score, prominence, threshold, days, background };
}

export function composeThirtyDayReading(
	input: WorkflowInput,
	calculation: CalculationSnapshot
): TrialReading {
	assertCalendarProjection(input, calculation);
	if (input.forecastPeriod !== 'rolling-30-days') throw Error('Período de 30 dias obrigatório.');
	const { data, graph, career, theme, receiver, prominence, threshold, days, background } =
		thirtyDaySelection(input, calculation);
	const themeText: Record<string, string> = {
		resources: 'o uso de recursos e a relação entre esforço e remuneração',
		routine: 'a distribuição de tarefas, prazos e carga de trabalho',
		career: 'a direção profissional e os compromissos que você assume',
		relationship: 'as necessidades e os acordos nas relações',
		work: 'a rotina de trabalho e os recursos disponíveis',
		personal: 'suas prioridades e a organização do cotidiano'
	};
	const action: Record<string, string> = {
		resources:
			'Compare um custo e um recurso real que você pode ajustar sem assumir uma obrigação nova.',
		routine:
			'Escolha uma tarefa e confirme prazo, responsabilidade e condição de conclusão com quem participa dela.',
		career:
			'Defina um próximo passo profissional pequeno, com prazo de revisão e um critério observável.',
		relationship:
			'Transforme uma necessidade em um pedido claro e escute a resposta sem presumir intenções.',
		work: 'Revise uma entrega, o tempo disponível e o apoio necessário antes de assumir outra tarefa.',
		personal:
			'Escolha uma prioridade e verifique se ela cabe no tempo e nas condições que você tem.'
	};
	const sections: TrialReading['sections'] = [],
		plan: EditorialTrace['plan'] = [],
		selection: EditorialTrace['selection'] = [];
	const add = (title: string, text: string, ids: string[], role: string) => {
		const factIds = unique(ids);
		sections.push({ title, text, factIds });
		plan.push({ title, factIds, role });
	};
	const describe = (w: CalendarWindow) => {
		const p = receiver(w);
		return `${bodyNames[w.transit]} em ${aspectNames[w.aspect]} com ${bodyNames[w.natal]} natal, em ${signs[p.sign]}${p.house ? `, casa ${p.house}` : ''}: a hipótese aproxima ${functions[w.transit]} de ${functions[w.natal]}. ${relations[w.aspect]}`;
	};
	add(
		'Seu ponto de partida',
		`De ${date(data.samples.startDate)} a ${date(data.days.at(-1)!.date)}, acompanhe ${themeText[theme]}. ${input.context ? `O contexto que você trouxe orienta essa prioridade: “${input.context}”. Ele é um relato seu e não uma conclusão do mapa.` : 'Sem um contexto informado, a seleção considera as funções e casas natais do tema.'} ${action[theme]} Os contatos observados ajudam a formular perguntas; as condições reais orientam suas escolhas.`,
		['calendar-period', ...(graph.contextFactId ? [graph.contextFactId] : [])],
		'period-opening'
	);
	add(
		'Movimentos que atravessam o período',
		background.length
			? background
					.map(
						(w) =>
							`${describe(w)} A relação aparece nas ${w.observations} observações, de ${date(w.firstInstant)} a ${date(w.lastInstant)}. Retome essa hipótese ao longo do período e compare com o que você vive.`
					)
					.join('\n\n')
			: 'Nenhuma relação com destaque suficiente no tema permaneceu dentro de 2° nas 120 observações. Isso não prevê ausência de acontecimentos: acompanhe as mudanças datadas e sua experiência.',
		['calendar-period', ...background.flatMap((w) => [w.id, receiver(w).factId])],
		'period-background'
	);
	const firstComment = new Map<string, string>();
	for (let start = 0; start < days.length; start += 5) {
		const group = days.slice(start, start + 5),
			ids: string[] = [];
		const text = group
			.map(({ day, signals }) => {
				ids.push(`calendar-day-${day.date}`);
				const lines = signals.map((s) => {
					const { event: e, window: w } = s;
					ids.push(e.id, w.id, receiver(w).factId);
					selection.push({
						factId: e.id,
						score: prominence(s),
						reason: `Destaque ${prominence(s).toFixed(3)} >= limiar ${threshold.toFixed(3)} do período; tema ${theme}; até dois contatos por data, sem preenchimento.`
					});
					const stage =
						e.kind === 'entry'
							? `A primeira observação dentro de 2° foi às ${e.instant.slice(11, 16)} UTC. Registre a situação atual para comparar depois.`
							: e.kind === 'peak'
								? `A amostra mais próxima desta janela tem afastamento ${e.orb.toFixed(2)}°, às ${e.instant.slice(11, 16)} UTC. Compare uma experiência concreta com a hipótese; proximidade angular não mede a intensidade do dia.`
								: `A primeira amostra fora de 2° foi às ${e.instant.slice(11, 16)} UTC; a última dentro foi ${date(w.lastInstant)} às ${w.lastInstant.slice(11, 16)} UTC. Reveja o que mudou sem supor que uma situação terminou.`;
					const previous = firstComment.get(w.id);
					firstComment.set(w.id, previous ?? day.date);
					const interpretation = previous
						? `${bodyNames[w.transit]} em ${aspectNames[w.aspect]} com ${bodyNames[w.natal]} natal. Compare com a interpretação de ${date(previous)}.`
						: describe(w);
					return `${stageNames[e.kind]}: ${interpretation} ${stage}`;
				});
				const marks = input.calendarMarks?.entries.filter((m) => m.date === day.date) ?? [];
				for (const f of calculation.facts.filter(
					(f) => f.id.startsWith('reported-mark-') && f.display.startsWith(day.date)
				))
					ids.push(f.id);
				return `${date(day.date)}\n${lines.join('\n') || 'Sem novo destaque selecionado.'}${marks.map((m) => `\nMarco informado por você: ${m.label}. Esse relato não altera os trânsitos calculados.`).join('')}`;
			})
			.join('\n\n');
		add(
			`${date(group[0].day.date)} a ${date(group.at(-1)!.day.date)}`,
			text,
			ids,
			`period-days-${start + 1}-${start + group.length}`
		);
	}
	add(
		'Revisão dos 30 dias',
		`Retome ${themeText[theme]}. Compare um dia com sinal selecionado e outro sem sinal. O que correspondeu à sua experiência e o que contrariou a hipótese? ${action[theme]} A leitura conserva o nascimento, o período e o contexto usados; alterações pedem uma nova edição.`,
		['calendar-period', ...(graph.contextFactId ? [graph.contextFactId] : [])],
		'period-review'
	);
	const covered = new Set(sections.flatMap((s) => s.factIds));
	add(
		'Como esta leitura foi construída',
		`A leitura compara posições dos astros com seu mapa natal a cada seis horas, ao longo de 30 dias em UTC. Usa os cinco aspectos maiores da astrologia e um afastamento de até 2° para identificar aproximações. ${career ? 'O foco está em recursos, rotina e direção profissional; o contexto que você informou ajuda a definir a prioridade entre esses assuntos.' : 'O contexto que você informou ajuda a priorizar relações, trabalho ou cotidiano.'} Cada data reúne até dois contatos que se destacam no período; algumas datas não têm destaque. Relações que permanecem durante os 30 dias ficam no panorama. Mais contatos não significam um dia melhor ou pior. Os horários indicam observações, não o instante exato de um trânsito; contatos breves entre observações podem não aparecer.`,
		['calendar-period', ...calculation.facts.filter((f) => !covered.has(f.id)).map((f) => f.id)],
		'period-reference'
	);
	return {
		version: RECONSTRUCTION_VERSION,
		productId: input.productId,
		title: career
			? 'Previsões de Dinheiro e Carreira — Próximos 30 Dias'
			: 'Calendário de Previsões — Próximos 30 Dias',
		opening: `Trinta dias para observar ${themeText[theme]}, de ${date(data.samples.startDate)} a ${date(data.days.at(-1)!.date)}.`,
		source: `${CANON_VERSION}; ${PERIOD_POLICY}; síntese original com contexto consentido.`,
		sections,
		questions: [
			'Qual hipótese encontrou apoio na sua experiência?',
			'O que aconteceu de forma diferente?',
			'Que próximo passo cabe nas suas condições reais?'
		],
		practice: action[theme],
		limits: [
			...calculation.limits,
			...(career
				? [
						'Esta leitura não prevê renda, contratação ou retorno financeiro e não recomenda investimentos.'
					]
				: [])
		],
		editorial: {
			version: RECONSTRUCTION_VERSION,
			canon: CANON_VERSION,
			graph: PERIOD_POLICY,
			selection,
			patterns: background.map((w) => ({ kind: 'thirty-day-background', factIds: [w.id] })),
			themes: [{ id: theme, factIds: unique(selection.map((s) => s.factId)) }],
			context: { key: theme, factId: graph.contextFactId },
			plan
		}
	};
}

export function reviewThirtyDayReading(
	input: WorkflowInput,
	calculation: CalculationSnapshot,
	reading: TrialReading
): string[] {
	try {
		assertCalendarProjection(input, calculation);
	} catch {
		return ['Período, geometria ou origem sem correspondência.'];
	}
	const { data, days, theme } = thirtyDaySelection(input, calculation),
		errors: string[] = [];
	if (
		data.days.length !== 30 ||
		data.samples.rows.length !== 120 ||
		reading.editorial?.graph !== PERIOD_POLICY ||
		reading.editorial?.canon !== CANON_VERSION
	)
		errors.push('Método de 30 dias divergente.');
	if (
		reading.editorial?.context.key !== theme ||
		reading.editorial?.selection.map((s) => s.factId).join('|') !==
			days.flatMap((d) => d.signals.map((s) => s.event.id)).join('|')
	)
		errors.push('Seleção não corresponde ao tema e às datas.');
	if (
		days.some((d) => d.signals.length > 2) ||
		data.days.some(
			(d) => !reading.sections.some((s) => s.factIds.includes(`calendar-day-${d.date}`))
		)
	)
		errors.push('Cobertura temporal incompleta.');
	const known = new Set(calculation.facts.map((f) => f.id));
	if (reading.sections.some((s) => !s.factIds.length || s.factIds.some((id) => !known.has(id))))
		errors.push('Texto sem fatos rastreáveis.');
	if (
		reading.sections.some((s) =>
			/(?:vai|irá) (?:receber|ganhar|acontecer|conquistar)|dia (?:garantido|favorável)|horário exato certificado/i.test(
				s.text
			)
		)
	)
		errors.push('Promessa sem base.');
	return errors;
}
