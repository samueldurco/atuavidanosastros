import type { CalculationSnapshot, WorkflowInput } from '@atv/domain';
import type { TrialReading } from '../reading';
import { CANON_VERSION, aspectNames, bodyNames, functions, signMeanings, signs } from './canon';
import type { EditorialTrace } from './career';
import { normalizeFactGraph, type Aspect, type FactGraph, type Position } from './fact-graph';
import {
	assertCompassProjection,
	COMPASS_READING_VERSION,
	compassMethod,
	type CompassData
} from './compass-facts';
import { houseAreas } from './natal-canon';

const unique = (ids: string[]) => [...new Set(ids)];
const label = (p: Position) => `${bodyNames[p.body]} em ${signs[p.sign]}`;
const personal = new Set(['sun', 'moon', 'mercury', 'venus', 'mars']);
type CompassContext = {
	key: EditorialTrace['context']['key'];
	priority: string[];
	focus: string;
	task: string;
	question: string;
};
export function compassContext(text = ''): CompassContext {
	const t = text.toLocaleLowerCase('pt-BR');
	if (/sobrecarg|cansa|exaust|esgot|descanso/.test(t))
		return {
			key: 'workload',
			priority: ['sustainability', 'environment'],
			focus:
				'Na pergunta sobre carga e descanso, a capacidade disponível vem antes de ampliar a direção.',
			task: 'escolha uma tarefa que possa ser reduzida; descreva a entrega mínima, o apoio necessário e uma responsabilidade que precisa ser renegociada',
			question: 'Que parte da carga pode diminuir antes de acrescentar uma nova iniciativa?'
		};
	if (/estud|formaç|\bcurso\b|aprender/.test(t))
		return {
			key: 'study',
			priority: ['motivation', 'working-style'],
			focus:
				'Na pergunta sobre aprendizagem, compare interesse com a experiência concreta de praticar.',
			task: 'compare dois exercícios gratuitos e curtos ligados à habilidade mencionada; observe compreensão, interesse e acesso a orientação antes de assumir uma formação',
			question:
				'Qual exercício acessível permite comparar seu interesse com a prática antes de escolher uma formação?'
		};
	if (/lider|equipe|gestão|gestao|coordena/.test(t))
		return {
			key: 'leadership',
			priority: ['environment', 'contribution'],
			focus:
				'Na pergunta sobre equipe, a contribuição depende de acordos entre autonomia, responsabilidade e apoio.',
			task: 'descreva uma entrega compartilhada, quem pode decidir cada parte e o retorno necessário; identifique um acordo que precisa ficar claro antes da execução',
			question:
				'Que acordo entre autonomia e responsabilidade precisa ficar explícito para a equipe?'
		};
	if (/autônom|empreend|freela|negócio próprio|projeto próprio/.test(t))
		return {
			key: 'independent',
			priority: ['sustainability', 'working-style'],
			focus: 'Na pergunta sobre atividade própria, limite o escopo antes de avaliar uma expansão.',
			task: 'esboce uma proposta pequena, o recurso já disponível e o limite de entrega; compare o tempo necessário com a margem atual sem assumir compromisso financeiro',
			question: 'Que parte da proposta cabe nos recursos atuais e pode ser avaliada sem despesa?'
		};
	if (/mudança|mudar|transi|recoloca|desempreg|alternativa|comparar/.test(t))
		return {
			key: 'transition',
			priority: ['contribution', 'environment'],
			focus:
				'Na comparação entre direções, examine a tarefa real e as condições de acesso antes de decidir.',
			task: 'compare uma tarefa da situação atual com uma alternativa acessível; descreva quem se beneficia, o que muda no cotidiano e qual informação ainda falta',
			question:
				'Qual diferença concreta entre a situação atual e a alternativa precisa ser verificada antes de decidir?'
		};
	return {
		key: 'general',
		priority: ['contribution', 'motivation'],
		focus: 'A reflexão começa pela utilidade de uma tarefa e pela motivação para repeti-la.',
		task: 'escolha uma tarefa já disponível; descreva para quem ela serve e compare o resultado obtido com o esforço necessário',
		question: 'Em qual tarefa você consegue observar utilidade e motivação nas condições atuais?'
	};
}
const themeBodies = (ruler: string): Record<string, string[]> => ({
	contribution: ['sun', ruler],
	motivation: ['sun', 'moon', 'venus'],
	environment: ['moon', 'mercury', 'saturn'],
	'working-style': ['mercury', 'mars', 'sun'],
	sustainability: ['jupiter', 'saturn', 'mars']
});
const required = (g: FactGraph, body: string) => {
	const p = g.positions.find((p) => p.body === body);
	if (!p) throw Error(`Função natal ausente da Bússola: ${body}.`);
	return p;
};
export function compassSelection(g: FactGraph) {
	const ruler = g.mc!.ruler,
		bodySets = themeBodies(ruler),
		themes = Object.values(bodySets),
		binding = compassContext(g.facts.find((f) => f.id === g.contextFactId)?.display);
	return g.aspects
		.map((a) => ({
			aspect: a,
			score:
				[a.first, a.second].filter((b) => personal.has(b)).length *
					compassMethod.selection.personalWeight +
				([a.first, a.second].includes(ruler) ? compassMethod.selection.rulerWeight : 0) +
				themes.filter((b) => b.includes(a.first) && b.includes(a.second)).length *
					compassMethod.selection.themeWeight +
				binding.priority.filter(
					(id) => bodySets[id].includes(a.first) && bodySets[id].includes(a.second)
				).length *
					compassMethod.selection.contextWeight +
				6 -
				a.orb
		}))
		.sort((a, b) => b.score - a.score || a.aspect.factId.localeCompare(b.aspect.factId))
		.slice(0, compassMethod.selection.maximumAspects);
}
const procedures: Record<string, string> = {
	sun: 'assumir uma entrega de autoria identificável e pedir retorno sobre sua utilidade',
	moon: 'observar uma necessidade de cuidado ou acolhimento e combinar como atendê-la sem absorver toda a carga',
	mercury:
		'transformar uma informação confusa numa explicação curta e conferir o que a outra pessoa compreendeu',
	venus:
		'comparar dois critérios de qualidade e negociar um acordo que respeite o valor de cada parte',
	mars: 'iniciar uma tarefa delimitada e explicitar onde sua responsabilidade começa e termina',
	jupiter: 'ligar uma tarefa a uma ideia mais ampla e testar um exemplo antes de generalizar',
	saturn: 'definir uma sequência curta, um limite de escopo e um critério verificável de conclusão',
	uranus: 'propor uma mudança pequena no procedimento e comparar o resultado com o modo habitual',
	neptune: 'dar forma concreta a uma percepção ou imagem e pedir retorno sobre o que ela comunica',
	pluto:
		'investigar a causa de um problema delimitado sem transformar a investigação em controle das pessoas'
};
function relation(g: FactGraph, a: Aspect) {
	const one = required(g, a.first),
		two = required(g, a.second);
	const dynamic = {
		conjunction:
			'As funções entram juntas na cena; convém distinguir o que cada uma pede antes de responder de modo automático.',
		sextile:
			'Há uma possibilidade de cooperação que pede iniciativa. A facilidade só se torna recurso quando recebe uma tarefa concreta.',
		square:
			'Os procedimentos podem disputar a mesma decisão. Defina quando usar cada um, em vez de cobrar respostas simultâneas para necessidades diferentes.',
		trine:
			'A familiaridade entre os procedimentos pode facilitar a ação, mas também esconder hábitos sem revisão. Peça retorno sobre o resultado.',
		opposition:
			'As prioridades pedem negociação: dar todo o espaço a uma delas pode tornar invisível a necessidade da outra. Procure uma sequência ou um acordo.'
	}[a.kind];
	return `${label(one)} e ${label(two)} formam ${aspectNames[a.kind]} (orbe ${a.orb.toFixed(2)}°) e colocam em relação ${functions[a.first]} com ${functions[a.second]}. Um procedimento busca ${signMeanings[one.sign].method}; o outro, ${signMeanings[two.sign].method}. ${dynamic} Observe uma situação de trabalho em que essa combinação ajudou e outra em que atrapalhou. Se o contraste não aparecer na experiência, reduza o peso dessa hipótese; condições de trabalho e aprendizagem também explicam o resultado.`;
}

