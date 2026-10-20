import {
	tarotMethodFor,
	type CalculationSnapshot,
	type MethodCard,
	type WorkflowInput
} from '@atv/domain';
import { composeReconstructedTarot } from '../reconstruction/tarot';
import { TAROT_CANON_VERSION, type TarotMeaning } from '../reconstruction/tarot-canon';
import { cardApplication, currentTarotMeanings } from './symbolic-cards';
import { cardRelationPrinciples } from './symbolic-relations';
import { SYMBOLIC_CURRENT_VERSION, type CurrentSymbolicReading } from './symbolic';

const supported = new Set([
	'tarot-situation-challenge-advice',
	'tarot-peladan-cross',
	'tarot-celtic-cross',
	'tarot-aphrodite-temple',
	'tarot-astrological-mandala'
]);
type Movement =
	| 'open'
	| 'act'
	| 'contain'
	| 'discern'
	| 'connect'
	| 'release'
	| 'imagine'
	| 'recover'
	| 'cultivate'
	| 'disrupt'
	| 'reflect';
type Card = MethodCard & { meaning: TarotMeaning; movement: Movement; factId: string };

// Card-level editorial decisions, independent of suit. A court, an ace and a ten
// of the same suit can perform different operations in a relationship of cards.
const movementGroups: Record<Movement, readonly string[]> = {
	open: ['major-0', 'major-17', 'wands-1', 'wands-11', 'cups-1', 'cups-11', 'pentacles-1'],
	act: [
		'major-1',
		'major-7',
		'wands-3',
		'wands-6',
		'wands-8',
		'wands-12',
		'wands-13',
		'wands-14',
		'swords-12'
	],
	contain: [
		'major-4',
		'major-8',
		'major-15',
		'wands-7',
		'wands-9',
		'wands-10',
		'swords-8',
		'pentacles-4'
	],
	discern: [
		'major-5',
		'major-6',
		'major-11',
		'major-20',
		'swords-1',
		'swords-11',
		'swords-13',
		'swords-14'
	],
	connect: [
		'major-19',
		'wands-4',
		'cups-2',
		'cups-3',
		'cups-10',
		'cups-13',
		'cups-14',
		'pentacles-3',
		'pentacles-6'
	],
	release: ['major-13', 'major-21', 'cups-8', 'swords-6', 'swords-10'],
	imagine: ['major-18', 'cups-6', 'cups-7', 'cups-9', 'cups-12', 'swords-9'],
	recover: ['major-14', 'cups-5', 'swords-3', 'swords-4', 'pentacles-5'],
	cultivate: [
		'major-3',
		'pentacles-2',
		'pentacles-7',
		'pentacles-8',
		'pentacles-9',
		'pentacles-10',
		'pentacles-11',
		'pentacles-12',
		'pentacles-13',
		'pentacles-14'
	],
	disrupt: ['major-10', 'major-16', 'wands-5', 'swords-5', 'swords-7'],
	reflect: ['major-2', 'major-9', 'major-12', 'wands-2', 'cups-4', 'swords-2']
};
export const currentTarotMovement = Object.fromEntries(
	Object.entries(movementGroups).flatMap(([movement, ids]) => ids.map((id) => [id, movement]))
) as Record<string, Movement>;
const core = (card: Card) => card.meaning.core.split(';')[0]!.trim();
const quote = (value: string) => `“${value}”`;
const about = (value: string) =>
	value.startsWith('a ')
		? `à ${value.slice(2)}`
		: value.startsWith('o ')
			? `ao ${value.slice(2)}`
			: `a ${value}`;
const of = (value: string) =>
	value.startsWith('a ')
		? `da ${value.slice(2)}`
		: value.startsWith('o ')
			? `do ${value.slice(2)}`
			: `de ${value}`;
const sentence = (value: string) => value.charAt(0).toLocaleUpperCase('pt-BR') + value.slice(1);

