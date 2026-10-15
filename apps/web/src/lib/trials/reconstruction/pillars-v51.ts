import type { CalculationSnapshot, WorkflowInput } from '@atv/domain';
import type { TrialReading } from '../reading';
import { aspectNames, bodyNames, signs } from './canon';
import { normalizeFactGraph, type Aspect, type FactGraph, type Position } from './fact-graph';
import { houseAreas } from './natal-canon';
import {
	composeReconstructedPillars,
	pillarsContext,
	pillarsSelection,
	reviewReconstructedPillars,
	ways
} from './pillars';
import {
	assertPillarsProjection,
	PILLARS_READING_VERSION,
	PILLARS_READING_V5_VERSION
} from './pillars-facts';

// Each function asks a different observable question. The sign changes its manner;
// it does not turn all planets in that sign into the same psychological trait.
const roles: Record<string, { work: string; evidence: string }> = {
	sun: {
		work: 'assumir uma escolha e reconhecer sua autoria',
		evidence: 'a participação efetivamente escolhida delimita a decisão'
	},
	moon: {
		work: 'reconhecer a condição de segurança e recuperação',
		evidence: 'a possibilidade de continuar sem esgotamento mostra se havia apoio'
	},
	mercury: {
		work: 'formular, escutar e revisar informação',
		evidence: 'a diferença entre pergunta e resposta revela o que ainda precisa ser entendido'
	},
	venus: {
		work: 'negociar preferência, valor e reciprocidade',
		evidence: 'o que cada parte aceitou ou recusou mostra a medida do acordo'
	},
	mars: {
		work: 'iniciar ação e marcar um limite',
		evidence: 'o passo executado e o limite respeitado distinguem iniciativa de imposição'
	},
	jupiter: {
		work: 'ampliar sentido e possibilidades',
		evidence: 'os recursos disponíveis determinam o alcance possível da expansão'
	},
	saturn: {
		work: 'estabelecer compromisso, prazo e capacidade',
		evidence: 'a diferença entre compromisso e tempo disponível revela o custo da promessa'
	},
	uranus: {
		work: 'ensaiar uma alternativa ao hábito',
		evidence: 'a alternativa só ganha sentido diante da rotina que pode melhorar'
	},
	neptune: {
		work: 'dar linguagem a uma impressão e esclarecer seus limites',
		evidence: 'o observado e o imaginado precisam permanecer distinguíveis'
	},
	pluto: {
		work: 'examinar profundidade, controle e transformação',
		evidence: 'a mudança possível termina onde começaria a coerção de outra pessoa'
	}
};
const unique = (ids: readonly string[]) => [...new Set(ids)];
const scenes = {
	workload: {
		setting: 'Se chegar mais uma demanda quando o descanso já está em questão',
		priority: 'o tempo e a energia realmente disponíveis',
		move: 'reduza uma demanda antes de prometer continuidade',
		turn: 'O pedido novo pode aproveitar uma competência sua e, ao mesmo tempo, ocupar o tempo que você reservou para descansar.'
	},
	relationships: {
		setting: 'Se uma conversa sobre confiança pedir uma resposta agora',
		priority: 'o que cada pessoa aceitou dizer ou ouvir',
		move: 'proponha uma conversa curta e peça uma resposta explícita',
		turn: 'Uma resposta imediata pode encerrar a conversa antes de se descobrir se há confiança para continuá-la.'
	},
	study: {
		setting: 'Se você começar uma atividade de estudo que pode interromper',
		priority: 'o tempo e o apoio que permitem aprender',
		move: 'escolha um exercício acessível e confira o que compreendeu',
		turn: 'O entusiasmo do começo pode adiantar uma meta enquanto a compreensão ainda se forma.'
	},
	general: {
		setting: 'Se aparecer uma decisão cotidiana que ainda pode ser revista',
		priority: 'as condições reais para continuar',
		move: 'escolha um gesto reversível e confira seu efeito',
		turn: 'Uma resposta rápida pode soar definitiva antes de você saber o custo de mantê-la.'
	}
} as const;
const evidenceCue: Record<string, string> = {
	sun: 'a escolha assumida',
	moon: 'a condição de apoio',
	mercury: 'a pergunta respondida',
	venus: 'o acordo aceito pelas partes',
	mars: 'a iniciativa com limite',
		jupiter: 'o alcance da proposta',
	saturn: 'o prazo e a capacidade disponíveis',
	uranus: 'a alternativa comparada com a rotina',
	neptune: 'o observado separado da impressão',
	pluto: 'o que pode mudar sem forçar outra pessoa'
};
const position = (g: FactGraph, body: string) => {
	const p = g.positions.find((p) => p.body === body);
	if (!p) throw Error(`Função natal ausente: ${body}.`);
	return p;
};
const label = (p: Position) => `${bodyNames[p.body]} em ${signs[p.sign]}`;
const sunMoonLine = (aspect: Aspect | undefined) => {
	if (!aspect)
		return 'Não há aspecto maior Sol–Lua; por isso, nenhuma facilidade ou disputa entre os dois será atribuída ao cálculo.';
	const relation = aspectNames[aspect.kind];
	if (aspect.kind === 'square' || aspect.kind === 'opposition')
		return `A ${relation} entre Sol e Lua (orbe ${aspect.orb.toFixed(2)}°) torna relevante a ordem: uma escolha pode avançar enquanto o apoio ainda pede negociação.`;
	if (aspect.kind === 'conjunction')
		return `A ${relation} entre Sol e Lua (orbe ${aspect.orb.toFixed(2)}°) aproxima escolha e necessidade no mesmo momento; distingui-las impede que uma fale pela outra.`;
	return `O ${relation} entre Sol e Lua (orbe ${aspect.orb.toFixed(2)}°) permite que a escolha encontre apoio com menos atrito, desde que essa condição exista na situação.`;
};
const aspectPriority = (g: FactGraph, aspect: Aspect | undefined) => {
	if (!aspect) return 'Não há outro vínculo selecionado que mude a prioridade desta cena.';
	const a = position(g, aspect.first),
		b = position(g, aspect.second);
	const pair = `${bodyNames[a.body]}–${bodyNames[b.body]} em ${aspectNames[aspect.kind]}`;
	if (aspect.kind === 'conjunction')
		return `${pair} reúne ${evidenceCue[a.body]} e ${evidenceCue[b.body]} no mesmo momento; uma função não comprova a outra.`;
	if (aspect.kind === 'square' || aspect.kind === 'opposition')
		return `${pair} acrescenta uma fricção possível entre ${evidenceCue[a.body]} e ${evidenceCue[b.body]}; uma parte pode avançar sem acomodar a outra.`;
	return `${pair} sugere uma passagem possível entre ${evidenceCue[a.body]} e ${evidenceCue[b.body]}, caso haja condições para as duas funções.`;
};
const priorityDiscovery = (aspect: Aspect | undefined) => {
	if (!aspect) return 'Nenhum outro aspecto selecionado desloca essa pergunta inicial.';
	const first = evidenceCue[aspect.first],
		second = evidenceCue[aspect.second];
	const pair = `${bodyNames[aspect.first]}–${bodyNames[aspect.second]} em ${aspectNames[aspect.kind]}`;
	if (aspect.kind === 'conjunction')
		return `${pair} destaca uma diferença: ${first} não comprova por si só ${second}.`;
	if (aspect.kind === 'square' || aspect.kind === 'opposition')
		return `${pair} põe uma distância em foco entre ${first} e ${second}.`;
	return `${pair} põe em foco uma possível cooperação entre ${first} e ${second}.`;
};
type PillarPair = 'sun-moon' | 'sun-ascendant' | 'moon-ascendant';
export function pillarsPairV51(pair: PillarPair, firstSign: number, secondSign: number): string {
	const sameElement = firstSign % 4 === secondSign % 4;
	const sameModality = firstSign % 3 === secondSign % 3;
	if (pair === 'sun-moon')
		return `Entre Sol em ${signs[firstSign]} e Lua em ${signs[secondSign]}, ${sameElement ? 'a escolha e a busca de apoio podem reconhecer sinais parecidos; a existência do apoio continua uma questão da situação' : 'o sinal usado para mostrar uma escolha pode não responder ao que dá apoio; essa condição precisaria aparecer antes de uma promessa de continuidade'}. ${sameModality ? 'O modo de sustentar os dois movimentos se aproxima, mas suas funções continuam diferentes' : 'Os modos de sustentar os dois movimentos diferem; a condição de apoio pode ganhar contorno depois do primeiro compromisso'}.`;
	if (pair === 'sun-ascendant')
		return `Entre Sol em ${signs[firstSign]} e Ascendente em ${signs[secondSign]}, ${sameElement ? 'a entrada pode dar uma pista reconhecível da escolha, sem confirmá-la inteira' : 'a primeira impressão pode sugerir uma intenção diferente da escolha que ainda precisa ser dita'}. ${sameModality ? 'A forma do primeiro gesto pode acompanhar a decisão, enquanto seu limite permanece implícito' : 'O primeiro gesto e a decisão seguem modos diferentes; uma frase pode impedir que a entrada seja tomada como resposta final'}.`;
	return `Entre Lua em ${signs[firstSign]} e Ascendente em ${signs[secondSign]}, ${sameElement ? 'algo da condição de apoio pode aparecer no gesto inicial, mas sua disponibilidade continua em aberto' : 'a condição de apoio pode ficar escondida atrás do primeiro gesto; sem nomeá-la, o outro teria de adivinhar'}. ${sameModality ? 'A entrada e a busca de apoio podem manter um modo semelhante, sem equivalerem uma à outra' : 'A entrada e a busca de apoio seguem modos diferentes; uma pausa pode revelar o que o gesto não mostrou'}.`;
}
const role = (p: Position, other: Position) => {
	const r = roles[p.body];
	if (!r) throw Error(`Função editorial ausente: ${p.body}.`);
	return `${label(p)} trata de ${r.work} diante de ${bodyNames[other.body]}; ${r.evidence}.`;
};
const dynamics: Record<string, (one: Position, two: Position) => string> = {
	conjunction: (a, b) =>
		`As duas funções chegam juntas; ${evidenceCue[a.body]} e ${evidenceCue[b.body]} podem parecer uma só resposta, embora pertençam a perguntas diferentes.`,
	sextile: (a, b) =>
		`Há uma oportunidade de combinar ${evidenceCue[a.body]} com ${evidenceCue[b.body]}, desde que cada função tenha lugar na cena.`,
	square: (a, b) =>
		`Os dois pedidos podem disputar tempo ou recursos: ${evidenceCue[a.body]} pode avançar sem reservar lugar para ${evidenceCue[b.body]}.`,
	trine: (a, b) =>
		`A cooperação entre ${evidenceCue[a.body]} e ${evidenceCue[b.body]} pode parecer natural, mas ainda depende das condições da situação.`,
	opposition: (a, b) =>
		`Os pedidos podem surgir em lados diferentes de uma conversa: a distância entre ${evidenceCue[a.body]} e ${evidenceCue[b.body]} ganha importância.`
};
export function pillarsRelationV51(g: FactGraph, a: Aspect) {
	const one = position(g, a.first),
		two = position(g, a.second),
		interpret = dynamics[a.kind];
	if (!interpret) throw Error(`Aspecto editorial ausente: ${a.kind}.`);
	return `${label(one)} e ${label(two)} formam ${aspectNames[a.kind]}, orbe ${a.orb.toFixed(2)}°. ${interpret(one, two)} ${role(one, two)} ${role(two, one)}`;
}

