import type { CalculationSnapshot, WorkflowInput } from '@atv/domain';
import type { TrialReading } from '../reading';
import { CANON_VERSION, bodyNames, functions, signs } from './canon';
import { RECONSTRUCTION_VERSION, type EditorialTrace } from './career';
import { normalizeFactGraph, type Aspect, type FactGraph, type Position } from './fact-graph';
import {
	elementApproaches,
	elementNames,
	houseAreas,
	modalityApproaches,
	natalStyles
} from './natal-canon';

const unique = (ids: readonly string[]) => [...new Set(ids)];
const personal = ['sun', 'moon', 'mercury', 'venus', 'mars'];
const weights: Record<string, number> = {
	sun: 16,
	moon: 15,
	mercury: 9,
	venus: 9,
	mars: 9,
	jupiter: 6,
	saturn: 7,
	uranus: 1,
	neptune: 1,
	pluto: 1
};
const required = (graph: FactGraph, body: string) => {
	const value = graph.positions.find((p) => p.body === body);
	if (!value) throw Error(`Função natal necessária ausente: ${body}.`);
	return value;
};
const label = (p: Position) => `${bodyNames[p.body]} em ${signs[p.sign]}`;
const idsOf = (...positions: Position[]) => positions.map((p) => p.factId);
const area = (p: Position) =>
	p.house === null ? '' : ` A casa ${p.house} situa essa função em ${houseAreas[p.house - 1]}.`;
const areaIds = (p: Position) => (p.house === null ? [] : [`house-${p.house}`]);
const aspectNames: Record<string, string> = {
	conjunction: 'conjunção',
	sextile: 'sextil',
	square: 'quadratura',
	trine: 'trígono',
	opposition: 'oposição'
};
const bodyRoles: Record<string, string> = {
	sun: 'escolher uma participação que reconheça como sua',
	moon: 'perceber do que precisa para se sentir à vontade',
	mercury: 'formular uma ideia e conferir se foi compreendida',
	venus: 'expressar preferência e negociar reciprocidade',
	mars: 'agir, discordar e defender um limite',
	jupiter: 'ampliar a experiência e dar sentido ao que aprende',
	saturn: 'assumir uma responsabilidade que consiga sustentar',
	uranus: 'abrir espaço para autonomia e mudança',
	neptune: 'dar forma à imaginação sem perder a referência do que é verificável',
	pluto: 'rever relações de poder e o que precisa mudar em profundidade'
};