function theme(input: Pick<WorkflowInput, 'productId' | 'focus' | 'context'>) {
	const text = `${input.focus ?? ''} ${input.context ?? ''}`
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase();
	if (
		input.productId === 'tarot-aphrodite-temple' ||
		/relacion|relac|casal|parceir|namor|amor|vinculo/.test(text)
	)
		return {
			id: 'relationship',
			label: 'a relação',
			application:
				'Numa relação, uma abertura só se torna acordo quando cabe uma resposta diferente da esperada. O gesto de aproximação e o compromisso assumido têm pesos distintos.',
			criterion: 'reciprocidade demonstrada em conversa e em combinados',
			question:
				'Qual necessidade sua precisa ser dita sem transformar a resposta do outro numa obrigação?'
		};
	if (/dinheiro|financ|gasto|recurso|divida|orcamento/.test(text))
		return {
			id: 'resources',
			label: 'o uso dos seus recursos',
			application:
				'No uso de recursos, a vontade de ampliar uma possibilidade precisa caber no que já está comprometido. Um ganho imaginado ainda não é um recurso disponível.',
			criterion: 'margem disponível depois dos compromissos assumidos',
			question: 'Que compromisso já existente precisa caber na decisão que você está considerando?'
		};
	if (/estud|aprender|curso|formacao|faculdade/.test(text))
		return {
			id: 'learning',
			label: 'seu percurso de aprendizagem',
			application:
				'No estudo, interessar-se por um assunto e sustentar a prática que ele exige são movimentos distintos. A tiragem ajuda a relacionar a curiosidade com o modo de atravessar a dificuldade.',
			criterion: 'uma forma de aprender que una interesse e prática possível',
			question:
				'Em qual etapa da aprendizagem o entusiasmo encontra uma exigência que precisa de outro ritmo?'
		};
	if (/trabalh|carreira|profiss|projeto|equipe|emprego|entrega/.test(text))
		return {
			id: 'work',
			label: 'a situação de trabalho',
			application:
				'No trabalho, oferecer uma ideia e assumir sua execução têm custos diferentes. A interpretação considera também prazo, responsabilidade e espaço para negociar o que depende de outras pessoas.',
			criterion: 'responsabilidade que caiba nos recursos e acordos reais',
			question: 'Qual parte dessa responsabilidade você pode assumir e qual precisa ser negociada?'
		};
	if (/escolh|decid|mudar|mudanca|continuar|sair/.test(text))
		return {
			id: 'choice',
			label: 'a escolha em questão',
			application:
				'Uma escolha reúne o que atrai, o que precisa ser deixado e o custo de permanecer. A carta favorável não elimina o preço da decisão, assim como uma dificuldade não torna todas as alternativas equivalentes.',
			criterion: 'a diferença entre desejo, custo e compromisso',
			question: 'Que custo você aceita conscientemente em cada direção possível?'
		};
	return {
		id: 'open',
		label: 'o tema da consulta',
		application:
			input.focus || input.context
				? 'A leitura permanece no alcance da questão que você trouxe: interpreta maneiras de participar da situação, sem presumir o que já aconteceu ou decidir por você.'
				: 'As posições organizam a leitura sem atribuir acontecimentos à sua vida. O conjunto descreve uma dinâmica simbólica que pode ser aproximada de uma situação concreta.',
		criterion: 'o que pode ser escolhido e sustentado por você',
		question: 'Qual parte desta dinâmica se aproxima melhor da situação que motivou a consulta?'
	};
}

/** Positions determine whether a card contributes a resource, obstacle or
 * condition. The connecting distinction belongs to the actual card, never to
 * the broad movement index retained for source coverage. */
