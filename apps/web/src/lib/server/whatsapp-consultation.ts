import { atvPlusCommercialPlans, offeredProductIds } from '@atv/domain';
import { customerProduct } from '../data/product-copy';
import { productDetails } from '../data/product-details';
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
	commercialType: 'paid';
	currency: 'BRL';
	/** All authorized offer totals, in minor currency units; no price is inferred from prose. */
	paidPricesMinor: readonly number[];
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
// Commercial ATV+ has a scheduled service; the legacy 30-day evaluation is not its offer.
const atvPlusDetail = {
	scope:
		atvPlusCommercialPlans
			.map((plan) =>
				[
					`${plan.name}: ${plan.description}`,
					...plan.benefits.filter((benefit) => benefit.includes('de presente'))
				].join(' ')
			)
			.join(' ') +
		' Vigências de 3, 6 ou 12 meses, com pagamento único e renovação por nova contratação. Próxima Revolução Solar após contratação e cadastro, inclusive no trimestral com aniversário após a vigência. Previsões programadas conforme o plano, em PDF pelo WhatsApp. Sem consultas individuais, perguntas ao leitor ou grupos.',
	input:
		'No site: sua conta, plano e duração; data, hora e cidade de nascimento; cidade para a próxima Revolução Solar; confirmação dos dados e do WhatsApp, com consentimento de envio. Não envie esses dados nesta conversa.'
};

function isPaidOffer(offer: ConsultationOffer) {
	return (
		offer.available === true &&
		offer.checkoutAvailable === true &&
		offer.commercialType === 'paid' &&
		offer.currency === 'BRL' &&
		Array.isArray(offer.paidPricesMinor) &&
		offer.paidPricesMinor.length > 0 &&
		offer.paidPricesMinor.every(
			(total) => Number.isSafeInteger(total) && total > 0 && total <= 2_147_483_647
		)
	);
}

/** Canonical metadata alone never activates a product; a current paid offer is also required. */
export function createConsultationCatalogue({
	offers = [],
	registeredProducts = [],
	origin = publicOrigin
}: {
	offers?: readonly ConsultationOffer[];
	registeredProducts?: readonly ConsultationProduct[];
	origin?: string;
} = {}): ConsultationCatalogue {
	// A provider message cannot introduce another origin, a query payload or an external checkout.
	if (origin !== publicOrigin) throw new Error('Consultation origin must be canonical');
	const products: ConsultationCatalogue['products'][number][] = [];
	for (const offer of offers) {
		if (!isPaidOffer(offer)) continue;
		const product = customerProduct(offer.productId);
		// Historical definitions outside the public commercial catalog cannot become sales offers.
		if (product && product.id !== 'atv-plus' && !offeredProductIds.some((id) => id === product.id))
			continue;
		const detail =
			offer.productId === 'atv-plus'
				? atvPlusDetail
				: productDetails[offer.productId as keyof typeof productDetails];
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
	return { origin, products };
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
		'Oi! Sou a assistente virtual de vendas da ATVNA. Ajudo você a conhecer nossos produtos digitais pagos e escolher uma leitura para o assunto que deseja explorar. Você quer ver os produtos ou contar sua dúvida?\n\n1. Ver produtos digitais\n2. Fazer uma consulta\n\nPode também me contar sua dúvida em poucas palavras. Não envie dados de nascimento por aqui. Para encerrar, escreva sair.',
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
		`${explanation ?? 'Não encontrei um produto digital pago disponível que cubra esse pedido com segurança.'} Posso ajudar você a explorar outro assunto: escreva produtos para ver os temas, corrigir para explicar melhor ou sair para encerrar.`,
		'question',
		intent
	);
}

function productReply(
	id: string,
	catalogue: ConsultationCatalogue,
	intent: string,
	reason: string
) {
	const product = catalogue.products.find((item) => item.id === id && isPaidOffer(item));
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
	const products = catalogue.products
		.filter((product) => product.topicId === topicId && isPaidOffer(product))
		.slice(0, 10);
	const choices = products.map(({ id }) => id);
	if (!choices.length)
		return unavailable(
			'browse-empty',
			`Não há um produto digital pago disponível de ${topic.label.toLowerCase()} para indicar agora.`
		);
	return answer(
		`${topic.label}: estes são os produtos digitais pagos disponíveis. Escolha o número para conhecer o alcance e os dados necessários.\n\n${products
			.map(
				(product) =>
					`${product.name}. ${product.scope.length > 180 ? `${product.scope.slice(0, 177)}…` : product.scope}`
			)
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
			(/^(ver ficha|abrir ficha|abrir)$/.test(value) && state.choices?.length === 1
				? state.choices[0]
				: undefined);
		if (choice) {
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
		return productReply(
			'birth-chart',
			catalogue,
			'ascendant',
			'O Mapa Astral Completo inclui o Ascendente em uma leitura integrada do mapa natal. É um produto digital pago; a ficha mostra o alcance completo antes da compra.'
		);
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
	if (/sinastria|mapa.*(parceir|casal|namor)|nosso.*mapa|comparar.*mapa/.test(value))
		return productReply(
			'synastry',
			catalogue,
			'synastry',
			'Para comparar os dois mapas e explorar afinidades e diferenças da relação, a Análise Astral do Casal corresponde ao seu pedido.'
		);
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
	const topic = identifyTopic(value);
	if (topic && /^(amor|relacionamentos|tarot|sonhos|mapa astral|previsoes)$/.test(value))
		return browseTopic(topic, catalogue);
	return unavailable('no-coverage');
}
