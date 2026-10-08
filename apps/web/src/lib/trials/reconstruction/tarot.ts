import {
	parseWorkflowInput,
	tarotMethodFor,
	type CalculationSnapshot,
	type MethodCard,
	type WorkflowInput
} from '@atv/domain';
import type { TrialReading } from '../reading';
import { RECONSTRUCTION_VERSION, type EditorialTrace } from './career';
import { TAROT_CANON_VERSION, tarotCanon, type TarotMeaning } from './tarot-canon';

type Card = MethodCard & { factId: string; meaning: TarotMeaning };
type Binding = {
	key: EditorialTrace['context']['key'];
	title: string;
	subject: string;
	criterion: string;
	example: string;
	experiment: string;
	question: string;
};
const bindings: Record<string, Binding> = {
	relationships: {
		key: 'relationships',
		title: 'O que cabe numa conversa',
		subject: 'a relação',
		criterion: 'reciprocidade, acordo e espaço para uma resposta diferente da sua',
		example:
			'Uma mensagem carinhosa e a disponibilidade para cumprir um combinado são informações diferentes. Observe ambas antes de concluir o que existe entre vocês.',
		experiment:
			'Prepare uma conversa sobre um único combinado: o que você pode oferecer, o que precisa e qual resposta está disposto a escutar. Registre depois o que foi efetivamente dito.',
		question: 'Que acordo pode ser conversado sem presumir a resposta da outra pessoa?'
	},
	work: {
		key: 'leadership',
		title: 'Da intenção à entrega',
		subject: 'o trabalho',
		criterion: 'responsabilidade, margem de decisão e resultado que pode ser conferido',
		example:
			'Numa entrega em equipe, compare quem decide, quem executa e quem assume o custo de um atraso. Um título de cargo pode esconder diferenças nessas três funções.',
		experiment:
			'Escolha uma entrega de alcance pequeno. Combine com quem participa um resultado observável, o tempo disponível e uma revisão antes de assumir mais compromissos.',
		question: 'Que entrega pequena permite conferir a ideia antes de ampliar o compromisso?'
	},
	resources: {
		key: 'independent',
		title: 'O que sustenta a escolha',
		subject: 'os recursos disponíveis',
		criterion: 'custo, reserva e capacidade de manter o compromisso',
		example:
			'Uma opção pode parecer atraente e ainda exigir tempo ou dinheiro que já têm destino. Coloque os compromissos lado a lado antes de contar um mesmo recurso duas vezes.',
		experiment:
			'Anote o custo em tempo, dinheiro e manutenção de uma opção concreta. Separe o que já existe do que depende de confirmação; só então defina o alcance de um primeiro teste.',
		question: 'Qual custo ainda não entrou na conta dessa escolha?'
	},
	study: {
		key: 'study',
		title: 'Aprender e conferir',
		subject: 'a aprendizagem',
		criterion: 'compreensão demonstrável, prática e retorno sobre o que ainda falta',
		example:
			'Reconhecer uma explicação é diferente de conseguir usá-la. Uma tarefa pequena feita sem consultar a resposta ajuda a localizar a dúvida com mais precisão.',
		experiment:
			'Escolha uma dificuldade específica, faça uma tentativa curta e compare o resultado com um critério conhecido. Registre a dúvida que sobrou e leve essa dúvida a uma fonte ou pessoa adequada.',
		question: 'Como você poderia demonstrar o que aprendeu, em vez de apenas reconhecê-lo?'
	},
	transition: {
		key: 'transition',
		title: 'O tamanho do próximo passo',
		subject: 'a mudança em exame',
		criterion: 'o que termina, o que continua e o que ainda precisa ser conhecido',
		example:
			'Antes de deixar uma rotina ou entrar em outra, diferencie a parte que já não funciona da parte que apenas pede ajuste. Um ensaio com prazo evita tratar toda insatisfação como decisão definitiva.',
		experiment:
			'Desenhe um teste reversível com começo, limite e data de revisão. Anote o que precisa permanecer disponível durante a mudança e que observação faria você rever o plano.',
		question: 'O que precisa continuar disponível enquanto você experimenta outra direção?'
	},
	general: {
		key: 'general',
		title: 'Uma aplicação possível',
		subject: 'a situação que você escolher observar',
		criterion: 'o que acontece, o que você interpreta e o que pode experimentar',
		example:
			'Escolha um episódio recente com começo e fim: um pedido, uma conversa ou uma tarefa. Uma situação delimitada permite conferir a leitura sem fazê-la explicar toda a sua vida.',
		experiment:
			'Escolha uma situação pequena e anote o que ocorreu, sua interpretação e uma resposta alternativa. Experimente essa resposta quando houver ocasião e compare o efeito com a expectativa inicial.',
		question: 'Em qual situação delimitada essa leitura pode ser conferida?'
	}
};
function bind(input: WorkflowInput): Binding {
	const text = `${input.focus ?? ''} ${input.context ?? ''}`
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.toLowerCase();
	const key = /relacion|amor|casal|namor|vinculo|afet|parceir|famil/.test(text)
		? 'relationships'
		: /dinheiro|orcamento|financeir|recurso|gasto|divida|compra/.test(text)
			? 'resources'
			: /estud|aprend|curso|prova|faculdade|pesquis/.test(text)
				? 'study'
				: /trabalho|carreira|profiss|equipe|emprego|projeto|negocio/.test(text)
					? 'work'
					: /mudanca|transicao|recomec|mudar|escolha|decis|encerr/.test(text)
						? 'transition'
						: 'general';
	return bindings[key]!;
}
const unique = (values: string[]) => [...new Set(values)];
const cap = (s: string) => s[0]!.toLocaleUpperCase('pt-BR') + s.slice(1);
const subject = (card: Card) => `${card.name} (${card.positionName})`;
const suite = (card: Card) => card.cardId.split('-')[0]!;
const suiteMeaning: Record<string, string> = {
	wands: 'iniciativa, intensidade e direção da ação',
	cups: 'receptividade, afeto e qualidade das trocas',
	swords: 'critérios, linguagem e conflitos de interpretação',
	pentacles: 'recursos, tempo e sustentação material',
	major: 'princípios que organizam mais de uma parte da experiência'
};

