import type { CalculationSnapshot, WorkflowInput } from '@atv/domain';
import type { TrialReading } from '../reading';
import {
	CANON_VERSION,
	bodyNames,
	functions,
	houseMeanings,
	modernRulers,
	signMeanings,
	signs
} from './canon';
import { normalizeFactGraph, type Aspect, type FactGraph, type Position } from './fact-graph';

export const RECONSTRUCTION_VERSION = 'atv-product-reconstruction/4.0.0';
export const RECONSTRUCTION_POLICY = 'atv-private-interpretation-review/4.0.0';
type ContextKey =
	'transition' | 'leadership' | 'study' | 'independent' | 'workload' | 'relationships' | 'general';
type ContextBinding = {
	key: ContextKey;
	criteria: string;
	experiment: string;
	question: string;
	title: string;
};
export type EditorialTrace = {
	version: string;
	canon: string;
	graph: string;
	selection: { factId: string; score: number; reason: string }[];
	patterns: { kind: string; factIds: string[] }[];
	themes: { id: string; factIds: string[] }[];
	context: { key: ContextKey; factId: string | null };
	plan: { title: string; factIds: string[]; role: string }[];
};
const distinct = (ids: readonly string[]) => [...new Set(ids)];
const capitalize = (text: string) => text[0].toLocaleUpperCase('pt-BR') + text.slice(1);
const position = (graph: FactGraph, body: string) => graph.positions.find((p) => p.body === body);
const required = (graph: FactGraph, body: string) => {
	const p = position(graph, body);
	if (!p) throw new Error(`Posição necessária ausente: ${body}.`);
	return p;
};
const label = (p: Position) => `${bodyNames[p.body]} em ${signs[p.sign]}`;
const idsOf = (...positions: Position[]) => positions.map((p) => p.factId);
const bodyWeight: Record<string, number> = {
	sun: 12,
	moon: 10,
	mercury: 9,
	mars: 9,
	venus: 7,
	saturn: 8,
	jupiter: 7,
	uranus: 3,
	neptune: 3,
	pluto: 3
};

/** Relevance: explicit finite weights; close orbs and the MC ruler win ties. */
function select(graph: FactGraph) {
	const ruler = graph.mc!.ruler;
	const selection = graph.aspects.map((a) => ({
		aspect: a,
		score:
			(bodyWeight[a.first] ?? 0) +
			(bodyWeight[a.second] ?? 0) +
			([a.first, a.second].includes(ruler) ? 8 : 0) +
			(['square', 'opposition'].includes(a.kind) ? 4 : 0) +
			Math.max(0, 6 - a.orb)
	}));
	return selection
		.sort((a, b) => b.score - a.score || a.aspect.factId.localeCompare(b.aspect.factId))
		.slice(0, 3);
}
function patternEngine(graph: FactGraph) {
	const personal = graph.positions.filter((p) =>
		['sun', 'moon', 'mercury', 'venus', 'mars'].includes(p.body)
	);
	const patterns: EditorialTrace['patterns'] = [];
	for (let element = 0; element < 4; element++) {
		const group = personal.filter((p) => p.sign % 4 === element);
		if (group.length >= 3)
			patterns.push({ kind: `personal-element-${element}`, factIds: idsOf(...group) });
	}
	if (graph.mc) {
		const angular = graph.positions.filter(
			(p) =>
				Math.min(
					Math.abs(p.longitude - graph.mc!.longitude),
					360 - Math.abs(p.longitude - graph.mc!.longitude)
				) <= 5
		);
		if (angular.length)
			patterns.push({
				kind: 'near-midheaven',
				factIds: distinct([...graph.mc.factIds, ...idsOf(...angular)])
			});
	}
	return patterns;
}