function bridge(a: Card, b: Card): string {
	const difficulty = (card: Card) =>
		['challenge', 'opposition', 'crossing', 'shared-tension'].includes(card.positionId);
	const principle = cardRelationPrinciples[b.cardId];
	if (!principle) throw new Error('Carta sem distinção relacional.');
	const claim = difficulty(b)
		? `${a.name} oferece ${a.meaning.resource}, mas ${b.name} coloca esse recurso diante de ${b.meaning.excess}.`
		: difficulty(a)
			? `${b.name} responde a ${a.meaning.excess} por meio de ${b.meaning.resource}.`
			: b.positionId === 'environment'
				? `${a.name} descreve sua participação por meio de ${a.meaning.resource}; ${b.name} situa essa participação num ambiente de ${core(b)}.`
				: `${a.name}, em ${quote(a.positionName)}, oferece ${a.meaning.resource}; ${b.name}, em ${quote(b.positionName)}, muda a medida dessa contribuição com ${b.meaning.resource}.`;
	let connection: string;
	const pairIds = new Set([a.cardId, b.cardId]);
	if (pairIds.has('swords-5') && pairIds.has('swords-3')) {
		connection =
			'O preço da disputa aparece na diferença dolorosa que precisa ser reconhecida: vencer uma discussão pode deixar o vínculo sem a confiança necessária para continuar. Nomear essa ferida permite separar o que precisa ser reparado da necessidade de provar novamente quem tinha razão.';
	} else if (pairIds.has('cups-1') && pairIds.has('major-15')) {
		connection =
			'A disponibilidade afetiva encontra o risco de ficar presa à gratificação que o encontro oferece. O começo pode ser intenso e ainda precisar de liberdade para recusar: receber afeto não exige entregar à relação toda a medida do próprio desejo. Essa diferença entre abertura e dependência é o ponto que as duas imagens tornam visível.';
	} else if (pairIds.has('swords-4') && (pairIds.has('wands-8') || pairIds.has('swords-12'))) {
		connection =
			'A pausa que recompõe a atenção e a rapidez das respostas pedem ritmos diferentes. Responder antes de recuperar essa atenção pode conservar o desgaste; interromper todo movimento, por outro lado, retiraria a pausa daquilo que ela deveria ajudar a retomar. O ajuste está no tempo necessário para compreender antes da próxima resposta.';
	} else if (difficulty(b)) {
		connection = `${principle} Ter esse recurso à disposição não elimina o custo. A resposta sugerida é esta: ${b.meaning.action}. Esse cuidado ajuda a evitar que a dificuldade passe a conduzir toda a situação.`;
	} else if (difficulty(a)) {
		connection = `${principle} Esse gesto altera a resposta à dificuldade: em vez de permanecer organizado por ${a.meaning.excess}, o conselho permite dar lugar a ${b.meaning.resource}. Assim, o recurso de ${a.name} — ${a.meaning.resource} — pode ser retomado sem tratar seu excesso como a única saída.`;
	} else if (b.positionId === 'environment') {
		connection = `${principle} Essas são condições da interação, não uma tarefa que você possa cumprir por todas as pessoas. ${a.name} delimita sua contribuição: ${a.meaning.action}. A resposta do ambiente mostrará quanto espaço essa participação encontra.`;
	} else if (b.positionId === 'trend' || b.positionId === 'near-development') {
		connection = `${principle} A passagem entre as duas posições começa com uma orientação: ${a.meaning.action}. Sua continuidade depende de outro cuidado: ${b.meaning.action}. Se o movimento ficar preso a ${a.meaning.excess}, a segunda carta não elimina esse custo apenas por ocupar a posição de desdobramento.`;
	} else {
		connection = `${principle} Essa distinção modifica a orientação da primeira carta: ${a.meaning.action}. O efeito desse gesto passa a ser lido também pela dinâmica da segunda: ${core(b)}. O recurso de uma carta não apaga o limite da outra; ${b.meaning.excess} continua sendo um custo a considerar nessa aproximação.`;
	}
	return `${claim} ${connection}`;
}
function positional(card: Card, input: WorkflowInput): string {
	const m = card.meaning,
		p = card.positionId;
	if (['challenge', 'opposition', 'crossing', 'shared-tension'].includes(p))
		return `${card.name} coloca no centro de ${quote(card.positionName)} esta dinâmica: ${core(card)}. A dificuldade está no espaço que ela passa a ocupar: uma resposta possível estreita a participação quando vira a única resposta admitida.`;
	if (['advice', 'helpful-condition'].includes(p))
		return `${card.name} oferece uma resposta pela via de ${m.resource}. Na posição ${quote(card.positionName)}, seu sentido é alterar a forma de participar da situação: ${m.action}. Essa orientação perde precisão se virar ${m.excess}; por isso o gesto precisa manter a medida do problema que pretende responder.`;
	if (p === 'other-position' || p === 'other-need')
		return `${card.name} introduz na conversa o tema de ${core(card)}. Nesta posição, isso permite formular uma possibilidade sobre a interação: pode haver espaço para ${m.resource}, ou um limite ligado a ${m.excess}. A carta não determina qual dessas experiências pertence à outra pessoa. Seu valor é tornar essa diferença conversável, em vez de preencher o silêncio com uma certeza sobre o que ela sente.`;
	if (p === 'past')
		return `${card.name} organiza a posição de antecedente pelo tema de ${core(card)}. A leitura considera como uma experiência dessa natureza poderia continuar influenciando a situação: ${m.excess} pode persistir como modo de responder, enquanto ${m.resource} pode permanecer como aprendizado. Essa posição não comprova que um episódio assim ocorreu; oferece uma ligação possível a partir da qual o restante da cruz será lido.`;
	if (p === 'trend' || p === 'near-development')
		return `${card.name} descreve uma direção simbólica de ${core(card)}. A continuidade favorece ${m.resource} quando as condições discutidas no conjunto recebem atenção; se o mesmo movimento se fecha sobre si, pode assumir a forma de ${m.excess}. Trata-se do desdobramento da dinâmica da tiragem, sem prazo ou acontecimento garantido.`;
	if (p === 'your-need')
		return `${card.name} dá forma a uma necessidade ligada a ${core(card)}. ${cardApplication(m.relationship, 'relationship')} Existe uma diferença entre reconhecer o que importa para você e exigir que o vínculo elimine qualquer frustração. O risco está em ${m.excess}: a necessidade passa a organizar toda a relação, em vez de poder ser expressa dentro dela.`;
	if (p === 'hopes-fears')
		return `${card.name} reúne uma expectativa e seu possível avesso. ${sentence(m.resource)} descreve o que pode atrair nessa imagem; ${m.excess} mostra o preço temido ou o excesso que ela pode carregar. A ambivalência vem de desejar algo que também modifica as condições de participação. Essa posição ajuda a distinguir o que é esperado do que a situação já oferece.`;
	if (p === 'environment')
		return `${card.name}, no ambiente, representa condições de ${core(card)}. Seu apoio possível está em ${m.resource}; sua limitação, em ${m.excess}. Isso dirige a leitura para acordos, regras e respostas observáveis, sem atribuir intenções ocultas às pessoas em volta. A postura pessoal terá de encontrar uma forma de atuar dentro dessas condições.`;
	const application =
		theme(input).id === 'relationship'
			? cardApplication(m.relationship, 'relationship')
			: theme(input).id === 'work'
				? cardApplication(m.work, 'work')
				: '';
	return `${card.name}, em ${quote(card.positionName)}, descreve ${core(card)}.${application ? ` ${application}` : ''}`;
}