function normalize(input: WorkflowInput, calculation: CalculationSnapshot) {
	const parsed = parseWorkflowInput(input),
		method = tarotMethodFor(input.productId);
	if (
		!parsed ||
		!method ||
		calculation.version !== 'atv-tarot-method-calculation/2.0.0' ||
		calculation.kind !== 'tarot' ||
		calculation.status !== 'recorded'
	)
		throw new Error('Contrato de Tarot ausente.');
	const data = calculation.data,
		raw = data.cards;
	if (
		data.methodId !== method.id ||
		data.methodVersion !== method.version ||
		data.deckVersion !== 'atv-tarot-78/1.0.0' ||
		data.reversals !== false ||
		data.replacement !== false ||
		data.focus !== (parsed.focus ?? null) ||
		data.context !== (parsed.context ?? null) ||
		!Array.isArray(raw) ||
		raw.length !== method.positions.length
	)
		throw new Error('Sorteio incompatível com o método.');
	const seen = new Set<string>();
	const cards: Card[] = raw.map((value, i) => {
		const card = value as MethodCard,
			position = method.positions[i]!,
			meaning = tarotCanon[card.cardId],
			factId = `card-${i + 1}`;
		if (
			!meaning ||
			card.name !== meaning.name ||
			seen.has(card.cardId) ||
			card.position !== i + 1 ||
			card.positionId !== position.id ||
			card.positionName !== position.name ||
			card.orientation !== 'upright' ||
			!calculation.facts.some(
				(f) =>
					f.id === factId &&
					f.kind === 'drawn' &&
					f.display === `${card.positionName}: ${card.name} (posição direta)`
			)
		)
			throw new Error('Carta ou posição inconsistente.');
		seen.add(card.cardId);
		return { ...card, factId, meaning };
	});
	return {
		method,
		cards,
		context: bind(parsed),
		contextIds: calculation.facts.filter((f) => f.kind === 'reported').map((f) => f.id)
	};
}

/** A relation must retain both mechanisms and their different jobs in the spread. */
function theme(card: Card): string {
	return card.meaning.core.split(';')[0]!.trim();
}

function relation(a: Card, b: Card) {
	const first = `${subject(a)} põe em foco: ${theme(a)}`;
	const second = `${subject(b)} acrescenta outra condição: ${theme(b)}`;
	const shared =
		suite(a) === suite(b)
			? `O tema comum é ${suiteMeaning[suite(a)]}. Em ${a.positionName.toLowerCase()}, ${a.name} oferece ${a.meaning.resource}. Em ${b.positionName.toLowerCase()}, ${b.name} pede outro uso desse tema: ${b.meaning.action}.`
			: `Para relacionar as posições, considere o que ${a.name} oferece: ${a.meaning.resource}. O ajuste de ${b.name} é ${b.meaning.action}. Confira se esse ajuste preserva o recurso da primeira carta ou se cobra justamente aquilo que ela procura sustentar.`;
	return `${first}. ${second}. ${shared}`;
}

