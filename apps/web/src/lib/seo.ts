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
	'/loja'
] as const;
export const editorialHubs = {
	'/noticias': {
		title: 'Notícias e leituras do céu',
		description: 'Reportagens, colunas e guias com autoria, fontes e revisão editorial.',
		kind: 'news'
	},
	'/signos': {
		title: 'Atlas dos signos',
		description: 'Perfis dos signos com contexto, método e espaço para diferenças individuais.',
		kind: 'sign-profile'
	},
	'/horoscopo': {
		title: 'Horóscopo com contexto',
		description: 'Leituras por signo que distinguem fatos calculados, interpretação e escolha.',
		kind: 'horoscope'
	},
	'/compatibilidade': {
		title: 'Compatibilidade entre signos',
		description: 'Afinidades como perguntas sobre relações, não como vereditos sobre pessoas.',
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
				'Entenda o Meio do Céu como direção pública, contribuição e visibilidade — sem reduzir vocação a um signo.'
		},
		'/bussola-de-carreira': {
			title: 'Bússola de Carreira grátis',
			description:
				'Descubra as perguntas do seu Meio do Céu com uma ferramenta gratuita e linguagem profissional responsável.'
		},
		'/mapa-de-proposito': {
			title: 'Mapa de Propósito & Carreira — em preparação',
			description:
				'Proposta de leitura vocacional em preparação. Acesso, preço e checkout ainda não estão disponíveis.'
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