function patternSynthesis(
	graph: FactGraph,
	patterns: EditorialTrace['patterns']
): { text: string; factIds: string[] } {
	const angular = patterns.find((p) => p.kind === 'near-midheaven');
	if (angular) {
		const bodies = graph.positions.filter((p) => angular.factIds.includes(p.factId));
		return {
			text: `A proximidade de ${bodies.map((p) => bodyNames[p.body]).join(' e ')} ao Meio do Céu dá destaque a ${bodies.map((p) => functions[p.body]).join(' e ')} nessa contribuição. Ao avaliar uma função, examine em quais responsabilidades essas capacidades podem ser exercidas, em vez de considerar somente o título do cargo.`,
			factIds: angular.factIds
		};
	}
	const shared = patterns.find((p) => p.kind.startsWith('personal-element-'));
	if (!shared) return { text: '', factIds: [] };
	const styles = [
		'iniciar e experimentar',
		'manter um procedimento e verificar o resultado',
		'comparar ideias e conversar sobre alternativas',
		'perceber a experiência das pessoas envolvidas'
	];
	const costs = [
		'abrir mais tarefas do que consegue acompanhar',
		'insistir em um procedimento que precisa mudar',
		'adiar uma tentativa enquanto compara opções',
		'assumir necessidades de outras pessoas sem combinar responsabilidades'
	];
	const element = Number(shared.kind.at(-1));
	const names = graph.positions
		.filter((p) => shared.factIds.includes(p.factId))
		.map((p) => bodyNames[p.body])
		.join(', ');
	return {
		text: `${names} compartilham uma ênfase que atravessa diferentes funções pessoais: ${styles[element]}. Essa repetição torna esse modo de trabalhar um recurso a investigar, mas também pede atenção ao risco de ${costs[element]}. Compare duas tarefas recentes: em qual esse procedimento ajudou e em qual precisou de um complemento?`,
		factIds: shared.factIds
	};
}
/** Only the reported context chooses this binding. No biographical inference. */
function contextBinder(input: WorkflowInput): ContextBinding {
	const text = (input.context ?? '')
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.toLowerCase();
	if (/compar|transi|mudar de|mudanca de|trocar de|funcao atual/.test(text))
		return {
			key: 'transition',
			title: 'Comparar caminhos sem decidir só pelo título',
			criteria:
				'Compare a função atual e a alternativa pelas tarefas de uma semana real: autonomia, tipo de entrega, apoio disponível e carga de trabalho. Separe o que você já observou do que ainda depende de uma conversa ou de uma experiência.',
			experiment:
				'Escolha uma tarefa representativa da alternativa, combine uma experiência de alcance curto e registre o que ela exigiu. Compare esse registro com uma tarefa da função atual. Uma atividade interessante isolada não informa como será toda a rotina.',
			question:
				'Que diferença entre as duas alternativas você já observou, e qual ainda precisa verificar?'
		};
	if (/lider|gestao|gerenci|coorden|equipe/.test(text))
		return {
			key: 'leadership',
			title: 'Responsabilidade e divisão de decisões',
			criteria:
				'Diferencie o resultado pelo qual você responde das decisões que a equipe pode tomar. Verifique como pedidos, prioridades e discordâncias chegam até você; esses acordos ajudam a avaliar o ambiente além do nome do cargo.',
			experiment:
				'Escolha uma decisão recorrente, combine quem decide e qual informação deve circular. Acompanhe uma semana sem retomar a tarefa a cada dificuldade e avalie o efeito sobre a equipe e sua carga.',
			question:
				'Que decisão precisa da sua participação e qual pode ser compartilhada com critérios claros?'
		};
	if (/estud|curso|faculdade|formacao|aprender/.test(text))
		return {
			key: 'study',
			title: 'Aprendizagem ligada a uma tarefa real',
			criteria:
				'Compare o conteúdo da formação com as atividades que você quer aprender a realizar. Observe tempo disponível, acesso a prática e qualidade do retorno; gostar de um assunto e gostar de trabalhar com ele são experiências diferentes.',
			experiment:
				'Faça uma atividade curta representativa da formação e peça retorno a alguém que conheça a prática. Registre o que despertou interesse, o que exigiu esforço e o que você precisaria aprender em seguida.',
			question:
				'Qual atividade prática permitiria avaliar seu interesse antes de assumir uma formação longa?'
		};
	if (/empreend|autonom|negocio|cliente|freelanc/.test(text))
		return {
			key: 'independent',
			title: 'Autonomia com acordos de entrega',
			criteria:
				'Examine o trabalho de executar, negociar, revisar e administrar uma entrega. Separe o interesse pela atividade das responsabilidades de manter o trabalho por conta própria; a leitura não estima renda nem viabilidade comercial.',
			experiment:
				'Defina uma entrega pequena com uma pessoa interessada, escopo, prazo e forma de retorno. Anote o tempo de execução e de administração, sem assumir novos compromissos antes de revisar essa experiência.',
			question:
				'Que parte do trabalho independente você já conhece e qual ainda precisa experimentar?'
		};
	if (/cans|carga|sobrecarg|exaust|limite|rotina/.test(text))
		return {
			key: 'workload',
			title: 'Condições para sustentar a rotina',
			criteria:
				'Descreva a carga atual por tarefas e horários, incluindo interrupções e pedidos não combinados. O mapa oferece uma linguagem de reflexão; condições de trabalho precisam ser avaliadas pelos acontecimentos e pelos recursos de apoio disponíveis.',
			experiment:
				'Escolha uma demanda recorrente, negocie um limite verificável e registre o que mudou durante uma semana. Se nada puder ser renegociado, essa restrição do ambiente também precisa entrar na avaliação.',
			question:
				'Qual exigência concreta poderia ser reduzida, reorganizada ou compartilhada nesta semana?'
		};
	return {
		key: 'general',
		title: 'Levar a leitura para uma escolha concreta',
		criteria:
			'Escolha uma situação profissional que você conhece e confronte a leitura com tarefas, relações e condições observadas. Considere também os exemplos em que a descrição não se aplica; eles ajudam a delimitar a hipótese.',
		experiment:
			'Escolha uma entrega pequena que permita observar sua forma de contribuir. Combine um critério de resultado e peça retorno sobre a execução. Registre o que funcionou e o que você faria de outro modo.',
		question:
			'Em qual situação recente você reconhece esta forma de contribuir, e em qual ela não aparece?'
	};
}
function aspectInterpretation(a: Aspect): string {
	const left = functions[a.first],
		right = functions[a.second];
	const pair = `${bodyNames[a.first]} e ${bodyNames[a.second]}`;
	if (a.kind === 'square')
		return `A quadratura entre ${pair} coloca ${left} e ${right} em uma relação de ajuste. No trabalho, vale observar quando atender a uma dessas necessidades dificulta atender à outra. Nomeie a escolha e seu custo antes de aumentar o esforço; insistir nas duas ao mesmo tempo pode conservar o impasse.`;
	if (a.kind === 'opposition')
		return `A oposição entre ${pair} contrapõe ${left} e ${right}. Uma situação profissional pode pedir que você diferencie esses critérios e negocie a participação de cada um. Evite atribuir um dos lados apenas a colegas ou à chefia: verifique também qual exigência é sua.`;
	if (a.kind === 'conjunction')
		return `A conjunção entre ${pair} aproxima ${left} e ${right}. Uma mesma tarefa pode mobilizar os dois temas, de modo que avaliar um deles separadamente fica mais difícil. Ao rever uma decisão, descreva o que queria realizar e a necessidade que estava tentando atender junto.`;
	if (a.kind === 'trine')
		return `O trígono entre ${pair} sugere uma associação relativamente fluida entre ${left} e ${right}. Essa facilidade simbólica pode orientar uma atividade para experimentar, mas não substitui prática nem comprova competência. Verifique se o recurso aparece na entrega e se continua útil fora de condições familiares.`;
	return `O sextil entre ${pair} aproxima ${left} e ${right} como recursos que podem ser desenvolvidos em conjunto. Escolha uma tarefa em que ambos tenham uma função clara e observe o efeito da prática. A possibilidade descrita não equivale a um resultado garantido.`;
}
/** Thematic synthesis joins multiple factors; it is never a list of sign keywords. */
function synthesis(graph: FactGraph, sun: Position, ruler: Position): string {
	const mc = graph.mc!,
		direction = signMeanings[mc.sign],
		personal = signMeanings[sun.sign],
		route = signMeanings[ruler.sign];
	const link =
		mc.sign % 4 === sun.sign % 4
			? `A direção pública e a motivação pessoal compartilham uma ênfase: a contribuição ganha sentido quando você consegue ${personal.contribution}. Essa convergência não elimina o cuidado com ${route.cost}.`
			: `A direção pública enfatiza ${direction.contribution}, enquanto sua motivação pessoal se liga a ${personal.motivation}. Uma função pode atender ao primeiro tema e deixar o segundo pouco presente. Ao comparar possibilidades, procure uma tarefa concreta em que os dois tenham lugar, sem exigir que todo o trabalho satisfaça todas as necessidades.`;
	return `O Meio do Céu em ${signs[mc.sign]} orienta a hipótese de ${direction.contribution}. Seu regente, ${label(ruler)}, mostra uma maneira de desenvolver essa direção: ${route.method}. ${link}`;
}