function openingSynthesis(methodId: string, cards: Card[], context: Binding): string {
	const c = (i: number) => cards[i]!;
	if (cards.length === 1)
		return `${subject(c(0))} organiza a consulta em torno de ${c(0).meaning.core}. O ponto de atenção é distinguir quando esse movimento ajuda e quando começa a cobrar um custo maior do que oferece. Para ${context.subject}, a diferença aparece ao examinar ${context.criterion}.`;
	switch (methodId) {
		case 'tarot-situation-challenge-advice':
			return `${relation(c(0), c(1))}\n\nO conselho de ${c(2).name} responde a essa fricção por uma ação: ${c(2).meaning.action}. Experimente esse gesto onde o desafio de ${c(1).name} pesa sobre a situação de ${c(0).name}. Observe se ele reduz esse peso e o que exige para funcionar, considerando ${context.criterion}.`;
		case 'tarot-peladan-cross':
			return `${relation(c(0), c(1))}\n\n${c(2).name}, no conselho, oferece uma mediação: ${c(2).meaning.action}. A tendência de ${c(3).name} descreve uma possibilidade caso essa dinâmica continue. ${c(4).name}, no centro, pede reunir as forças por ${c(4).meaning.core}. Para ${context.subject}, o apoio só pode ser avaliado junto do custo que a resistência torna visível.`;
		case 'tarot-celtic-cross':
			return `${relation(c(0), c(1))}\n\nA explicação consciente de ${c(4).name} precisa ser conferida com o fundamento de ${c(2).name}. Sua postura, em ${c(6).name}, conta com ${c(6).meaning.resource}; o ambiente, em ${c(7).name}, exige considerar ${c(7).meaning.action}. Essa exigência ajuda a distinguir o que depende da sua resposta do que precisa de uma condição externa. A tendência de ${c(9).name} pode ser explorada por este tema: ${theme(c(9))}. Ela permanece condicionada à relação entre postura e ambiente. Ao conferir a leitura, dê atenção a ${context.criterion}.`;
		case 'tarot-aphrodite-temple':
			return `${c(0).name}, no tema compartilhado, propõe olhar para ${c(0).meaning.core}. Esse tema ganha dois lados: ${c(1).name} ocupa sua posição e ${c(3).name} representa uma hipótese sobre a posição da outra pessoa. Sua necessidade, em ${c(2).name}, envolve ${c(2).meaning.core}; a outra perspectiva, em ${c(4).name}, pede que se investigue ${c(4).meaning.core} pela conversa.\n\nPara ${context.subject}, o encontro entre essas necessidades precisa considerar ${context.criterion}. ${c(5).name}, na tensão compartilhada, torna relevante o risco de ${c(5).meaning.excess}. A condição favorável de ${c(6).name} sugere ${c(6).meaning.action}. Observe se esse ajuste permite às duas partes declarar o que precisam sem transformar uma hipótese sobre o vínculo numa resposta atribuída à outra pessoa.`;
		default: {
			const center = c(12);
			const axis =
				context.key === 'relationships'
					? [6, 0]
					: context.key === 'leadership'
						? [9, 3]
						: context.key === 'independent'
							? [1, 7]
							: context.key === 'study'
								? [8, 2]
								: [0, 6];
			return `A mandala coloca doze áreas simbólicas ao redor de ${center.name}, na posição central. O movimento de ${center.meaning.core} oferece um princípio para relacionar as áreas; cada setor conserva seu próprio assunto.\n\nPara ${context.subject}, o eixo entre ${c(axis[0]!).positionName.toLowerCase()} e ${c(axis[1]!).positionName.toLowerCase()} ganha prioridade: ${relation(c(axis[0]!), c(axis[1]!))} O centro sugere ${center.meaning.action} para considerar as duas exigências em conjunto. Outros eixos comparam recursos e partilha, trocas e horizontes, raízes e contribuição, criação e redes, rotina e recolhimento; os capítulos seguintes permitem conferir onde o mesmo princípio precisa de outra medida.`;
		}
	}
}

function application(methodId: string, cards: Card[], context: Binding) {
	const c = (i: number) => cards[i]!;
	switch (methodId) {
		case 'tarot-single-card':
			return {
				questions: [
					context.question,
					`Em que momento o recurso de ${c(0).name} dá lugar ao excesso descrito nesta leitura?`,
					`Que efeito você observaria ao experimentar o ajuste de ${c(0).name}?`
				],
				practice: `Escolha um episódio relacionado a ${context.subject}. Antes de agir, anote como o tema de ${c(0).name} aparece e qual parte ainda é hipótese. Experimente este ajuste: ${c(0).meaning.action}. Registre o efeito e o custo; use ambos para decidir se o gesto merece ser repetido.`
			};
		case 'tarot-situation-challenge-advice':
			return {
				questions: [
					`Onde o desafio de ${c(1).name} interfere na situação apresentada por ${c(0).name}?`,
					`O conselho de ${c(2).name} modifica essa dificuldade ou apenas desvia a atenção dela?`,
					context.question
				],
				practice: `Descreva uma situação em três linhas: o que ocorre, onde a dificuldade pesa e o que você pode tentar. Para a terceira linha, considere ${c(2).meaning.action}. Depois da tentativa, compare o efeito com o desafio de ${c(1).name}. Registre o que se modificou e o que continua exigindo outra resposta.`
			};
		case 'tarot-peladan-cross':
			return {
				questions: [
					`Que apoio de ${c(0).name} permanece disponível diante da resistência de ${c(1).name}?`,
					`Como o conselho de ${c(2).name} pode usar esse apoio sem ignorar o custo?`,
					`O que precisaria se manter para a tendência de ${c(3).name} fazer sentido, considerando ${context.criterion}?`
				],
				practice: `Faça duas colunas para uma decisão concreta: apoio e resistência. Use ${c(0).name} e ${c(1).name} para investigar cada lado, registrando também o que os fatos contradizem. Formule um ensaio a partir do conselho de ${c(2).name}: ${c(2).meaning.action}. Ao rever o ensaio, confira se ele reúne os dois lados pelo tema central de ${c(4).name}.`
			};
		case 'tarot-celtic-cross':
			return {
				questions: [
					`A explicação consciente de ${c(4).name} dá conta do fundamento descrito por ${c(2).name}?`,
					`Que parte da resposta depende da sua postura em ${c(6).name}, e que parte pede verificar o ambiente de ${c(7).name}?`,
					`Qual mudança nessas condições enfraqueceria a tendência de ${c(9).name}?`
				],
				practice: `Separe numa folha o que você sabe sobre a situação, o que espera e o que teme. Compare sua explicação consciente, em ${c(4).name}, com a sustentação sugerida por ${c(2).name}. Escolha uma ação sob sua responsabilidade e uma informação do ambiente que ainda precisa obter. Só depois releia ${c(9).name} como tendência condicionada por essas respostas.`
			};
		case 'tarot-aphrodite-temple':
			return {
				questions: [
					`Que necessidade de ${c(2).name} você consegue expressar sem atribuí-la à outra pessoa?`,
					`Como a perspectiva de ${c(4).name} poderia ser investigada por uma pergunta aberta?`,
					`O ajuste de ${c(6).name} permite às duas pessoas responder à tensão de ${c(5).name}?`
				],
				practice: `Prepare uma conversa a partir de uma necessidade sua, observada na posição de ${c(2).name}. Escreva uma pergunta aberta sobre a outra perspectiva, em ${c(4).name}, sem incluir a resposta que espera ouvir. Considere ${c(6).meaning.action} como condição de diálogo. Depois, distinga o que foi dito do que permaneceu como hipótese da tiragem.`
			};
		default:
			return {
				questions: [
					`Em qual área o princípio central de ${c(12).name} encontra uma condição favorável, e em qual encontra um limite?`,
					`O que muda quando você compara presença, em ${c(0).name}, com relações, em ${c(6).name}?`,
					context.question
				],
				practice: `Escolha um eixo da mandala e descreva um episódio de cada uma das suas duas áreas. Compare o recurso que aparece de um lado com a exigência do outro. Em seguida, experimente o ajuste do centro, ${c(12).name}: ${c(12).meaning.action}. Confira separadamente o efeito em cada área; um resultado favorável num setor não confirma automaticamente os demais.`
			};
	}
}