type Integration = { text: string; factIds: string[] };
export function pillarsIntegrationV51(g: FactGraph, input: WorkflowInput): Integration {
	if (!g.asc) throw Error('Ascendente necessário.');
	const sun = position(g, 'sun'),
		moon = position(g, 'moon'),
		ruler = position(g, g.asc.ruler),
		binding = pillarsContext(input.context),
		selected = pillarsSelection(g),
		luminary = g.aspects.find(
			(a) => [a.first, a.second].includes('sun') && [a.first, a.second].includes('moon')
		),
		contact = g.angleContacts.find((a) => a.angle === 'ascendant'),
		rulerHouse = ruler.house,
		scene = scenes[binding.key],
		angle = contact
			? `O contato de ${bodyNames[contact.body]} com o Ascendente (${aspectNames[contact.kind]}, orbe ${contact.orb.toFixed(2)}°) pode trazer ${evidenceCue[contact.body]} para a primeira impressão.`
			: 'Nenhum contato angular selecionado muda essa primeira impressão.';
	const text = `${scene.setting}, ${ways[g.asc.sign].start} pode ser entendido como uma decisão já tomada. ${scene.turn} Aqui está o intervalo deste trio: a entrada por Ascendente em ${signs[g.asc.sign]} acontece antes de se confirmar se a escolha de ${ways[sun.sign].choose}, ligada a ${label(sun)}, pode contar com ${ways[moon.sign].need}, condição indicada por ${label(moon)}.\n\n${luminary ? `O vínculo Sol–Lua calculado é ${aspectNames[luminary.kind]} (orbe ${luminary.orb.toFixed(2)}°); ${luminary.kind === 'conjunction' ? 'escolha e apoio aparecem juntos no desenho do mapa, sem que um comprove o outro' : ['square', 'opposition'].includes(luminary.kind) ? 'a ordem entre decidir e obter apoio ganha importância' : 'escolha e apoio podem aproximar-se se a condição existir'}.` : 'Sem aspecto maior Sol–Lua, a relação entre decidir e obter apoio permanece uma hipótese de uso, sem qualidade geométrica atribuída.'} O regente do Ascendente, ${label(ruler)}${rulerHouse === null ? ', sem casa calculável' : `, na casa ${rulerHouse} (${houseAreas[rulerHouse - 1]})`}, oferece um caminho para tornar o início concreto: ${roles[ruler.body].work}. ${aspectPriority(g, selected[0]?.aspect)} ${angle}\n\nNesta situação, o tamanho da promessa depende deste dado: ${scene.priority}. A hipótese perde força se o gesto inicial não tiver sido tomado como compromisso, se a condição lunar não importar ao resultado ou se ${selected[0] ? 'a relação selecionada' : 'a distinção entre escolha e apoio'} não aparecer no episódio.`;
	return {
		text,
		factIds: unique([
			sun.factId,
			moon.factId,
			...g.asc.factIds,
			ruler.factId,
			'pillars-ruler-house',
			...(rulerHouse === null ? [] : [`house-${rulerHouse}`]),
			...(luminary ? [luminary.factId] : []),
			...(selected[0]
				? [
						selected[0].aspect.factId,
						position(g, selected[0].aspect.first).factId,
						position(g, selected[0].aspect.second).factId
					]
				: []),
			...(contact ? [contact.factId, position(g, contact.body).factId] : []),
			...(g.contextFactId ? [g.contextFactId] : [])
		])
	};
}

