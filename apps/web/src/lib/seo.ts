import { SITE, editorialPages, signs, signNames } from '$lib/data/site';
import { interestNavigation } from '$lib/data/public-navigation';
import { freeTools } from '$lib/data/free-tools';

export interface PageSeo {
	title: string;
	description: string;
	path: string;
	indexable: boolean;
	managePrimary: boolean;
	image?: { url: string; alt: string; large: boolean };
	article?: { publishedAt: string; modifiedAt: string };
	jsonLd?: string;
}

// Existing public inventory, not retroactive editorial approval.
export const legacyPublicPaths = [
	'/',
	'/temas',
	...interestNavigation.map((topic) => topic.href),
	'/ferramentas',
	...freeTools.map((tool) => tool.href),
	'/revista',
	'/meio-do-ceu',
	'/mapa-de-proposito',
	'/vocacao-no-mapa-astral',
	'/carreira-no-mapa-astral',
	'/casa-10',
	'/loja',
	'/leituras',
	'/atv-mais',
	'/canais-oficiais',
	'/fale-conosco'
] as const;
export const editorialHubs = {
	'/noticias': {
		title: 'Notícias de astrologia',
		description: 'Notícias, artigos e guias sobre astrologia e autoconhecimento.',
		kind: 'news'
	},
	'/signos': {
		title: 'Os 12 signos',
		description: 'Conheça as características dos signos no amor, no trabalho e nas relações.',
		kind: 'sign-profile'
	},
	'/horoscopo': {
		title: 'Horóscopo e previsões',
		description: 'Previsões por signo para o amor, o trabalho e o seu dia a dia.',
		kind: 'horoscope'
	},
	'/compatibilidade': {
		title: 'Compatibilidade entre signos',
		description: 'Descubra as afinidades entre os signos no amor e na convivência.',
		kind: 'compatibility'
	}
} as const;
export type EditorialHub = keyof typeof editorialHubs;

// Planned public guides without an existing dedicated product page. No placeholder indexing.
export const evergreenGuidePaths = [
	'/mercurio-retrogrado',
	'/lua-cheia',
	'/lua-nova',
	'/eclipses',
	'/calendario-astral',
	'/ascendente',
	'/lua-no-mapa-astral',
	'/mapa-astral',
	'/elementos-dos-signos',
	'/modalidades-dos-signos',
	'/venus-no-mapa-astral',
	'/marte-no-mapa-astral',
	'/casas-astrologicas',
	'/transitos-astrologicos',
	'/sol-no-mapa-astral'
] as const;

export function isProductionOrigin(url: Pick<URL, 'origin'>): boolean {
	return url.origin === SITE.url;
}

export function legacySeo(path: string): PageSeo | null {
	const discovery = discoverySeo(path);
	if (discovery) return discovery;
	const slug = path.slice(1);
	const page = Object.hasOwn(editorialPages, slug)
		? editorialPages[slug as keyof typeof editorialPages]
		: null;
	const special: Record<string, { title: string; description: string }> = {
		'/': {
			title: `${SITE.name} — uma descoberta de cada vez`,
			description:
				'Ferramentas grátis, produtos digitais e histórias para ampliar seu olhar. Explore astrologia, Tarot, sonhos e a Loja dos Signos.'
		},
		'/meio-do-ceu': {
			title: 'Meio do Céu no mapa astral',
			description:
				'Descubra o que o Meio do Céu mostra sobre carreira, reconhecimento e vida profissional.'
		},
		'/bussola-de-carreira': {
			title: 'Bússola de Carreira grátis',
			description: 'Calcule seu Meio do Céu grátis com sua data, hora e local de nascimento.'
		},
		'/mapa-de-proposito': {
			title: 'Mapa de Propósito & Carreira — em preparação',
			description:
				'Conheça a leitura de carreira, trabalho e dinheiro no mapa astral. Produto em preparação.'
		},
		'/leituras': {
			title: 'Leituras digitais',
			description:
				'Explore os produtos digitais da ATVNA: mapa astral, previsões, relacionamentos, carreira, Tarot e sonhos. Confira o conteúdo e a disponibilidade de cada leitura.'
		},
		'/loja': {
			title: 'Produtos físicos · Loja dos Signos — em preparação',
			description:
				'Conheça as primeiras artes da coleção de pôsteres da Loja dos Signos. Produtos físicos em preparação.'
		}
	};
	const sign = path.match(/^\/loja\/signo\/([a-z]+)$/)?.[1];
	const shopSign = signs.find((value) => value === sign);
	const entry =
		(Object.hasOwn(special, path) ? special[path] : null) ??
		page ??
		(shopSign
			? {
					title: `Produtos físicos de ${signNames[shopSign]} — em preparação`,
					description:
						'Conheça a coleção de produtos físicos da Loja dos Signos, ainda em preparação.'
				}
			: null);
	if (!entry) return null;
	return {
		title: path === '/' ? entry.title : `${entry.title} — ${SITE.name}`,
		description: entry.description,
		path,
		indexable: path !== '/loja' && !shopSign,
		managePrimary: false,
		image: { url: `${SITE.url}/brand/social/og-default-1200x630.png`, alt: SITE.name, large: false }
	};
}

