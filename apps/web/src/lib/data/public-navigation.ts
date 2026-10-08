// Public discovery exposes only the first experience of each interest.
// Later products remain in their contextual journeys and account area.
export const interestNavigation = [
	{
		id: 'meu-ceu',
		label: 'Mapa astral',
		href: '/produtos/ascendente',
		action: 'Descobrir meu ascendente',
		note: 'Conheça uma parte do seu mapa',
		editorial: 'Entender meu mapa astral',
		available: false,
		icon: 'M12 3v18M3 12h18M5.6 5.6l12.8 12.8M5.6 18.4L18.4 5.6'
	},
	{
		id: 'ciclos',
		label: 'Horóscopo e previsões',
		href: '/horoscopo',
		action: 'Ver meu horóscopo',
		note: 'Acompanhe os ciclos do seu signo',
		editorial: 'Artigos sobre ciclos e previsões',
		available: false,
		icon: 'M20 15.5A9 9 0 018.5 4 9 9 0 1020 15.5Z'
	},
	{
		id: 'amor',
		label: 'Amor e relacionamentos',
		href: '/produtos/preview-do-par',
		action: 'Ver nossa compatibilidade',
		note: 'Comece com uma prévia do par',
		editorial: 'Artigos sobre amor e sinastria',
		available: false,
		icon: 'M12 20S3 14 3 8a5 5 0 019-3 5 5 0 019 3c0 6-9 12-9 12Z'
	},
	{
		id: 'tarot',
		label: 'Tarot',
		href: '/produtos/carta-unica',
		action: 'Tirar uma carta',
		note: 'Um convite à reflexão',
		editorial: 'Conhecer o Tarot',
		available: false,
		icon: 'M6 3h12v18H6ZM12 7l3 5-3 5-3-5Z'
	},
	{
		id: 'proposito',
		label: 'Carreira e propósito',
		href: '/bussola-de-carreira',
		action: 'Fazer minha Bússola de Carreira',
		note: 'Explore sua direção profissional',
		editorial: 'Artigos sobre carreira e vocação',
		available: true,
		icon: 'M12 3l3 6 6 3-6 3-3 6-3-6-6-3 6-3Z'
	},
	{
		id: 'sonhos',
		label: 'Sonhos e significados',
		href: '/produtos/registro-de-sonho',
		action: 'Registrar meu sonho',
		note: 'Guarde seu relato e suas impressões',
		editorial: 'Explorar sonhos e símbolos',
		available: false,
		icon: 'M19 14a8 8 0 01-9-10 8 8 0 109 10ZM18 3v4M16 5h4'
	}
] as const;

export const secondaryNavigation = [
	{ href: '/caderno', label: 'Todos os artigos' },
	{ href: '/metodo', label: 'Nosso método' },
	{ href: '/suporte', label: 'Ajuda' }
] as const;