export function composeReconstructedPillarsV51(
	input: WorkflowInput,
	c: CalculationSnapshot
): TrialReading {
	const reading = composeReconstructedPillars(input, c);
	if (!reading.editorial) throw Error('Rastreio editorial ausente.');
	const g = normalizeFactGraph(c);
	if (!g.asc) throw Error('Ascendente necessário.');
	const sun = position(g, 'sun'),
		moon = position(g, 'moon'),
		ruler = position(g, g.asc.ruler),
		binding = pillarsContext(input.context),
		integration = pillarsIntegrationV51(g, input),
		selected = pillarsSelection(g),
		contacts = g.angleContacts.filter((a) => a.angle === 'ascendant'),
		luminary = g.aspects.find(
			(a) => [a.first, a.second].includes('sun') && [a.first, a.second].includes('moon')
		),
		scene = scenes[binding.key];
	const replace = (index: number, text: string, ids: string[]) => {
		const factIds = unique(ids);
		reading.sections[index] = { ...reading.sections[index], text, factIds };
		reading.editorial!.plan[index] = { ...reading.editorial!.plan[index], factIds };
	};
	replace(
		0,
		`${scene.setting}, três movimentos podem acontecer em tempos diferentes: a entrada sugerida pelo Ascendente em ${signs[g.asc.sign]}, a escolha de ${label(sun)} e a condição de apoio de ${label(moon)}. O achado é que o gesto mais visível pode chegar primeiro sem representar a decisão inteira.\n\n${priorityDiscovery(selected[0]?.aspect)} O regente ${label(ruler)} oferece uma via para tornar essa diferença perceptível.`,
		integration.factIds
	);
	replace(
		1,
		`A cena pode começar com um detalhe: ${scene.turn} O gesto de ${ways[g.asc.sign].start} é algo que os outros podem perceber; a decisão de ${ways[sun.sign].choose} depende de você; o apoio para continuar talvez envolva ${ways[moon.sign].need}, algo menos visível.\n\nPor isso, a reação ao gesto não informa sozinha quanto você quer participar nem quanto apoio existe. Essas informações pertencem a momentos diferentes da mesma cena, e a diferença entre elas é o que esta leitura vai examinar.`,
		unique([sun.factId, moon.factId, ...g.asc.factIds])
	);
	replace(
		2,
		`${pillarsPairV51('sun-moon', sun.sign, moon.sign)}\n\n${pillarsPairV51('sun-ascendant', sun.sign, g.asc.sign)}\n\n${pillarsPairV51('moon-ascendant', moon.sign, g.asc.sign)}\n\nEssas comparações de signos não são aspectos geométricos. A relação efetiva Sol–Lua é conferida pelo cálculo na próxima parte.`,
		unique([sun.factId, moon.factId, ...g.asc.factIds])
	);
	replace(
		3,
		`${sunMoonLine(luminary)} Na cena proposta, ${ways[sun.sign].choose} só se torna uma escolha sustentável se houver espaço para ${ways[moon.sign].need}. ${luminary?.kind === 'conjunction' ? 'Mesmo quando decisão e necessidade aparecem juntas, a participação escolhida não informa sozinha se existe apoio para continuar.' : luminary && ['square', 'opposition'].includes(luminary.kind) ? 'Se escolha e apoio pedirem respostas simultâneas, pode ser preciso diminuir o compromisso ou mudar a ordem antes de agir.' : luminary ? 'Se a cooperação sugerida aparecer, ela pode tornar visível a condição que ajuda a escolha, sem garantir que estará sempre disponível.' : 'Sem vínculo geométrico maior, a disponibilidade desse apoio precisa ser conhecida na situação.'}\n\nA pergunta que fica é concreta: ao fazer esse primeiro movimento, que condição precisaria estar presente para você realmente continuar? Uma resposta diferente da imaginada muda o tamanho da escolha, sem mudar os dados do mapa.`,
		unique([sun.factId, moon.factId, ...g.asc.factIds, ...(luminary ? [luminary.factId] : [])])
	);
	replace(
		4,
		`Ascendente em ${signs[g.asc.sign]} descreve a forma de entrar: ${ways[g.asc.sign].start}. Na cena hipotética, esse gesto pode ser visto por outra pessoa antes que ela saiba da intenção de ${ways[sun.sign].choose} ou da necessidade de ${ways[moon.sign].need}. Se a entrada for tomada como um sim completo, uma frase sobre o que você aceita agora e sobre o que ainda depende de apoio pode mudar a conversa.\n\nA ponte funciona quando o primeiro gesto apresenta a escolha sem esconder sua condição. Se ninguém interpretou o gesto como compromisso, essa hipótese perde relevância; o Ascendente não determina a reação alheia.`,
		unique([sun.factId, moon.factId, ...g.asc.factIds])
	);
	replace(
		5,
		`${label(ruler)} rege o Ascendente em ${signs[g.asc.sign]} neste método. Sua função é ${roles[ruler.body].work}; em ${signs[ruler.sign]}, uma maneira possível de começar é ${ways[ruler.sign].start}. ${ruler.house === null ? 'Sem casa calculável, a leitura não atribui um campo específico a essa via.' : `A casa ${ruler.house} (${houseAreas[ruler.house - 1]}) sugere onde essa via pode ser observada, sem afirmar que um acontecimento ocorrerá ali.`}\n\nNa cena, o regente oferece um meio para dizer o que ${label(sun)} quer assumir e pedir o que ${label(moon)} precisa para continuar; ${roles[ruler.body].evidence}.`,
		integration.factIds
	);
	replace(
		6,
		`${selected.length ? selected.map((s) => pillarsRelationV51(g, s.aspect)).join('\n\n') : 'Nenhum outro aspecto maior de Sol, Lua ou regente foi selecionado dentro dos orbes; a leitura permanece centrada na relação entre escolha, apoio e entrada.'}\n\n${contacts.length ? contacts.map((a) => `${bodyNames[a.body]} faz ${aspectNames[a.kind]} ao Ascendente, orbe ${a.orb.toFixed(2)}°. Esse contato pode trazer ${evidenceCue[a.body]} para o primeiro gesto; o cálculo não informa o que de fato ocorreu.`).join(' ') : 'Não há contato maior ao Ascendente dentro de 3°.'}\n\n${selected.length ? 'A primeira relação acima ganha prioridade porque toca diretamente os pilares da pergunta. As demais só acrescentam nuances se tiverem correspondência na situação vivida.' : 'A ausência de outro vínculo selecionado mantém a prioridade na relação entre os três pilares e no que foi relatado.'}`,
		reading.sections[6].factIds
	);
	const quote = input.context
		? `Você declarou: “${input.context}”${/[.!?…]$/.test(input.context.trim()) ? '' : '.'}`
		: 'Nenhum contexto pessoal foi declarado; escolha uma situação cotidiana reversível.';
	replace(
		7,
		`${quote}\n\n${integration.text}\n\nEssa é uma hipótese para a pergunta apresentada. A resposta de outra pessoa e as condições materiais podem mudar o desfecho; nenhum desses fatos foi calculado pelo mapa.`,
		integration.factIds
	);
	replace(
		8,
		`Faça uma tentativa sem despesa, de até vinte minutos, na situação que você trouxe: ${scene.move}. Separe o que você escolhe agora do apoio de que dependeria continuar. O gesto de ${ways[g.asc.sign].start} pode apresentar esse passo; ${roles[ruler.body].work} pode ajudar a torná-lo claro.\n\n${selected[0] ? `Na resposta, procure algo que mostre ${evidenceCue[selected[0].aspect.first]} e algo que mostre ${evidenceCue[selected[0].aspect.second]}.` : 'Na resposta, procure um sinal da escolha e outro do apoio.'} Anote o que ocorreu e o custo real. Uma evidência contrária é a condição esperada não ter importância no resultado. Se o custo for maior que o previsto, reduza ou abandone a tentativa.`,
		integration.factIds
	);
	replace(
		9,
		`Depois da tentativa, compare a resposta obtida com a que você esperava. ${luminary ? `O aspecto de ${aspectNames[luminary.kind]} entre Sol e Lua encontrou algum equivalente na ordem em que escolha e apoio apareceram?` : 'A diferença entre escolha e apoio apareceu mesmo sem aspecto maior calculado?'} ${selected[0] ? `A relação de ${bodyNames[selected[0].aspect.first]} com ${bodyNames[selected[0].aspect.second]} acrescentou algo que o trio sozinho não explicava?` : 'A ausência de outro vínculo selecionado deixou alguma parte importante sem explicação?'} O regente ${label(ruler)} só ganha peso se sua via ajudou a entender esse resultado.\n\nSe a resposta da outra pessoa ou uma condição material explicou melhor o ocorrido, dê prioridade a esse fato. Guarde também qualquer caso que contrarie a hipótese para a próxima situação.`,
		integration.factIds
	);
	reading.version = PILLARS_READING_VERSION;
	reading.editorial.version = PILLARS_READING_VERSION;
	reading.editorial.graph = 'atv-pillars-integrated-graph/1.1.0';
	const pairKind = (name: string, first: number, second: number) =>
		`trio-pair-${name}:element-${first % 4 === second % 4 ? 'convergence' : 'difference'}-modality-${first % 3 === second % 3 ? 'convergence' : 'difference'}`;
	reading.editorial.patterns = [
		{ kind: pairKind('sun-moon', sun.sign, moon.sign), factIds: [sun.factId, moon.factId] },
		{
			kind: pairKind('sun-ascendant', sun.sign, g.asc.sign),
			factIds: [sun.factId, 'angle-ascendant']
		},
		{
			kind: pairKind('moon-ascendant', moon.sign, g.asc.sign),
			factIds: [moon.factId, 'angle-ascendant']
		},
		...reading.editorial.patterns.slice(3)
	];
	reading.editorial.themes = reading.editorial.themes.map((theme) => ({
		...theme,
		factIds: reading.editorial!.plan.find((p) => p.role === theme.id)!.factIds
	}));
	reading.opening = `${scene.setting}, começar pode soar como uma promessa. O trio sugere descobrir o tamanho da escolha de ${ways[sun.sign].choose} que ainda preserva ${ways[moon.sign].need}; Ascendente em ${signs[g.asc.sign]} mostra o primeiro gesto.`;
	reading.practice = `Em até vinte minutos, sem despesa: ${scene.move}. Observe se o começo comunica uma decisão maior que a condição disponível para sustentá-la.`;
	return reading;
}

