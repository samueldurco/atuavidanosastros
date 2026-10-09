import type { CalculationSnapshot, WorkflowInput } from '@atv/domain';
import type { TrialReading } from '../reading';
import { CANON_VERSION, aspectNames, bodyNames, functions, signs } from './canon';
import type { EditorialTrace } from './career';
import { normalizeFactGraph, type Aspect, type FactGraph, type Position } from './fact-graph';
import { elementApproaches, houseAreas, modalityApproaches, natalStyles } from './natal-canon';
import {
	assertBirthProjection,
	BIRTH_READING_VERSION,
	birthMethod,
	type BirthData
} from './birth-facts';

const unique = (ids: readonly string[]) => [...new Set(ids)];
const required = (g: FactGraph, body: string) => {
	const p = g.positions.find((p) => p.body === body);
	if (!p) throw Error(`Posição natal ausente: ${body}`);
	return p;
};
const label = (p: Position) => `${bodyNames[p.body]} em ${signs[p.sign]}`;
const location = (p: Position) =>
	p.house === null
		? 'sem localização por casa disponível'
		: `na casa ${p.house}, ligada a ${houseAreas[p.house - 1]}`;
const positionIds = (...ps: Position[]) =>
	unique(ps.flatMap((p) => [p.factId, ...(p.house === null ? [] : [`house-${p.house}`])]));