export function composeReconstructedCareer(
	input: WorkflowInput,
	calculation: CalculationSnapshot
): TrialReading {
	const graph = normalizeFactGraph(calculation);
	if (!graph.mc || !graph.positions.length)
		throw new Error('Dados natais completos são necessários para esta edição.');
	const sun = required(graph, 'sun'),
		mercury = required(graph, 'mercury'),
		mars = required(graph, 'mars'),
		moon = required(graph, 'moon'),
		jupiter = required(graph, 'jupiter'),
		saturn = required(graph, 'saturn'),
		ruler = required(graph, graph.mc.ruler);
	const direction = signMeanings[graph.mc.sign],
		style = signMeanings[mercury.sign],
		action = signMeanings[mars.sign],
		care = signMeanings[moon.sign],
		growth = signMeanings[jupiter.sign],
		structure = signMeanings[saturn.sign];
	const selection = select(graph),
		patterns = patternEngine(graph),
		binding = contextBinder(input),
		pattern = patternSynthesis(graph, patterns);
	if (
		input.context &&
		(!graph.contextFactId ||
			graph.facts.find((f) => f.id === graph.contextFactId)?.display !== input.context)
	)
		throw new Error('Contexto sem fato relatado correspondente.');
	const coreIds = distinct([...graph.mc.factIds, ...idsOf(sun, ruler)]);
	const themes: EditorialTrace['themes'] = [
		{ id: 'contribution', factIds: coreIds },
		{ id: 'environment', factIds: distinct([...graph.mc.factIds, ...idsOf(moon, mercury)]) },
		{ id: 'execution', factIds: idsOf(mercury, mars, jupiter, saturn) },
		{ id: 'adjustment', factIds: selection.map((s) => s.aspect.factId) }
	];
	const plan: EditorialTrace['plan'] = [];
	const sections: TrialReading['sections'] = [];
	const add = (title: string, text: string, factIds: string[], role: string) => {
		const ids = distinct(factIds);
		sections.push({ title, text, factIds: ids });
		plan.push({ title, factIds: ids, role });
	};
	add(
		'Como sua contribuição pode ganhar forma',
		[synthesis(graph, sun, ruler), pattern.text].filter(Boolean).join('\n\n'),
		distinct([...coreIds, ...pattern.factIds]),
		'integrated-synthesis'
	);
	add(
		'O ambiente também participa da escolha',
		`A direção do Meio do Céu valoriza ${direction.environment}. Isso descreve condições para investigar, sem indicar uma profissão específica. ${label(mercury)} acrescenta um modo de lidar com problemas: ${style.method}. Verifique se o ambiente permite esse procedimento ou exige outro o tempo todo.\n\n${label(moon)} traz para a análise a necessidade de ${care.motivation}. Um trabalho pode ter tarefas interessantes e, ainda assim, oferecer pouco espaço para essa necessidade. Observe os acordos cotidianos: como circula o retorno, como as pessoas pedem ajuda e como se tratam as mudanças de prioridade.`,
		themes[1].factIds,
		'environment-and-needs'
	);
	add(
		'Entre compreender e agir',
		`${label(mercury)} favorece a hipótese de ${style.method}; ${label(mars)} desloca a atenção para ${action.method}. ${mercury.sign === mars.sign ? 'Aqui, a forma de analisar e a de iniciar uma ação compartilham o mesmo modo de proceder. O risco é repetir esse modo quando a tarefa pede uma abordagem diferente.' : `Esses procedimentos podem pedir tempos diferentes. Antes de executar, explicite o que precisa estar compreendido; durante a execução, defina o que pode ser aprendido pela tentativa.`}\n\nUm cuidado associado a Mercúrio é ${style.cost}; com Marte, é ${action.cost}. Use esses dois pontos para revisar uma tarefa que ficou difícil: o problema estava na definição, na iniciativa ou nas condições de execução?`,
		idsOf(mercury, mars),
		'working-style'
	);
	if (selection.length)
		add(
			'Uma tensão ou recurso que muda a leitura',
			`${aspectInterpretation(selection[0].aspect)}\n\nRelacione esse contato à possibilidade de ${direction.contribution}: em qual tarefa os dois temas ajudam essa contribuição, e em qual dificultam sua execução? Escolha um exemplo recente para avaliar a relação.`,
			[
				selection[0].aspect.factId,
				...idsOf(
					required(graph, selection[0].aspect.first),
					required(graph, selection[0].aspect.second)
				),
				...graph.mc.factIds
			],
			'selected-aspect'
		);
	add(
		'Crescer sem perder as condições de continuidade',
		`${label(jupiter)} associa a expansão à possibilidade de ${growth.method}. ${label(saturn)} acrescenta um critério de sustentação: ${structure.method}. A combinação convida a testar uma ampliação que tenha condições de continuidade.\n\nAntes de aceitar uma responsabilidade nova, descreva o aprendizado que ela oferece e os recursos que exige. A hipótese de crescimento perde utilidade quando depende de ${growth.cost}; a busca de segurança pode estreitar a escolha quando leva a ${structure.cost}. Procure um compromisso que permita aprender e revisar a carga.`,
		idsOf(jupiter, saturn),
		'growth-and-conditions'
	);
	if (input.productId === 'purpose-career') {
		for (const house of graph.houses.filter((h) => [2, 6, 10].includes(h.house))) {
			const houseRuler = required(graph, modernRulers[house.sign]);
			const occupants = graph.positions.filter((p) => p.house === house.house);
			const meaning = signMeanings[houseRuler.sign];
			const observations: Record<number, string> = {
				2: 'Liste recursos que você já utiliza, como tempo, ferramentas e capacidades desenvolvidas. Qual deles precisa ser melhor reconhecido ou preservado em um acordo de trabalho?',
				6: 'Descreva uma semana de tarefas, interrupções e manutenção. Qual acordo cotidiano ajudaria esse modo de trabalhar a se tornar praticável?',
				10: 'Observe como sua contribuição é avaliada e quem participa dessa avaliação. O critério de reconhecimento corresponde à responsabilidade que você de fato assume?'
			};
			const empty: Record<number, string> = {
				2: 'Mesmo sem planetas nesta casa, recursos e valor do trabalho continuam presentes na análise pelo signo da cúspide e por seu regente.',
				6: 'Uma casa 6 sem planetas não elimina a importância da rotina. Aqui, a leitura se apoia na cúspide e na posição de seu regente.',
				10: 'A ausência de planetas na casa 10 não indica falta de direção profissional; cúspide, regente e Meio do Céu qualificam esse campo.'
			};
			add(
				`Casa ${house.house}: ${house.house === 2 ? 'recursos e valor do trabalho' : house.house === 6 ? 'rotina e condições de execução' : 'responsabilidade e reconhecimento'}`,
				`A casa ${house.house} organiza a reflexão sobre ${houseMeanings[house.house]}. Com a cúspide em ${signs[house.sign]}, a leitura ganha o critério de ${signMeanings[house.sign].contribution}. Seu regente, ${label(houseRuler)}, relaciona esse tema à maneira de ${meaning.method}.\n\n${occupants.length ? `Nesta casa estão ${occupants.map((p) => bodyNames[p.body]).join(', ')}. As funções de ${occupants.map((p) => functions[p.body]).join(' e ')} entram no mesmo campo de experiência; observe em qual tarefa isso fica mais claro.` : empty[house.house]} ${observations[house.house]}`,
				[house.factId, houseRuler.factId, ...idsOf(...occupants)],
				'house-ruler-and-occupants'
			);
		}
		if (selection.length > 1)
			add(
				'Outras relações que qualificam a direção',
				selection
					.slice(1)
					.map((s) => aspectInterpretation(s.aspect))
					.join('\n\n'),
				selection
					.slice(1)
					.flatMap((s) => [
						s.aspect.factId,
						...idsOf(required(graph, s.aspect.first), required(graph, s.aspect.second))
					]),
				'secondary-aspects'
			);
	}
	add(
		binding.title,
		`${binding.criteria}\n\nUse como primeiro critério a possibilidade de ${direction.contribution}. Como segundo, verifique se há espaço para ${signMeanings[sun.sign].motivation}. Como terceiro, examine o limite de ${structure.cost}. Esses critérios ganham valor quando você os confronta com a experiência relatada, inclusive quando ela contradiz a leitura.`,
		distinct([...coreIds, saturn.factId, ...(graph.contextFactId ? [graph.contextFactId] : [])]),
		'context-bound-decision'
	);
	add(
		'Um experimento e uma revisão',
		`${binding.experiment}\n\nPara observar a contribuição descrita pelo regente do Meio do Céu, você pode ${signMeanings[ruler.sign].test}. Adapte a tarefa às condições que possui. Depois, registre uma entrega concreta, uma dificuldade e um ajuste. Decida o passo seguinte com esse registro e com o retorno recebido, sem tratar o mapa como uma escolha feita por você.`,
		distinct([...coreIds, ...(graph.contextFactId ? [graph.contextFactId] : [])]),
		'context-bound-experiment'
	);
	const used = new Set(sections.flatMap((s) => s.factIds));
	const remaining = graph.facts.filter((f) => !used.has(f.id));
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
		title: input.productId === 'purpose-career' ? 'Mapa de Carreira' : 'Bússola de Carreira',
		opening: `${capitalize(direction.contribution)} é uma hipótese central desta leitura. Ela é qualificada pelo modo de ${signMeanings[ruler.sign].method} e pela motivação de ${signMeanings[sun.sign].motivation}.`,
		source:
			'Leitura simbólica do mapa natal, relacionada às condições e escolhas que você pode observar no trabalho.',
		sections,
		questions: [
			binding.question,
			`Em que tarefa você já conseguiu ${direction.contribution}, e o que tornou isso possível?`,
			`Que condição ajuda você a ${structure.method}, sem ${structure.cost}?`
		],
		practice: `Faça três colunas: contribuição, motivação e condições. Anote um exemplo observado de ${direction.contribution}, um de ${signMeanings[sun.sign].motivation} e uma condição que permita ${structure.method}. Termine o registro respondendo: ${binding.question} Use essa resposta na próxima revisão da escolha.`,
		limits: distinct([
			...calculation.limits,
			'Esta leitura não determina profissão, renda ou competência. As hipóteses devem ser confrontadas com sua experiência.'
		]),
		editorial: {
			version: RECONSTRUCTION_VERSION,
			canon: CANON_VERSION,
			graph: graph.version,
			selection: selection.map((s) => ({
				factId: s.aspect.factId,
				score: Math.round(s.score * 1000) / 1000,
				reason: 'personal-functions+mc-ruler+aspect-kind+orb'
			})),
			patterns,
			themes,
			context: { key: binding.key, factId: graph.contextFactId },
			plan
		}
	};
}