export function reviewReconstructedPillarsV51(
	input: WorkflowInput,
	c: CalculationSnapshot,
	r: TrialReading
): string[] {
	try {
		assertPillarsProjection(input, c);
	} catch {
		return ['pillars-source-mismatch'];
	}
	const oldShape = {
		...r,
		version: PILLARS_READING_V5_VERSION,
		editorial: r.editorial && {
			...r.editorial,
			version: PILLARS_READING_V5_VERSION,
			graph: 'atv-pillars-integrated-graph/1.0.0'
		}
	};
	const errors = reviewReconstructedPillars(input, c, oldShape);
	if (
		r.version !== PILLARS_READING_VERSION ||
		r.editorial?.version !== PILLARS_READING_VERSION ||
		r.editorial.graph !== 'atv-pillars-integrated-graph/1.1.0'
	)
		errors.push('pillars-edition');
	const g = normalizeFactGraph(c);
	if (!g.asc || !r.editorial) return [...errors, 'pillars-trace'];
	const sun = position(g, 'sun'),
		moon = position(g, 'moon');
	const pairKind = (name: string, first: number, second: number) =>
		`trio-pair-${name}:element-${first % 4 === second % 4 ? 'convergence' : 'difference'}-modality-${first % 3 === second % 3 ? 'convergence' : 'difference'}`;
	const pairs = [
		[pairKind('sun-moon', sun.sign, moon.sign), [sun.factId, moon.factId]],
		[pairKind('sun-ascendant', sun.sign, g.asc.sign), [sun.factId, 'angle-ascendant']],
		[pairKind('moon-ascendant', moon.sign, g.asc.sign), [moon.factId, 'angle-ascendant']]
	] as const;
	if (
		pairs.some(
			([kind, ids], i) =>
				r.editorial!.patterns[i]?.kind !== kind ||
				JSON.stringify(r.editorial!.patterns[i].factIds) !== JSON.stringify(ids)
		)
	)
		errors.push('pillars-pair-trace');
	if (
		!r.sections[2]?.text.includes(pillarsPairV51('sun-moon', sun.sign, moon.sign)) ||
		!r.sections[2]?.text.includes(pillarsPairV51('sun-ascendant', sun.sign, g.asc.sign)) ||
		!r.sections[2]?.text.includes(pillarsPairV51('moon-ascendant', moon.sign, g.asc.sign))
	)
		errors.push('pillars-pair-meaning');
	const selected = pillarsSelection(g);
	if (
		JSON.stringify(r.editorial.selection.map((s) => s.factId)) !==
			JSON.stringify(selected.map((s) => s.aspect.factId)) ||
		selected.some((s) => !r.sections[6]?.text.includes(pillarsRelationV51(g, s.aspect)))
	)
		errors.push('pillars-function-specificity');
	const integration = pillarsIntegrationV51(g, input);
	if (
		!r.sections[7]?.text.includes(integration.text) ||
		JSON.stringify(r.sections[7]?.factIds) !== JSON.stringify(integration.factIds) ||
		!r.sections[8]?.text.includes('até vinte minutos') ||
		!r.sections[9]?.text.includes('caso que contrarie a hipótese')
	)
		errors.push('pillars-integrated-hypothesis');
	if (
		/\bvocê (é|será|sempre|nunca)\b|\bisso prova que\b|\bé certo que você\b/i.test(
			[r.opening, ...r.sections.map((s) => s.text), r.practice].join('\n')
		)
	)
		errors.push('pillars-categorical-claim');
	return unique(errors);
}
