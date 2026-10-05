export const SITE = {
	name: 'A Tua Vida nos Astros',
	tagline: 'Astrologia para conhecer você.',
	url: 'https://atuavidanosastros.com.br',
	description:
		'Mapa astral, previsões, amor, carreira, Tarot e sonhos. Conheça os temas e as leituras da A Tua Vida nos Astros.'
} as const;

export const navigation = [
	{ href: '/meu-ceu', label: 'Mapa astral' },
	{ href: '/ciclos', label: 'Previsões' },
	{ href: '/amor', label: 'Amor' },
	{ href: '/proposito', label: 'Carreira e dinheiro' },
	{ href: '/tarot', label: 'Tarot' },
	{ href: '/sonhos', label: 'Sonhos' }
];

export const universes = [
	{
		slug: 'meu-ceu',
		href: '/meu-ceu',
		eyebrow: 'Sobre você',
		title: 'Mapa astral',
		description:
			'Descubra o que Sol, Lua e Ascendente mostram sobre sua personalidade, emoções e relacionamentos.',
		cta: 'Conhecer as leituras do mapa',
		productUniverse: 'meu-ceu'
	},
	{
		slug: 'ciclos',
		href: '/ciclos',
		eyebrow: 'Seu período',
		title: 'Previsões',
		description:
			'Horóscopo, trânsitos e previsões para os dias, as semanas e o seu ano astrológico.',
		cta: 'Conhecer as previsões',
		productUniverse: 'ciclos-tempo'
	},
	{
		slug: 'amor',
		href: '/amor',
		eyebrow: 'Relacionamentos',
		title: 'Amor e relacionamentos',
		description: 'Conheça a combinação de dois mapas: atração, afinidades e desafios da relação.',
		cta: 'Conhecer as leituras de amor',
		productUniverse: 'amor-relacoes'
	},
	{
		slug: 'proposito',
		href: '/proposito',
		eyebrow: 'Trabalho',
		title: 'Carreira e dinheiro',
		description:
			'Explore sua vocação, sua vida profissional e sua relação com dinheiro no mapa astral.',
		cta: 'Conhecer as leituras de carreira',
		productUniverse: 'proposito-prosperidade'
	},
	{
		slug: 'tarot',
		href: '/tarot',
		eyebrow: 'Sua pergunta',
		title: 'Tarot',
		description: 'Tire uma carta, faça suas perguntas e conheça as leituras de Tarot.',
		cta: 'Conhecer as leituras de Tarot',
		productUniverse: 'tarot-arcanos'
	},
	{
		slug: 'sonhos',
		href: '/sonhos',
		eyebrow: 'Seus sonhos',
		title: 'Sonhos',
		description: 'Conte seus sonhos, explore seus símbolos e acompanhe os temas que se repetem.',
		cta: 'Conhecer as leituras de sonhos',
		productUniverse: 'sonhos-simbolos'
	}
] as const;

export const signs = [
	'aries',
	'touro',
	'gemeos',
	'cancer',
	'leao',
	'virgem',
	'libra',
	'escorpiao',
	'sagitario',
	'capricornio',
	'aquario',
	'peixes'
] as const;
export type SignSlug = (typeof signs)[number];
export const signNames: Record<SignSlug, string> = {
	aries: 'Áries',
	touro: 'Touro',
	gemeos: 'Gêmeos',
	cancer: 'Câncer',
	leao: 'Leão',
	virgem: 'Virgem',
	libra: 'Libra',
	escorpiao: 'Escorpião',
	sagitario: 'Sagitário',
	capricornio: 'Capricórnio',
	aquario: 'Aquário',
	peixes: 'Peixes'
};

export const editorialPages = {
	'meu-ceu': universes[0],
	ciclos: universes[1],
	amor: universes[2],
	proposito: universes[3],
	tarot: universes[4],
	sonhos: universes[5],
	'vocacao-no-mapa-astral': {
		eyebrow: 'Guia',
		title: 'Vocação no mapa astral',
		description:
			'Entenda como Meio do Céu, casas e planetas entram na leitura da sua vida profissional.',
		cta: 'Calcular meu Meio do Céu',
		href: '/bussola-de-carreira'
	},
	'carreira-no-mapa-astral': {
		eyebrow: 'Guia',
		title: 'Carreira no mapa astral',
		description: 'Conheça os fatores do mapa ligados a trabalho, rotina e carreira.',
		cta: 'Calcular meu Meio do Céu',
		href: '/bussola-de-carreira'
	},
	'casa-10': {
		eyebrow: 'Mapa astral',
		title: 'Casa 10: carreira e vida pública',
		description: 'Saiba o que a Casa 10 representa e como ela se relaciona com o Meio do Céu.',
		cta: 'Entender o Meio do Céu',
		href: '/meio-do-ceu'
	},
	metodo: {
		eyebrow: 'Como funciona',
		title: 'Como fazemos as leituras',
		description:
			'Conheça o cálculo dos mapas, a interpretação dos resultados e o tratamento de dados incompletos.',
		cta: 'Ver os temas',
		href: '/#universos'
	},
	caderno: {
		eyebrow: 'Artigos',
		title: 'Artigos de astrologia',
		description: 'Guias sobre mapa astral, previsões, relacionamentos, carreira, Tarot e sonhos.',
		cta: 'Conhecer o mapa astral',
		href: '/meu-ceu'
	},
	privacidade: {
		eyebrow: 'Seus dados',
		title: 'Privacidade e dados pessoais',
		description:
			'Veja como usamos seus dados de nascimento e suas leituras. Consulte os controles disponíveis na conta e na Biblioteca.',
		cta: 'Acessar minha conta',
		href: '/dashboard'
	},
	cookies: {
		eyebrow: 'Preferências',
		title: 'Cookies sob o seu controle',
		description:
			'Usamos armazenamento essencial para manter o serviço. Analytics permanece desligado até você autorizar.',
		cta: 'Voltar ao início',
		href: '/'
	},
	suporte: {
		eyebrow: 'Ajuda',
		title: 'Suporte',
		description:
			'Precisa de ajuda com acesso, leituras ou cobrança? Consulte primeiro sua Biblioteca. O canal de atendimento está em preparação.',
		cta: 'Abrir minhas leituras',
		href: '/biblioteca'
	}
} as const;
