import { customerProduct } from '../data/product-copy';
import { productDetails } from '../data/product-details';
import { freeToolById, freeTools } from '../data/free-tools';
import { interestNavigation } from '../data/public-navigation';

/** Only categorical state is retained. Never put a message, name or birth data here. */
export interface ConsultationState {
	step: 'menu' | 'topic' | 'question' | 'prosper' | 'choice' | 'closed';
	choices?: string[];
}

/** A current server-side offer snapshot, supplied by the commerce owner, never by the customer. */
export interface ConsultationOffer {
	productId: string;
	href: string;
	available: boolean;
	checkoutAvailable: boolean;
	priceText: string;
	timingText: string;
	deliveryText: string;
	acceptsConversationQuestion?: boolean;
}

export interface ConsultationProduct {
	id: string;
	name: string;
	href: string;
	topicId: string;
	scope: string;
	input: string;
}

export interface ConsultationCatalogue {
	origin: string;
	freeToolIds: readonly string[];
	products: readonly (ConsultationProduct & ConsultationOffer)[];
}

export interface ConsultationReply {
	reply: string;
	state: ConsultationState;
	intent: string;
	productId?: string;
	destination?: string;
}

const publicOrigin = 'https://atuavidanosastros.com.br';
const footer = '\n\nVocê pode escrever menu, corrigir ou sair.';
const topics = interestNavigation.map(({ id, label }) => ({ id, label }));
const universeTopic: Record<string, string> = {
	'meu-ceu': 'meu-ceu',
	'ciclos-tempo': 'ciclos',
	'amor-relacoes': 'amor',
	'proposito-prosperidade': 'proposito',
	'tarot-arcanos': 'tarot',
	'sonhos-simbolos': 'sonhos',
	global: 'ciclos'
};

/** P02 may register new IDs from its canonical catalog without activating an offer here. */
export function createConsultationCatalogue({
	verifiedFreeToolIds = [],
	offers = [],
	registeredProducts = [],
	origin = publicOrigin
}: {
	verifiedFreeToolIds?: readonly string[];
	offers?: readonly ConsultationOffer[];
	registeredProducts?: readonly ConsultationProduct[];
	origin?: string;
} = {}): ConsultationCatalogue {
	// A provider message cannot introduce another origin, a query payload or an external checkout.
	if (origin !== publicOrigin) throw new Error('Consultation origin must be canonical');
	const products: ConsultationCatalogue['products'][number][] = [];
	for (const offer of offers) {
		if (!offer.available || !offer.checkoutAvailable) continue;
		const product = customerProduct(offer.productId);
		const detail = productDetails[offer.productId as keyof typeof productDetails];
		const registered = registeredProducts.find((item) => item.id === offer.productId);
		const definition =
			product && detail
				? {
						id: product.id,
						name: product.name,
						href: product.id === 'atv-plus' ? '/atv-mais' : product.href,
						topicId: universeTopic[product.universe],
						scope: detail.scope,
						input: detail.input
					}
				: registered;
		if (
			!definition ||
			!definition.name ||
			definition.name.length > 160 ||
			!definition.scope ||
			definition.scope.length > 700 ||
			!definition.input ||
			definition.input.length > 500 ||
			!/^[a-z0-9-]{1,100}$/.test(definition.id) ||
			!topics.some(({ id }) => id === definition.topicId) ||
			!/^\/produtos\/[a-z0-9]+(?:-[a-z0-9]+)*$|^\/atv-mais$/.test(definition.href) ||
			offer.href !== definition.href ||
			![offer.priceText, offer.timingText, offer.deliveryText].every(
				(value) => typeof value === 'string' && value.trim().length > 0 && value.length <= 500
			)
		)
			continue;
		if (!products.some(({ id }) => id === definition.id))
			products.push({ ...definition, ...offer });
	}
	return {
		origin,
		freeToolIds: [...new Set(verifiedFreeToolIds)].filter(
			(id) => freeToolById(id)?.id === id && freeToolById(id)?.availability === 'available'
		),
		products
	};
}

const normalize = (text: string) =>
	text
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9+ ]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();

function answer(
	reply: string,
	step: ConsultationState['step'],
	intent: string,
	choices?: string[]
): ConsultationReply {
	return { reply, state: { step, ...(choices?.length ? { choices } : {}) }, intent };
}