function positionText(
	card: Card,
	peer: Card | undefined,
	methodId: string,
	context: Binding
): string {
	const m = card.meaning,
		other = peer ? subject(peer) : '',
		application =
			context.key === 'relationships'
				? m.relationship
				: ['leadership', 'independent', 'study'].includes(context.key)
					? m.work
					: null;
	let text: string;
	switch (card.positionId) {
		case 'presence':
			text = `Como você ocupa espaço quando começa algo? ${card.name} propõe examinar essa entrada por ${m.core}. A área de presença trata do gesto que oferece contato: a iniciativa, o ritmo e a maneira de tornar sua posição perceptível.\n\nNo eixo oposto, ${other} fala das relações. Compare o que você afirma por conta própria com o que precisa ser combinado. A presença encontra um recurso em ${m.resource}; sua medida pode ser conferida pelo espaço que deixa para a outra parte responder.`;
			break;
		case 'resources':
			text = `Tempo, dinheiro, objetos e capacidades disponíveis entram nesta área. Com ${card.name}, o assunto ganha a dinâmica de ${m.core}. O recurso de ${m.resource} precisa caber no que existe, inclusive no esforço necessário para mantê-lo.\n\n${other}, na partilha, acrescenta a pergunta sobre compromissos com terceiros. Antes de destinar algo, confira a quem pertence, que uso já foi prometido e quem suporta o custo. A carta orienta essa observação; os números e acordos precisam vir da realidade.`;
			break;
		case 'exchange':
			text = `Uma conversa envolve o que se diz, o que se entende e o que circula depois. ${card.name} leva às trocas o movimento de ${m.core}. Aqui interessa reconhecer como uma informação chega, é verificada e ganha resposta.\n\nO eixo se completa com ${other}, nos horizontes. Uma conclusão ampla pode precisar de uma pergunta local mais precisa. Para melhorar essa passagem, considere ${m.action}. Observe se a conversa esclarece o assunto ou apenas repete uma interpretação conhecida.`;
			break;
		case 'roots':
			text = `Nesta área, a pergunta é o que oferece base para a vida fora das exigências públicas. ${card.name} aborda raízes por ${m.core}. Casa, pertencimento e apoio são possibilidades de observação; a carta não inventa uma história familiar.\n\nNa outra ponta está ${other}, em contribuição. Compare o que a participação pública pede com o que sua base consegue sustentar. ${cap(m.resource)} pode favorecer essa sustentação; já ${m.excess} pode indicar um custo que ficou concentrado onde poucas pessoas o veem.`;
			break;
		case 'creation':
			text = `Criar envolve dar forma a algo que ainda não tem resposta pronta. ${card.name} coloca nessa área ${m.core}. Pode ser um trabalho autoral, uma brincadeira ou uma experiência prazerosa; o tamanho real depende da situação que você escolher.\n\n${other}, nas redes, introduz a relação entre expressão própria e participação coletiva. Uma ideia não precisa representar todo o grupo para merecer um primeiro ensaio. O ajuste oferecido por esta carta é ${m.action}; confira se ele preserva espaço para experimentar sem transformar cada tentativa numa prova de valor.`;
			break;
		case 'routine':
			text = `O que se repete também consome recursos. Na rotina, ${card.name} trata de ${m.core}. A observação recai sobre tarefas, intervalos e formas de organizar o cotidiano, sem inferir condições de saúde.\n\n${other}, no recolhimento, mostra o outro lado desse eixo: a rotina precisa incluir o que restaura capacidade, e a pausa precisa encontrar lugar entre compromissos reais. Use ${m.resource} para examinar um hábito específico. Se o hábito só funciona ignorando cansaço, tempo ou responsabilidades, vale rever sua medida.`;
			break;
		case 'relationships':
			text = `A área das relações pergunta como duas partes participam de um vínculo. ${card.name} oferece o mecanismo de ${m.core}. ${cap(m.relationship)}. Essa formulação precisa ser comparada com acordos e respostas conhecidos.\n\n${other}, na presença, põe em relação a afirmação pessoal e a reciprocidade. Procure um ponto em que declarar seu limite torne o encontro mais claro. O conselho de ${m.action} só faz sentido se houver espaço para escutar a posição da outra pessoa.`;
			break;
		case 'sharing':
			text = `Partilhar muda a responsabilidade sobre um recurso. ${card.name} coloca em exame ${m.core}. Aqui entram obrigações assumidas em conjunto, confiança e critérios de acesso; intimidade ou boa intenção não dispensam clareza sobre esses termos.\n\nNo eixo de recursos, ${other} pergunta o que está disponível antes da divisão. Compare as duas áreas: uma coisa é possuir ou produzir, outra é definir quem decide e quem responde pelo uso. O recurso de ${m.resource} ajuda quando torna essa diferença mais compreensível.`;
			break;
		case 'horizons':
			text = `Uma experiência pode mudar a maneira de compreender outras. ${card.name}, nos horizontes, sugere investigar ${m.core}. Aprendizagem, viagens e revisão de valores são campos possíveis; nenhuma dessas experiências é anunciada como evento futuro.\n\n${other}, nas trocas, traz o eixo de volta à informação concreta. Antes de adotar uma conclusão ampla, procure a evidência que a sustenta e o caso que a desafia. ${cap(m.action)} pode ser uma forma de ampliar perspectiva sem abandonar o que já pode ser conferido.`;
			break;
		case 'contribution':
			text = `Contribuição é o encontro entre o que você oferece e uma responsabilidade reconhecível fora de você. ${card.name} aborda essa participação por ${m.core}. ${cap(m.work)}. A área não escolhe profissão nem promete reconhecimento.\n\n${other}, nas raízes, permite conferir o custo privado da presença pública. Compare a escala do compromisso com o apoio disponível para sustentá-lo. Uma participação útil precisa conseguir explicar tanto sua entrega quanto seus limites.`;
			break;
		case 'networks':
			text = `Num grupo, objetivos comuns convivem com diferenças de função e interesse. ${card.name} sugere olhar para ${m.core}. O recurso de ${m.resource} pode favorecer a participação quando existe uma tarefa ou um acordo que o grupo reconhece.\n\nO contraponto de ${other}, em criação, pergunta o que cada pessoa traz de próprio. Compare pertencimento com possibilidade de discordar. O excesso de ${m.excess} merece atenção se a participação coletiva começar a apagar iniciativa, autoria ou limite individual.`;
			break;
		case 'retreat':
			text = `Recolhimento é o espaço em que uma experiência pode ser assimilada antes de virar outra exigência. ${card.name} traz um tema para essa elaboração: ${m.core}. A área permite observar silêncio e descanso, sem inferir uma condição clínica ou uma vida oculta.\n\n${other}, na rotina, ajuda a verificar se esse espaço encontra lugar no cotidiano. Considere ${m.action}. Uma pausa útil muda a qualidade do retorno; se apenas adia o mesmo acúmulo sem alterar nenhuma condição, ainda falta ajustar a organização ao redor dela.`;
			break;
		case 'foundation':
			text = `O fundamento descreve o que pode sustentar a questão, mesmo quando não ocupa o primeiro plano. ${card.name} propõe investigar ${m.core}. Procure uma condição recorrente, um recurso ou uma premissa que ajude a entender por que a situação se mantém.\n\n${other}, na consciência, apresenta a maneira de compreender o tema. Compare a explicação que você costuma dar com o que precisa existir para a situação funcionar. A diferença entre fundamento e explicação pode revelar uma necessidade de ajuste: ${m.action}.`;
			break;
		case 'awareness':
			text = `Na posição de consciência, ${card.name} representa uma lente disponível para compreender a questão: ${m.core}. Uma lente ajuda a selecionar o que importa e também pode deixar uma parte do problema fora do campo.\n\nO contraponto é ${other}, no fundamento. Confira se sua explicação inclui as condições que sustentam a situação. ${cap(m.resource)} favorece uma compreensão mais útil quando admite revisão diante de algo que a explicação inicial não conseguiu abranger.`;
			break;
		case 'stance':
			text = `Sua postura é a parte da tiragem que pergunta como você responde à questão. ${card.name} propõe examinar ${m.core}. Isso não define sua personalidade; descreve uma maneira de agir que pode estar disponível nesta situação.\n\nAo lado de ${other}, no ambiente, essa postura precisa encontrar condições reais de participação. Considere ${m.action}. Compare o efeito que espera produzir com a resposta que recebe, sem atribuir a você o controle de tudo que acontece ao redor.`;
			break;
		case 'your-position':
			text = `Do seu lado do vínculo, ${card.name} propõe observar ${m.core}. ${cap(m.relationship)}. A posição ajuda a distinguir o que você traz para o encontro daquilo que espera que a outra pessoa traga.\n\n${other} representa uma hipótese sobre a outra perspectiva. Compare as duas lentes antes de concluir que uma diferença de resposta significa falta de interesse ou de cuidado. O ponto de conferência é o que cada parte consegue dizer e sustentar num acordo.`;
			break;
		case 'your-need':
			text = `O que precisa estar presente para você participar com mais clareza? ${card.name} organiza essa pergunta por ${m.core}. A necessidade pode encontrar um recurso em ${m.resource}, sem que a carta autorize exigir uma resposta específica de outra pessoa.\n\nA posição conversa com ${other}, na necessidade do outro. Uma conversa útil não tenta igualar as necessidades; procura condições em que ambas possam ser nomeadas. Considere ${m.action} e traduza a ideia num pedido que a outra parte tenha liberdade para discutir.`;
			break;
		case 'shared-theme':
			text = `O tema compartilhado é uma pergunta sobre a dinâmica entre vocês. Com ${card.name}, ela se organiza por ${m.core}. A carta não descreve duas pessoas por inteiro; seleciona um processo para observar na relação.\n\n${other}, na tensão compartilhada, chama atenção para ${peer!.meaning.excess}. Compare o que o tema permite construir com a dificuldade que pode limitar essa construção. Exemplos conhecidos dos dois lados são mais úteis aqui do que tentar adivinhar o que alguém ainda não disse.`;
			break;
		case 'central-theme':
			text = `${cap(m.action)}. Essa é uma maneira de dar aplicação ao tema de ${card.name}, sem exigir que uma única carta explique todos os aspectos da situação. ${application ? `${cap(application)}.` : `Considere o gesto em relação a ${context.subject}, observando o efeito que produz nas condições que você conhece.`}\n\nEscolha um episódio no qual esse gesto possa ser observado. A pergunta útil é o que muda quando você o pratica: fica mais fácil compreender, negociar ou agir? Se nada disso muda, o gesto pode precisar de outra medida ou a hipótese da leitura pode não corresponder à experiência.`;
			break;
		case 'challenge':
		case 'crossing':
		case 'opposition':
		case 'shared-tension':
			text = `Aqui, ${card.name} é lida pela dificuldade que pode criar: ${m.excess}. Sua posição não declara que isso já esteja acontecendo; indica o que vale conferir quando a situação perde margem.\n\n${peer ? `Diante de ${other}, o desafio é perceber se ${m.core} atende à questão ou a mantém presa ao mesmo funcionamento.` : `O risco nasce do mesmo mecanismo que poderia oferecer ajuda: ${m.core}.`} Uma dificuldade reconhecida com precisão permite escolher uma resposta menor e mais útil do que lutar contra um rótulo.`;
			break;
		case 'advice':
		case 'helpful-condition':
			text = `${cap(m.action)}. Nesta posição, ${card.name} propõe uma maneira de responder à dinâmica da tiragem. A ação precisa ter alcance compatível com os meios disponíveis e com a participação de quem será afetado.\n\n${peer ? `A referência para avaliar o conselho é ${other}: ${peer.meaning.core}. O conselho ajuda quando altera essa dinâmica de forma observável; perde utilidade se apenas produz uma sensação momentânea de solução.` : `O recurso que sustenta essa resposta é ${m.resource}.`} Confira especialmente ${context.criterion}.`;
			break;
		case 'near-development':
			text = `No desenvolvimento próximo, ${card.name} ajuda a examinar a primeira mudança de dinâmica: ${m.core}. A posição se refere ao que você pode observar numa etapa seguinte, antes de avaliar o rumo mais amplo da situação.\n\n${peer ? `A expectativa ou o receio de ${other} pode influenciar como essa mudança será percebida. Confira um sinal concreto do recurso de ${m.resource}, sem tomar a expectativa como prova de que ele estará disponível.` : `Procure um sinal concreto do recurso de ${m.resource}.`} Se aparecer ${m.excess}, reveja a resposta enquanto o processo ainda permite um ajuste. O primeiro movimento não determina sozinho a tendência final.`;
			break;
		case 'trend':
			text = `Se as condições descritas pelas outras cartas continuarem, ${card.name} permite explorar ${m.core}. Trata-se de uma direção possível, aberta a mudanças de conduta, informação e circunstância.\n\n${peer ? `${other} oferece uma condição para avaliar essa direção: ${peer.meaning.action}. Compare o que essa condição exige com o que já está disponível.` : `O recurso dessa direção é ${m.resource}.`} O sinal de excesso seria ${m.excess}; reconhecê-lo cedo ajuda a ajustar o percurso.`;
			break;
		case 'other-position':
			text = `${card.name} oferece uma hipótese para escutar a outra pessoa: ${m.core}. A posição permite preparar uma pergunta sobre como ela descreve o tema compartilhado. Essa hipótese não revela sentimentos ou intenções.\n\n${peer ? `Sua própria perspectiva aparece em ${other}. Antes de explicar a diferença entre vocês, pergunte como a outra pessoa reconhece o tema de ${theme(card)} na situação.` : `O recurso a investigar numa conversa é ${m.resource}.`} Escute a descrição que ela trouxer, inclusive se não corresponder à carta; só a resposta permite saber onde existe um acordo ou uma diferença real.`;
			break;
		case 'other-need':
			text = `Que condições tornam a participação possível para a outra pessoa? ${card.name} organiza essa pergunta por ${m.core}. O tema serve para abrir uma conversa; não permite concluir qual necessidade ela tem.\n\n${peer ? `${other} descreve sua necessidade. Ao apresentar o que você precisa, pergunte se o recurso de ${m.resource} teria utilidade para a outra parte e em que condições.` : `Investigue se ${m.resource} seria útil à outra parte.`} Uma resposta concreta permite reconhecer pedidos compatíveis, diferenças que pedem negociação ou um limite que ainda precisa ser respeitado.`;
			break;
		case 'past':
			text = `Nesta posição, ${card.name} convida a procurar antecedentes relacionados a ${m.core}. O método organiza a investigação do passado; não prova que um acontecimento específico tenha ocorrido.\n\nCompare uma situação que você conhece com o modo como responde hoje. ${peer ? `${other} descreve a questão atual por ${peer.meaning.core}; a diferença entre as duas cartas ajuda a separar um recurso aprendido de uma reação que continuou por hábito.` : `O recurso que pode ter sido aprendido é ${m.resource}.`}`;
			break;
		case 'hopes-fears':
			text = `${card.name} reúne expectativa e receio em torno de ${m.core}. Um mesmo tema pode atrair pelo recurso de ${m.resource} e preocupar pelo risco de ${m.excess}.\n\n${peer ? `Compare essa expectativa com ${other}. O que você deseja ou teme não pode ocupar o lugar de informação sobre ${peer.meaning.core}.` : 'Diferencie o que você deseja do que já foi observado.'} Nomear as duas possibilidades ajuda a reconhecer qual delas está influenciando a escolha.`;
			break;
		case 'environment':
			text = `O ambiente é examinado por ${card.name}: ${m.core}. A posição fala das condições a observar ao redor da questão, sem atribuir uma intenção oculta a colegas, familiares ou parceiros.\n\n${peer ? `${other} descreve sua postura. A relação entre essas cartas pede conferir onde sua resposta encontra apoio e onde depende de acordo com outras pessoas.` : `Procure condições concretas para que ${m.resource} esteja disponível.`} Prazos, pedidos, respostas e limites conhecidos oferecem uma base melhor do que supor que todos enxergam a situação da mesma maneira.`;
			break;
		case 'synthesis':
		case 'center':
			text = `${card.name} integra a tiragem pelo movimento de ${m.core}. O centro não substitui as outras posições: sua função é permitir que apoio, dificuldade e possibilidades de resposta caibam numa mesma leitura.\n\n${peer ? `${other} torna essa integração concreta. Em relação a ${peer.meaning.core}, o centro pede ${m.action}.` : `A integração encontra um recurso em ${m.resource}.`} ${methodId === 'tarot-astrological-mandala' ? 'Escolha duas áreas que interferem uma na outra e compare suas exigências. As áreas são simbólicas; não representam casas calculadas de um mapa natal.' : `Para ${context.subject}, confira o que a síntese exige que você mantenha e o que pede rever.`}`;
			break;
		case 'support':
			text = `O apoio indicado por ${card.name} está em ${m.resource}. Esse recurso precisa de uma condição para funcionar: ${m.action}. A carta ocupa o lugar de algo que pode ajudar, sem prometer que a ajuda já esteja disponível.\n\n${peer ? `Na relação com ${other}, observe se o apoio responde ao risco de ${peer.meaning.excess}. Usado sem essa comparação, o mesmo recurso pode crescer além da medida e tornar-se ${m.excess}.` : `O limite desse apoio aparece em ${m.excess}.`}`;
			break;
		default:
			text = `${card.name} aborda ${card.positionName.toLowerCase()} por ${m.core}. ${application ? `${cap(application)}.` : `O recurso desse movimento é ${m.resource}.`}\n\n${peer ? `A posição conversa com ${other}, que traz ${peer.meaning.core}. Compare como a primeira dinâmica modifica as condições da segunda: o ajuste sugerido por ${card.name} é ${m.action}.` : `Para observar a diferença entre recurso e excesso, procure quando surge ${m.excess}. A carta fica mais precisa quando você consegue localizar essa passagem num episódio concreto.`}`;
	}
	return text;
}

