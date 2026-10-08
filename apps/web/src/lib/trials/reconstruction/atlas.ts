import type { CalculationSnapshot, WorkflowInput } from '@atv/domain';
import { atlasPriorityFor, type AtlasPriorityId } from '../../atlas-priorities';
import { canonical, type TrialReading } from '../reading';
import { assertAtlasProjection, atlasMethod, type AtlasData } from './atlas-facts';
import { CANON_VERSION, bodyNames, functions, signs } from './canon';
import { RECONSTRUCTION_VERSION } from './career';
import { normalizeFactGraph, type FactGraph, type Position } from './fact-graph';
import { houseAreas, natalStyles } from './natal-canon';

type Area = {
	houses: number[];
	bodies: string[];
	aim: string;
	tension: string;
	task: string;
	criterion: string;
	contrary: string;
};
/** Original editorial correspondences, declared rather than inferred from a person's prose. */
export const atlasAreas: Record<AtlasPriorityId, Area> = {
	work: {
		houses: [2, 6, 10],
		bodies: ['sun', 'saturn', 'mercury', 'mars'],
		aim: 'dar forma a uma contribuição que caiba nas condições reais de trabalho',
		tension: 'confundir reconhecimento com disponibilidade permanente',
		task: 'descrever uma tarefa que já realiza, quem se beneficia e uma pequena alteração que reduziria esforço sem deslocá-lo para outra pessoa',
		criterion: 'uma contribuição compreensível, com limite de tempo e responsabilidade combinados',
		contrary: 'a alteração aumenta a carga ou depende de autonomia que você não tem'
	},
	relationships: {
		houses: [7, 11],
		bodies: ['venus', 'moon', 'mercury', 'mars'],
		aim: 'tornar preferências e acordos mais claros em um vínculo escolhido',
		tension: 'tomar reciprocidade como adivinhação ou aceitar um acordo para evitar desconforto',
		task: 'escrever um pedido concreto e uma alternativa aceitável; só depois, se houver disponibilidade e consentimento, conversar com a pessoa envolvida',
		criterion: 'as duas pessoas conseguem dizer o que aceitaram e o que continua em aberto',
		contrary: 'o acordo exige silêncio, pressão ou uma disponibilidade que não foi oferecida'
	},
	resources: {
		houses: [2, 8],
		bodies: ['venus', 'saturn', 'jupiter', 'mars'],
		aim: 'distinguir recursos próprios, recursos compartilhados e limites de acesso',
		tension: 'tratar valor pessoal como equivalente a renda ou transformar prudência em culpa',
		task: 'listar sem valores monetários três recursos disponíveis — tempo, ferramenta ou apoio consentido — e uma condição de uso de cada um',
		criterion: 'o próximo passo usa um recurso já disponível e respeita quem também depende dele',
		contrary: 'a tarefa pressupõe dinheiro, acesso ou autorização inexistentes'
	},
	home: {
		houses: [4],
		bodies: ['moon', 'saturn', 'venus', 'sun'],
		aim: 'reconhecer uma condição de pertencimento que possa ser negociada no cotidiano',
		tension:
			'assumir cuidado como obrigação sem limite ou procurar segurança em uma regra imutável',
		task: 'observar um momento da rotina doméstica e escrever uma mudança pequena que preserve o espaço e a responsabilidade das demais pessoas',
		criterion: 'a mudança oferece alguma previsibilidade sem transferir o trabalho de cuidado',
		contrary: 'a proposta só funciona se outra pessoa assumir uma tarefa sem concordar'
	},
	learning: {
		houses: [3, 5, 9],
		bodies: ['mercury', 'jupiter', 'sun', 'venus'],
		aim: 'transformar curiosidade em uma forma de aprender e expressar algo verificável',
		tension:
			'acumular possibilidades sem escolher uma pergunta ou confundir exposição com aprendizagem',
		task: 'escolher uma pergunta, usar uma fonte gratuita já acessível e produzir em vinte minutos uma explicação curta com uma dúvida ainda aberta',
		criterion: 'você consegue explicar o que mudou em sua compreensão e onde a fonte não basta',
		contrary: 'a explicação repete a fonte sem permitir que você formule um exemplo próprio'
	},
	care: {
		houses: [6, 12],
		bodies: ['moon', 'saturn', 'mars', 'venus'],
		aim: 'observar ritmo, recuperação e limites sem transformar autocuidado em desempenho',
		tension:
			'preencher a pausa com mais uma obrigação ou chamar uma limitação material de falta de vontade',
		task: 'identificar uma exigência adiável e experimentar uma pausa breve compatível com sua segurança, responsabilidades e orientações de saúde já recebidas',
		criterion:
			'a pausa cabe no dia sem dívida de trabalho e permite perceber uma necessidade concreta',
		contrary: 'a tentativa aumenta cansaço, culpa ou conflito; reduza, substitua ou pause o teste'
	},
	identity: {
		houses: [1, 5],
		bodies: ['sun', 'mars', 'venus', 'uranus'],
		aim: 'distinguir uma escolha sua de uma expectativa que está repetindo',
		tension: 'tratar autonomia como isolamento ou uma preferência atual como identidade definitiva',
		task: 'escrever duas maneiras reversíveis de realizar uma tarefa pessoal e escolher a que permita explicar sua preferência sem desqualificar a alternativa',
		criterion:
			'você reconhece uma razão própria e consegue mudar de ideia diante de nova informação',
		contrary:
			'a escolha depende apenas de aprovação externa ou exige uma ruptura que o teste não justifica'
	},
	networks: {
		houses: [11, 9],
		bodies: ['mercury', 'jupiter', 'uranus', 'saturn'],
		aim: 'relacionar um projeto a pessoas, regras de participação e recursos acessíveis',
		tension:
			'confundir quantidade de contatos com apoio ou aderir a uma ideia sem conferir sua organização',
		task: 'desenhar em privado um projeto pequeno, a contribuição possível de cada participante e uma pergunta sobre como decisões seriam tomadas; não convide ninguém sem combinar antes',
		criterion: 'o projeto tem escopo e regras que podem ser explicados, revistos e recusados',
		contrary: 'o plano só avança com trabalho invisível, acesso fechado ou participação presumida'
	}
};
const unique = (ids: readonly string[]) => [...new Set(ids)];
const label = (p: Position) => `${bodyNames[p.body]} em ${signs[p.sign]}`;
const style = (p: Position) => {
	const s = natalStyles[p.sign];
	return p.body === 'sun'
		? s.aim
		: p.body === 'moon'
			? s.need
			: p.body === 'mercury'
				? s.thought
				: p.body === 'venus'
					? s.affection
					: p.body === 'mars'
						? s.action
						: `${functions[p.body]}, examinando como ${s.adjustment}`;
};
const aspectNames: Record<string, string> = {
	conjunction: 'conjunção',
	sextile: 'sextil',
	square: 'quadratura',
	trine: 'trígono',
	opposition: 'oposição'
};
export function selectAtlasCluster(graph: FactGraph, id: AtlasPriorityId) {
	const area = atlasAreas[id];
	const ranked = graph.positions
		.filter((p) => area.bodies.includes(p.body))
		.map((p) => ({
			position: p,
			score:
				12 -
				area.bodies.indexOf(p.body) * 2 +
				(p.house !== null && area.houses.includes(p.house) ? 6 : 0),
			reason: `Função editorial de ${functions[p.body]}${p.house !== null && area.houses.includes(p.house) ? `; casa ${p.house} associada à área` : ''}`
		}))
		.sort(
			(a, b) =>
				b.score - a.score ||
				area.bodies.indexOf(a.position.body) - area.bodies.indexOf(b.position.body)
		);
	const selected = ranked.slice(0, 3),
		bodies = selected.map((s) => s.position.body);
	const aspects = graph.aspects
		.filter((a) => bodies.includes(a.first) || bodies.includes(a.second))
		.map((a) => ({
			aspect: a,
			paired: bodies.includes(a.first) && bodies.includes(a.second) ? 1 : 0
		}))
		.sort(
			(a, b) =>
				b.paired - a.paired ||
				a.aspect.orb - b.aspect.orb ||
				a.aspect.factId.localeCompare(b.aspect.factId)
		)
		.slice(0, 2)
		.map((a) => a.aspect);
	const houseIds = graph.houses.filter((h) => area.houses.includes(h.house)).map((h) => h.factId);
	const angleIds =
		id === 'work' && graph.mc
			? ['angle-midheaven']
			: id === 'identity' && graph.asc
				? ['angle-ascendant']
				: [];
	return {
		selected,
		aspects,
		factIds: unique([
			...selected.flatMap((s) => [
				s.position.factId,
				...(s.position.house === null ? [] : [`house-${s.position.house}`])
			]),
			...houseIds,
			...angleIds,
			...aspects.map((a) => a.factId)
		])
	};
}
export function composeReconstructedAtlas(
	input: WorkflowInput,
	c: CalculationSnapshot
): TrialReading {
	assertAtlasProjection(input, c);
	const d = c.data as unknown as AtlasData,
		graph = normalizeFactGraph(c);
	const priorities = d.priorities.map((original, i) => ({
		original,
		choice: atlasPriorityFor(original)!,
		factId: `priority-${i + 1}`,
		day: atlasMethod.path[i]
	}));
	const clusters = priorities.map((p) => selectAtlasCluster(graph, p.choice.id));
	const sections: TrialReading['sections'] = [],
		plan: { title: string; factIds: string[]; role: string }[] = [];
	const add = (title: string, text: string, factIds: string[], role: string) => {
		const ids = unique(factIds);
		sections.push({ title, text, factIds: ids });
		plan.push({ title, factIds: ids, role });
	};
	add(
		'O mapa acompanha a ordem que você escolheu',
		`Seu percurso começa por ${priorities[0].original}, passa por ${priorities[1].original} e ${priorities[2].original} e chega a ${priorities[3].original}. Essa é uma ordem de atenção declarada por você. O mapa não mede qual área merece mais cuidado. A primeira recebe a abertura do percurso; as demais ganham capítulos e tarefas próprios. Mudar a escolha muda quais funções, casas disponíveis e relações são selecionadas; mudar apenas a ordem muda a sequência e a síntese, preservando a geometria natal. As correspondências são um método simbólico explícito, que deve ser confrontado com sua experiência.`,
		['priority-1', 'priority-2', 'priority-3', 'priority-4', 'atlas-method'],
		'priority-order'
	);
	priorities.forEach((p, i) => {
		const area = atlasAreas[p.choice.id],
			cluster = clusters[i];
		const functionsText = cluster.selected
			.map(
				({ position: q }) =>
					`${label(q)} traz a hipótese de ${style(q)}.${q.house === null ? ' A casa está indisponível; a leitura não substitui essa informação.' : ` A casa ${q.house} situa a função em ${houseAreas[q.house - 1]}.`} Para ${p.choice.label.toLocaleLowerCase('pt-BR')}, examine como esse modo de agir encontra a condição concreta da tarefa.`
			)
			.join('\n\n');
		const aspectText = cluster.aspects.length
			? cluster.aspects
					.map((a) => {
						const movement = ['square', 'opposition'].includes(a.kind)
							? 'negociar necessidades que podem pedir respostas diferentes'
							: a.kind === 'conjunction'
								? 'distinguir duas funções que podem entrar juntas na mesma situação'
								: 'experimentar uma cooperação que ainda depende de ação e condições';
						return `${bodyNames[a.first]} e ${bodyNames[a.second]} formam ${aspectNames[a.kind]} (orbe ${a.orb.toFixed(2)}°). A relação liga ${functions[a.first]} a ${functions[a.second]}; propõe ${movement}. Isso não comprova facilidade ou conflito na vida. Confronte a hipótese com um episódio e procure também quando ela não se aplica.`;
					})
					.join('\n\n')
			: 'Não foi selecionado aspecto maior ligado às funções desta área dentro dos orbes declarados. Isso não significa ausência de recursos ou tensões na sua experiência.';
		const housesText = graph.houses.length
			? `As casas ${area.houses.join(', ')} entram no recorte por sua associação editorial com ${area.aim}; são contextos simbólicos, não prova de um acontecimento.`
			: 'Sem casas disponíveis, o recorte usa as funções presentes e seus aspectos; não atribui áreas a casas inventadas.';
		add(
			`${i + 1}. ${p.choice.label}: funções que merecem atenção`,
			`Você informou “${p.original}” na posição ${i + 1}. O foco é ${area.aim}. Foram escolhidas três funções por relação com a área e, quando disponível, pela casa ocupada; esses pesos organizam o texto e não avaliam sua vida. ${housesText}\n\n${functionsText}\n\n${aspectText}\n\nUma tensão a investigar é ${area.tension}. Uma reação diferente da descrita também é informação útil: condições, história e decisões podem explicar mais do episódio que a hipótese simbólica.`,
			[p.factId, 'atlas-method', ...cluster.factIds],
			`priority-${i + 1}-reading`
		);
		add(
			`${i + 1}. ${p.choice.label}: uma experiência possível`,
			`Até o marco relativo do dia ${p.day}, experimente ${area.task}. Limite a tentativa a vinte minutos, sem despesa ou exposição pública; substitua-a por uma anotação privada se depender de consentimento ainda ausente. A hipótese é que ${area.aim} possa ganhar uma forma observável, respeitando as condições que você descreveu.\n\nUse como critério ${area.criterion}. Registre o que ocorreu, o que foi possível e que condição interferiu. Procure evidência contrária: ${area.contrary}. Não encontrar mudança não demonstra falha pessoal. Compare a hipótese com uma explicação alternativa, como tempo disponível, acesso ou resposta de outra pessoa. Escolha continuar, ajustar ou pausar; uma tarefa pequena pode ser suficiente para decidir o próximo teste.`,
			[p.factId, ...cluster.factIds],
			`priority-${i + 1}-experiment`
		);
	});
	const shared = unique(
		clusters[0].selected
			.filter((a) =>
				clusters.slice(1).some((cl) => cl.selected.some((b) => a.position.body === b.position.body))
			)
			.map((a) => a.position.body)
	);
	add(
		'Como suas prioridades conversam entre si',
		`${priorities[0].choice.label} abre este Atlas com ${clusters[0].selected.map((s) => bodyNames[s.position.body]).join(', ')}. ${priorities[1].choice.label} pede outro recorte: ${clusters[1].selected.map((s) => bodyNames[s.position.body]).join(', ')}. ${shared.length ? `A presença de ${shared.map((b) => bodyNames[b]).join(' e ')} em mais de uma área permite examinar como uma mesma função muda de papel conforme a situação.` : 'Os primeiros recortes não precisam compartilhar a mesma função para dialogar; a ligação pode estar nas condições que você observa.'} Não some os pesos como uma nota. Uma solução na primeira área pode consumir o tempo ou apoio necessário à segunda.\n\nAntes de avançar para ${priorities[2].choice.label} e ${priorities[3].choice.label}, confira o que cada tentativa oferece e exige. Escolha uma condição comum a preservar, como tempo, privacidade ou responsabilidade. Se as áreas competirem pelo mesmo recurso, reduza o escopo e diga qual ficará para depois. Alterar a ordem cria outro percurso; a leitura atual conserva a ordem original para permitir comparação honesta.`,
		unique([...priorities.map((p) => p.factId), ...clusters.flatMap((cl) => cl.factIds)]),
		'priority-connections'
	);
	add(
		'Seu percurso de trinta dias',
		`Dia zero: anote uma expectativa, uma condição que precisa preservar e como perceberá que o teste deve ser revisto. Dias 1–7: ${priorities[0].choice.label}; ${atlasAreas[priorities[0].choice.id].task}. Dias 8–14: ${priorities[1].choice.label}; ${atlasAreas[priorities[1].choice.id].task}. Dias 15–21: ${priorities[2].choice.label}; ${atlasAreas[priorities[2].choice.id].task}. Dias 22–30: ${priorities[3].choice.label}; ${atlasAreas[priorities[3].choice.id].task}.\n\nNos marcos 7, 14 e 21, registre observação, condições, evidência contrária e próximo passo. No dia 30, compare os quatro relatos com a expectativa inicial: o que se sustentou, o que precisa de outra explicação e o que você escolhe continuar, ajustar ou pausar? Os dias são relativos ao início que você decidir; não são datas de trânsito ou comprovação de execução. Use as anotações privadas abaixo e reabra a leitura para recuperar o percurso. Etapas sem relato continuam sem evidência.`,
		priorities.map((p) => p.factId),
		'30-day-path'
	);
	const context = input.context;
	const contextAction = /mud|transi|troca/i.test(context ?? '')
		? 'Compare a tentativa com uma condição atual que precisa preservar antes de planejar uma mudança.'
		: /cansa|descans|cuidado|saúde/i.test(context ?? '')
			? 'Reduza o teste à menor ação que caiba na energia e no apoio disponíveis; uma pausa também pode ser a decisão adequada.'
			: 'Escolha um episódio recente relacionado à primeira prioridade e escreva qual condição concreta permite repetir ou revisar a tentativa.';
	add(
		'Seu contexto delimita o que vale experimentar',
		`${context ? `Você declarou: “${context}”.` : 'Você não acrescentou contexto livre; o Atlas não preenche essa ausência com uma história presumida.'} ${contextAction} A ordem das prioridades organiza a atenção, enquanto sua situação define o que é possível. Uma hipótese simbólica não informa renda, formação, saúde, segurança ou acesso. Essas condições precisam vir do seu relato e da experiência.\n\nAntes da primeira tarefa, registre um limite que não quer ultrapassar e um recurso já disponível. Uma demanda urgente pode mudar a sequência; anote a razão em vez de interpretar o desvio como desobediência ao mapa. Não exponha dados de outras pessoas para comprovar o exercício. Se o contexto mudar, um novo pedido pode registrar novas prioridades sem reescrever a edição anterior.`,
		['priority-1', ...(context ? ['personal-context'] : [])],
		'reported-context'
	);
	add(
		'Revisão: o que merece continuar',
		`Volte a ${priorities[0].choice.label}: qual observação sustenta o critério de ${atlasAreas[priorities[0].choice.id].criterion}? Compare com ${priorities[3].choice.label}, cujo critério é ${atlasAreas[priorities[3].choice.id].criterion}. Uma diferença entre as respostas pode mostrar uma condição diferente, sem indicar que uma área é melhor.\n\nLeia também os relatos das duas etapas intermediárias. Separe o fato observado da interpretação que fez dele e registre evidência contrária antes de escolher o próximo passo. Se não houve tentativa, escreva o impedimento sem inventar resultado. A decisão pode ser continuar uma prática pequena, ajustar uma condição, pausar ou encerrar a pergunta. No ATV+, você pode consultar suas leituras e escolher outra pergunta; esse histórico não é importado automaticamente nem transforma repetição em prova de destino.`,
		priorities.map((p) => p.factId),
		'final-review'
	);
	const used = new Set(sections.flatMap((s) => s.factIds)),
		remaining = c.facts.filter((f) => !used.has(f.id));
	add(
		'Base completa e limites do recorte',
		`O mapa completo permanece disponível no gráfico e nesta base. A ausência de um fator nos capítulos significa somente que ele não foi priorizado pelo recorte das quatro áreas. Não significa ausência de uma qualidade ou problema. Todos os fatores preservam a origem do cálculo; contexto e prioridades permanecem relatos.\n\n${remaining.map((f) => f.display).join('\n\n')}\n\nOs capítulos usam três funções por área e até dois aspectos ligados a elas. Outros fatores podem oferecer leituras diferentes. Nenhuma interpretação substitui sua observação, as condições sociais ou orientação profissional pertinente.`,
		remaining.map((f) => f.id),
		'source-appendix'
	);
	return {
		version: RECONSTRUCTION_VERSION,
		productId: input.productId,
		title: 'Atlas da Vida 360',
		opening: `Comece por ${priorities[0].choice.label}, com atenção a ${clusters[0].selected.map((s) => functions[s.position.body]).join(', ')}. Depois percorra ${priorities
			.slice(1)
			.map((p) => p.choice.label)
			.join(
				', '
			)}. Sua ordem orienta quatro recortes do mesmo mapa e um roteiro de observação de trinta dias.`,
		source:
			'Síntese simbólica natal ATVNA organizada por quatro prioridades declaradas, correspondências explícitas e condições da experiência.',
		sections,
		questions: [
			`O que faz de ${priorities[0].choice.label} sua primeira prioridade agora?`,
			`Qual condição precisa ser preservada ao passar de ${priorities[0].choice.label} para ${priorities[1].choice.label}?`,
			'Que observação contrariaria sua hipótese?',
			'O que você escolhe continuar, ajustar ou pausar depois de comparar os quatro relatos?'
		],
		practice: `Comece com ${priorities[0].choice.label}: ${atlasAreas[priorities[0].choice.id].task}. Registre expectativa e limites no dia zero; observação, condições, evidência contrária e próximo passo nos dias 7, 14, 21 e 30.`,
		limits: c.limits,
		editorial: {
			version: RECONSTRUCTION_VERSION,
			canon: CANON_VERSION,
			graph: 'atv-atlas-priority-graph/1.0.0',
			selection: clusters.flatMap((cl, i) =>
				cl.selected.map((s) => ({
					factId: s.position.factId,
					score: s.score,
					reason: `Prioridade ${i + 1} (${priorities[i].choice.label}): ${s.reason}`
				}))
			),
			patterns: clusters.map((cl, i) => ({
				kind: `priority-cluster-${priorities[i].choice.id}`,
				factIds: cl.factIds
			})),
			themes: priorities.map((p, i) => ({
				id: p.choice.id,
				factIds: [p.factId, ...clusters[i].factIds]
			})),
			context: { key: 'general', factId: context ? 'personal-context' : null },
			plan
		}
	};
}
export function reviewReconstructedAtlas(
	input: WorkflowInput,
	c: CalculationSnapshot,
	r: TrialReading
): string[] {
	try {
		assertAtlasProjection(input, c);
	} catch {
		return ['atlas-source-mismatch'];
	}
	const errors: string[] = [];
	if (canonical(r) !== canonical(composeReconstructedAtlas(input, c)))
		errors.push('atlas-editorial-mismatch');
	if (r.sections.length !== 14 || r.sections.some((s) => s.text.length < 220))
		errors.push('atlas-depth');
	if (c.facts.some((f) => !r.sections.some((s) => s.factIds.includes(f.id))))
		errors.push('atlas-fact-coverage');
	if (r.editorial?.themes.length !== 4 || r.editorial.plan.length !== r.sections.length)
		errors.push('atlas-priority-plan');
	return errors;
}
