// Public topics use stable universe IDs and a separate, readable URL.
export const interestNavigation = [
	{
		id: 'meu-ceu',
		slug: 'mapa-astral',
		label: 'Mapa astral',
		href: '/temas/mapa-astral',
		description: 'Conheça os principais elementos do seu mapa e escolha o que quer aprofundar.',
		productUniverse: 'meu-ceu',
		toolHref: '/ferramentas/ascendente',
		action: 'Descobrir meu ascendente',
		note: 'Comece por uma parte do seu mapa',
		editorial: 'Entender meu mapa astral',
		available: true,
		icon: 'M12 3v18M3 12h18M5.6 5.6l12.8 12.8M5.6 18.4L18.4 5.6'
	},
	{
		id: 'ciclos',
		slug: 'previsoes',
		label: 'Previsões',
		href: '/temas/previsoes',
		description:
			'Diferencie conteúdo geral por signo de previsões feitas a partir do seu mapa natal.',
		productUniverse: 'ciclos-tempo',
		toolHref: '/ferramentas/horoscopo',
		action: 'Consultar meu signo',
		note: 'Previsões datadas dependem de publicação aprovada',
		editorial: 'Artigos sobre ciclos e previsões',
		available: true,
		icon: 'M20 15.5A9 9 0 018.5 4 9 9 0 1020 15.5Z'
	},
	{
		id: 'amor',
		slug: 'amor',
		label: 'Amor e relacionamentos',
		href: '/temas/amor',
		description:
			'Explore afinidades entre dois mapas e conheça o alcance de cada leitura da relação.',
		productUniverse: 'amor-relacoes',
		toolHref: '/ferramentas/combinacao-do-casal',
		action: 'Explorar nossa combinação',
		note: 'Uma primeira comparação dos mapas',
		editorial: 'Artigos sobre amor e sinastria',
		available: true,
		icon: 'M12 20S3 14 3 8a5 5 0 019-3 5 5 0 019 3c0 6-9 12-9 12Z'
	},
	{
		id: 'proposito',
		slug: 'carreira',
		label: 'Dinheiro e carreira',
		href: '/temas/carreira',
		description: 'Explore sua relação com dinheiro, trabalho e carreira a partir do seu mapa.',
		productUniverse: 'proposito-prosperidade',
		toolHref: '/ferramentas/meio-do-ceu',
		action: 'Calcular meu Meio do Céu',
		note: 'Calcule seu Meio do Céu gratuitamente',
		editorial: 'Artigos sobre dinheiro e carreira',
		available: true,
		icon: 'M12 3l3 6 6 3-6 3-3 6-3-6-6-3 6-3Z'
	},
	{
		id: 'tarot',
		slug: 'tarot',
		label: 'Tarot',
		href: '/temas/tarot',
		description: 'Conheça diferentes métodos de leitura e explore os símbolos das cartas.',
		productUniverse: 'tarot-arcanos',
		toolHref: '/ferramentas/carta-do-dia',
		action: 'Tirar minha carta do dia',
		note: 'Uma carta como convite à reflexão',
		editorial: 'Conhecer o Tarot',
		available: true,
		icon: 'M6 3h12v18H6ZM12 7l3 5-3 5-3-5Z'
	},
	{
		id: 'sonhos',
		slug: 'sonhos',
		label: 'Sonhos',
		href: '/temas/sonhos',
		description:
			'Registre o que você lembra e conheça as diferentes formas de explorar seus sonhos.',
		productUniverse: 'sonhos-simbolos',
		toolHref: '/ferramentas/registro-de-sonho',
		action: 'Registrar meu sonho',
		note: 'Guarde o relato e suas próprias impressões',
		editorial: 'Explorar sonhos e símbolos',
		available: true,
		icon: 'M19 14a8 8 0 01-9-10 8 8 0 109 10ZM18 3v4M16 5h4'
	}
] as const;

export const explorationNavigation = [
	{
		href: '/temas',
		label: 'Seis universos',
		description: 'Encontre ferramentas, leituras digitais e artigos por assunto.'
	},
	{
		href: '/ferramentas',
		label: 'Ferramentas grátis',
		description: 'Experimente e veja seu resultado antes de criar uma conta.'
	},
	{
		href: '/revista',
		label: 'Revista ATVNA',
		description: 'Leia artigos e guias sobre astrologia, Tarot e sonhos.'
	}
] as const;

export const offerNavigation = [
	{
		href: '/leituras',
		label: 'Leituras digitais',
		description: 'Compare as leituras avulsas e confira conteúdo, formatos e disponibilidade.'
	},
	{
		href: '/loja',
		label: 'Produtos físicos',
		description: 'Loja dos Signos · conheça as artes da coleção em preparação.'
	},
	{
		href: '/atv-mais',
		label: 'ATV+ · Assinatura',
		description: 'Compare os três planos de leituras digitais a cada 30 dias.'
	}
] as const;

export const navigationGroups = [
	{ id: 'produtos', label: 'Produtos e assinatura', links: offerNavigation },
	{ id: 'explorar', label: 'Comece e explore', links: explorationNavigation }
] as const;

export const primaryNavigation = [...explorationNavigation, ...offerNavigation];

export const secondaryNavigation = [
	{ href: '/', label: 'Início' },
	{ href: '/metodo', label: 'Nosso método' },
	{ href: '/fale-conosco', label: 'Fale conosco' }
] as const;

export type PublicTopicId = (typeof interestNavigation)[number]['id'];
