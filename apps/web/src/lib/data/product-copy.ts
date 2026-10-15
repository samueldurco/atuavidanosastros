import { offeredProductIds, productCatalog, tarotMethods } from '@atv/domain';

/** Customer language. IDs, publication state and delivery rights stay in the domain catalog. */
export const productCopy = {
	...Object.fromEntries(
		tarotMethods.map((method) => [
			method.id,
			{ summary: method.description, action: `Consultar ${method.name}` }
		])
	),
	'birth-chart': {
		summary:
			'Conheça os planetas, as casas e os aspectos do seu mapa, com uma leitura integrada sobre você.',
		action: 'Conhecer meu mapa completo'
	},
	'three-pillars': {
		summary: 'Entenda o que Sol, Lua e Ascendente mostram no seu mapa.',
		action: 'Conhecer meu Sol, Lua e Ascendente'
	},
	ascendant: {
		summary: 'Descubra seu Ascendente e sua forma de se apresentar ao mundo.',
		action: 'Descobrir meu Ascendente'
	},
	'life-atlas': {
		summary: 'Aprofunde a leitura do seu mapa em quatro assuntos que você escolher.',
		action: 'Escolher os temas do meu mapa'
	},
	horoscope: {
		summary: 'Veja as previsões astrológicas para o período escolhido.',
		action: 'Ver meu horóscopo'
	},
	'date-reading': {
		summary:
			'Veja os trânsitos do seu mapa para uma data importante e relacione a leitura ao seu momento.',
		action: 'Consultar uma data especial'
	},
	'week-reading': {
		summary: 'Veja os principais trânsitos da sua semana e os dias em destaque.',
		action: 'Ver previsões da semana'
	},
	'personal-calendar': {
		summary: 'Acompanhe os trânsitos do seu mapa nos 30 dias seguintes à geração da leitura.',
		action: 'Criar meu calendário'
	},
	'solar-return': {
		summary: 'Conheça os temas do seu ano entre um aniversário e o seguinte.',
		action: 'Ver meu ano astrológico'
	},
	synastry: {
		summary: 'Compare dois mapas e entenda afinidades, diferenças e desafios da relação.',
		action: 'Comparar nossos mapas'
	},
	'pair-preview': {
		summary: 'Comece pela combinação do Sol, da Lua e do Ascendente de vocês.',
		action: 'Ver nossa combinação'
	},
	'couple-dossier': {
		summary: 'Aprofunde a comparação dos mapas com o que vocês contam sobre a relação.',
		action: 'Conhecer a leitura do casal'
	},
	'daily-card': {
		summary: 'Tire uma carta de Tarot e leia sua interpretação para a pergunta do dia.',
		action: 'Tirar minha carta do dia'
	},
	'tarot-yes-no': {
		summary: 'Faça uma pergunta de sim ou não e veja como interpretar a carta tirada.',
		action: 'Fazer minha pergunta ao Tarot'
	},
	'three-questions': {
		summary: 'Traga três perguntas e receba uma leitura de Tarot para cada uma.',
		action: 'Fazer três perguntas'
	},
	'tarot-journey': {
		summary: 'Acompanhe uma sequência de leituras de Tarot sobre um objetivo.',
		action: 'Começar minha jornada de Tarot'
	},
	'tarot-focus': {
		summary: 'Use uma pergunta para explorar o que merece sua atenção agora.',
		action: 'Consultar o Tarot'
	},
	'purpose-career': {
		summary:
			'Explore sua relação com dinheiro, trabalho e vida profissional a partir do mapa de nascimento.',
		action: 'Conhecer meu mapa de dinheiro e carreira'
	},
	'career-forecast-30d': {
		summary: 'Acompanhe os trânsitos ligados a dinheiro, trabalho e carreira nos próximos 30 dias.',
		action: 'Ver minhas previsões de dinheiro e carreira'
	},
	midheaven: {
		summary: 'Descubra seu Meio do Céu e entenda sua relação com a vida profissional.',
		action: 'Descobrir meu Meio do Céu'
	},
	'career-compass': {
		summary: 'Calcule seu Meio do Céu e comece a explorar carreira no mapa astral.',
		action: 'Calcular meu Meio do Céu'
	},
	'direction-journey': {
		summary: 'Acompanhe um objetivo de trabalho ao longo de uma sequência de etapas.',
		action: 'Definir meu objetivo de carreira'
	},
	'dream-reading': {
		summary: 'Conte seu sonho e explore seus símbolos a partir do seu relato.',
		action: 'Interpretar meu sonho'
	},
	'dream-journal': {
		summary: 'Anote seus sonhos, as emoções e o que você lembra ao acordar.',
		action: 'Registrar meu sonho'
	},
	'dream-dossier': {
		summary: 'Aprofunde a leitura de um sonho com as associações que você contar.',
		action: 'Conhecer a leitura do sonho'
	},
	'dream-atlas': {
		summary:
			'Registre seus sonhos por 30 dias e receba uma análise integrada dos relatos ao final.',
		action: 'Começar meu diário de sonhos'
	},
	'atv-plus': {
		summary:
			'Escolha entre Essencial, Ampliado e Premium para acompanhar previsões e leituras a cada 30 dias.',
		action: 'Conhecer o ATV+'
	}
} satisfies Record<string, { summary: string; action: string }>;

export function customerProduct(id: string) {
	const product = productCatalog.find((item) => item.id === id);
	const copy = productCopy[id as keyof typeof productCopy];
	if (!product || !copy) return undefined;
	return {
		...product,
		...copy,
		href: `/produtos/${product.slug}`,
		// An unreleased product offers details, never a promise of immediate delivery.
		cta: product.state === 'ACTIVE' ? copy.action : `Conhecer ${product.name}`
	};
}

export const customerProducts = productCatalog.map((item) => customerProduct(item.id)!);

/** Public offers exclude free tools, historical experiences and the separate ATV+ subscription. */
export const customerOffers = offeredProductIds.map((id) => customerProduct(id)!);
