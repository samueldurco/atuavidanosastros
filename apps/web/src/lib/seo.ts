import { SITE, editorialPages, signs, signNames } from '$lib/data/site';

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
	'/meu-ceu',
	'/ciclos',
	'/amor',
	'/proposito',
	'/tarot',
	'/sonhos',
	'/meio-do-ceu',
	'/bussola-de-carreira',
	'/mapa-de-proposito',
	'/vocacao-no-mapa-astral',
	'/carreira-no-mapa-astral',
	'/casa-10',
	'/loja',
	'/leituras'
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

export function isProductionOrigin(url: URL): boolean {
	return url.origin === SITE.url;
}

export function legacySeo(path: string): PageSeo | null {
	const slug = path.slice(1);
	const page = Object.hasOwn(editorialPages, slug)
		? editorialPages[slug as keyof typeof editorialPages]
		: null;
	const special: Record<string, { title: string; description: string }> = {
		'/': { title: `${SITE.name} — ${SITE.tagline}`, description: SITE.description },
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
			title: 'Leituras e experiências',
			description:
				'Explore os produtos digitais da ATVNA: mapa astral, previsões, relacionamentos, carreira, Tarot e sonhos. Confira o conteúdo e a disponibilidade de cada leitura.'
		},
		'/loja': {
			title: 'Loja dos signos — em preparação',
			description: 'A coleção está em preparação. Nenhum produto, preço ou estoque foi publicado.'
		}
	};
	const sign = path.match(/^\/loja\/signo\/([a-z]+)$/)?.[1];
	const shopSign = signs.find((value) => value === sign);
	const entry =
		(Object.hasOwn(special, path) ? special[path] : null) ??
		page ??
		(shopSign
			? {
					title: `Coleção ${signNames[shopSign]} — em preparação`,
					description: 'Coleção em preparação, sem produtos, preços ou estoque publicados.'
				}
			: null);
	if (!entry) return null;
	return {
		title: path === '/' ? entry.title : `${entry.title} — ${SITE.name}`,
		description: entry.description,
		path,
		indexable: !shopSign,
		managePrimary: false,
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
export function robotsPolicy(seo: PageSeo | null | undefined, url: URL, status = 200): string {
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