function relate(graph: FactGraph, a: Aspect) {
	const first = required(graph, a.first),
		second = required(graph, a.second);
	const movement =
		a.kind === 'conjunction'
			? `As duas funções tendem a entrar juntas na experiência: ${bodyRoles[a.first]} pode mobilizar também a necessidade de ${bodyRoles[a.second]}. Distinguir a intenção de ${bodyNames[a.first]} da resposta de ${bodyNames[a.second]} ajuda a perceber quando cooperam e quando uma ocupa todo o espaço.`
			: a.kind === 'square'
				? `Há um ajuste entre ${bodyRoles[a.first]} e ${bodyRoles[a.second]}. Ao responder pela função de ${bodyNames[a.first]}, examine se a necessidade de ${bodyNames[a.second]} também encontra lugar. Uma escolha concreta permite verificar se ${bodyRoles[a.first]} está deixando espaço para ${bodyRoles[a.second]}.`
				: a.kind === 'opposition'
					? `O contraste entre ${bodyRoles[a.first]} e ${bodyRoles[a.second]} pede alternância e negociação. Num desacordo, examine como a intenção de ${bodyNames[a.first]} recebe a resposta de ${bodyNames[a.second]}: parte do contraste pode expressar necessidades suas, antes de pertencer à outra pessoa.`
					: a.kind === 'trine'
						? `A relação favorece uma passagem familiar entre ${bodyRoles[a.first]} e ${bodyRoles[a.second]}. A facilidade entre ${bodyNames[a.first]} e ${bodyNames[a.second]} pode apoiar a ação, mas também tornar um hábito pouco examinado. Observe se essa cooperação ainda atende à situação em que pretende usá-la.`
						: `A relação oferece uma possibilidade de cooperação entre ${bodyRoles[a.first]} e ${bodyRoles[a.second]}. Reservar uma atividade para exercitar a função de ${bodyNames[a.first]} junto à de ${bodyNames[a.second]} permite verificar esse recurso, em vez de esperar que se expresse sozinho.`;
	return `${label(first)} e ${label(second)} formam ${aspectNames[a.kind]}, com orbe de ${a.orb.toFixed(2)}°. ${movement}`;
}
function strongest(graph: FactGraph, bodies?: string[]) {
	return graph.aspects
		.filter((a) => !bodies || bodies.some((b) => [a.first, a.second].includes(b)))
		.map((aspect) => ({
			aspect,
			score:
				(weights[aspect.first] ?? 0) +
				(weights[aspect.second] ?? 0) +
				([aspect.first, aspect.second].includes(graph.asc?.ruler ?? '') ? 8 : 0) +
				(['square', 'opposition'].includes(aspect.kind) ? 3 : 0) +
				Math.max(0, 6 - aspect.orb)
		}))
		.sort((a, b) => b.score - a.score || a.aspect.factId.localeCompare(b.aspect.factId));
}
function patternEngine(graph: FactGraph): EditorialTrace['patterns'] {
	const positions = graph.positions.filter((p) => personal.includes(p.body));
	const patterns: EditorialTrace['patterns'] = [];
	for (let i = 0; i < 4; i++) {
		const group = positions.filter((p) => p.sign % 4 === i);
		if (group.length >= 3)
			patterns.push({ kind: `personal-element-${i}`, factIds: idsOf(...group) });
	}
	for (let i = 0; i < 3; i++) {
		const group = positions.filter((p) => p.sign % 3 === i);
		if (group.length >= 3)
			patterns.push({ kind: `personal-modality-${i}`, factIds: idsOf(...group) });
	}
	return patterns;
}
function patternText(patterns: EditorialTrace['patterns']) {
	return patterns
		.map((p) => {
			const i = Number(p.kind.split('-').at(-1));
			return p.kind.includes('element')
				? `A concentração de funções pessoais em ${elementNames[i]} reforça a tendência de ${elementApproaches[i]}. Isso recebe peso na síntese porque aparece por caminhos diferentes do mapa, sem depender de um único signo.`
				: `A repetição de uma modalidade entre funções pessoais dá destaque a ${modalityApproaches[i]}. Ela descreve um ritmo recorrente, que pode ser ajustado quando a tarefa pede outro tempo.`;
		})
		.join(' ');
}
function bindContext(context?: string): {
	key: EditorialTrace['context']['key'];
	frame: string;
	experiment: string;
	question: string;
} {
	const text = (context ?? '')
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.toLowerCase();
	if (/relacion|casal|parceir|namor|familia|vincul/.test(text))
		return {
			key: 'relationships',
			frame:
				'Nos vínculos, a diferença entre uma primeira reação e uma necessidade que aparece depois merece uma conversa concreta. Escolha um acordo recente e observe o que foi oferecido, o que ficou implícito e o que ainda precisa ser dito.',
			experiment:
				'Retome um acordo pequeno com alguém envolvido. Descreva uma preferência sua, pergunte como a outra pessoa entendeu a situação e combinem uma alteração que os dois possam observar.',
			question:
				'O que você consegue pedir diretamente, em vez de esperar que a outra pessoa deduza?'
		};
	if (/estud|curso|aprend|formacao/.test(text))
		return {
			key: 'study',
			frame:
				'Para uma decisão de estudo, diferencie interesse inicial, modo de aprender e condições de continuidade. Uma formação pode atrair pela proposta e ainda exigir um ritmo que precise ser negociado com a sua rotina.',
			experiment:
				'Teste uma atividade curta do conteúdo que pretende estudar. Registre o que despertou interesse, em que momento perdeu o fio e que recurso ajudou a retomar. Compare essa experiência com a rotina exigida pelo curso.',
			question: 'Que condição permite transformar curiosidade em aprendizagem continuada?'
		};
	if (/trabalh|carreira|profiss|funcao|emprego/.test(text))
		return {
			key: 'workload',
			frame:
				'No trabalho, examine uma tarefa e um acordo real: o modo como você assume a tarefa pode ser diferente da condição que precisa para terminá-la bem. Essa diferença ajuda a formular um pedido específico sobre autonomia, prazo ou retorno.',
			experiment:
				'Escolha uma entrega pequena e combine o resultado, o prazo e um momento de retorno. Observe como começa, o que mantém seu envolvimento e o que exige um limite mais claro.',
			question: 'Que ajuste de condição faria diferença numa tarefa que já existe?'
		};
	if (/mudanc|transicao|recomec|escolh/.test(text))
		return {
			key: 'transition',
			frame:
				'Diante de uma mudança, separe o impulso de começar do que permitirá continuar. Compare duas possibilidades pelas condições concretas que oferecem, incluindo o que cada uma exige que você deixe para depois.',
			experiment:
				'Faça uma tentativa pequena e reversível de uma das possibilidades. Registre a experiência antes de ampliar o compromisso e estabeleça um critério para continuar, ajustar ou encerrar.',
			question: 'O que precisa ser experimentado antes de assumir um compromisso maior?'
		};
	return {
		key: 'general',
		frame:
			'Escolha uma situação cotidiana que esteja suficientemente clara para ser observada. Compare sua primeira resposta, a necessidade percebida depois e a escolha que conseguiu sustentar. A distância entre esses três momentos oferece mais informação do que uma descrição abstrata de personalidade.',
		experiment:
			'Durante uma semana, registre três situações: como entrou nelas, do que precisou e o que escolheu fazer. Procure uma diferença recorrente e teste um ajuste pequeno na situação seguinte.',
		question:
			'Em que situação sua resposta inicial representa apenas uma parte do que você precisa?'
	};
}