export function composeReconstructedTarot(
	input: WorkflowInput,
	calculation: CalculationSnapshot
): TrialReading {
	const { method, cards, context, contextIds } = normalize(input, calculation),
		allIds = cards.map((c) => c.factId);
	const sections: TrialReading['sections'] = [],
		plan: EditorialTrace['plan'] = [];
	const add = (title: string, text: string, factIds: string[], role: string) => {
		const ids = unique(factIds);
		sections.push({ title, text, factIds: ids });
		plan.push({ title, factIds: ids, role });
	};
	add(
		'O fio desta tiragem',
		openingSynthesis(method.id, cards, context),
		[...allIds, ...contextIds],
		'joint-synthesis'
	);
	const peerIndex = (i: number) => {
		if (cards.length === 1) return -1;
		if (cards.length === 13)
			return i === 12
				? context.key === 'relationships'
					? 6
					: context.key === 'leadership'
						? 9
						: context.key === 'independent'
							? 1
							: 0
				: (i + 6) % 12;
		if (cards.length === 3) return i === 2 ? 1 : i === 0 ? 1 : 0;
		if (cards.length === 5) return i === 0 ? 1 : i === 1 ? 0 : i === 2 ? 1 : 2;
		if (cards.length === 7) return [5, 3, 4, 1, 2, 0, 5][i]!;
		return [1, 0, 4, 0, 2, 8, 7, 6, 9, 5][i]!;
	};
	cards.forEach((card, i) => {
		const peer = cards[peerIndex(i)];
		add(
			`${card.position}. ${card.positionName} — ${card.name}`,
			positionText(card, peer, method.id, context),
			[card.factId, ...(peer ? [peer.factId] : [])],
			'position'
		);
	});
	if (cards.length === 1)
		add(
			'Recurso e ponto de excesso',
			`Em ${cards[0]!.name}, o recurso de ${cards[0]!.meaning.resource} e o risco de ${cards[0]!.meaning.excess} pertencem à mesma imagem. A diferença se mostra pelo efeito que produzem, pelo custo e pela margem que deixam para uma resposta diferente.\n\nUma forma de investigar essa medida é ${cards[0]!.meaning.action}. Antes de ampliar o gesto, observe se ele torna a situação mais compreensível e se respeita as condições que você conhece.`,
			allIds,
			'resource-excess'
		);
	const anchor =
		cards.find((c) => ['advice', 'helpful-condition', 'center'].includes(c.positionId)) ??
		cards[0]!;
	add(
		context.title,
		`${context.example}\n\nNesta aplicação, ${anchor.name}, em ${anchor.positionName.toLowerCase()}, orienta a atenção para ${anchor.meaning.core}. O critério de conferência é ${context.criterion}. Separe uma observação que sustentaria essa leitura de uma observação que faria você modificá-la; ambas precisam poder existir fora do texto das cartas.`,
		unique([anchor.factId, ...contextIds]),
		'context-application'
	);
	if (cards.length > 1) {
		const a = cards[0]!,
			b = cards[peerIndex(0)]!;
		add(
			'Como conferir a leitura conjunta',
			`Compare duas exigências desta consulta: a de ${a.name}, em ${a.positionName.toLowerCase()}, e a de ${b.name}, em ${b.positionName.toLowerCase()}. A primeira disponibiliza ${a.meaning.resource}; a segunda torna relevante ${b.meaning.action}.\n\nProcure uma resposta que conserve o que a primeira oferece e inclua o ajuste pedido pela segunda. Se a resposta só funciona ignorando uma das posições, a integração ainda está incompleta. ${context.experiment}`,
			[a.factId, b.factId, anchor.factId, ...contextIds],
			'joint-test'
		);
	}
	const patterns: EditorialTrace['patterns'] = [];
	for (const s of Object.keys(suiteMeaning)) {
		const group = cards.filter((c) => suite(c) === s);
		if (group.length > 1)
			patterns.push({ kind: `shared-function:${s}`, factIds: group.map((c) => c.factId) });
	}
	patterns.push({ kind: `method-roles:${method.id}`, factIds: allIds });
	const applied = application(method.id, cards, context);
	return {
		version: RECONSTRUCTION_VERSION,
		productId: method.id,
		title: method.name,
		opening: `${method.description} ${input.focus || input.context ? `Nesta consulta, a aplicação considera ${context.subject} e dá prioridade a ${context.criterion}.` : 'Sem um foco informado, a leitura segue a função de cada posição; você pode escolher depois uma situação concreta para observá-la.'}`,
		source:
			'Esta leitura combina os significados das cartas com a função de cada posição, a partir dos Livros 19 e 20 do acervo ATVNA. Usa o baralho Rider–Waite–Smith, com Força VIII e Justiça XI.' +
			(input.productId === 'tarot-peladan-cross'
				? ' A Cruz Péladan usa uma adaptação com cinco cartas distintas. Na variante histórica descrita por Wirth, a quinta carta é calculada a partir das quatro primeiras.'
				: ''),
		sections,
		questions: applied.questions,
		practice: applied.practice,
		limits: [...calculation.limits],
		editorial: {
			version: RECONSTRUCTION_VERSION,
			canon: TAROT_CANON_VERSION,
			graph: 'atv-tarot-position-fact-graph/1.0.0',
			selection: cards.map((c) => ({
				factId: c.factId,
				score: c === anchor ? 10 : 5,
				reason: c === anchor ? 'method-integration-and-application' : 'named-method-position'
			})),
			patterns,
			themes: [
				{ id: 'method-integration', factIds: allIds },
				{ id: 'focus-application', factIds: unique([anchor.factId, ...contextIds]) }
			],
			context: { key: context.key, factId: contextIds[0] ?? null },
			plan
		}
	};
}