function menu() {
	return answer(
		'Oi! Sou a assistente virtual da ATVNA. A orientação inicial é gratuita e a compra é opcional. Você quer conhecer nossos produtos digitais ou fazer uma consulta sobre um assunto específico?\n\n1. Ver produtos digitais\n2. Fazer uma consulta\n\nPode também me contar sua dúvida em poucas palavras. Não envie dados de nascimento por aqui. Para encerrar, escreva sair.',
		'menu',
		'menu'
	);
}

function askTopic() {
	return answer(
		`Qual assunto você quer explorar?\n\n${topics.map((topic, i) => `${i + 1}. ${topic.label}`).join('\n')}${footer}`,
		'topic',
		'browse'
	);
}

function askQuestion() {
	return answer(
		'O que você gostaria de saber? Me conte em poucas palavras e eu vejo se temos uma leitura que pode ajudar e o que ela cobre. Não envie dados de nascimento por aqui.' +
			footer,
		'question',
		'question'
	);
}

function unavailable(intent: string, explanation?: string) {
	return answer(
		`${explanation ?? 'Não encontrei uma leitura disponível que cubra esse pedido com segurança.'} Posso ajudar você a explorar outro assunto: escreva produtos para ver os temas, corrigir para explicar melhor ou sair para encerrar.`,
		'question',
		intent
	);
}

function toolReply(id: string, catalogue: ConsultationCatalogue, intent: string, partial?: string) {
	const tool = freeToolById(id);
	if (!tool || !catalogue.freeToolIds.includes(tool.id)) return unavailable(intent);
	const destination = catalogue.origin + tool.href;
	return {
		...answer(
			`${partial ? `${partial}\n\n` : ''}${tool.label} — grátis. ${tool.description}\nDados pedidos na ferramenta: ${tool.requirements}\nVocê vê o resultado na própria ferramenta.\n${destination}${footer}`,
			'choice',
			intent,
			[`free-${tool.id}`]
		),
		destination
	};
}

function productReply(
	id: string,
	catalogue: ConsultationCatalogue,
	intent: string,
	reason: string
) {
	const product = catalogue.products.find((item) => item.id === id);
	if (!product)
		return unavailable(
			intent,
			'A leitura que corresponde a esse objetivo não está disponível para compra agora.'
		);
	const destination = catalogue.origin + product.href;
	return {
		...answer(
			`${reason}\n\n${product.name}. ${product.scope}\nDados pedidos na ficha: ${product.input}\nPreço: ${product.priceText}\nPrazo: ${product.timingText}\nEntrega: ${product.deliveryText}\nO preço final e qualquer benefício de membro são confirmados pela ficha e pelo checkout da sua conta. A compra é opcional. Os dados e o pagamento seguem pelo site; esta conversa não é enviada automaticamente para a leitura.\nVer ficha: ${destination}${footer}`,
			'choice',
			intent,
			[id]
		),
		productId: id,
		destination
	};
}

function browseTopic(topicId: string, catalogue: ConsultationCatalogue) {
	const topic = topics.find(({ id }) => id === topicId);
	if (!topic) return askTopic();
	const tools = freeTools.filter(
		(tool) => tool.topicId === topicId && catalogue.freeToolIds.includes(tool.id)
	);
	const products = catalogue.products
		.filter((product) => product.topicId === topicId)
		.slice(0, 10 - tools.length);
	const choices = [...tools.map((tool) => `free-${tool.id}`), ...products.map(({ id }) => id)];
	if (!choices.length)
		return unavailable(
			'browse-empty',
			`Não há uma ferramenta ou leitura disponível de ${topic.label.toLowerCase()} para indicar agora.`
		);
	return answer(
		`${topic.label}: estas são as opções disponíveis. Escolha o número para conhecer o alcance e os dados necessários.\n\n${[
			...tools.map((tool) => `${tool.label} — grátis. ${tool.description}`),
			...products.map(
				(product) =>
					`${product.name}. ${product.scope.length > 180 ? `${product.scope.slice(0, 177)}…` : product.scope}`
			)
		]
			.map((label, i) => `${i + 1}. ${label}`)
			.join('\n')}${footer}`,
		'choice',
		'browse-topic',
		choices
	);
}

function identifyTopic(text: string) {
	if (/amor|relacionamento|casal|parceir|namor|sinastria/.test(text)) return 'amor';
	if (/dinheiro|carreira|trabalho|prosper|profission|talento/.test(text)) return 'proposito';
	if (/tarot|carta|arcano/.test(text)) return 'tarot';
	if (/sonho|sonhei/.test(text)) return 'sonhos';
	if (/previs|semana|horoscopo|ciclo/.test(text)) return 'ciclos';
	if (/mapa|ascendente|sol|lua|ceu|astrolog/.test(text)) return 'meu-ceu';
	return undefined;
}