export function composeCurrentTarot(
	input: WorkflowInput,
	calculation: CalculationSnapshot
): CurrentSymbolicReading | null {
	if (!supported.has(input.productId)) return null;
	// Reuse the established projection checks, never its generated narrative.
	composeReconstructedTarot(input, calculation);
	const method = tarotMethodFor(input.productId)!;
	const cards = (calculation.data.cards as unknown as MethodCard[]).map((card) => ({
		...card,
		meaning: currentTarotMeanings[card.cardId]!,
		movement: currentTarotMovement[card.cardId]!,
		factId: `card-${card.position}`
	}));
	if (cards.some((card) => !card.movement)) throw new Error('Carta sem relação editorial atual.');
	const binding = theme(input),
		contextIds = calculation.facts.filter((f) => f.kind === 'reported').map((f) => f.id);
	const sections: CurrentSymbolicReading['sections'] = [],
		conclusions: CurrentSymbolicReading['interpretation']['conclusions'] = [];
	const add = (
		title: string,
		claim: string,
		paragraphs: string[],
		used: Card[],
		relation: string,
		contextual = false
	) => {
		const factIds = [...new Set([...used.map((c) => c.factId), ...(contextual ? contextIds : [])])];
		conclusions.push({ section: sections.length, claim, factIds, relation });
		sections.push({ title, text: [claim, ...paragraphs].join('\n\n'), factIds });
	};
	const described = new Set<string>();
	const pair = (title: string, a: Card, b: Card, implication: string, contextual = false) => {
		const interaction = bridge(a, b),
			end = interaction.indexOf('. ');
		const claim = end >= 0 ? interaction.slice(0, end + 1) : interaction;
		const descriptions = [a, b]
			.filter((card) => !described.has(card.cardId))
			.map((card) => {
				described.add(card.cardId);
				return positional(card, input);
			});
		add(
			title,
			claim,
			[
				...descriptions,
				...(end >= 0 ? [interaction.slice(end + 2)] : []),
				implication,
				...(contextual ? [binding.application] : [])
			],
			[a, b],
			`${a.positionId}: ${a.meaning.core}; ${b.positionId}: ${b.meaning.core}. Relação entre os sentidos específicos das cartas: ${interaction} A função de cada posição determina recurso, obstáculo ou direção.`,
			contextual
		);
	};
	const c = (i: number) => cards[i]!;
	if (input.productId === 'tarot-situation-challenge-advice') {
		pair(
			'O ponto em que a situação encontra resistência',
			c(0),
			c(1),
			`O desafio de ${c(1).name} modifica a situação de ${c(0).name}: o recurso inicial não resolve sozinho aquilo que a segunda carta torna difícil. A resposta precisa enfrentar esse custo dentro ${of(binding.label)}.`,
			true
		);
		pair(
			'Uma resposta que muda a dinâmica',
			c(1),
			c(2),
			`O conselho de ${c(2).name} responde especificamente ao excesso de ${c(1).name}: ${c(1).meaning.excess}. Ele conserva o tema trazido pela situação — ${core(c(0))} — e propõe outra maneira de lhe dar continuidade.`
		);
		add(
			'O que as três cartas respondem',
			`A situação se organiza em torno desta dinâmica: ${core(c(0))}. A orientação da tiragem é cuidar dela sem reforçar ${c(1).meaning.excess}.`,
			[
				`${c(2).name} acrescenta a alternativa de ${c(2).meaning.resource}. O conselho faz sentido porque altera a resposta ao desafio; repetir apenas a força da primeira carta poderia tornar a dificuldade mais intensa.`,
				`Aplicada ${about(binding.label)}, essa diferença orienta a escolha por este critério: ${binding.criterion}. ${input.focus ? `Sua pergunta, ${quote(input.focus)}, encontra aqui uma orientação de participação: ${c(2).meaning.action}.` : `A resposta possível toma a forma de ${c(2).meaning.action}.`}`
			],
			cards,
			'Situação estabelece a dinâmica; desafio restringe seu uso; conselho oferece resposta ao mecanismo do desafio.',
			true
		);
	} else if (input.productId === 'tarot-peladan-cross') {
		pair(
			'O apoio e o preço de usá-lo',
			c(0),
			c(1),
			'O apoio e a resistência pertencem à mesma decisão. Reconhecer esse limite permite usar a força favorável com medida, sem exigir que uma qualidade resolva toda a questão.',
			true
		);
		pair(
			'Como o conselho atravessa a resistência',
			c(1),
			c(2),
			`O conselho trabalha sobre a resistência em vez de negar sua existência. A orientação é concreta: ${c(2).meaning.action}. Ela preserva a força favorável sem reproduzir automaticamente o custo da resistência.`
		);
		pair(
			'A direção depende do modo de participar',
			c(2),
			c(3),
			`A tendência é lida depois do conselho porque sua qualidade depende da participação. ${sentence(c(3).meaning.resource)} é uma direção possível; ${c(3).meaning.excess} mostra o que pode acontecer ao sentido da carta quando a resposta perde medida.`
		);
		add(
			'O centro da cruz',
			`${c(4).name} reúne a cruz em torno de ${core(c(4))}.`,
			[
				positional(c(4), input),
				`O apoio de ${c(0).name} oferece ${c(0).meaning.resource}, mas a resistência de ${c(1).name} exige lidar com ${c(1).meaning.excess}. A síntese não escolhe um lado e apaga o outro: usa ${c(2).meaning.resource} como mediação.`,
				`${bridge(c(2), c(4))} Nesta leitura, a prioridade passa a ser ${c(4).meaning.action}. A tendência de ${c(3).name} permanece condicionada a essa maneira de sustentar a decisão.`
			],
			cards,
			'Síntese central qualifica a mediação entre apoio e resistência e condiciona a tendência ao conselho.',
			true
		);
	} else if (input.productId === 'tarot-celtic-cross') {
		pair(
			'A situação e aquilo que a atravessa',
			c(0),
			c(1),
			`A força que cruza não é um episódio adicional: ela modifica a expressão de ${c(0).name}, colocando em primeiro plano ${c(1).meaning.excess}.`,
			true
		);
		pair(
			'O que sustenta a questão e o que se espera dela',
			c(2),
			c(4),
			`A base pode oferecer ${c(2).meaning.resource}, enquanto a direção percebida privilegia ${core(c(4))}. A distância entre sustentar e desejar ajuda a compreender por que uma direção pode parecer clara antes de suas condições estarem reunidas.`
		);
		pair(
			'Entre um antecedente possível e o próximo movimento',
			c(3),
			c(5),
			`A carta do passado oferece uma hipótese de continuidade, sem estabelecer biografia. A relação permite distinguir o que seria repetição de ${core(c(3))} e o que seria abertura para ${core(c(5))}.`
		);
		pair(
			'Sua margem de ação diante do ambiente',
			c(6),
			c(7),
			`Sua participação pode mobilizar ${c(6).meaning.resource}, mas encontra condições externas representadas por ${core(c(7))}. O ajuste está em ${c(6).meaning.action}, sem assumir responsabilidade pela resposta de todos os envolvidos.`
		);
		pair(
			'Expectativa e continuidade não são a mesma coisa',
			c(8),
			c(9),
			`A expectativa de ${c(8).name} pode colorir a maneira de ler a tendência. ${c(9).name} precisa ser compreendida também à luz da força que cruza e do ambiente, não como confirmação automática do desejo ou do receio.`
		);
		add(
			'A leitura da cruz como uma única dinâmica',
			`O ponto de integração é aproximar ${core(c(4))} das condições de ${core(c(2))}, atravessando a dificuldade de ${c(1).name}.`,
			[
				`${c(0).name} situa o movimento inicial; ${c(3).name} oferece um possível antecedente, e ${c(5).name} mostra a passagem simbólica seguinte. Há uma diferença entre continuar por familiaridade e continuar porque a direção ainda faz sentido.`,
				`A resposta sob sua responsabilidade aparece em ${c(6).name}: ${c(6).meaning.action}. Ela encontra no ambiente de ${c(7).name} uma condição de ${core(c(7))}. ${bridge(c(6), c(7))}`,
				`Por isso, ${c(9).name} descreve uma continuidade condicionada. O desejo ou receio de ${c(8).name} não a torna um resultado certo. Para ${binding.label}, a cruz favorece uma decisão que reúna ${binding.criterion} e ${c(9).meaning.resource}, sem ignorar ${c(1).meaning.excess}.`
			],
			cards,
			'Integra situação/cruzamento, base/direção, antecedente/desenvolvimento, postura/ambiente e expectativa/tendência sem converter posições em fatos biográficos.',
			true
		);
	} else if (input.productId === 'tarot-aphrodite-temple') {
		pair(
			'O vínculo visto pela sua participação',
			c(0),
			c(1),
			`O tema comum de ${c(0).name} ganha forma na participação representada por ${c(1).name}. Isso diferencia o que se deseja do vínculo e o modo pelo qual se tenta construí-lo.`,
			true
		);
		pair(
			'Necessidade e maneira de estar perto',
			c(1),
			c(2),
			`A necessidade de ${c(2).name} pode ser cuidada por ${c(1).meaning.resource}, mas também pode ficar encoberta por ${c(1).meaning.excess}. Nomear essa diferença permite pedir algo específico, sem fazer da relação a responsável por adivinhar tudo.`
		);
		pair(
			'Uma perspectiva que precisa de resposta do outro',
			c(3),
			c(4),
			`Essas duas posições formulam possibilidades para a conversa. O tema de ${core(c(3))} pode aproximar ou entrar em tensão com ${core(c(4))}; apenas o diálogo pode dizer se essa articulação descreve a experiência da outra pessoa.`
		);
		pair(
			'Como a tensão pode ganhar outra forma',
			c(5),
			c(6),
			`A ajuda de ${c(6).name} precisa responder a ${c(5).meaning.excess}. Isso aproxima o diálogo de uma condição concreta: ${c(6).meaning.action}. Uma conversa não resolve diferenças por apagar um dos lados; ela permite reconhecer o que cada lado pode oferecer.`
		);
		add(
			'O encontro possível entre as duas perspectivas',
			`A leitura concentra o cuidado do vínculo em ${c(6).meaning.resource}, diante da tensão de ${c(5).meaning.excess}.`,
			[
				`Sua necessidade aparece em ${c(2).name}, enquanto ${c(4).name} dá nome a uma necessidade possível a perguntar. ${bridge(c(2), c(4))}`,
				`O tema comum, ${core(c(0))}, pode ganhar sustentação quando sua participação de ${c(1).name} encontra uma resposta real à questão levantada por ${c(3).name}. Até essa resposta existir, a leitura mantém uma diferença clara entre o que você pode expressar e o que só o outro pode dizer.`,
				`O encaminhamento é ${c(6).meaning.action}. Aplicado à sua questão${input.focus ? `, ${quote(input.focus)}` : ''}, ele prioriza ${binding.criterion}; não produz veredito sobre sentimentos, fidelidade ou futuro do casal.`
			],
			cards,
			'Necessidade própria e necessidade hipotética são relacionadas sob tensão compartilhada e condição de ajuda; alteridade permanece pergunta, não inferência factual.',
			true
		);
	} else {
		const axes: [number, number, string, string][] = [
			[
				0,
				6,
				'Presença e vínculo',
				'A forma de ocupar espaço encontra a forma de negociar esse espaço com alguém. A integração precisa preservar iniciativa sem tornar o acordo uma renúncia permanente.'
			],
			[
				1,
				7,
				'O que sustenta você e o que é compartilhado',
				'Um recurso próprio e um compromisso compartilhado pedem critérios diferentes. A relação entre essas áreas esclarece onde autonomia e dependência podem se confundir.'
			],
			[
				2,
				8,
				'Aprender no cotidiano e ampliar o horizonte',
				'As trocas próximas dão matéria ao entendimento mais amplo. O sentido escolhido também muda quais informações merecem atenção no dia a dia.'
			],
			[
				3,
				9,
				'Base íntima e participação pública',
				'A direção que aparece no mundo precisa encontrar uma base em que seja possível repousar e se reconhecer. O custo de sustentar uma imagem pública não pode ser lido separado dessa base.'
			],
			[
				4,
				10,
				'Expressão própria e construção em grupo',
				'Criar algo próprio e participar de um projeto comum podem se alimentar, desde que o pertencimento não exija apagar a autoria e a autoria consiga reconhecer a contribuição dos outros.'
			],
			[
				5,
				11,
				'O ritmo entre fazer e elaborar',
				'A organização cotidiana e o recolhimento se influenciam: uma rotina pode proteger um tempo de elaboração, enquanto uma pausa pode esclarecer o que merece voltar à rotina.'
			]
		];
		for (const [a, b, title, implication] of axes) pair(title, c(a), c(b), implication, a === 0);
		add(
			'A carta central articula as áreas',
			`${c(12).name} propõe ${core(c(12))} como fio de integração da mandala.`,
			[
				positional(c(12), input),
				`A prioridade sugerida pelo centro é ${c(12).meaning.action}. Esse gesto altera o modo de lidar com a presença de ${c(0).name} e os acordos de ${c(6).name}: ${bridge(c(0), c(12))}`,
				`A sustentação de ${c(1).name} e a rotina de ${c(5).name} dão uma medida concreta à direção de ${c(9).name}. O centro não torna todas as áreas iguais: sua contribuição é reunir ${c(12).meaning.resource} sem reforçar ${c(12).meaning.excess}.`,
				`Para ${binding.label}, a mandala apresenta relações entre áreas simbólicas. A questão${input.focus ? ` ${quote(input.focus)}` : ''} recebe uma prioridade de participação, e não doze previsões independentes.`
			],
			cards,
			'Seis eixos contrapõem áreas complementares; a carta central modifica presença/acordos e articula recursos/rotina/direção sem supor casas natais calculadas.',
			true
		);
	}
	const advice = cards.find((card) =>
		['advice', 'helpful-condition', 'center', 'stance'].includes(card.positionId)
	)!;
	return {
		version: SYMBOLIC_CURRENT_VERSION,
		productId: input.productId,
		title: method.name,
		opening: `${input.focus ? `A questão que orienta esta leitura é ${quote(input.focus)}. ` : ''}${input.context ? `Você situou a consulta assim: ${quote(input.context)}. ` : ''}As cartas serão lidas em relação: cada posição muda o papel da imagem, e o conjunto mostra tanto uma possibilidade de participação quanto o ponto em que ela encontra dificuldade.`,
		source: `Cartas desta execução, posições do método ${method.name} e cânone original ATVNA (${TAROT_CANON_VERSION}); interpretação simbólica sem consulta externa.`,
		sections,
		questions: [binding.question],
		practice: `Uma forma de levar a orientação à situação: ${advice.meaning.action}. A medida é ${binding.criterion}; mantenha espaço para rever o gesto conforme a resposta concreta.`,
		limits: [
			'As cartas oferecem uma interpretação simbólica; não comprovam acontecimentos, estados internos de terceiros ou resultados futuros.',
			...(input.productId === 'tarot-astrological-mandala'
				? ['As doze áreas da mandala são simbólicas; esta tiragem não calcula casas natais.']
				: [])
		],
		interpretation: {
			version: 'atv-interpretation-evidence/1',
			family: `tarot:${method.id}`,
			conclusions
		}
	};
}