export function composeReconstructedCompass(
	input: WorkflowInput,
	c: CalculationSnapshot
): TrialReading {
	assertCompassProjection(input, c);
	const g = normalizeFactGraph(c),
		data = c.data as unknown as CompassData;
	if (!g.mc || !g.mc.ruler) throw Error('Meio do Céu e regente necessários.');
	const sun = required(g, 'sun'),
		moon = required(g, 'moon'),
		mercury = required(g, 'mercury'),
		venus = required(g, 'venus'),
		mars = required(g, 'mars'),
		jupiter = required(g, 'jupiter'),
		saturn = required(g, 'saturn'),
		ruler = required(g, g.mc.ruler);
	const direction = signMeanings[g.mc.sign],
		authorship = signMeanings[sun.sign],
		security = signMeanings[moon.sign],
		thinking = signMeanings[mercury.sign],
		action = signMeanings[mars.sign],
		values = signMeanings[venus.sign],
		regency = signMeanings[ruler.sign];
	const binding = compassContext(input.context);
	const selected = compassSelection(g),
		core = unique([...g.mc.factIds, sun.factId, ruler.factId, 'compass-ruler-house']);
	const sections: TrialReading['sections'] = [],
		plan: EditorialTrace['plan'] = [];
	const add = (title: string, text: string, factIds: string[], role: string) => {
		const ids = unique(factIds);
		sections.push({ title, text, factIds: ids });
		plan.push({ title, factIds: ids, role });
	};
	const angular = data.angular.length
		? data.angular
				.map(
					(a) =>
						`${bodyNames[a.body]} está a ${a.orb.toFixed(2)}° do MC: a função de ${functions[a.body]} recebe destaque angular`
				)
				.join('; ')
		: 'A direção será articulada pelo signo do MC, seu regente e os fatores pessoais';
	add(
		'Uma direção para comparar com a vida real',
		`A direção sugerida pelo MC em ${signs[g.mc.sign]} é ${direction.contribution}. Ela ganha um meio de execução em ${label(ruler)}: ${procedures[ruler.body]}, com atenção a ${regency.method}. ${label(sun)} acrescenta a necessidade de ${authorship.motivation}. A hipótese central é combinar uma contribuição útil a outras pessoas com um modo de fazê-la que preserve sua participação e possa ser repetido nas condições atuais.\n\n${angular}. ${selected[0] ? `Um vínculo que modifica essa hipótese será examinado adiante: ${bodyNames[selected[0].aspect.first]} e ${bodyNames[selected[0].aspect.second]} articulam as funções de ${functions[selected[0].aspect.first]} e de ${functions[selected[0].aspect.second]}.` : 'Os procedimentos abaixo devem ser avaliados pelo resultado e pelo custo.'} Comece por uma atividade que você já conhece: observe se o resultado ajudou alguém, se o procedimento funcionou e se o custo foi sustentável. Uma divergência entre esses três pontos pede ajuste da tarefa ou do ambiente, sem obrigar você a sustentar uma identidade profissional.`,
		unique([
			...core,
			...data.angular.map((a) => a.factId),
			...(selected[0] ? [selected[0].aspect.factId] : [])
		]),
		'integrated-compass'
	);
	add(
		'Contribuição: do ângulo à entrega',
		`O Meio do Céu está em ${signs[g.mc.sign]}, a ${(g.mc.longitude % 30).toFixed(2)}° do signo. Sua direção simbólica é ${direction.contribution}; uma entrega útil começa quando você identifica para quem isso faz diferença e como reconhecer essa utilidade. A regência moderna liga esse ângulo a ${label(ruler)} e ao procedimento de ${procedures[ruler.body]}.\n\n${data.regent.house === null ? 'A casa do regente está indisponível; o local de expressão dessa função permanece em aberto.' : `O regente ocupa a casa ${data.regent.house}, associada a ${houseAreas[data.regent.house - 1]}. Use esse campo como lugar possível de observação: procure uma atividade já vivida ali e veja como sua contribuição apareceu.`} O signo do regente qualifica o modo: ${regency.method}. Isso não escolhe uma ocupação. Compare tarefas concretas de diferentes atividades e pergunte qual delas permite produzir um resultado que outra pessoa consiga reconhecer, dentro dos recursos a que você tem acesso.`,
		core,
		'contribution'
	);
	add(
		'Motivação: autoria, segurança e valor',
		`${label(sun)} propõe ${authorship.motivation} como fonte de participação; ${label(moon)} acrescenta ${security.motivation} como condição de segurança; ${label(venus)} pede atenção ao valor de ${values.contribution}. Essas três funções podem ser atendidas numa mesma atividade, mas cada uma faz uma pergunta diferente: tenho espaço para participar, consigo sustentar a experiência e considero útil o que estou fazendo?\n\n${sun.sign === moon.sign ? 'Sol e Lua compartilham o signo: a direção da autoria e a busca de segurança usam um vocabulário próximo. Essa convergência pode facilitar o início, sem dispensar o retorno de outras pessoas.' : `Sol e Lua usam procedimentos diferentes: ${authorship.method}, para participar, e ${security.method}, para obter segurança. Reserve espaço para ambos; interesse não elimina a necessidade de apoio e previsibilidade.`} Relembre uma tarefa que motivou você e uma que consumiu energia apesar do reconhecimento. Diferencie o conteúdo da tarefa, as relações e as condições de execução antes de atribuir a diferença a uma vocação.`,
		[sun.factId, moon.factId, venus.factId],
		'motivation'
	);
	add(
		'Ambientes: condições que permitem contribuir',
		`A direção do MC pode ser favorecida em contextos com ${direction.environment}. A Lua acrescenta a necessidade de ${security.environment}; Mercúrio, a de ${thinking.environment}. Essas são condições a investigar em atividades e organizações reais: descreva como as decisões são tomadas, como se pede ajuda, como circulam as informações e que autonomia acompanha a responsabilidade.\n\n${label(saturn)} propõe ${signMeanings[saturn.sign].method} para dar continuidade. Compare o ambiente imaginado com o disponível: uma tarefa interessante pode se tornar inviável quando faltam tempo, apoio, remuneração suficiente ou condições de saúde. Liste uma condição indispensável e uma negociável. Busque evidência em experiências anteriores ou numa conversa acessível sobre o trabalho concreto; um nome de cargo, sozinho, não informa como o cotidiano funciona.`,
		[...g.mc.factIds, moon.factId, mercury.factId, saturn.factId],
		'environment'
	);
	add(
		'Modo de trabalhar: pensar, iniciar e concluir',
		`${label(mercury)} simboliza um modo de pensar e comunicar: ${thinking.method}. ${label(mars)} indica um modo de iniciar e defender limites: ${action.method}. A sequência prática é explicitar o problema, escolher uma ação pequena e combinar o critério de conclusão. ${mercury.sign === mars.sign ? 'Os dois fatores compartilham o signo; pensar e agir podem seguir um procedimento semelhante. Inclua uma pausa de conferência para não confundir rapidez com compreensão.' : `Como os procedimentos diferem, dê a cada função um momento: primeiro organize a informação do modo proposto por Mercúrio; depois inicie uma ação delimitada do modo indicado por Marte.`}\n\nExperimente essa sequência numa tarefa já disponível. Registre o que ficou mais claro e onde foi necessário pedir ajuda ou renegociar o limite. Se o procedimento tornar a tarefa mais lenta sem melhorar o resultado, simplifique-o. Se faltar conhecimento técnico, a próxima ação pode ser aprender ou buscar orientação; o mapa não comprova habilidade nem dispensa formação.`,
		[mercury.factId, mars.factId, sun.factId],
		'working-style'
	);
	add(
		'Tensões e recursos: três relações em contexto',
		selected.length
			? selected.map((s) => relation(g, s.aspect)).join('\n\n') +
					'\n\nA seleção prioriza funções pessoais, regente do MC, vínculos com os cinco temas, prioridades do contexto e proximidade do aspecto. Esses pesos organizam a leitura; não medem a importância objetiva de um traço ou acontecimento. Escolha a relação que encontra um exemplo claro e deixe as demais como hipóteses.'
			: 'Compare a contribuição que deseja oferecer com o modo de pensar, agir e buscar segurança descrito acima. Uma dificuldade pode vir da tarefa, da aprendizagem ou das condições do ambiente. Registre um exemplo e uma alternativa de procedimento antes de atribuir a tensão a uma característica permanente. A ausência de contato selecionado não elimina conflitos nem garante facilidade.',
		selected.length
			? unique(
					selected.flatMap((s) => [
						s.aspect.factId,
						required(g, s.aspect.first).factId,
						required(g, s.aspect.second).factId
					])
				)
			: [sun.factId, moon.factId, mercury.factId, mars.factId],
		'selected-relations'
	);
	add(
		'Sustentação: crescer sem ultrapassar os recursos',
		`${label(jupiter)} oferece a hipótese de ${signMeanings[jupiter.sign].contribution}, por meio de ${signMeanings[jupiter.sign].method}. ${label(saturn)} contrapõe o trabalho de ${signMeanings[saturn.sign].contribution}; seu procedimento é ${signMeanings[saturn.sign].method}. Crescimento e continuidade precisam de uma negociação concreta: o que vale ampliar, o que cabe manter e qual limite protege a qualidade da entrega?\n\nO excesso a observar em Júpiter é ${signMeanings[jupiter.sign].cost}; em Saturno, ${signMeanings[saturn.sign].cost}. Considere tempo, recursos, saúde, responsabilidades e oportunidades reais. Defina um teto de esforço e uma condição de parada antes do teste. Se a margem atual for pequena, reduzir escopo ou adiar pode ser a escolha coerente. Uma limitação de acesso não demonstra falta de propósito, disposição ou mérito.`,
		[jupiter.factId, saturn.factId, mars.factId],
		'sustainability'
	);
	add(
		'Seu contexto: transformar a pergunta em critérios',
		`${input.context ? `Você informou: “${input.context}”\n\nEsse relato define a pergunta a investigar; a leitura não acrescenta uma profissão, uma intenção de mudança ou uma condição que você não declarou.` : 'Nenhum contexto profissional foi informado. Escolha uma situação concreta antes de aplicar a leitura: uma tarefa atual, um projeto acessível ou uma dúvida sobre o cotidiano do trabalho.'}\n\nPara essa situação, compare três critérios: a utilidade de ${direction.contribution} para alguém; a possibilidade de ${procedures[ruler.body]} com os recursos atuais; e o custo de um procedimento voltado a ${regency.method} quando surgem exigências do ambiente. Escreva um exemplo favorável e um limite para cada critério. Se sua pergunta envolver uma decisão ampla, reduza-a a uma informação que ainda falta ou a uma tarefa reversível. Contexto, necessidades materiais e preferência pessoal podem fazer você escolher outro caminho, mesmo quando a hipótese simbólica parece atraente.`,
		unique([...core, ...(g.contextFactId ? [g.contextFactId] : [])]),
		'reported-context'
	);
	add(
		'Um experimento privado de vinte minutos',
		`Reserve até vinte minutos para uma tarefa já acessível, sem despesa e sem compromisso público. A hipótese é: “${direction.contribution} pode ser útil quando uso este procedimento: ${regency.method}”. Use o procedimento de ${procedures[ruler.body]}. Como ponto de partida, ${direction.test}. Adapte a proposta a uma ação pequena que possa interromper ou desfazer.\n\nAntes, registre o resultado esperado, o tempo disponível e uma condição que faria você parar. Depois, anote o que produziu, quem poderia se beneficiar e qual parte exigiu ajuda. Procure uma evidência contrária: a tarefa trouxe pouco valor, o procedimento aumentou o esforço ou o ambiente impediu a execução? Nenhum desses resultados precisa ser corrigido para caber no mapa. Escolha continuar, ajustar, adiar ou abandonar a hipótese. Se a tarefa envolver outras pessoas, combine a participação e o retorno; observar algo sozinho também é uma opção válida.`,
		core,
		'reversible-experiment'
	);
	add(
		'Levar uma escolha adiante',
		`A Bússola reuniu direção pública, motivação, condições de ambiente, pensamento e ação, relações selecionadas e capacidade de sustentar o esforço. Volte à hipótese inicial: ${direction.contribution}, por meio de ${regency.method}, preservando espaço para ${authorship.motivation}. Use o resultado do teste para decidir qual parte merece continuidade e qual precisa mudar.\n\nRegistre uma observação concreta, um limite e um próximo passo pequeno. Uma conversa, um exercício ou a revisão de um acordo já podem produzir informação suficiente; não é necessário iniciar uma mudança profissional. O registro fica sob sua escolha e a continuidade no ATV+ exige consentimento próprio. Reabra esta leitura quando houver novas condições e compare a hipótese com a experiência atual. A decisão permanece revisável: aprendizagem, acesso e responsabilidades mudam o que é possível realizar.`,
		core,
		'practical-reflection'
	);
	sections[0].text = `${binding.focus}\n\n${sections[0].text}`;
	const contextIndex = plan.findIndex((p) => p.role === 'reported-context');
	sections[contextIndex].text +=
		`\n\nPara responder à pergunta declarada, ${binding.task}. A informação a procurar é esta: ${binding.question}`;
	const experimentIndex = plan.findIndex((p) => p.role === 'reversible-experiment');
	sections[experimentIndex].text =
		`${binding.focus} No teste, ${binding.task}.\n\n${sections[experimentIndex].text}`;
	const themeOrder = unique([...binding.priority, ...compassMethod.themes]);
	const order = [
		'integrated-compass',
		'reported-context',
		...themeOrder,
		'selected-relations',
		'reversible-experiment',
		'practical-reflection'
	];
	const ordered = sections
		.map((s, i) => ({ s, p: plan[i] }))
		.sort((a, b) => order.indexOf(a.p.role) - order.indexOf(b.p.role));
	sections.splice(0, sections.length, ...ordered.map((o) => o.s));
	plan.splice(0, plan.length, ...ordered.map((o) => o.p));
	const used = new Set(sections.flatMap((s) => s.factIds)),
		remaining = g.facts.filter((f) => !used.has(f.id));
	add(
		'Base preservada e referências de cálculo',
		remaining.map((f) => f.display.replace(/ da candidata\b/g, '')).join('\n') +
			'\n\nA base natal integral fica preservada para conferência. A seleção acima organiza uma investigação de trabalho e contribuição; fatores de outras áreas não viram afirmações profissionais sem uma relação explícita. Casas indisponíveis permanecem indisponíveis. Os aspectos usam o método registrado, sem atribuir aplicação ou separação. A experiência relatada pode contrariar a hipótese e modificar seu uso.',
		remaining.map((f) => f.id),
		'technical-reference'
	);
	return {
		version: COMPASS_READING_VERSION,
		productId: 'career-compass',
		title: 'Bússola de Carreira',
		opening: `${binding.focus} Uma direção possível é ${direction.contribution}, experimentando ${regency.method}. Compare essa hipótese com sua motivação, o ambiente de trabalho e as condições reais para sustentar a escolha.`,
		source:
			'Método ATVNA de funções do trabalho: síntese natal humanista com regência moderna, cinco temas, aspectos selecionados e contexto declarado.',
		sections,
		questions: [
			binding.question,
			`Que condição do ambiente permite experimentar ${regency.method} sem ultrapassar seus limites?`,
			'Que evidência faria você ajustar ou abandonar essa hipótese?'
		],
		practice: `Faça o experimento privado de até vinte minutos, sem despesa: ${binding.task}. Use o procedimento de ${procedures[ruler.body]}. Registre resultado, custo e evidência contrária; escolha um próximo passo reversível.`,
		limits: c.limits,
		editorial: {
			version: COMPASS_READING_VERSION,
			canon: CANON_VERSION,
			graph: 'atv-compass-work-graph/1.0.0',
			selection: selected.map((s) => ({
				factId: s.aspect.factId,
				score: Math.round(s.score * 1000) / 1000,
				reason: 'personal-endpoints*5+mc-ruler*6+shared-themes*4+context-shared-themes*8+6-orb'
			})),
			patterns: data.angular.map((a) => ({
				kind: 'mc-proximity',
				factIds: [a.factId, `position-${a.body}`, 'angle-midheaven']
			})),
			themes: Object.entries(themeBodies(ruler.body)).map(([id, bodies]) => ({
				id,
				factIds: unique([
					...(id === 'contribution' ? core : []),
					...bodies.map((b) => required(g, b).factId)
				])
			})),
			context: { key: binding.key, factId: g.contextFactId },
			plan
		}
	};
}
export function reviewReconstructedCompass(
	input: WorkflowInput,
	c: CalculationSnapshot,
	r: TrialReading
): string[] {
	try {
		assertCompassProjection(input, c);
	} catch {
		return ['compass-source-mismatch'];
	}
	const errors: string[] = [];
	if (
		r.productId !== 'career-compass' ||
		r.version !== COMPASS_READING_VERSION ||
		r.editorial?.canon !== CANON_VERSION ||
		r.editorial.graph !== 'atv-compass-work-graph/1.0.0'
	)
		errors.push('compass-edition');
	if (r.sections.length !== 11 || r.sections.some((s) => s.text.length < 220))
		errors.push('compass-depth');
	if (
		r.editorial?.plan.length !== r.sections.length ||
		r.sections.some(
			(s, i) =>
				s.title !== r.editorial?.plan[i].title ||
				JSON.stringify(s.factIds) !== JSON.stringify(r.editorial?.plan[i].factIds)
		)
	)
		errors.push('compass-plan');
	if (compassMethod.themes.some((id) => !r.editorial?.themes.some((t) => t.id === id)))
		errors.push('compass-themes');
	if (
		input.context &&
		!r.sections.some(
			(s) => s.factIds.includes('personal-context') && s.text.includes(input.context!)
		)
	)
		errors.push('compass-context');
	if (
		r.questions.length !== 3 ||
		!r.sections.some(
			(s) => s.text.includes('evidência contrária') && s.text.includes('vinte minutos')
		)
	)
		errors.push('compass-review');
	return errors;
}