export function discoverySeo(path: string): PageSeo | null {
	const topic = interestNavigation.find((item) => item.href === path);
	const tool = freeTools.find((item) => item.href === path);
	const directories: Record<string, { title: string; description: string }> = {
		'/temas': {
			title: 'Explore os seis temas',
			description:
				'Mapa astral, previsões, amor, carreira, Tarot e sonhos: encontre uma ferramenta grátis, compare leituras digitais e leia artigos de cada tema.'
		},
		'/ferramentas': {
			title: 'Ferramentas grátis',
			description:
				'Descubra seu Ascendente, calcule seu mapa astral e Meio do Céu, explore Tarot, relações e sonhos. Consulte a disponibilidade do horóscopo por signo.'
		},
		'/atv-mais': {
			title: 'ATV+ · Assinatura de leituras digitais',
			description:
				'Compare os três planos do ATV+: previsões para os próximos 30 dias e leituras de Tarot ou sonhos conforme o plano.'
		},
		'/canais-oficiais': {
			title: 'ATVNA nas redes — canais oficiais',
			description:
				'Encontre os perfis oficiais da ATVNA no Instagram, Facebook, YouTube, Threads, X, TikTok e outras redes.'
		},
		'/fale-conosco': {
			title: 'Fale conosco',
			description:
				'Entre em contato com a ATVNA para tirar dúvidas sobre sua conta, leituras digitais, conteúdos ou produtos físicos da Loja dos Signos.'
		},
		'/revista': {
			title: 'Revista ATVNA',
			description:
				'Guias e artigos sobre mapa astral, previsões, relacionamentos, carreira, Tarot e sonhos.'
		}
	};
	const entry = topic
		? { title: topic.label, description: topic.description }
		: tool
			? { title: tool.label, description: tool.description }
			: directories[path];
	if (!entry) return null;
	return {
		title: `${entry.title} — ${SITE.name}`,
		description: entry.description,
		path,
		indexable: true,
		managePrimary: true,
		image: { url: `${SITE.url}/brand/social/og-default-1200x630.png`, alt: SITE.name, large: false }
	};
}
// These legacy pages already emit a restrictive robots tag. Keep one tag while
// preserving the independent product/admin work in progress.
export function legacyOwnsRobots(path: string): boolean {
	return (
		['/admin', '/entrar', '/design-system', '/conta/nascimento'].includes(path) ||
		/^\/loja\/signo\/[a-z]+$/.test(path) ||
		/^\/conta\/_spec\/nascimento$/.test(path) ||
		/^\/biblioteca\/(?:_spec\/[^/]+|nova\/[^/]+|[0-9a-f-]{36})$/i.test(path)
	);
}
export function robotsPolicy(
	seo: PageSeo | null | undefined,
	url: Pick<URL, 'origin'>,
	status = 200
): string {
	if (!seo?.indexable || status !== 200 || !isProductionOrigin(url)) return 'noindex, nofollow';
	return seo.image?.large ? 'index, follow, max-image-preview:large' : 'index, follow';
}
export function safeJsonLd(value: unknown): string {
	return JSON.stringify(value)
		.replace(/</g, '\\u003c')
		.replace(/>/g, '\\u003e')
		.replace(/&/g, '\\u0026')
		.replace(/\u2028/g, '\\u2028')
		.replace(/\u2029/g, '\\u2029');
}