/** The free tools use the same card meanings, with a smaller, question-led scope. */
export function composeCurrentSingleCard(
	cardId: string,
	focus: string | undefined,
	mode: 'day' | 'love' | 'question'
): { summary: string; sections: { id: string; title: string; body: string }[] } {
	const meaning = currentTarotMeanings[cardId],
		movement = currentTarotMovement[cardId];
	if (!meaning || !movement) throw new Error('Carta desconhecida para a leitura atual.');
	const binding = theme({
		productId: mode === 'love' ? 'tarot-aphrodite-temple' : 'tarot-single',
		focus
	});
	const subject =
		mode === 'day'
			? 'o ritmo do seu dia'
			: mode === 'love'
				? 'a maneira de participar de um vínculo'
				: binding.label;
	const cardAnswer = cardRelationPrinciples[cardId];
	const context =
		binding.id === 'relationship'
			? cardApplication(meaning.relationship, 'relationship')
			: binding.id === 'work'
				? `${cardApplication(meaning.work, 'work')} Isso aproxima a imagem de ${binding.criterion}.`
				: binding.application;
	const normalizedFocus = (focus ?? '')
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase();
	// These verbs are ambiguous without their object: finishing a course is not
	// leaving it, and "sair bem" or "deixar de procrastinar" are not departures.
	const completing =
		/\b(?:concluir|completar|finalizar|terminar|encerrar)\s+(?:(?:o|a|os|as|meu|minha|meus|minhas|um|uma|este|esta|esse|essa)\s+){0,2}(?:curso|faculdade|graduacao|formacao|estudo|estudos|projeto|tarefa|trabalho|entrega|etapa|obra|divida)\b/.test(
			normalizedFocus
		);
	const returning =
		/\b(?:retomar|recomecar|reconciliar)\b|\bvoltar\s+(?:a|ao|aos|as|para|com)\b/.test(
			normalizedFocus
		);
	const leaving =
		/\bsair\s+(?:da|do|das|dos|de)\s+(?:(?:um|uma|meu|minha|meus|minhas)\s+){0,2}(?:relacao|relacionamento|casamento|namoro|emprego|trabalho|empresa|curso|faculdade|casa|projeto|equipe)\b|\b(?:terminar|encerrar|finalizar)\s+(?:(?:o|a|meu|minha|um|uma)\s+){0,2}(?:relacao|relacionamento|casamento|namoro|vinculo)\b/.test(
			normalizedFocus
		);
	const returnApplication =
		binding.id === 'learning'
			? 'Na retomada dos estudos, recomeçar uma prática e sustentar a continuidade dela são etapas diferentes. O percurso pode partir do que você já aprendeu, com espaço para rever o modo de estudar.'
			: binding.id === 'work'
				? 'Na retomada de um trabalho ou projeto, voltar à execução pede distinguir o que ainda pode ser aproveitado do que depende de novos prazos e acordos.'
				: binding.id === 'relationship'
					? 'Como sua questão envolve retomar uma relação, recuperar uma presença e repetir as mesmas condições são possibilidades diferentes.'
					: 'Como sua questão envolve retomar, o recomeço pode aproveitar o que foi aprendido sem exigir a repetição das condições anteriores.';
	const questionSpecific = completing
		? `Sua pergunta sobre concluir ${binding.id === 'learning' ? 'esse percurso de aprendizagem' : 'uma tarefa ou projeto'} coloca em foco a diferença entre sustentar o que falta e apenas desejar chegar ao fim. ${meaning.name} acrescenta ${meaning.resource} a essa passagem. A orientação da carta — ${meaning.action} — se aplica à maneira de atravessar a etapa restante; ela não antecipa o resultado.`
		: returning
			? `${returnApplication} ${movement === 'release' ? 'O encerramento sugerido pela carta pode se referir à forma anterior do vínculo ou da tentativa; ele não obriga a recusar toda possibilidade nova.' : `${meaning.name} relaciona essa retomada a ${meaning.resource}. A orientação é ${meaning.action}.`}`
			: leaving
				? `Como sua questão envolve uma saída, a leitura diferencia o que deixaria de ser sustentado do que ainda precisaria de cuidado depois da decisão. ${meaning.name} acrescenta ${meaning.core.split(';')[0]} a essa diferença; a carta não transforma a saída na única alternativa.`
				: /escolh|decid|mudar|mudanca/.test(normalizedFocus)
					? `Na escolha que você trouxe, ${meaning.name} dá peso a ${meaning.core.split(';')[0]}. Esse critério ajuda a comparar o custo de participar de cada direção, sem oferecer uma resposta automática de sim ou não.`
					: `Para ${subject}, a contribuição específica de ${meaning.name} é ${meaning.action}. Essa orientação tem sentido junto da ambivalência descrita acima, sem substituir sua decisão.`;
	return {
		summary: `${meaning.name} coloca em foco ${meaning.core.split(';')[0]}. ${mode === 'day' ? 'Uma imagem para dar outra atenção ao dia.' : focus ? `Sua questão é ${quote(focus)}.` : 'A leitura relaciona essa imagem ao tema da consulta.'}`,
		sections: [
			{
				id: 'card-dynamic',
				title:
					mode === 'day'
						? 'A qualidade que a carta traz ao dia'
						: 'O que esta carta acrescenta à questão',
				body: `${cardAnswer}\n\n${meaning.name} torna essa dinâmica específica por meio de ${meaning.resource}. Quando essa resposta ocupa todo o espaço, seu excesso aparece em ${meaning.excess}.`
			},
			{
				id: 'card-context',
				title:
					mode === 'love'
						? 'Como isso participa do vínculo'
						: mode === 'day'
							? 'Onde essa imagem pode fazer diferença'
							: 'Uma orientação para a sua pergunta',
				body: `${context}\n\n${questionSpecific}`
			}
		]
	};
}