/** Call with a newly resolved catalogue on each inbound message; stale state never authorizes a link. */
export function replyToConsultation({
	text,
	state,
	catalogue
}: {
	text: string;
	state?: ConsultationState | null;
	catalogue: ConsultationCatalogue;
}): ConsultationReply {
	if (typeof text !== 'string' || text.length > 2000) return askQuestion();
	const value = normalize(text);
	if (/^(sair|encerrar|tchau|parar|cancelar|nao quero|obrigad[oa])$/.test(value))
		return answer(
			'Conversa encerrada. Quando quiser, escreva menu para começar de novo.',
			'closed',
			'exit'
		);
	if (
		/^(menu|inicio|voltar|reiniciar|recomecar|comecar de novo|oi|ola|bom dia|boa tarde|boa noite)$/.test(
			value
		) ||
		value === 'ola quero conhecer a assistente virtual da atvna' ||
		!value
	)
		return menu();
	if (/^(corrigir|nao era isso|outra coisa|mudar|mudar indicacao)$/.test(value))
		return askQuestion();
	if (state?.step === 'closed') return menu();
	if (
		/^(ver produtos digitais|produtos digitais|produtos|catalogo|conhecer produtos)$/.test(value) ||
		(state?.step === 'menu' && value === '1')
	)
		return askTopic();
	if (
		/^(fazer uma consulta|consulta|consultar)$/.test(value) ||
		(state?.step === 'menu' && value === '2')
	)
		return askQuestion();
	if (state?.step === 'choice') {
		const numeric = /^\d{1,2}$/.test(value) ? Number(value) - 1 : -1;
		const choice =
			state.choices?.[numeric] ??
			(/^(ver ficha|abrir ficha|ver ferramenta|abrir)$/.test(value) && state.choices?.length === 1
				? state.choices[0]
				: undefined);
		if (choice) {
			if (choice.startsWith('free-')) return toolReply(choice.slice(5), catalogue, 'selected-tool');
			return productReply(
				choice,
				catalogue,
				'selected-product',
				'Você escolheu conhecer esta leitura.'
			);
		}
	}
	if (state?.step === 'topic') {
		const topic = /^\d$/.test(value) ? topics[Number(value) - 1]?.id : identifyTopic(value);
		return topic ? browseTopic(topic, catalogue) : askTopic();
	}
	if (/produtos|conhecer|explorar|opcoes/.test(value)) {
		const topic = identifyTopic(value);
		if (topic) return browseTopic(topic, catalogue);
	}
	if (/ascendente/.test(value) && !/estilo|roupa|vestir/.test(value))
		return toolReply('ascendente', catalogue, 'ascendant');
	if (/meio do ceu/.test(value)) return toolReply('meio-do-ceu', catalogue, 'midheaven');
	if (/arcano pessoal/.test(value))
		return toolReply('arcano-pessoal', catalogue, 'personal-arcana');
	if (/carta do dia/.test(value)) return toolReply('carta-do-dia', catalogue, 'daily-card');
	if (/carta do amor/.test(value)) return toolReply('carta-do-amor', catalogue, 'love-card');
	if (
		/quando (vou|irei) (me )?casar|quando (vai|sera) (o )?meu casamento|em que (dia|data) (vou|irei) (me )?casar/.test(
			value
		)
	)
		return unavailable(
			'marriage-prediction',
			'A comparação de datas não prevê quando você vai se casar. Não temos uma leitura disponível que determine a data de um casamento futuro.'
		);
	if (
		/casamento|cerimonia|casar/.test(value) &&
		/duas datas|tres datas|comparar|comparacao|opcoes|entre.*datas/.test(value)
	)
		return productReply(
			'wedding-date-map',
			catalogue,
			'wedding-options',
			'Esta análise compara duas ou três datas reais da cerimônia, com horário e cidade; não descobre uma data de casamento futuro.'
		);
	if (
		/toda semana|semanalmente|regularmente|recorrent|assinatura|atv\+|atv mais|receber.*previs|recebe.*semana/.test(
			value
		)
	)
		return productReply(
			'atv-plus',
			catalogue,
			'recurring-forecast',
			'Para acompanhar previsões futuras com regularidade, conheça o ATV+. Os envios seguem a programação do plano, não uma consulta avulsa.'
		);
	if (/semana|horoscopo semanal/.test(value))
		return productReply(
			'week-reading',
			catalogue,
			'single-week',
			'Para olhar uma semana específica, esta é uma leitura avulsa; não ativa envios recorrentes.'
		);
	if (/sinastria|mapa.*(parceir|casal|namor)|nosso.*mapa|comparar.*mapa/.test(value)) {
		if (/gratis|gratuit|inicial|primeira/.test(value))
			return toolReply('combinacao-do-casal', catalogue, 'couple-free');
		if (catalogue.products.some(({ id }) => id === 'synastry'))
			return productReply(
				'synastry',
				catalogue,
				'synastry',
				'Para comparar os dois mapas e explorar afinidades e diferenças da relação, a Análise Astral do Casal corresponde ao seu pedido.'
			);
		return toolReply(
			'combinacao-do-casal',
			catalogue,
			'synastry-unavailable',
			'A Análise Astral do Casal não está disponível para compra agora. Como alternativa parcial, a ferramenta gratuita faz uma primeira exploração de afinidades; ela não substitui a leitura completa.'
		);
	}
	if (/cobrar|cobro|receber pelo|preco do meu|bloqueio.*dinheiro|bloqueio.*financ/.test(value))
		return productReply(
			'financial-blocks-tarot',
			catalogue,
			'charging-impasse',
			'Esta tiragem explora um impasse concreto ao cobrar ou receber e um primeiro passo; não promete renda ou resultado financeiro.'
		);
	if (/favor|talento|habilidade|oferecer.*servico|faco de graca/.test(value))
		return productReply(
			'hidden-talent-map',
			catalogue,
			'hidden-talent',
			'Esta leitura parte de habilidades reconhecíveis nos favores que você já faz para pensar numa primeira oferta experimental, sem prometer renda.'
		);
	if (
		/mapa.*(dinheiro|carreira|trabalho)|natal.*(carreira|dinheiro)|carreira.*mapa|dinheiro.*mapa/.test(
			value
		) ||
		(state?.step === 'prosper' && /^(1|mapa natal|meu mapa|carreira)$/.test(value))
	) {
		if (/gratis|gratuit|calcular|posicao/.test(value))
			return toolReply('dinheiro-no-mapa', catalogue, 'money-free');
		return productReply(
			'purpose-career',
			catalogue,
			'natal-career',
			'Para entender sua relação com recursos, trabalho e carreira a partir do nascimento, esta leitura trata do mapa natal, sem prometer renda ou emprego.'
		);
	}
	if (state?.step === 'prosper' && value === '2')
		return productReply(
			'financial-blocks-tarot',
			catalogue,
			'charging-impasse',
			'Esta tiragem explora um impasse concreto ao cobrar ou receber e um primeiro passo; não promete renda.'
		);
	if (state?.step === 'prosper' && value === '3')
		return productReply(
			'hidden-talent-map',
			catalogue,
			'hidden-talent',
			'Esta leitura explora habilidades que já aparecem nos favores que você faz e uma primeira oferta experimental.'
		);
	if (/prosper|dinheiro|carreira|trabalho/.test(value))
		return answer(
			'O que você quer explorar?\n\n1. O que meu mapa natal mostra sobre dinheiro e carreira\n2. Uma dificuldade concreta para cobrar pelo que já faço\n3. Algo que faço de graça e poderia começar a oferecer\n\nSe for outra coisa, me conte em poucas palavras.' +
				footer,
			'prosper',
			'prosper-clarification'
		);
	if (/tarot/.test(value) && /situacao|desafio|conselho|tres cartas|3 cartas/.test(value))
		return productReply(
			'tarot-situation-challenge-advice',
			catalogue,
			'tarot-three',
			'As três posições exploram Situação, Desafio e Conselho. O método não exige uma pergunta e esta conversa não personaliza automaticamente a leitura.'
		);
	if (/mapa astral|meu mapa/.test(value) && /gratis|gratuit|calcular|posico/.test(value))
		return toolReply('mapa-astral', catalogue, 'birth-chart-free');
	if (/registrar.*sonho|anotar.*sonho/.test(value))
		return toolReply('registro-de-sonho', catalogue, 'dream-log');
	const topic = identifyTopic(value);
	if (topic && /^(amor|relacionamentos|tarot|sonhos|mapa astral|previsoes)$/.test(value))
		return browseTopic(topic, catalogue);
	return unavailable('no-coverage');
}