const style = (p: Position) => natalStyles[p.sign];
export function birthContext(text: string | undefined): {
	key: EditorialTrace['context']['key'];
	use: string;
	task: string;
	question: string;
} {
	const t = (text ?? '').toLocaleLowerCase('pt-BR');
	if (/cansa|sobrecarg|rotina|prazo|descans|limite/.test(t))
		return {
			key: 'workload',
			use: 'Examinar quanto uma escolha consome e que condição permite repeti-la sem aumentar a carga.',
			task: 'escolha uma demanda pequena, explicite o tempo disponível e observe o efeito de combinar um limite antes de começar',
			question: 'Que condição de rotina permite sustentar sua intenção sem ignorar o custo?'
		};
	if (/relaç|relac|víncul|vincul|conversa|parceir|afet/.test(t))
		return {
			key: 'relationships',
			use: 'Distinguir o que você pretende, o apoio que precisa e o que a outra pessoa efetivamente oferece.',
			task: 'prepare uma conversa breve com uma intenção, uma necessidade e uma pergunta sobre disponibilidade',
			question:
				'O que você pode pedir de modo claro e o que precisa ouvir antes de fazer um acordo?'
		};
	if (/estud|aprend|curso|pesquis/.test(t))
		return {
			key: 'study',
			use: 'Relacionar curiosidade, direção de estudo e condições para transformar informação em compreensão.',
			task: 'compare duas maneiras de estudar o mesmo tópico durante dez minutos e anote qual produziu uma explicação verificável',
			question:
				'Que forma de aprender ajuda você a testar uma ideia, em vez de apenas acumular informação?'
		};
	if (/lider|equipe|coordena/.test(t))
		return {
			key: 'leadership',
			use: 'Examinar como uma iniciativa se torna um acordo que outras pessoas conseguem compreender e executar.',
			task: 'escreva uma proposta curta para uma situação real, incluindo responsabilidade, limite e espaço para resposta',
			question: 'Como apresentar uma direção sem pressupor que todos dispõem dos mesmos recursos?'
		};
	if (/autôn|auton|independen|próprio|proprio/.test(t))
		return {
			key: 'independent',
			use: 'Separar liberdade de escolha, recursos disponíveis e compromissos necessários para manter uma iniciativa.',
			task: 'delimite uma iniciativa que dependa de você e identifique uma condição externa que precisa confirmar',
			question: 'Qual parte da autonomia você consegue experimentar com os recursos presentes?'
		};
	if (/transi|mudan|carreira|trabalho/.test(t))
		return {
			key: 'transition',
			use: 'Comparar um caminho em curso com uma alternativa pequena, preservando critérios que você considera importantes.',
			task: 'descreva uma alternativa concreta e uma forma reversível de conhecê-la sem abandonar o caminho atual',
			question: 'O que vale preservar e o que merece ser experimentado durante esta mudança?'
		};
	return {
		key: 'general',
		use: 'Escolher uma situação recente em que intenção, necessidade e modo de agir tenham pedido soluções diferentes.',
		task: 'retome uma situação recente, descreva o que queria fazer e compare isso com o apoio e o tempo disponíveis',
		question:
			'Qual situação concreta ajuda a reconhecer tanto a utilidade quanto o limite desta leitura?'
	};
}
const emphasis: Record<EditorialTrace['context']['key'], readonly string[]> = {
	workload: ['saturn', 'mars', 'mercury'],
	relationships: ['venus', 'mars', 'saturn'],
	study: ['mercury', 'jupiter', 'saturn'],
	leadership: ['mars', 'saturn', 'jupiter'],
	independent: ['mars', 'venus', 'saturn'],
	transition: ['jupiter', 'saturn', 'mercury'],
	general: ['mercury', 'venus', 'mars']
};
type Signature = {
	id: string;
	title: string;
	factIds: string[];
	body?: string;
	aspect?: Aspect;
	score: number;
	reason: string;
};
function closest(g: FactGraph, body: string) {
	return g.aspects
		.filter(
			(a) =>
				(a.first === body || a.second === body) && a.orb <= birthMethod.selection.closeAspectOrb
		)
		.sort((a, b) => a.orb - b.orb || a.factId.localeCompare(b.factId))[0];
}
function axisContact(g: FactGraph, axis: 'ascendant' | 'midheaven') {
	return g.angleContacts
		.filter((a) => a.angle === axis)
		.sort((a, b) => a.orb - b.orb || a.factId.localeCompare(b.factId))[0];
}
function axisIds(g: FactGraph, axis: 'ascendant' | 'midheaven') {
	const contact = axisContact(g, axis);
	return contact ? [contact.factId, ...positionIds(required(g, contact.body))] : [];
}
function axisText(g: FactGraph, axis: 'ascendant' | 'midheaven') {
	const a = axisContact(g, axis);
	if (!a) return '';
	const name = axis === 'ascendant' ? 'Ascendente' : 'Meio do Céu';
	const geometry = `${bodyNames[a.body]} forma ${aspectNames[a.kind]} com o ${name}, com orbe de ${a.orb.toFixed(2)}°.`;
	const interaction =
		a.kind === 'conjunction'
			? 'A proximidade sugere uma ligação mais imediata'
			: a.kind === 'square' || a.kind === 'opposition'
				? 'Essa relação permite investigar exigências que podem pedir negociação'
				: 'O contato oferece uma possibilidade de associação que merece ser experimentada';
	return axis === 'ascendant'
		? `\n\n${geometry} ${interaction}: a entrada nas situações pode tornar mais visível a função de ${functions[a.body]}. Observe como ela participa de um primeiro encontro e o que só aparece depois que você ganha confiança.`
		: `\n\n${geometry} ${interaction} entre participação pública e ${functions[a.body]}. Um retorno concreto sobre o que você ofereceu ajuda a distinguir a contribuição que deseja fazer da expectativa que imagina receber.`;
}
export function birthSignatures(
	g: FactGraph,
	context: EditorialTrace['context']['key']
): Signature[] {
	if (!g.asc || !g.mc) throw Error('Eixos natais necessários.');
	const sun = required(g, 'sun'),
		moon = required(g, 'moon'),
		ar = required(g, g.asc.ruler),
		mr = required(g, g.mc.ruler);
	const core: Signature[] = [
		{
			id: 'sun-moon',
			title: `Intenção solar e apoio lunar: ${signs[sun.sign]} / ${signs[moon.sign]}`,
			factIds: positionIds(sun, moon),
			score: 30,
			reason: 'core-sun-moon'
		},
		{
			id: 'asc-ruler',
			title: `Entrada em ${signs[g.asc.sign]} e via de ${bodyNames[ar.body]}`,
			factIds: unique([...g.asc.factIds, ...positionIds(ar), ...axisIds(g, 'ascendant')]),
			score: 30,
			reason: 'core-asc-ruler'
		},
		{
			id: 'mc-ruler',
			title: `Contribuição em ${signs[g.mc.sign]} e via de ${bodyNames[mr.body]}`,
			factIds: unique([...g.mc.factIds, ...positionIds(mr), ...axisIds(g, 'midheaven')]),
			score: 30,
			reason: 'core-mc-ruler'
		}
	];
	const candidates = ['mercury', 'venus', 'mars', 'jupiter', 'saturn']
		.map((body) => {
			const p = required(g, body),
				aspect = closest(g, body),
				contact = g.angleContacts
					.filter((a) => a.body === body)
					.sort((a, b) => a.orb - b.orb || a.factId.localeCompare(b.factId))[0];
			const score =
				({ mercury: 9, venus: 9, mars: 9, jupiter: 7, saturn: 8 }[body] ?? 0) +
				(emphasis[context].includes(body) ? 8 : 0) +
				(aspect ? 6 - aspect.orb : 0) +
				(contact ? 5 - contact.orb : 0) +
				(body === ar.body || body === mr.body ? 2 : 0);
			return {
				id: `resource-${body}`,
				title: `${bodyNames[body]}: ${functions[body]} em ${signs[p.sign]}`,
				body,
				aspect,
				score: Math.round(score * 1000) / 1000,
				reason: `function-base+context*8+close-aspect(6-orb)+angle(5-orb)+axis-ruler*2`,
				factIds: unique([
					...positionIds(p),
					...(aspect
						? [
								aspect.factId,
								required(g, aspect.first === body ? aspect.second : aspect.first).factId
							]
						: []),
					...(contact
						? [
								contact.factId,
								contact.angle === 'ascendant' ? 'angle-ascendant' : 'angle-midheaven'
							]
						: [])
				])
			};
		})
		.sort((a, b) => b.score - a.score || a.body.localeCompare(b.body));
	return [...core, ...candidates.slice(0, 3)];
}
function houseLink(g: FactGraph, d: BirthData, number: number): { text: string; ids: string[] } {
	const h = g.houses.find((h) => h.house === number),
		r = d.houseRegents.find((r) => r.house === number);
	if (!h || !r) throw Error(`Casa ${number} ausente.`);
	const p = required(g, r.body);
	const field = [
		`O começo da casa 1 em ${signs[h.sign]} aproxima presença e iniciativa da função de ${bodyNames[r.body]}`,
		`Recursos próprios e escolhas de valor pertencem à casa 2, que começa em ${signs[h.sign]} e tem ${bodyNames[r.body]} como regente moderno`,
		`Na casa 3, as trocas e a aprendizagem cotidiana começam em ${signs[h.sign]}; sua ligação com ${bodyNames[r.body]} amplia a investigação`,
		`A base íntima da casa 4 começa em ${signs[h.sign]} e se relaciona, pela regência, com ${bodyNames[r.body]}`,
		`A casa 5 começa em ${signs[h.sign]}, trazendo criação e prazer para uma conversa com ${bodyNames[r.body]}`,
		`A organização cotidiana da casa 6 passa por ${signs[h.sign]} e pela função de seu regente, ${bodyNames[r.body]}`,
		`O encontro com o outro, na casa 7, começa em ${signs[h.sign]} e encontra uma via em ${bodyNames[r.body]}`,
		`Na casa 8, intimidade e recursos compartilhados passam por ${signs[h.sign]} e pela regência moderna de ${bodyNames[r.body]}`,
		`O estudo e a ampliação de experiência da casa 9 começam em ${signs[h.sign]}, sob a regência de ${bodyNames[r.body]}`,
		`A casa 10 começa em ${signs[h.sign]}; contribuição e reconhecimento se ligam a ${bodyNames[r.body]}`,
		`Grupos e projetos, na casa 11, partem de ${signs[h.sign]} e se articulam com ${bodyNames[r.body]}`,
		`Recolhimento e elaboração silenciosa pertencem à casa 12, que começa em ${signs[h.sign]} e tem ${bodyNames[r.body]} como regente moderno`
	][number - 1];
	return {
		text: `${field}, ${location(p)}.`,
		ids: [h.factId, `birth-house-ruler-${number}`, ...positionIds(p)]
	};
}
function dynamics(g: FactGraph, a: Aspect, index: number): string {
	const p = required(g, a.first),
		q = required(g, a.second),
		pair = `${bodyNames[p.body]} e ${bodyNames[q.body]}`;
	const styles =
		p.sign % 4 === q.sign % 4
			? `${label(p)} e ${label(q)} compartilham uma abordagem elemental: ${elementApproaches[p.sign % 4]}. Essa afinidade aproxima ${functions[p.body]} de ${functions[q.body]}, embora cada função responda a uma necessidade diferente`
			: `${label(p)} convida a ${elementApproaches[p.sign % 4]}, enquanto ${label(q)} traz a via de ${elementApproaches[q.sign % 4]}`;
	const opening = [
		`No diálogo entre ${pair}`,
		`Ao aproximar ${functions[p.body]} de ${functions[q.body]}`,
		`O encontro de ${label(p)} com ${label(q)}`
	][index % 3];
	const relation =
		a.kind === 'conjunction'
			? 'a conjunção reúne funções que podem chegar juntas à mesma situação; vale dar nome a cada uma antes de responder'
			: a.kind === 'square'
				? 'a quadratura sugere exigências que podem disputar a mesma decisão; uma negociação concreta ajuda a encontrar uma resposta que não silencie nenhum dos lados'
				: a.kind === 'opposition'
					? 'a oposição permite examinar dois polos que se tornam mais visíveis nas trocas; pergunte que parte você assume e qual atribui ao outro'
					: a.kind === 'trine'
						? 'o trígono oferece uma associação que pode parecer familiar; a facilidade merece ser usada com intenção para não se tornar repetição automática'
						: 'o sextil aponta uma combinação que pede participação: a possibilidade ganha valor quando existe ocasião e alguém decide experimentá-la';
	const questions: Record<string, string> = {
		sun: 'qual intenção deseja afirmar',
		moon: 'que apoio precisa preservar',
		mercury: 'o que precisa compreender ou explicar',
		venus: 'que valor e que troca estão em questão',
		mars: 'qual ação está ao seu alcance',
		jupiter: 'que perspectiva merece ser ampliada',
		saturn: 'qual compromisso cabe nas condições atuais',
		uranus: 'que alternativa pede espaço',
		neptune: 'que ideal precisa encontrar um contorno',
		pluto: 'que intensidade pede elaboração'
	};
	const question = `${questions[p.body]} e ${questions[q.body]}`;
	const closing = [
		`Para examinar essa dupla, pergunte ${question}. Uma situação recente pode mostrar como as duas demandas conviveram.`,
		`Retome um episódio concreto e investigue ${question}; observe o que sua resposta mudou na situação.`,
		`A questão aqui é ${question}. Compare a primeira reação com a escolha que fez depois de considerar os dois lados.`
	][index % 3];
	return `${opening}, ${relation}. ${styles}. O aspecto tem orbe de ${a.orb.toFixed(2)}° e relaciona ${bodyNames[p.body]} ${location(p)} com ${bodyNames[q.body]} ${location(q)}. ${closing}`;
}
export function composeReconstructedBirth(
	input: WorkflowInput,
	c: CalculationSnapshot
): TrialReading {
	assertBirthProjection(input, c);
	const g = normalizeFactGraph(c),
		d = c.data as unknown as BirthData,
		binding = birthContext(input.context),
		selected = birthSignatures(g, binding.key);
	const sun = required(g, 'sun'),
		moon = required(g, 'moon'),
		mercury = required(g, 'mercury'),
		venus = required(g, 'venus'),
		mars = required(g, 'mars'),
		jupiter = required(g, 'jupiter'),
		saturn = required(g, 'saturn');
	const asc = g.asc!,
		mc = g.mc!,
		ar = required(g, asc.ruler),
		mr = required(g, mc.ruler);
	const sections: TrialReading['sections'] = [],
		plan: EditorialTrace['plan'] = [];
	const add = (role: string, title: string, text: string, ids: string[]) => {
		const factIds = unique(ids);
		sections.push({ title, text, factIds });
		plan.push({ role, title, factIds });
	};
	const house = (n: number) => houseLink(g, d, n);
	const h1 = house(1),
		h2 = house(2),
		h3 = house(3),
		h4 = house(4),
		h5 = house(5),
		h6 = house(6),
		h7 = house(7),
		h8 = house(8),
		h9 = house(9),
		h10 = house(10),
		h11 = house(11),
		h12 = house(12);
	add(
		'whole-chart',
		'Seis assinaturas para percorrer seu mapa',
		`Uma leitura do mapa ganha sentido quando os fatores se esclarecem mutuamente. Aqui, seis assinaturas orientam a navegação: três relações centrais e três recursos cuja prioridade considera contatos calculados e o tema que você trouxe. Elas não esgotam o nascimento nem medem a força de uma pessoa.\n\n${selected.map((s, i) => `${i + 1}. ${s.title}`).join('\n')}\n\nAs duas primeiras aproximam intenção, apoio e modo de entrar nas experiências; a terceira acompanha a passagem da participação pessoal à contribuição pública. Os recursos destacados ajudam a investigar como isso acontece. Os capítulos seguintes também incluem fatores que ficaram fora dessa seleção: uma prioridade de leitura não apaga o restante do mapa. Comece pelo tema que reconhece na vida atual e depois confronte-o com um capítulo que ofereça outra perspectiva.`,
		selected.flatMap((s) => s.factIds)
	);
	const sameElement = sun.sign % 4 === moon.sign % 4,
		sameMode = sun.sign % 3 === moon.sign % 3;
	add(
		'identity-needs',
		'O que você escolhe e o que sustenta a escolha',
		`${label(sun)} situa a intenção de ${style(sun).aim}; sua localização, ${location(sun)}, indica um campo em que essa escolha pode ganhar expressão. A Lua tem outra função: ${label(moon)} convida a reconhecer a necessidade de ${style(moon).need}, ${location(moon)}. Querer participar de uma experiência e ter condições para permanecer nela são perguntas diferentes.\n\n${sameElement ? 'Sol e Lua compartilham uma abordagem elemental, o que pode facilitar reconhecer o que faz sentido e o que oferece apoio. Essa afinidade não elimina a diferença entre intenção e necessidade.' : `As abordagens diferem: o Sol privilegia ${elementApproaches[sun.sign % 4]}, enquanto a Lua busca ${elementApproaches[moon.sign % 4]}. Uma escolha pode ser interessante e ainda pedir uma condição emocional ou prática que você não incluiu no plano.`} ${sameMode ? `Ambos partilham a tendência a ${modalityApproaches[sun.sign % 3]}; observe quando esse ritmo ajuda e quando precisa de uma pausa.` : `Também há ritmos distintos: ${modalityApproaches[sun.sign % 3]} para o Sol e ${modalityApproaches[moon.sign % 3]} para a Lua. Ajustar o tempo pode ser mais útil do que escolher um lado.`}\n\nRetome uma decisão recente: o que você queria afirmar, que apoio precisava e o que fez quando as duas coisas não coincidiram? Essa comparação oferece uma primeira síntese que poderá mudar ao passar pelos outros temas.`,
		positionIds(sun, moon)
	);
	add(
		'presence-action',
		'Como uma intenção chega ao mundo',
		`Ascendente em ${signs[asc.sign]} descreve uma possibilidade de entrada: ${natalStyles[asc.sign].entry}. Essa porta de chegada não conta toda a história. Seu regente moderno, ${label(ar)}, relaciona essa entrada à função de ${functions[ar.body]}, ${location(ar)}. Assim, a primeira impressão e o lugar em que você elabora uma resposta podem pedir tempos diferentes.\n\nMarte acrescenta a maneira de mobilizar esforço: ${label(mars)} sugere ${style(mars).action}, ${location(mars)}. Ao aproximar entrada e ação, pergunte se você começa do mesmo modo que sustenta um movimento. ${asc.sign % 4 === mars.sign % 4 ? 'Há uma linguagem elemental compartilhada entre o Ascendente e Marte; ela pode facilitar a passagem entre apresentação e iniciativa, mas também repetir um impulso sem revisão.' : 'A diferença elemental entre Ascendente e Marte permite reconhecer uma apresentação que não coincide imediatamente com o impulso de agir; explicar essa passagem pode evitar mal-entendidos.'}\n\n${h1.text} Antes de interpretar uma reação como identidade fixa, observe a situação que a provocou, o espaço para escolher e a resposta que veio depois. A margem de ação se torna mais clara quando você descreve o episódio em vez de dar um rótulo a si.${axisText(g, 'ascendant')}`,
		[...asc.factIds, ...positionIds(ar, mars), ...h1.ids, ...axisIds(g, 'ascendant')]
	);
	add(
		'learning',
		'Aprender, explicar e ampliar a perspectiva',
		`Mercúrio e Júpiter participam de escalas diferentes do aprendizado. ${label(mercury)} oferece a via de ${style(mercury).thought}, ${location(mercury)}. Júpiter em ${signs[jupiter.sign]}, ${location(jupiter)}, amplia o horizonte por ${style(jupiter).aim}. Um detalhe bem entendido e uma visão mais ampla podem se apoiar; também podem se separar quando uma conclusão chega antes da verificação.\n\n${h3.text} ${h9.text} Esses dois campos aproximam a troca cotidiana do estudo que muda a maneira de compreender o mundo. O regente mostra uma ligação simbólica entre assuntos, sem transformar um interesse em obrigação ou formação prevista.\n\nUma forma de usar esse conjunto é explicar uma ideia com suas palavras, identificar um exemplo que a sustenta e buscar uma exceção. Se você reconhece facilidade para abrir perspectivas, experimente terminar uma investigação pequena; se prefere consolidar o conhecido, reserve uma pergunta que ainda não sabe responder. A qualidade da aprendizagem pode ser observada na compreensão produzida, sem precisar corresponder a um estilo único.`,
		[...positionIds(mercury, jupiter), ...h3.ids, ...h9.ids]
	);
	add(
		'relationships',
		'Afeto, acordos e espaço para reciprocidade',
		`Vênus fala de aproximação, valor e troca. Em ${signs[venus.sign]}, a possibilidade de ${style(venus).affection} ganha destaque ${location(venus)}. A Lua, em ${signs[moon.sign]}, lembra a condição de ${style(moon).need}. Uma forma de demonstrar interesse não garante que o apoio desejado esteja sendo comunicado; tornar esse pedido compreensível pode mudar a conversa.\n\n${h7.text} A casa dos encontros oferece um campo de observação para acordos e diferenças. Seu regente, ${bodyNames[d.houseRegents[6].body]}, liga parceria à área em que essa função está localizada; essa ligação não descreve quem outra pessoa é, nem autoriza presumir o que ela sente.\n\nCompare uma troca que funcionou com outra em que houve desencontro. O que você ofereceu, o que pediu e o que foi realmente combinado? Observe também se o gesto teve resposta e se havia liberdade para recusar. A leitura se torna útil quando amplia a capacidade de formular uma necessidade e ouvir outra, preservando o que cada pessoa pode escolher.`,
		[...positionIds(venus, moon), ...h7.ids]
	);
	add(
		'private-support',
		'Base íntima, recolhimento e recuperação',
		`A necessidade lunar de ${style(moon).need} merece um lugar na vida que não dependa apenas do reconhecimento externo. ${label(moon)}, ${location(moon)}, ajuda a nomear condições de apoio, sem deduzir acontecimentos da infância ou a qualidade de um vínculo familiar. Você pode investigar essas condições a partir da experiência que deseja compartilhar.\n\n${h4.text} ${h12.text} A primeira aponta o campo privado de pertencimento; a segunda abre espaço para recolhimento e elaboração. Seus regentes relacionam esses assuntos a outras áreas do mapa, mas a ligação simbólica não determina quem deve cuidar de você nem explica sozinha uma dificuldade.\n\nPense em um intervalo recente em que conseguiu retomar o próprio ritmo. Houve silêncio, contato, previsibilidade, movimento ou possibilidade de expressar algo? Compare a condição observada com o que a Lua sugere e registre a diferença. Um recurso de apoio pode ser modesto e circunstancial; ele não precisa transformar sua rotina inteira para ter valor.`,
		[...positionIds(moon), ...h4.ids, ...h12.ids]
	);
	add(
		'daily-effort',
		'Rotina: agir, organizar e reconhecer o limite',
		`Marte em ${signs[mars.sign]} mobiliza esforço por ${style(mars).action}. Saturno em ${signs[saturn.sign]}, ${location(saturn)}, introduz responsabilidade, continuidade e a possibilidade de ${style(saturn).adjustment}. Mercúrio em ${signs[mercury.sign]} participa da organização ao ${style(mercury).thought}. A rotina pede uma combinação dessas funções, e não uma resposta única para toda demanda.\n\n${h6.text} O campo do trabalho cotidiano é uma oportunidade para observar condições e acordos. Se o impulso de começar avança mais rápido que os recursos, delimite a tarefa; se a exigência de controle impede qualquer tentativa, defina o que já é suficiente para um primeiro passo. Essa diferença pode ser constatada pelo tempo gasto, pela clareza do combinado e pelo resultado obtido.\n\nUse uma atividade pequena como referência. O que coube no tempo disponível e o que pediu ajuste? Considere a carga real antes de atribuir um resultado à motivação. Este capítulo não avalia saúde ou capacidade profissional; oferece perguntas sobre organização e margem de escolha.`,
		[...positionIds(mars, saturn, mercury), ...h6.ids]
	);
	add(
		'contribution',
		'Contribuição e reconhecimento público',
		`Meio do Céu em ${signs[mc.sign]} aponta uma qualidade de participação pública associada a ${natalStyles[mc.sign].aim}. A via de seu regente moderno, ${label(mr)}, aparece ${location(mr)}: o campo em que você elabora essa função pode alimentar o que oferece fora do âmbito privado. Isso abre possibilidades de contribuição, sem indicar uma profissão ou prometer reconhecimento.\n\nJúpiter em ${signs[jupiter.sign]} ajuda a ampliar uma perspectiva, enquanto Saturno em ${signs[saturn.sign]} pergunta por critério, responsabilidade e duração. Uma direção ganha consistência quando você consegue dizer o que deseja oferecer, em quais condições e como saberá se foi útil. Uma oportunidade ampla pode pedir limite; uma responsabilidade já assumida pode merecer mais espaço para aprender.\n\n${h10.text} Para examinar essa combinação, escolha uma experiência em que sua participação foi percebida por alguém. Qual contribuição foi reconhecida e qual custo ficou menos visível? A resposta pode confirmar parte da leitura e deslocar outra; seu percurso concreto continua sendo a referência para uma decisão.${axisText(g, 'midheaven')}`,
		[...mc.factIds, ...positionIds(mr, jupiter, saturn), ...h10.ids, ...axisIds(g, 'midheaven')]
	);
	add(
		'resources',
		'Valor próprio e recursos compartilhados',
		`O sentido de valor aparece em escolhas de uso, troca e preservação. Vênus em ${signs[venus.sign]}, ${location(venus)}, oferece a possibilidade de ${style(venus).affection}; Júpiter em ${signs[jupiter.sign]} amplia o que parece significativo. Ao aproximar essas funções, observe o que você considera suficiente e o que deseja ampliar, incluindo tempo, atenção e habilidades.\n\n${h2.text} ${h8.text} Recursos próprios e compartilhados exigem perguntas distintas: o que está sob sua decisão, o que depende de acordo e que compromisso acompanha a troca? A ligação entre os regentes e suas casas ajuda a escolher onde observar essas questões, sem estimar renda, patrimônio ou resultados financeiros.\n\nRetome um acordo simples de divisão de tempo ou responsabilidade. O critério estava claro para todos? Alguma oferta trouxe uma expectativa que não foi dita? Nomear o que tem valor pode facilitar uma negociação; preservar autonomia inclui reconhecer quando um recurso exige consentimento ou uma decisão conjunta.`,
		[...positionIds(venus, jupiter), ...h2.ids, ...h8.ids]
	);
	const outer = ['uranus', 'neptune', 'pluto'].map((body) => required(g, body));
	add(
		'groups-meaning',
		'Criação, grupos e questões de uma geração',
		`${h5.text} ${h11.text} Esses campos colocam lado a lado a expressão própria e a participação em algo coletivo. O Sol em ${signs[sun.sign]} pergunta pelo lugar de sua intenção; Júpiter em ${signs[jupiter.sign]} amplia a busca por sentido. Criar e pertencer podem se apoiar, mas também pedir negociação entre uma preferência pessoal e a proposta de um grupo.\n\n${outer.map((p, i) => `${label(p)}, ${location(p)}, oferece o símbolo de ${['mudança e diferenciação', 'imaginação, ideal e permeabilidade', 'intensidade e transformação'][i]}.`).join(' ')} Os signos dos planetas lentos são compartilhados por muitas pessoas da mesma geração. Sua presença no mapa se particulariza por casas e relações calculadas; ela não demonstra uma missão individual nem permite prever rupturas ou perdas.\n\nExamine um grupo ou projeto em que você participa: o que pode trazer de próprio e o que precisa construir com outras pessoas? Escolher uma contribuição delimitada permite conhecer a resposta do ambiente. A leitura pode suscitar uma pergunta sobre sentido sem precisar dar uma explicação total para sua história.`,
		[...h5.ids, ...h11.ids, ...positionIds(sun, jupiter, ...outer)]
	);
	const aspects = unique(selected.flatMap((s) => (s.aspect ? [s.aspect.factId] : []))).map((id) =>
		g.aspects.find((a) => a.factId === id)!
	);
	add(
		'selected-dynamics',
		'Relações que merecem uma segunda leitura',
		aspects.length
			? `${aspects.map((a, i) => dynamics(g, a, i)).join('\n\n')}\n\nEssas relações participaram da prioridade dos recursos destacados porque têm orbe de até três graus. Um contato próximo oferece uma pergunta mais específica; ele não supera automaticamente o contexto, as demais funções ou a evidência da vida. Leia o par como uma interação, evitando transformar uma das partes em causa única de uma escolha.`
			: `Nenhum dos três recursos destacados apresenta aspecto maior com orbe de até três graus nesta seleção. A leitura permanece apoiada nos signos, casas, eixos e regentes calculados. Ausência desse recorte não significa isolamento entre funções ou falta de capacidade. Ao investigar uma situação, compare intenção, apoio, ação e condições de resposta; não preencha uma lacuna técnica com uma tensão inventada.`,
		unique([
			...selected.filter((s) => s.body).flatMap((s) => s.factIds),
			...aspects.flatMap((a) => [
				a.factId,
				required(g, a.first).factId,
				required(g, a.second).factId
			])
		])
	);
	add(
		'synthesis',
		'Uma síntese que cabe numa situação real',
		`As seis assinaturas podem ser reunidas numa pergunta de uso: como ${style(sun).aim}, com espaço para ${style(moon).need}, começando por ${natalStyles[asc.sign].entry}? ${sun.sign === mc.sign ? 'O Meio do Céu retoma essa qualidade solar no campo da participação pública' : `O Meio do Céu acrescenta a possibilidade pública de ${natalStyles[mc.sign].aim}`}; seu regente leva essa reflexão para ${houseAreas[(mr.house ?? 1) - 1]}.\n\nOs três recursos priorizados são ${selected
			.filter((s) => s.body)
			.map((s) => `${bodyNames[s.body!]} (${functions[s.body!]})`)
			.join(
				', '
			)}. Eles oferecem maneiras de investigar o tema atual. Se uma hipótese ajuda a nomear uma escolha mas não descreve seu comportamento, preserve a pergunta e ajuste a interpretação. A diferença entre símbolos também importa: ${sameElement ? 'a proximidade elemental entre Sol e Lua não torna intenção e apoio intercambiáveis' : 'as abordagens elementais distintas de Sol e Lua podem exigir um acordo entre vontade e condição de permanência'}.\n\nA síntese se completa ao encontrar uma experiência em que essa composição foi útil e outra em que falhou. Inclua o que dependeu de outras pessoas e de circunstâncias. Assim, o mapa pode organizar uma reflexão sem assumir o lugar da história, do conhecimento que você tem de si ou da escolha seguinte.`,
		selected.flatMap((s) => s.factIds)
	);
	add(
		'declared-context',
		'A leitura encontra o tema que você trouxe',
		`${input.context ? `Você escreveu: “${input.context}”` : 'Nenhum contexto pessoal foi informado para esta leitura.'}\n\nO foco desta consulta é ${binding.use.charAt(0).toLowerCase() + binding.use.slice(1)} O tema declarado muda a prioridade de consulta dos recursos, preservando posições, aspectos e casas do nascimento.\n\nVocê pode ler primeiro o capítulo mais próximo dessa situação, escolher uma relação entre dois fatores e formular uma pergunta que consiga responder por observação. Depois, visite um tema menos evidente: ele pode mostrar uma condição que ficou de fora. Não é necessário reconhecer todas as frases para fazer uso do conjunto. O que não encontra apoio em sua experiência deve permanecer como hipótese descartável.\n\nGuarde apenas o relato que deseja manter privado. Ao voltar ao mesmo mapa em outro momento, compare os registros: a mudança de contexto pode tornar outra ligação relevante, sem transformar retrospectivamente um fato do nascimento.`,
		unique([...selected.flatMap((s) => s.factIds), ...(g.contextFactId ? [g.contextFactId] : [])])
	);
	add(
		'reversible-practice',
		'Um experimento e uma forma de revisar',
		`Reserve até vinte minutos, sem despesa: ${binding.task}. Escreva a situação de partida e escolha dois fatores da leitura que ofereçam perguntas diferentes. Você pode usar a intenção solar e o apoio lunar, ou aproximar um recurso pessoal do campo público indicado pelo Meio do Céu.\n\nRegistre três coisas: o que tentou, que resposta encontrou e que custo percebeu. Acrescente uma evidência contrária: algo que não combinou com a hipótese, uma condição ignorada ou uma resposta que pediu outra explicação. Se o exercício não ajudar, interrompa e registre o motivo. O resultado observado tem mais valor do que fazer a experiência caber na descrição.\n\nUma nota privada no ATV+ pode guardar esse registro para comparação posterior, com seu consentimento. A continuidade serve para aprender com situações reais; ela não exige seguir um roteiro nem concordar com a interpretação. Ao revisar, escolha se quer manter, modificar ou abandonar a pergunta inicial.`,
		selected.flatMap((s) => s.factIds)
	);
	add(
		'technical-reference',
		'Posições, casas e método para conferência',
		`A leitura utiliza zodíaco tropical, dez corpos, Ascendente, Meio do Céu, doze casas Placidus e regência moderna. A atribuição de casa inclui a cúspide inicial e exclui a seguinte, atravessando zero grau quando necessário. Os aspectos maiores usam orbe nominal de 6°, com 4° para sextil; contatos aos ângulos têm limite de 3°. Esta edição não distingue aspectos aplicativos de separativos.\n\n${g.positions.map((p) => `${label(p)}: ${p.longitude.toFixed(3)}° de longitude; ${location(p)}; ${p.retrograde ? 'movimento retrógrado' : 'movimento direto'}.`).join('\n')}\n\nAscendente: ${asc.longitude.toFixed(3)}°; Meio do Céu: ${mc.longitude.toFixed(3)}°. ${g.houses.map((h) => `Casa ${h.house}: ${signs[h.sign]}, longitude ${h.longitude.toFixed(3)}°.`).join(' ')}\n\nA base experimental preserva o instante UTC e a proveniência do cálculo. Ela ainda exige homologação de precisão para liberação em produção. Se o horário ou o lugar de nascimento mudar, os eixos e as casas precisam ser recalculados; o contexto pessoal não corrige esses dados.`,
		g.facts
			.filter((f) => f.kind === 'calculated' && f.availability === 'available')
			.map((f) => f.id)
	);
	return {
		version: BIRTH_READING_VERSION,
		productId: 'birth-chart',
		title: 'Mapa Astral — assinaturas e temas de vida',
		opening:
			'Seu mapa pode ser lido como uma composição de intenções, necessidades, recursos e campos de experiência. Seis assinaturas orientam este percurso; cada capítulo aproxima os fatores para que você possa examiná-los em situações reais.',
		source:
			'Método ATVNA de leitura natal humanista: seis assinaturas integradas, regência moderna, casas Placidus e relações calculadas, com contexto declarado.',
		sections,
		questions: [
			binding.question,
			`Onde a via de ${functions[ar.body]} ajuda a aproximar sua intenção e a condição de apoio?`,
			'Que experiência concreta confirma uma ligação e que evidência pede outra interpretação?'
		],
		practice: `Experiência de até vinte minutos, com custo zero: escolha uma situação, aproxime dois fatores e registre tentativa, resposta, custo e um contraponto antes de decidir o que revisar.`,
		limits: c.limits,
		editorial: {
			version: BIRTH_READING_VERSION,
			canon: CANON_VERSION,
			graph: 'atv-birth-life-signatures/1.0.0',
			selection: selected.map((s) => ({ factId: s.factIds[0], score: s.score, reason: s.reason })),
			patterns: selected.map((s) => ({ kind: s.id, factIds: s.factIds })),
			themes: birthMethod.themes.map((id) => ({
				id,
				factIds: plan.find((p) => p.role === id)!.factIds
			})),
			context: { key: binding.key, factId: g.contextFactId },
			plan
		}
	};
}
export function reviewReconstructedBirth(
	input: WorkflowInput,
	c: CalculationSnapshot,
	r: TrialReading
): string[] {
	try {
		assertBirthProjection(input, c);
	} catch {
		return ['birth-source-mismatch'];
	}
	const errors: string[] = [],
		g = normalizeFactGraph(c),
		expected = birthSignatures(g, birthContext(input.context).key);
	if (
		r.productId !== 'birth-chart' ||
		r.version !== BIRTH_READING_VERSION ||
		r.editorial?.canon !== CANON_VERSION ||
		r.editorial.graph !== 'atv-birth-life-signatures/1.0.0'
	)
		errors.push('birth-edition');
	if (r.sections.length !== 15 || r.sections.some((s) => s.text.length < 250))
		errors.push('birth-depth');
	if (
		JSON.stringify(r.editorial?.patterns) !==
		JSON.stringify(expected.map((s) => ({ kind: s.id, factIds: s.factIds })))
	)
		errors.push('birth-six-signatures');
	if (
		r.editorial?.plan.length !== r.sections.length ||
		r.sections.some(
			(s, i) =>
				s.title !== r.editorial?.plan[i].title ||
				JSON.stringify(s.factIds) !== JSON.stringify(r.editorial?.plan[i].factIds)
		)
	)
		errors.push('birth-plan');
	if (birthMethod.themes.some((id) => !r.editorial?.themes.some((t) => t.id === id)))
		errors.push('birth-themes');
	if (
		input.context &&
		!r.sections.some(
			(s) => s.factIds.includes('personal-context') && s.text.includes(input.context!)
		)
	)
		errors.push('birth-context');
	if (
		r.questions.length !== 3 ||
		!r.sections.some(
			(s) => s.text.includes('vinte minutos') && s.text.includes('evidência contrária')
		)
	)
		errors.push('birth-review');
	const used = new Set(r.sections.flatMap((s) => s.factIds));
	if (g.positions.some((p) => !used.has(p.factId)) || g.houses.some((h) => !used.has(h.factId)))
		errors.push('birth-coverage');
	const narrative = r.sections.filter(
		(s) => s.title !== 'Posições, casas e método para conferência'
	);
	const sentences = [...narrative.map((s) => s.text), r.practice].flatMap((t) =>
		t
			.split(/(?<=[.!?])\s+/)
			.map((s) => s.trim())
			.filter((s) => s.length > 100)
	);
	if (new Set(sentences).size !== sentences.length) errors.push('repeated-long-sentence');
	if (new Set(narrative.map((s) => s.text.slice(0, 100))).size !== narrative.length)
		errors.push('repeated-opening');
	if (
		/destino inevitável|sucesso garantido|sua alma|nasceu para|pipeline|fact graph|contrato interpretativo/i.test(
			[r.opening, ...narrative.map((s) => s.text), r.practice].join('\n')
		)
	)
		errors.push('voice-or-unsupported-claim');
	return errors;
}
