import type { CalculationSnapshot, WorkflowInput } from '@atv/domain';
import type { TrialReading } from '../reading';
import type { WeekTemporalEvent } from '../../../../../worker/src/week-temporal-search';
import { RECONSTRUCTION_VERSION, type EditorialTrace } from './career';
import { CANON_VERSION, bodyNames, functions, signs } from './canon';
import { houseAreas } from './natal-canon';
import { normalizeFactGraph, type Position } from './fact-graph';
import { aspectNames } from './date-facts';
import { assertWeekProjection, type WeekContact, type WeekDay } from './week-facts';

const unique = (ids: string[]) => [...new Set(ids)];
const slow = new Set(['jupiter', 'saturn', 'uranus', 'neptune', 'pluto']);
const date = (instant: string) => instant.slice(0, 10).split('-').reverse().join('/');
const time = (instant: string) => `${date(instant)} às ${instant.slice(11, 16)} UTC`;
const bracketTime = (instant: string) => `${date(instant)} às ${instant.slice(11, 19)} UTC`;
const invitations: Record<string, { subject: string; action: string; risk: string }> = {
	sun: {
		subject: 'participação e autoria',
		action: 'reservar espaço para uma contribuição que tenha a sua assinatura',
		risk: 'medir o próprio valor pela atenção recebida'
	},
	moon: {
		subject: 'disponibilidade emocional',
		action: 'rever a agenda quando uma necessidade concreta pedir cuidado',
		risk: 'tratar uma reação passageira como uma decisão definitiva'
	},
	mercury: {
		subject: 'trocas e organização de informações',
		action: 'conferir uma informação antes de transformar a conversa em compromisso',
		risk: 'confundir uma suposição repetida com algo confirmado'
	},
	venus: {
		subject: 'preferências e reciprocidade',
		action: 'dar nome ao que torna uma troca satisfatória para ambas as partes',
		risk: 'aceitar uma condição e esperar que a outra pessoa adivinhe seu incômodo'
	},
	mars: {
		subject: 'iniciativa e limites',
		action: 'dividir uma iniciativa em passos que permitam avaliar esforço e resposta',
		risk: 'aumentar a pressão quando falta um acordo'
	},
	jupiter: {
		subject: 'ampliação de possibilidades',
		action: 'comparar uma possibilidade de crescimento com os recursos realmente disponíveis',
		risk: 'confundir entusiasmo com capacidade ilimitada'
	},
	saturn: {
		subject: 'continuidade e responsabilidade',
		action: 'escolher o compromisso que merece uma estrutura sustentável',
		risk: 'usar cobrança para compensar a ausência de apoio'
	},
	uranus: {
		subject: 'autonomia e experimentação',
		action: 'testar uma alternativa reversível e combinar como avaliar o resultado',
		risk: 'romper uma estrutura antes de compreender o que ela sustenta'
	},
	neptune: {
		subject: 'sensibilidade e discernimento',
		action: 'acolher uma impressão e buscar fatos que permitam examiná-la',
		risk: 'atribuir certeza a um ideal ou à intenção de outra pessoa'
	},
	pluto: {
		subject: 'profundidade e revisão do controle',
		action: 'reconhecer a escolha que é sua e o limite que pertence ao outro',
		risk: 'tentar garantir um resultado controlando todas as respostas'
	}
};
const relations: Record<string, string> = {
	conjunction:
		'A conjunção aproxima as duas funções: diferenciação ajuda a perceber quando uma ocupa o lugar da outra.',
	sextile:
		'O sextil sugere uma cooperação possível que precisa de iniciativa para virar experiência.',
	square:
		'A quadratura põe exigências em atrito: um ajuste de ritmo ou prioridade pode criar espaço para ambas.',
	trine:
		'O trígono sugere uma passagem mais familiar entre as funções; facilidade também pode manter um hábito sem revisão.',
	opposition:
		'A oposição pede atenção a dois polos: alternar perspectivas costuma ser mais útil que eleger um vencedor.'
};
function contextFor(input: WorkflowInput) {
	const text = (input.context || '')
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.toLowerCase();
	if (/relacion|casal|parceir|amor|vinculo/.test(text))
		return {
			key: 'relationships' as EditorialTrace['context']['key'],
			bodies: ['venus', 'moon', 'mercury'],
			houses: [5, 7, 8],
			focus: 'construir reciprocidade sem presumir a intenção de ninguém',
			practice:
				'Escolha um acordo que atravessa a semana. Registre o que deseja oferecer e receber, converse sobre as condições e retome a combinação no último dia. Compare o combinado com o que de fato aconteceu.'
		};
	if (/trabalh|carreira|prazo|taref|carga|prioridade|organizacao/.test(text))
		return {
			key: 'workload' as EditorialTrace['context']['key'],
			bodies: ['saturn', 'sun', 'mars', 'mercury'],
			houses: [2, 6, 10],
			focus: 'distribuir compromissos de acordo com a capacidade que existe',
			practice:
				'Escolha uma entrega da semana e estime tempo, recursos e apoio. Nos dias destacados, confira o que mudou nessas condições. No último dia, compare o esforço previsto e o realizado e negocie um ajuste para a próxima etapa.'
		};
	if (/estud|aprend|curso|formacao/.test(text))
		return {
			key: 'study' as EditorialTrace['context']['key'],
			bodies: ['mercury', 'jupiter', 'saturn'],
			houses: [3, 9],
			focus: 'transformar estudo em uma aplicação que permita conferir o aprendizado',
			practice:
				'Escolha uma pergunta de estudo. Faça uma primeira tentativa no início do período, uma aplicação prática em um dia destacado e uma revisão ao final. Registre a dúvida concreta que permaneceu, em vez de avaliar só as horas estudadas.'
		};
	return {
		key: 'general' as EditorialTrace['context']['key'],
		bodies: ['sun', 'moon', 'mercury', 'venus', 'mars'],
		houses: [] as number[],
		focus: 'acompanhar uma escolha sem transformar cada mudança de humor em mudança de direção',
		practice:
			'Escolha uma situação pequena que possa observar durante sete dias. Anote a resposta habitual no início, experimente uma alternativa nos dias destacados e compare os resultados ao final. Guarde também o que contrariou a leitura.'
	};
}
function select(input: WorkflowInput, calculation: CalculationSnapshot) {
	const graph = normalizeFactGraph(calculation),
		context = contextFor(input);
	const contacts = calculation.data.contacts as WeekContact[];
	const position = (c: WeekContact) => graph.positions.find((p) => p.body === c.natal)!;
	const scored = contacts
		.map((c) => ({
			c,
			score:
				(context.bodies.includes(c.transit) ? 12 : 0) +
				(context.bodies.includes(c.natal) ? 9 : 0) +
				(context.houses.includes(position(c).house ?? 0) ? 10 : 0) +
				(c.eventIds.length ? 4 : 0) +
				(c.observedHours >= 120 ? 6 : 0) +
				(2 - c.minOrb) * 2
		}))
		.sort((a, b) => b.score - a.score || a.c.id.localeCompare(b.c.id));
	const chosen: typeof scored = [];
	const add = (x: (typeof scored)[number] | undefined) => {
		if (x && !chosen.some((y) => y.c.id === x.c.id)) chosen.push(x);
	};
	add(scored.find((x) => slow.has(x.c.transit)));
	add(scored.find((x) => !slow.has(x.c.transit)));
	for (const x of scored) if (chosen.length < 5) add(x);
	chosen.sort((a, b) => b.score - a.score || a.c.id.localeCompare(b.c.id));
	return { graph, context, chosen, position };
}
const title = (c: WeekContact) =>
	`${bodyNames[c.transit]} em ${aspectNames[c.aspect]} com ${bodyNames[c.natal]} natal: ${invitations[c.transit].subject}`;
