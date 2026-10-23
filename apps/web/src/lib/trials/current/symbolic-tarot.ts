import {
	tarotMethodFor,
	type CalculationSnapshot,
	type MethodCard,
	type WorkflowInput
} from '@atv/domain';
import { composeReconstructedTarot } from '../reconstruction/tarot';
import { TAROT_CANON_VERSION, type TarotMeaning } from '../reconstruction/tarot-canon';
import { currentTarotMeanings } from './symbolic-cards';
import { tarotApplications } from './symbolic-contexts';
import { tarotDevelopments } from './symbolic-developments';
import {
	interactionMechanism,
	resolutionMechanism,
	type TarotScope
} from './symbolic-interactions';
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
const quote = (value: string) => `“${value}”`;

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
				'No estudo, interessar-se por um assunto e sustentar a prática que ele exige são movimentos distintos. A curiosidade abre uma direção; um ritmo possível de estudo permite continuar quando o assunto deixa de ser novidade.',
			criterion: 'uma forma de aprender que una interesse e prática possível',
			question:
				'Em qual etapa da aprendizagem o entusiasmo encontra uma exigência que precisa de outro ritmo?'
		};
	if (/trabalh|carreira|profiss|projeto|equipe|emprego|entrega/.test(text))
		return {
			id: 'work',
			label: 'a situação de trabalho',
			application:
				'No trabalho, oferecer uma ideia e assumir sua execução têm custos diferentes. Prazo, responsabilidade e espaço para negociar o que depende de outras pessoas dão uma medida concreta ao compromisso.',
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
		application: '',
		criterion: 'o que pode ser escolhido e sustentado por você',
		question: 'Qual parte desta dinâmica se aproxima melhor da situação que motivou a consulta?'
	};
}

/** Positions determine whether a card contributes a resource, obstacle or
 * condition. The connecting distinction belongs to the actual card, never to
 * the broad movement index retained for source coverage. */
