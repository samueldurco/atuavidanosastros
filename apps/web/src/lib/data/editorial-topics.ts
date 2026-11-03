import type { PublicTopicId } from './public-navigation';

type ArticleLink = { path: string; title: string };

// The editorial review covers these links for this specific revision of each guide.
const reviewedGuideLinks = new Map<string, ArticleLink>([
	['guide-horario-nascimento', { path: '/ascendente', title: 'Entender o ascendente' }],
	[
		'guide-mercurio-retrogrado',
		{ path: '/temas/previsoes', title: 'Ver outros temas de previsões' }
	],
	[
		'guide-sinastria-limites',
		{ path: '/ferramentas/combinacao-do-casal', title: 'Explorar a combinação do casal' }
	],
	[
		'guide-arcanos-maiores-menores',
		{ path: '/ferramentas/carta-do-dia', title: 'Experimentar a carta do dia' }
	],
	[
		'guide-meio-ceu-reflexao',
		{ path: '/ferramentas/meio-do-ceu', title: 'Calcular meu Meio do Céu' }
	],
	['guide-diario-sonhos', { path: '/ferramentas/registro-de-sonho', title: 'Registrar um sonho' }]
]);

export function reviewedGuideLink(document: { id: string; revision: number; kind: string }) {
	return document.kind === 'guide' && document.revision === 4
		? reviewedGuideLinks.get(document.id)
		: undefined;
}

// Discovery metadata is separate from the immutable, signed article packages.
export const editorialTopicPaths: Record<string, readonly string[]> = {
	'meu-ceu': [
		'/mapa-astral',
		'/ascendente',
		'/noticias/2026/10/sol-lua-ascendente',
		'/noticias/2026/10/horario-nascimento-mapa-astral'
	],
	ciclos: ['/mercurio-retrogrado', '/noticias/2026/10/fases-da-lua'],
	amor: [
		'/noticias/2026/10/sinastria-e-combinacao-de-signos',
		'/noticias/2026/10/sinastria-dados-e-consentimento'
	],
	tarot: [
		'/noticias/2026/10/arcanos-maiores-e-menores',
		'/noticias/2026/10/perguntas-para-o-tarot'
	],
	proposito: ['/noticias/2026/10/meio-do-ceu-e-reflexao-de-carreira'],
	sonhos: ['/noticias/2026/10/diario-de-sonhos']
};

export const topicIntroductions: Record<PublicTopicId, { heading: string; text: string }> = {
	'meu-ceu': {
		heading: 'Como ler meu mapa astral?',
		text: 'Se você já tem o desenho do mapa, use o guia para localizar o Sol, a Lua e o Ascendente. Se ainda precisa calcular as posições, separe a data, a hora e o local de nascimento para usar a calculadora.'
	},
	ciclos: {
		heading: 'Qual é o horóscopo do meu signo?',
		text: 'Escolha o signo e consulte o dia, a semana ou o mês. Cada leitura indica o período que cobre. Quando a previsão atual ainda não saiu, o histórico reúne as edições anteriores disponíveis.'
	},
	amor: {
		heading: 'Como funciona a sinastria entre dois mapas?',
		text: 'A sinastria parte dos dados de nascimento das duas pessoas. Antes de preencher a combinação do casal, combine com a outra pessoa que dados podem ser usados e que questão vocês querem explorar juntos.'
	},
	proposito: {
		heading: 'Onde começar a ler carreira no mapa astral?',
		text: 'Para localizar o Meio do Céu, separe a data, a hora e o local de nascimento. Ao ler o resultado, pense em um projeto em que você gostou do papel que assumiu e no que gostaria de repetir dessa experiência.'
	},
	tarot: {
		heading: 'Como começar a ler as cartas de tarot?',
		text: 'Para reconhecer as cartas, comece pelo guia dos arcanos maiores e menores. A calculadora de arcano pessoal usa sua data de nascimento e mostra cada etapa da soma. Se preferir tirar uma carta para refletir sobre o dia, escolha a Carta do Dia.'
	},
	sonhos: {
		heading: 'Como registrar um sonho antes que os detalhes escapem?',
		text: 'Anote primeiro a cena que ficou na memória. Acrescente o que sentiu ao acordar e o que aquela imagem lembra na sua própria vida. O modelo de diário ajuda a separar essas impressões para reler depois.'
	}
};

export function editorialTopic(path: string): string | undefined {
	if (/^\/horoscopo\/[a-z]+\/(?:daily|weekly|monthly)\/\d{4}-\d{2}-\d{2}$/.test(path))
		return 'ciclos';
	return Object.keys(editorialTopicPaths).find((id) => editorialTopicPaths[id].includes(path));
}