/** Product plans share normalized facts and canon, not a single reading with different titles. */
export function composeReconstructedNatal(
	input: WorkflowInput,
	calculation: CalculationSnapshot
): TrialReading {
	const graph = normalizeFactGraph(calculation),
		sun = required(graph, 'sun'),
		moon = required(graph, 'moon');
	if (!graph.asc || !graph.mc) throw Error('Ângulos natais necessários indisponíveis.');
	const asc = graph.asc,
		mc = graph.mc,
		ruler = required(graph, asc.ruler),
		mcRuler = required(graph, mc.ruler);
	const mercury = required(graph, 'mercury'),
		venus = required(graph, 'venus'),
		mars = required(graph, 'mars');
	const solar = natalStyles[sun.sign],
		lunar = natalStyles[moon.sign],
		entry = natalStyles[asc.sign];
	const ranked = strongest(graph),
		patterns = patternEngine(graph),
		context = bindContext(input.context);
	const sections: TrialReading['sections'] = [],
		plan: EditorialTrace['plan'] = [],
		themes: EditorialTrace['themes'] = [];
	const add = (title: string, text: string, factIds: string[], role: string) => {
		const ids = unique(factIds);
		sections.push({ title, text, factIds: ids });
		plan.push({ title, factIds: ids, role });
		themes.push({ id: role, factIds: ids });
	};
	const core = unique([...idsOf(sun, moon, ruler), ...asc.factIds]);
	const patternIds = patterns.flatMap((p) => p.factIds);
	const trio = `${label(sun)} põe em primeiro plano ${solar.aim}. A ${label(moon)} descreve a necessidade de ${lunar.need}. Com Ascendente em ${signs[asc.sign]}, a entrada nas situações tende a passar por ${entry.entry}. A primeira resposta, portanto, não resume o que sustenta seu envolvimento: reconhecer a necessidade lunar ajuda a escolher como participar, em vez de apenas repetir o gesto inicial.`;
	const sameElement = sun.sign % 4 === moon.sign % 4;
	const rhythm = sameElement
		? `Sol e Lua compartilham o elemento ${elementNames[sun.sign % 4]}. Existe uma afinidade simbólica entre o que orienta a participação e o que oferece segurança, especialmente ao ${elementApproaches[sun.sign % 4]}. Isso não elimina conflitos: o Ascendente acrescenta o modo de ${entry.entry}, que pode aparecer antes de você reconhecer o que deseja.`
		: `O Sol enfatiza ${elementNames[sun.sign % 4]} e a Lua, ${elementNames[moon.sign % 4]}. Assim, ${solar.aim} e ${lunar.need} podem pedir tempos ou condições diferentes. Não é necessário escolher uma função e abandonar a outra: uma decisão pode preservar a direção solar e ajustar a forma de participação para incluir a necessidade lunar.`;
	const rulerAspect = strongest(graph, [ruler.body])[0]?.aspect;
	const rulerText = `O regente moderno do Ascendente é ${label(ruler)}. Ele liga o modo de entrar nas situações à função de ${functions[ruler.body]}, expressa pela tendência de ${natalStyles[ruler.sign].entry}.${area(ruler)} O signo do Ascendente ganha, assim, uma condição concreta: o começo se desenvolve no campo em que seu regente está colocado. ${rulerAspect ? relate(graph, rulerAspect) : 'Nenhum contato principal do regente foi selecionado dentro dos orbes adotados; a leitura se apoia na posição disponível, sem acrescentar relações ausentes.'}`;
	const rulerIds = unique([
		...asc.factIds,
		ruler.factId,
		...areaIds(ruler),
		...(rulerAspect
			? [
					rulerAspect.factId,
					...idsOf(required(graph, rulerAspect.first), required(graph, rulerAspect.second))
				]
			: [])
	]);
	const contacts = graph.angleContacts
		.filter((a) => a.angle === 'ascendant')
		.sort((a, b) => a.orb - b.orb)
		.slice(0, 3);
	const contactText = contacts.length
		? contacts
				.map(
					(a) =>
						`${bodyNames[a.body]} faz ${aspectNames[a.kind]} com o Ascendente, com orbe de ${a.orb.toFixed(2)}°. A função de ${functions[a.body]} ganha destaque no modo de se apresentar e responder a uma situação nova. ${a.kind === 'conjunction' ? `A proximidade de ${bodyNames[a.body]} ao ângulo põe ${bodyRoles[a.body]} em primeiro plano na entrada, sem substituir o restante do mapa.` : ['square', 'opposition'].includes(a.kind) ? `Antes de assumir um acordo, compare a resposta imediata com a necessidade de ${bodyRoles[a.body]}: o contato de ${bodyNames[a.body]} pede que ambas encontrem lugar.` : `Exercitar ${bodyRoles[a.body]} pode oferecer um recurso para ajustar o começo à situação; observe em que condições esse contato de ${bodyNames[a.body]} se torna útil.`}`
				)
				.join('\n\n')
		: `Não há contatos com o Ascendente dentro do orbe de três graus adotado. O modo inicial de ${entry.entry} permanece qualificado pelo regente, pelo Sol e pela Lua. A ausência de um contato próximo não indica falta de expressão: apenas impede atribuir a um planeta uma proximidade que o cálculo não mostra.`;
	const unspokenAspects = () => {
		const used = new Set(sections.flatMap((section) => section.factIds));
		return ranked.filter((item) => !used.has(item.aspect.factId));
	};
	const aspectIds = (a: Aspect) => [
		a.factId,
		...idsOf(required(graph, a.first), required(graph, a.second))
	];
	const title =
		input.productId === 'three-pillars'
			? 'Três Pilares'
			: input.productId === 'ascendant'
				? 'Ascendente'
				: input.productId === 'midheaven'
					? 'Meio do Céu'
					: 'Mapa Astral';
	let opening: string;
	if (input.productId === 'three-pillars') {
		opening = `O começo passa por ${entry.entry}; a continuidade pede ${lunar.need}; a direção pessoal ganha força ao ${solar.aim}. A leitura acompanha a relação entre esses três movimentos.`;
		add(
			'Como os três pilares trabalham juntos',
			`${trio}\n\n${patternText(patterns)}`,
			[...core, ...patternIds],
			'integrated-trio'
		);
		add(
			'Afinidades, diferenças e tempo de resposta',
			`${rhythm}\n\nUm exemplo é aceitar uma proposta pelo modo como ela chega e perceber depois que as condições não atendem ao que você precisa. Rever a condição ou negociar o ritmo pode preservar o interesse sem tornar a primeira reação uma obrigação.`,
			core,
			'trio-rhythm'
		);
		add('O caminho aberto pelo regente', rulerText, rulerIds, 'asc-ruler');
		add(
			'O que modifica a primeira impressão',
			contactText,
			[...asc.factIds, ...contacts.flatMap((a) => [a.factId, required(graph, a.body).factId])],
			'asc-contacts'
		);
		const luminary = unspokenAspects()
			.filter((item) =>
				['sun', 'moon'].some((body) => [item.aspect.first, item.aspect.second].includes(body))
			)
			.slice(0, 2);
		add(
			'Direção e necessidade na mesma escolha',
			luminary.length
				? luminary.map((s) => relate(graph, s.aspect)).join('\n\n')
				: `A motivação solar de ${solar.aim} e a necessidade lunar de ${lunar.need} continuam participando da mesma escolha mesmo quando não há outro contato principal a desenvolver. Relembre uma decisão recente: o que queria realizar e de que apoio precisou durante o processo? Uma diferença entre essas respostas ajuda a distinguir direção e condição de continuidade.`,
			luminary.length ? luminary.flatMap((s) => aspectIds(s.aspect)) : core,
			'luminary-relations'
		);
	} else if (input.productId === 'ascendant') {
		opening = `Ascendente em ${signs[asc.sign]} destaca ${entry.entry}. Seu desenvolvimento depende do regente, ${bodyNames[ruler.body]}, e da relação desse começo com o Sol e a Lua.`;
		add(
			'O gesto inicial e o que ele deixa para depois',
			`Ascendente em ${signs[asc.sign]} sugere uma entrada voltada a ${entry.entry}. Essa resposta pode ser útil quando há pouco tempo para conhecer a situação. O excesso aparece ao ${entry.excess}; o ajuste passa por ${entry.adjustment}.\n\n${patternText(patterns)} A posição do regente indica onde essa forma de entrar encontra experiência e precisa se desenvolver.`,
			[...asc.factIds, ruler.factId, ...patternIds],
			'asc-entry'
		);
		add('Onde o regente dá continuidade ao começo', rulerText, rulerIds, 'asc-ruler');
		add(
			'Contatos que tornam a resposta mais específica',
			contactText,
			[...asc.factIds, ...contacts.flatMap((a) => [a.factId, required(graph, a.body).factId])],
			'asc-contacts'
		);
		add(
			'O que aparece primeiro e o que sustenta você',
			`${trio}\n\n${rhythm}`,
			core,
			'asc-luminaries'
		);
	} else if (input.productId === 'midheaven') {
		const direction = natalStyles[mc.sign],
			method = natalStyles[mcRuler.sign];
		opening = `Meio do Céu em ${signs[mc.sign]} coloca em discussão ${direction.aim}. O regente em ${signs[mcRuler.sign]} qualifica como essa direção pode ganhar forma pública.`;
		add(
			'Direção pública e participação pessoal',
			`O Meio do Céu em ${signs[mc.sign]} destaca ${direction.aim} no campo da contribuição e do reconhecimento. ${label(sun)} acrescenta a motivação de ${solar.aim}. A direção pública precisa encontrar uma forma de participação que tenha sentido para você, em vez de depender apenas da resposta de outras pessoas.\n\n${patternText(patterns)} Uma posição no mapa oferece uma hipótese de orientação; competência, oportunidade e reconhecimento dependem também da experiência e das condições concretas.`,
			[...mc.factIds, sun.factId, ...patternIds],
			'mc-direction'
		);
		add(
			'Por onde essa direção se desenvolve',
			`O regente moderno do Meio do Céu é ${label(mcRuler)}. A função de ${functions[mcRuler.body]} participa do desenvolvimento da direção pública, com o modo de ${method.action}.${area(mcRuler)} Observe em qual atividade essa combinação aparece e que condição permite praticá-la com continuidade. Uma direção ampla ganha utilidade quando pode ser traduzida numa responsabilidade ou contribuição observável.`,
			[...mc.factIds, mcRuler.factId, ...areaIds(mcRuler)],
			'mc-ruler'
		);
		const related = strongest(graph, [mcRuler.body]).slice(0, 2);
		add(
			'Relações que qualificam a responsabilidade',
			related.length
				? related.map((s) => relate(graph, s.aspect)).join('\n\n')
				: `A posição disponível do regente orienta a leitura sem acrescentar aspectos ausentes. ${method.adjustment} pode ser um critério para examinar uma responsabilidade concreta. Confronte esse critério com o retorno recebido e com a possibilidade real de sustentar o compromisso.`,
			related.length
				? related.flatMap((s) => aspectIds(s.aspect))
				: [...mc.factIds, mcRuler.factId],
			'mc-aspects'
		);
		add(
			'O espaço público precisa de uma base de vida',
			`${label(moon)} descreve a necessidade de ${lunar.need}.${area(moon)} Ela participa das condições para sustentar responsabilidades. Com Ascendente em ${signs[asc.sign]}, a resposta inicial tende a ${entry.entry}. Compare esse começo com o tempo e o apoio de que necessita: um compromisso pode exigir ajustes de ritmo sem perder sua direção.`,
			[...core, ...areaIds(moon)],
			'mc-private-balance'
		);
	} else if (input.productId === 'birth-chart') {
		const dominant = graph.positions
			.map((p) => ({
				p,
				score:
					(weights[p.body] ?? 0) +
					(p.body === asc.ruler ? 10 : 0) +
					graph.angleContacts.filter((a) => a.body === p.body && a.kind === 'conjunction').length *
						12 +
					graph.aspects.filter(
						(a) =>
							[a.first, a.second].includes(p.body) &&
							personal.some((b) => [a.first, a.second].includes(b)) &&
							a.orb <= 3
					).length *
						2
			}))
			.sort((a, b) => b.score - a.score || a.p.body.localeCompare(b.p.body))
			.slice(0, 5);
		opening = `A leitura começa pela combinação de ${solar.aim}, ${lunar.need} e ${entry.entry}. As relações mais relevantes do mapa mostram onde esses movimentos se apoiam e onde pedem ajustes.`;
		add(
			'O conjunto antes dos detalhes',
			`${trio}\n\nOs fatores que recebem maior peso são ${dominant.map((d) => label(d.p)).join('; ')}, além do Ascendente e de seu regente. O peso considera funções pessoais, regência, proximidade dos ângulos e relações próximas com funções pessoais. ${patternText(patterns)}`,
			[...core, ...idsOf(...dominant.map((d) => d.p)), ...patternIds],
			'natal-dominants'
		);
		add(
			'Identidade e necessidades de apoio',
			`${label(sun)} orienta a participação para ${solar.aim}.${area(sun)} A ${label(moon)} pede ${lunar.need}.${area(moon)}\n\n${rhythm} Em uma escolha importante, descreva o resultado que deseja e a condição emocional que permitirá atravessar o processo. São perguntas diferentes, e a resposta a uma delas não substitui a outra.`,
			[...idsOf(sun, moon), ...areaIds(sun), ...areaIds(moon), ...asc.factIds],
			'identity-and-needs'
		);
		add(
			'Presença, iniciativa e continuidade',
			`${rulerText}\n\n${contactText}`,
			[...rulerIds, ...contacts.flatMap((a) => [a.factId, required(graph, a.body).factId])],
			'presence-and-ruler'
		);
		const communication = () =>
			add(
				'Pensar, aprender e se fazer entender',
				`${label(mercury)} descreve a tendência de ${natalStyles[mercury.sign].thought}.${area(mercury)} A Lua acrescenta a necessidade de ${lunar.need}: uma conversa pode ter conteúdo claro e ainda precisar de um ritmo em que você consiga perceber e expressar a própria resposta.\n\nNum assunto difícil, diferencie o que observou, a interpretação que fez e a pergunta que ainda precisa formular. Esse cuidado permite usar seu modo de pensar sem pressupor que a outra pessoa chegou à mesma conclusão.`,
				[...idsOf(mercury, moon), ...areaIds(mercury)],
				'communication'
			);
		const relationship = () =>
			add(
				'Afeto, escolha e reciprocidade',
				`${label(venus)} sugere demonstrar afeto ao ${natalStyles[venus.sign].affection}.${area(venus)} Essa preferência se encontra com a necessidade lunar de ${lunar.need}. Oferecer o que você valoriza pode ser uma forma de vínculo; descobrir o que a outra pessoa recebe como cuidado exige escuta e um acordo específico.\n\nObserve uma troca recente: o que foi oferecido, o que foi pedido e o que ficou subentendido. A diferença entre esses três pontos permite rever expectativas sem concluir, a partir do mapa, o que outra pessoa sente ou pretende.`,
				[...idsOf(venus, moon), ...areaIds(venus)],
				'affection-and-relating'
			);
		if (context.key === 'relationships') {
			relationship();
			communication();
		} else {
			communication();
			relationship();
		}
		add(
			'Agir sem perder a medida do esforço',
			`${label(mars)} coloca energia em ${natalStyles[mars.sign].action}.${area(mars)} O Ascendente acrescenta o modo inicial de ${entry.entry}, enquanto o Sol procura ${solar.aim}. Distinguir impulso, objetivo e condição de execução evita que a rapidez do começo decida o tamanho de todo o compromisso.\n\nO excesso pode aparecer ao ${natalStyles[mars.sign].excess}. Um ajuste possível é ${natalStyles[mars.sign].adjustment}. Verifique esse critério numa tarefa que você consiga observar até o fim, inclusive se a experiência mostrar outra necessidade.`,
			[...idsOf(mars, sun), ...asc.factIds, ...areaIds(mars)],
			'action-and-limits'
		);
		add(
			'Trabalho, contribuição e reconhecimento',
			`O Meio do Céu em ${signs[mc.sign]} orienta a reflexão para ${natalStyles[mc.sign].aim}. Seu regente, ${label(mcRuler)}, participa dessa direção pela função de ${functions[mcRuler.body]}.${area(mcRuler)} A motivação solar de ${solar.aim} precisa encontrar lugar na responsabilidade assumida.\n\nCompare uma contribuição que deseja fazer com as condições disponíveis para praticá-la. O mapa pode organizar perguntas sobre direção e modo de participar; formação, acesso, habilidade e retorno precisam ser examinados na experiência.`,
			[...mc.factIds, ...idsOf(mcRuler, sun), ...areaIds(mcRuler)],
			'work-and-direction'
		);
		const selected = unspokenAspects().slice(0, 3);
		add(
			'Tensões e recursos que mudam o conjunto',
			selected.length
				? selected.map((s) => relate(graph, s.aspect)).join('\n\n')
				: `A síntese se apoia nas posições e ângulos disponíveis. ${rhythm} Uma combinação sem aspecto selecionado continua tendo diferenças de função e de ritmo; essas diferenças devem ser examinadas numa experiência concreta, sem inventar um contato para explicá-las.`,
			selected.length ? selected.flatMap((s) => aspectIds(s.aspect)) : core,
			'selected-dynamics'
		);
	} else throw Error('Contrato natal não reconhecido.');
	const contextIds = unique([...core, ...(graph.contextFactId ? [graph.contextFactId] : [])]);
	add(
		'Uma situação para confrontar com a leitura',
		`${context.frame}\n\nO critério pessoal desta leitura é incluir ${lunar.need} na busca por ${solar.aim}, reconhecendo o começo de ${entry.entry}. A experiência pode confirmar uma parte, contradizer outra e mostrar uma condição que o mapa não descreve.`,
		contextIds,
		'context-bound-observation'
	);
	add(
		'Como testar um ajuste',
		`${context.experiment}\n\nProcure especialmente o excesso de ${entry.excess}. Um ajuste a experimentar é ${entry.adjustment}. Na revisão, registre o que mudou na situação e o que permaneceu difícil; use esse resultado para escolher o próximo passo.`,
		contextIds,
		'context-bound-experiment'
	);
	const used = new Set(sections.flatMap((s) => s.factIds)),
		remaining = graph.facts.filter((f) => !used.has(f.id));
	if (remaining.length)
		add(
			'Referências desta leitura',
			remaining.map((f) => f.display).join('\n'),
			remaining.map((f) => f.id),
			'technical-reference'
		);
	return {
		version: RECONSTRUCTION_VERSION,
		productId: input.productId,
		title,
		opening,
		source:
			'Leitura simbólica do mapa natal tropical, com regências modernas e relações calculadas. As hipóteses são confrontadas com a experiência relatada.',
		sections,
		questions: [
			context.question,
			`Onde a necessidade de ${lunar.need} pede uma condição diferente do seu primeiro impulso?`,
			`Que escolha permite ${solar.aim} com um compromisso que consiga sustentar?`
		],
		practice: `Depois da experiência proposta, faça três anotações: como você entrou na situação, do que precisou para continuar e qual direção escolheu. Identifique onde essas respostas se ajudaram e onde pediram negociação. Use como critério: ${context.question} Escolha um ajuste pequeno para a próxima ocasião.`,
		limits: unique([
			...calculation.limits,
			'A interpretação é simbólica e não determina personalidade, acontecimentos ou escolhas de outras pessoas.'
		]),
		editorial: {
			version: RECONSTRUCTION_VERSION,
			canon: CANON_VERSION,
			graph: graph.version,
			selection: ranked.slice(0, 5).map((s) => ({
				factId: s.aspect.factId,
				score: Math.round(s.score * 1000) / 1000,
				reason: 'personal-function+asc-ruler+orb+dynamic'
			})),
			patterns,
			themes,
			context: { key: context.key, factId: graph.contextFactId },
			plan
		}
	};
}