/** Quality checks are separate from composer equality and the integrity digest. */
export function reviewReconstructedCareer(
	input: WorkflowInput,
	calculation: CalculationSnapshot,
	reading: TrialReading
): string[] {
	const failures: string[] = [],
		trace = reading.editorial;
	const ids = new Set(calculation.facts.map((f) => f.id));
	if (!trace || trace.canon !== CANON_VERSION || trace.version !== RECONSTRUCTION_VERSION)
		return ['missing-editorial-trace'];
	const chapters = reading.sections.filter((s) => !/^Referências/.test(s.title));
	if (
		chapters.length < 6 ||
		chapters.some(
			(s) => s.text.length < 220 || !s.factIds.length || s.factIds.some((id) => !ids.has(id))
		)
	)
		failures.push('insufficient-supported-chapters');
	const synthesisIds = chapters[0]?.factIds ?? [];
	if (
		!['angle-midheaven', 'position-sun', 'career-mc-ruler'].every((id) => synthesisIds.includes(id))
	)
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
	const text = [
		reading.opening,
		...chapters.map((s) => s.text),
		...reading.questions,
		reading.practice
	].join('\n');
	if (
		/sua alma|destino inevitável|nasceu para|vibraç|o universo quer|profissão ideal|sucesso garantido|contrato interpretativo|fact graph|pipeline|ressonância|jornada interior/i.test(
			text
		)
	)
		failures.push('voice-or-unsupported-claim');
	const sentences = chapters.flatMap((s) =>
		s.text
			.split(/(?<=[.!?])\s+/)
			.map((s) => s.trim())
			.filter((s) => s.length > 90)
	);
	if (new Set(sentences).size !== sentences.length) failures.push('repeated-long-sentence');
	if (new Set(chapters.map((s) => s.text.slice(0, 100))).size !== chapters.length)
		failures.push('repeated-opening');
	if (trace.selection.some((s) => !ids.has(s.factId) || !Number.isFinite(s.score)))
		failures.push('invalid-relevance-evidence');
	if (
		trace.patterns.length &&
		!trace.patterns.some((p) => p.factIds.every((id) => synthesisIds.includes(id)))
	)
		failures.push('unused-pattern-evidence');
	return distinct(failures);
}