const natalText = (p: Position) =>
	`${bodyNames[p.body]} natal em ${signs[p.sign]}${p.house ? `, casa ${p.house} (${houseAreas[p.house - 1]})` : ', com casas indisponíveis nesta base'}`;
const idsFor = (c: WeekContact, p: Position) =>
	unique([c.id, p.factId, ...(p.house ? [`house-${p.house}`] : []), 'week-period']);

export function composeReconstructedWeek(
	input: WorkflowInput,
	calculation: CalculationSnapshot
): TrialReading {
	assertWeekProjection(input, calculation);
	const { graph, context, chosen, position } = select(input, calculation);
	const days = calculation.data.days as WeekDay[],
		events = calculation.data.events as WeekTemporalEvent[];
	const sections: TrialReading['sections'] = [],
		plan: EditorialTrace['plan'] = [];
	const add = (title: string, text: string, factIds: string[], role: string) => {
		sections.push({ title, text, factIds: unique(factIds) });
		plan.push({ title, factIds: unique(factIds), role });
	};
	const lead = chosen[0]?.c,
		fast = chosen.find((x) => !slow.has(x.c.transit))?.c;
	const movementIds = chosen.map((x) => x.c.id);
	const period = calculation.data.period as { endExclusive: string };
	const observedTime = (instant: string) =>
		instant === period.endExclusive
			? `no ponto de fechamento da grade, em ${time(instant)} (limite após a sétima data, sem acrescentar um oitavo dia)`
			: `em ${time(instant)}`;
	const summary = lead
		? `A semana combina ${invitations[lead.transit].subject}, em relação à função natal de ${functions[lead.natal]},${fast && fast.id !== lead.id ? ` com variações mais rápidas de ${invitations[fast.transit].subject}` : ' com diferentes intensidades ao longo dos dias'}.`
		: 'Nenhum contato passou pelo recorte de aspectos e orbe desta semana; isso não significa ausência de experiências ou de possibilidades.';
	add(
		'O tema que atravessa a semana',
		`${summary} O fio proposto é ${context.focus}. Entre ${date(days[0].date)} e ${date(days[6].date)}, acompanhe o que se mantém e o que pede ajuste. Os movimentos abaixo são hipóteses simbólicas ligadas a posições calculadas, não uma agenda de acontecimentos. Um contato persistente aparece uma vez na síntese; a linha do tempo destaca sua mudança observada, sem criar sete previsões iguais.`,
		['week-period', ...movementIds],
		'week-theme'
	);
	for (const { c } of chosen) {
		const p = position(c),
			meaning = invitations[c.transit];
		const crossing = events.find(
			(e) => c.eventIds.includes(e.id) && e.threshold === 'exact' && e.mode === 'bracketed-crossing'
		);
		const persistent = c.observedHours >= 120;
		const course = persistent
			? `Este contato aparece em ${c.observedHours} dos 169 pontos horários: funciona como pano de fundo, sem exigir uma interpretação nova a cada dia.`
			: `O contato aparece em ${c.observedHours} dos 169 pontos horários, de ${time(c.firstObserved)} a ${time(c.lastObserved)}; esse intervalo descreve observações e pode conter saídas e retornos ao orbe.`;
		const change = `O menor afastamento observado é ${c.minOrb.toFixed(2)}° ${observedTime(c.minimumInstant)}. Nos extremos da grade, o afastamento passa de ${c.orbAtStart.toFixed(2)}° para ${c.orbAtEnd.toFixed(2)}°; isso não certifica aproximação ou afastamento contínuos.`;
		const bracket = crossing
			? ` A busca encontrou um cruzamento da geometria exata entre ${bracketTime(crossing.from)} e ${bracketTime(crossing.to)}. O horário exato não foi certificado e o intervalo não determina favorabilidade.`
			: ' O mínimo da grade não equivale a um horário de exatidão certificado.';
		add(
			title(c),
			`${bodyNames[c.transit]} em trânsito forma ${aspectNames[c.aspect]} com ${natalText(p)}. A função em movimento, ${functions[c.transit]}, encontra ${functions[c.natal]} na sua organização natal. ${relations[c.aspect]}\n\n${course} ${change}${bracket}\n\nUma aplicação possível é ${meaning.action}${p.house ? ` no campo de ${houseAreas[p.house - 1]}` : ''}. Observe o risco de ${meaning.risk}. Use uma situação verificável para avaliar a hipótese; se não encontrar relação com sua experiência, preserve o dado e descarte a interpretação que não ajudar.`,
			idsFor(c, p),
			'week-movement'
		);
	}
	const stable = chosen.filter((x) => x.c.observedHours >= 120),
		changing = chosen.filter((x) => x.c.observedHours < 120);
	const sharedNatal = new Map<string, WeekContact[]>();
	for (const { c } of chosen) sharedNatal.set(c.natal, [...(sharedNatal.get(c.natal) ?? []), c]);
	const combined = [...sharedNatal.values()].filter((group) => group.length > 1);
	const synthesis = combined.length
		? combined
				.map((group) => {
					const p = position(group[0]);
					const needs = unique(group.map((c) => invitations[c.transit].subject)).join('; ');
					return `${group.length} movimentos encontram ${bodyNames[p.body]} natal${p.house ? ` na casa ${p.house}, campo de ${houseAreas[p.house - 1]}` : ''}. Eles reúnem ${needs} em torno de ${functions[p.body]}. Para integrar essas demandas, escolha uma situação desse campo, nomeie o que precisa de continuidade e o que pode ser ajustado, e teste um acordo que comporte as necessidades citadas. A resposta concreta ajuda a decidir qual ajuste manter; a repetição do ponto natal não multiplica a chance de um acontecimento.`;
				})
				.join('\n\n')
		: `Os movimentos selecionados encontram pontos natais distintos: ${unique(chosen.map(({ c }) => bodyNames[c.natal])).join(', ')}. Compare a necessidade de ${lead ? invitations[lead.transit].subject : 'continuidade'} com ${fast ? invitations[fast.transit].subject : 'os ajustes do cotidiano'} em uma escolha real. Separe o compromisso que precisa de continuidade da resposta que admite revisão; acompanhe ambos antes de atribuir uma única causa às mudanças da semana.`;
	add(
		'Continuidade e mudanças de ritmo',
		`Há ${stable.length} movimento(s) selecionado(s) presentes em pelo menos 120 dos 169 pontos e ${changing.length} com presença mais localizada na grade. ${stable.length ? `O pano de fundo de ${unique(stable.map((x) => bodyNames[x.c.transit])).join(', ')} merece acompanhamento entre etapas, sem transformar persistência em urgência.` : 'A seleção concentra movimentos mais localizados; a estrutura da semana pode vir de seus compromissos reais.'} ${changing.length ? `As variações de ${unique(changing.map((x) => bodyNames[x.c.transit])).join(', ')} ajudam a escolher momentos de observação, não datas obrigatórias de decisão.` : 'Os mínimos observados abaixo distinguem intensidades dentro de um mesmo tema.'}\n\n${synthesis}`,
		['week-period', ...chosen.flatMap(({ c }) => idsFor(c, position(c)))],
		'week-pattern'
	);
	for (const [i, d] of days.entries()) {
		const significant = chosen.filter(
			({ c }) =>
				c.minimumInstant.slice(0, 10) === d.date ||
				(c.days[i].observedHours > 0 &&
					(i === 0 ? c.days[i].observedHours < 24 : c.days[i - 1].observedHours === 0)) ||
				(c.days[i].observedHours === 0 && i > 0 && c.days[i - 1].observedHours > 0)
		);
		const details = significant.slice(0, 3).map(({ c }) => {
			const today = c.days[i],
				previous = c.days[i - 1];
			const stage =
				c.minimumInstant.slice(0, 10) === d.date
					? `contém o menor afastamento da grade semanal (${c.minOrb.toFixed(2)}° em ${time(c.minimumInstant)})`
					: today.observedHours === 0
						? 'deixa de aparecer no orbe nos pontos horários deste dia, após presença no dia anterior'
						: previous?.observedHours === 0
							? 'passa a aparecer no orbe nos pontos horários, após ausência no dia anterior'
							: 'aparece em parte dos pontos horários do primeiro dia';
			return `${bodyNames[c.transit]} com ${bodyNames[c.natal]} natal ${stage}. O tema já está desenvolvido em “${title(c)}”; aqui, confira como a situação escolhida respondeu à mudança.`;
		});
		const daily = [...chosen].sort((a, b) => a.c.days[i].minOrb - b.c.days[i].minOrb)[0]?.c;
		const continuity = daily
			? `Entre os movimentos centrais, ${bodyNames[daily.transit]} com ${bodyNames[daily.natal]} natal tem o menor afastamento observado nesta data: ${daily.days[i].minOrb.toFixed(2)}° a ${daily.days[i].maxOrb.toFixed(2)}° nos 24 pontos horários, dos quais ${daily.days[i].observedHours} estão no orbe. A referência ao tema de ${invitations[daily.transit].subject} continua no capítulo central. Confira uma condição concreta que permite ${invitations[daily.transit].action}, sem presumir que menor afastamento significa maior importância na sua vida.`
			: 'Use uma condição real da sua agenda para escolher o que observar.';
		const text = details.length
			? details.join('\n\n')
			: `A seleção não mostra início, saída ou mínimo semanal novo nesta data. ${continuity} A ausência de um destaque novo não torna o dia irrelevante.`;
		add(
			`${date(d.date)} · ${details.length ? 'mudanças para observar' : 'continuidade'}`,
			`${text}\n\nA referência visual desta data usa ${time(d.sampleInstant)}. O registro diário reúne 24 pontos horários UTC; não descreve integralmente o seu dia local.`,
			[
				`week-day-${i + 1}`,
				'week-period',
				...significant.slice(0, 3).map((x) => x.c.id),
				...(details.length ? [] : daily ? [daily.id] : [])
			],
			`week-day-${i + 1}`
		);
	}
	const areas = [
		{
			name: 'Prioridades e realização',
			bodies: ['sun', 'mars', 'saturn', 'jupiter'],
			action:
				'Compare a intenção com o tempo e o apoio disponíveis antes de reorganizar compromissos.'
		},
		{
			name: 'Relações e acordos',
			bodies: ['moon', 'venus', 'mercury'],
			action:
				'Converse sobre uma condição concreta da troca e deixe a outra pessoa responder por si.'
		},
		{
			name: 'Cuidado e sustentação',
			bodies: ['moon', 'saturn', 'neptune'],
			action:
				'Observe descanso, limites e recursos cotidianos sem usar o mapa para avaliar saúde ou substituir cuidado profissional.'
		}
	];
	for (const area of areas) {
		const related = chosen.find(
			(x) => area.bodies.includes(x.c.natal) || area.bodies.includes(x.c.transit)
		);
		add(
			area.name,
			related
				? `O movimento de ${bodyNames[related.c.transit]} com ${bodyNames[related.c.natal]} natal oferece uma pergunta para este campo: como ${functions[related.c.transit]} pode conviver com ${functions[related.c.natal]}? ${area.action} O mínimo observado ${observedTime(related.c.minimumInstant)} é uma referência para acompanhar o processo, sem atribuir vantagem a qualquer data. Confira a relação com sua experiência e reveja a hipótese se os fatos apontarem outra direção.`
				: `A seleção central não oferece um contato específico para resumir este campo. ${area.action} Use as condições reais da semana como referência, sem importar uma previsão de outra área para preencher esta seção.`,
			['week-period', ...(related ? [related.c.id] : [])],
			'week-area'
		);
	}
	add(
		'Seu contexto como critério de escolha',
		`${input.context || 'Você não declarou contexto adicional.'}\n\nNeste recorte, o contexto orientou ${context.focus}. Ele muda a seleção e a aplicação, sem mudar posições, datas ou afastamentos. ${context.practice} Use os destaques como lembretes de observação; compromissos, segurança e disponibilidade têm prioridade sobre qualquer leitura simbólica.`,
		unique(['week-period', ...(graph.contextFactId ? [graph.contextFactId] : []), ...movementIds]),
		'week-context'
	);
	const references = calculation.facts;
	add(
		'Referências desta leitura',
		references.map((f) => `${f.id}: ${f.display} [${f.source}]`).join('\n\n'),
		references.map((f) => f.id),
		'references'
	);
	return {
		version: RECONSTRUCTION_VERSION,
		productId: input.productId,
		title: 'Previsões da Semana',
		opening: `Sete dias para acompanhar continuidade, mudanças e escolhas possíveis, de ${date(days[0].date)} a ${date(days[6].date)}.`,
		source: `${CANON_VERSION}; atv-week-observed-relations/1.0.0; busca temporal preservada e política explícita de cinco aspectos maiores até 2°.`,
		sections,
		questions: [
			'Qual tema se manteve durante a semana mesmo quando a intensidade mudou?',
			'Que ajuste teve resultado observável na situação que você escolheu acompanhar?',
			'O que contrariou a hipótese desta leitura e merece orientar a próxima escolha?'
		],
		practice: context.practice,
		limits: [
			'Esta leitura acompanha sete datas em UTC. Confira a diferença para o horário do seu local antes de organizar a agenda.',
			'As mudanças descritas vêm de observações horárias. Entre elas, um contato breve ou uma mudança de direção pode não aparecer; os horários aproximados não garantem acontecimentos.',
			'O cálculo usa os dados natais que você informou e ainda tem limites de precisão em validação. Casas e ângulos pertencem ao mapa natal; não são um mapa completo de cada dia.',
			'As interpretações são hipóteses simbólicas para confrontar com sua experiência. Não indicam dias favoráveis, destino ou decisões obrigatórias; seu contexto orienta a reflexão, sem alterar o cálculo.'
		],
		editorial: {
			version: RECONSTRUCTION_VERSION,
			canon: CANON_VERSION,
			graph: 'atv-week-observed-relations/1.0.0',
			selection: chosen.map((x) => ({
				factId: x.c.id,
				score: x.score,
				reason: `Funções e casa natal em relação ao contexto ${context.key}; duração e mudanças da grade semanal preservadas.`
			})),
			patterns:
				chosen.length > 1 ? [{ kind: 'continuity-and-observed-change', factIds: movementIds }] : [],
			themes: areas.map((a, i) => ({
				id: `week-area-${i + 1}`,
				factIds: sections.find((s) => s.title === a.name)!.factIds
			})),
			context: { key: context.key, factId: graph.contextFactId },
			plan
		}
	};
}