export function reviewReconstructedTarot(
	input: WorkflowInput,
	calculation: CalculationSnapshot,
	reading: TrialReading
): string[] {
	const failures: string[] = [];
	let normalized: ReturnType<typeof normalize>;
	try {
		normalized = normalize(input, calculation);
	} catch {
		return ['invalid-tarot-contract'];
	}
	const { cards, context } = normalized;
	if (
		reading.sections.length < cards.length + 3 ||
		reading.sections.some((s) => s.text.length < 220)
	)
		failures.push('incomplete-reading');
	if (
		reading.editorial?.canon !== TAROT_CANON_VERSION ||
		reading.editorial.context.key !== context.key ||
		reading.editorial.plan.length !== reading.sections.length
	)
		failures.push('missing-trace');
	const positions = reading.sections.filter((s) => /^\d+\. /.test(s.title));
	if (
		positions.length !== cards.length ||
		positions.some(
			(s, i) => !s.factIds.includes(cards[i]!.factId) || !s.title.includes(cards[i]!.positionName)
		)
	)
		failures.push('position-coverage');
	if (cards.some((c) => !reading.sections[0]!.factIds.includes(c.factId)))
		failures.push('non-integrated-synthesis');
	const text = [reading.opening, ...reading.sections.map((s) => s.text), reading.practice].join(
		'\n'
	);
	if (
		/sua jornada|universo conspira|com certeza acontecerá|destino inevitável|vai te trair|ele sente|ela sente|alma gêmea|diagnóstico|contrato kármico/i.test(
			text
		)
	)
		failures.push('voice-or-claim');
	const openings = positions.map((s) => s.text.slice(0, 90));
	if (new Set(openings).size !== openings.length) failures.push('repeated-position-opening');
	const sentences = [...reading.sections.map((s) => s.text), reading.practice].flatMap((s) =>
		s
			.split(/(?<=[.!?])\s+/)
			.map((v) => v.trim())
			.filter((v) => v.length > 40)
	);
	if (new Set(sentences).size !== sentences.length) failures.push('repeated-sentence');
	if (input.productId === 'tarot-astrological-mandala' && !/áreas são simbólicas/.test(text))
		failures.push('mandala-scope');
	if (
		input.productId === 'tarot-aphrodite-temple' &&
		!/não revela sentimentos ou intenções/.test(text)
	)
		failures.push('third-party-scope');
	return failures;
}