function bridge(a: Card, b: Card, scope: TarotScope): string {
	const difficulty = (card: Card) =>
		['challenge', 'opposition', 'crossing', 'shared-tension'].includes(card.positionId);
	return interactionMechanism(
		a.cardId,
		b.cardId,
		difficulty(b) ? 'obstacle' : difficulty(a) ? 'response' : 'complement',
		scope
	);
}
function positional(card: Card, input: WorkflowInput): string {
	const application = tarotApplications[card.cardId];
	if (!application) throw new Error('Carta sem aplicação editorial atual.');
	const reading = theme(input).id === 'relationship' ? application.love : application.question;
	return `${card.name} · ${card.positionName}\n${reading}`;
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
		scope = binding.id as TarotScope,
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
		sections.push({ title, text: [claim, ...paragraphs].filter(Boolean).join('\n\n'), factIds });
	};
	const described = new Set<string>();
	const pair = (title: string, a: Card, b: Card, implication: string, contextual = false) => {
		const interaction = bridge(a, b, scope),
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
			[...descriptions, ...(end >= 0 ? [interaction.slice(end + 2)] : []), implication],
			[a, b],
			`${a.positionId}: ${a.meaning.core}; ${b.positionId}: ${b.meaning.core}. Relação entre os sentidos específicos das cartas: ${interaction} A função de cada posição determina recurso, obstáculo ou direção.`,
			contextual
		);
	};
	const c = (i: number) => cards[i]!;
	const resolve = (source: number, obstacle: number, response: number) =>
		resolutionMechanism(c(source).cardId, c(obstacle).cardId, c(response).cardId, scope);
	const connect = (a: number, b: number, kind: 'response' | 'complement' = 'complement') =>
		interactionMechanism(c(a).cardId, c(b).cardId, kind, scope);
	const synthesis = (title: string, paragraphs: string[], relation: string) => {
		const [first, ...rest] = paragraphs;
		if (!first) throw new Error('Síntese sem desenvolvimento.');
		const end = first.indexOf('. ');
		add(
			title,
			end < 0 ? first : first.slice(0, end + 1),
			[...(end < 0 ? [] : [first.slice(end + 2)]), ...rest],
			cards,
			relation,
			true
		);
	};
	if (input.productId === 'tarot-situation-challenge-advice') {
		pair('O ponto em que a situação encontra resistência', c(0), c(1), '', true);
		pair('Uma resposta que muda a dinâmica', c(1), c(2), '');
		synthesis(
			'O que as três cartas respondem',
			[resolve(0, 1, 2)],
			'Situação estabelece a dinâmica; desafio restringe seu uso; conselho oferece resposta ao mecanismo do desafio.'
		);
	} else if (input.productId === 'tarot-peladan-cross') {
		pair('O apoio e o preço de usá-lo', c(0), c(1), '', true);
		pair('Como o conselho atravessa a resistência', c(1), c(2), '');
		pair('A direção depende do modo de participar', c(2), c(3), '');
		synthesis(
			'O centro da cruz',
			[connect(2, 4, 'response'), positional(c(4), input)],
			'Síntese central modifica o conselho; as seções anteriores relacionam apoio, resistência e tendência.'
		);
	} else if (input.productId === 'tarot-celtic-cross') {
		pair('A situação e aquilo que a atravessa', c(0), c(1), '', true);
		pair('O que sustenta a questão e o que se espera dela', c(2), c(4), '');
		pair('Entre um antecedente possível e o próximo movimento', c(3), c(5), '');
		pair('Sua margem de ação diante do ambiente', c(6), c(7), '');
		pair('Expectativa e continuidade não são a mesma coisa', c(8), c(9), '');
		synthesis(
			'A leitura da cruz como uma única dinâmica',
			[
				resolve(0, 1, 6),
				`Entre ${c(6).name}, na sua postura, e ${c(9).name}, na tendência:\n${connect(6, 9)}`
			],
			'As cinco seções relacionam os eixos da cruz. A síntese acrescenta a resposta da postura ao cruzamento e sua influência sobre a tendência.'
		);
	} else if (input.productId === 'tarot-aphrodite-temple') {
		pair('O vínculo visto pela sua participação', c(0), c(1), '', true);
		pair('Necessidade e maneira de estar perto', c(1), c(2), '');
		pair(
			'Uma perspectiva que precisa de resposta do outro',
			c(3),
			c(4),
			'As posições do outro oferecem uma possibilidade de conversa: cabe a ele dizer como vive essa diferença.'
		);
		pair('Como a tensão pode ganhar outra forma', c(5), c(6), '');
		synthesis(
			'O encontro possível entre as duas perspectivas',
			[
				connect(2, 4),
				`Ao aproximar ${c(1).name}, na sua posição, de ${c(3).name}, na posição do outro:\n${connect(1, 3)}`
			],
			'As seções anteriores relacionam tema, posições, tensão e ajuda. A síntese acrescenta o encontro entre as necessidades e entre as formas de participar; a perspectiva do outro é uma hipótese para conversa.'
		);
	} else {
		const axes: [number, number, string][] = [
			[0, 6, 'Presença e vínculo'],
			[1, 7, 'O que sustenta você e o que é compartilhado'],
			[2, 8, 'Aprender no cotidiano e ampliar o horizonte'],
			[3, 9, 'Base íntima e participação pública'],
			[4, 10, 'Expressão própria e construção em grupo'],
			[5, 11, 'O ritmo entre fazer e elaborar']
		];
		for (const [a, b, title] of axes) pair(title, c(a), c(b), '', a === 0);
		synthesis(
			'O fio que aproxima as áreas',
			[
				connect(0, 12),
				positional(c(12), input),
				`Entre ${c(5).name}, no cotidiano, e ${c(9).name}, na direção pública:\n${connect(5, 9)}`
			],
			'Seis eixos contrapõem áreas complementares; a síntese relaciona a carta central à presença e acrescenta a relação entre rotina e direção, sem supor casas natais calculadas.'
		);
	}
	const advice = cards.find((card) =>
		['advice', 'helpful-condition', 'center', 'stance'].includes(card.positionId)
	)!;
	const pauseAndReply =
		input.productId === 'tarot-celtic-cross' &&
		c(0).cardId === 'swords-4' &&
		c(1).cardId === 'wands-8' &&
		c(6).cardId === 'major-14';
	const practice = pauseAndReply
		? scope === 'relationship'
			? 'Combinar uma hora para retomar a conversa permite descansar sem deixar o encontro suspenso. A resposta pode vir com mais atenção quando cada mensagem deixa de exigir uma disponibilidade imediata.'
			: 'Um prazo de retomada e um volume possível de trabalho dão lugar ao descanso sem abandonar o que precisa continuar. A próxima etapa começa melhor quando a cobrança também respeita esse intervalo.'
		: tarotDevelopments[advice.cardId]![binding.id === 'relationship' ? 'love' : 'question'];
	return {
		version: SYMBOLIC_CURRENT_VERSION,
		productId: input.productId,
		title: method.name,
		opening:
			`${input.focus ? `Você trouxe a questão ${quote(input.focus)}. ` : ''}${input.context ? `O contexto que você informou foi ${quote(input.context)}.` : ''}`.trim(),
		source: `Cartas desta execução, posições do método ${method.name} e cânone original ATVNA (${TAROT_CANON_VERSION}); interpretação simbólica sem consulta externa.`,
		sections,
		questions: [binding.question],
		practice,
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
		movement = currentTarotMovement[cardId],
		application = tarotApplications[cardId];
	if (!meaning || !movement || !application)
		throw new Error('Carta desconhecida para a leitura atual.');
	const binding = theme({
		productId: mode === 'love' ? 'tarot-aphrodite-temple' : 'tarot-single',
		focus
	});
	const cardAnswer = tarotDevelopments[cardId]![mode];
	const paragraph = application[mode];
	const firstEnd = paragraph.indexOf('. ');
	const summary = firstEnd >= 0 ? paragraph.slice(0, firstEnd + 1) : paragraph;
	const development = firstEnd >= 0 ? paragraph.slice(firstEnd + 2) : paragraph;
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
		? `Na sua pergunta sobre concluir ${binding.id === 'learning' ? 'esse percurso de aprendizagem' : 'uma tarefa ou projeto'}, essa diferença se concentra na etapa restante: o que ainda precisa receber continuidade e o que já pode ser entregue.`
		: returning
			? `${returnApplication} ${movement === 'release' ? 'O encerramento sugerido pela carta pode se referir à forma anterior do vínculo ou da tentativa; reconhecer o que terminou pode abrir espaço para uma aproximação em outras condições.' : ''}`
			: leaving
				? 'Como sua questão envolve uma saída, encerrar a participação também pede encaminhar os compromissos que continuarão existindo depois dela. Essa passagem pode ter um ritmo diferente da decisão de partir.'
				: '';
	return {
		summary,
		sections: [
			{
				id: 'card-dynamic',
				title: application.title,
				body: development
			},
			{
				id: 'card-context',
				title:
					mode === 'love'
						? 'O espaço entre o desejo e o encontro'
						: mode === 'day'
							? 'O cuidado que acompanha esse movimento'
							: 'O que ganha peso na escolha',
				body: [questionSpecific.trim(), cardAnswer].filter(Boolean).join(' ')
			}
		]
	};
}