export function reviewReconstructedWeek(
	input: WorkflowInput,
	calculation: CalculationSnapshot,
	reading: TrialReading
): string[] {
	try {
		assertWeekProjection(input, calculation);
	} catch {
		return ['Busca temporal da Semana adulterada.'];
	}
	const errors: string[] = [],
		contacts = calculation.data.contacts as WeekContact[],
		days = calculation.data.days as WeekDay[];
	const selected = reading.editorial?.selection.map((x) => x.factId) || [],
		plan = reading.editorial?.plan || [];
	if (
		selected.length !== Math.min(5, contacts.length) ||
		new Set(selected).size !== selected.length ||
		selected.some((id) => !contacts.some((c) => c.id === id))
	)
		errors.push('Movimentos semanais sem seleção única verificável.');
	if (plan.filter((p) => p.role === 'week-movement').length !== selected.length)
		errors.push('Movimentos persistentes duplicados ou ausentes.');
	for (const [i, d] of days.entries()) {
		const entries = plan.filter((p) => p.role === `week-day-${i + 1}`);
		if (
			entries.length !== 1 ||
			!entries[0].factIds.includes(`week-day-${i + 1}`) ||
			!entries[0].title.startsWith(date(d.date))
		)
			errors.push('Linha do tempo sem as sete datas calculadas.');
	}
	if (
		plan.filter((p) => p.role === 'week-area').length !== 3 ||
		!plan.some((p) => p.role === 'week-theme') ||
		!plan.some((p) => p.role === 'week-pattern')
	)
		errors.push('Síntese e três áreas incompletas.');
	if (
		reading.editorial?.graph !== 'atv-week-observed-relations/1.0.0' ||
		reading.editorial.canon !== CANON_VERSION ||
		reading.editorial.context.key !== contextFor(input).key
	)
		errors.push('Autoridade editorial semanal divergente.');
	const known = new Set(calculation.facts.map((f) => f.id));
	if (reading.sections.some((s) => !s.factIds.length || s.factIds.some((id) => !known.has(id))))
		errors.push('Capítulo semanal sem fato verificável.');
	if (
		reading.sections.some((s) =>
			/(?:vai|irá) (?:acontecer|receber|conquistar)|dia (?:garantido|favorável)|exatidão certificada/i.test(
				s.text
			)
		)
	)
		errors.push('Promessa ou precisão não sustentada.');
	return errors;
}