export function reviewReconstructedNatal(
	input: WorkflowInput,
	calculation: CalculationSnapshot,
	reading: TrialReading
): string[] {
	const failures: string[] = [],
		trace = reading.editorial,
		ids = new Set(calculation.facts.map((f) => f.id));
	if (!trace || trace.version !== RECONSTRUCTION_VERSION || trace.canon !== CANON_VERSION)
		return ['missing-editorial-trace'];
	const chapters = reading.sections.filter((s) => !/^Referências/.test(s.title));
	if (
		chapters.length < 6 ||
		chapters.some(
			(s) => s.text.length < 220 || !s.factIds.length || s.factIds.some((id) => !ids.has(id))
		)
	)
		failures.push('insufficient-supported-chapters');
	const first = chapters[0]?.factIds ?? [];
	const requiredIds =
		input.productId === 'midheaven'
			? ['angle-midheaven', 'career-mc-ruler', 'position-sun']
			: input.productId === 'ascendant'
				? ['angle-ascendant', 'natal-asc-ruler']
				: ['angle-ascendant', 'natal-asc-ruler', 'position-sun', 'position-moon'];
	if (!requiredIds.every((id) => first.includes(id)))
		failures.push('synthesis-missing-independent-factors');
	if (
		trace.plan.length !== reading.sections.length ||
		trace.plan.some(
			(p, i) =>
				p.title !== reading.sections[i]?.title ||
				p.factIds.join('|') !== reading.sections[i]?.factIds.join('|')
		)
	)
		failures.push('unbound-narrative-plan');
	if (input.context && trace.context.factId !== 'personal-context')
		failures.push('unbound-context');
	const text = [reading.opening, ...chapters.map((s) => s.text), reading.practice].join('\n');
	if (
		/sua alma|nasceu para|destino inevitável|sucesso garantido|o universo quer|pipeline|fact graph|contrato interpretativo|ressonância|jornada interior/i.test(
			text
		)
	)
		failures.push('voice-or-unsupported-claim');
	const sentences = [...chapters.map((s) => s.text), reading.practice].flatMap((text) =>
		text
			.split(/(?<=[.!?])\s+/)
			.map((s) => s.trim())
			.filter((s) => s.length > 100)
	);
	if (new Set(sentences).size !== sentences.length) failures.push('repeated-long-sentence');
	if (new Set(chapters.map((s) => s.text.slice(0, 100))).size !== chapters.length)
		failures.push('repeated-opening');
	if (trace.selection.some((s) => !ids.has(s.factId) || !Number.isFinite(s.score)))
		failures.push('invalid-relevance-evidence');
	if (trace.patterns.some((p) => !p.factIds.every((id) => first.includes(id))))
		failures.push('unused-pattern-evidence');
	return unique(failures);
}
