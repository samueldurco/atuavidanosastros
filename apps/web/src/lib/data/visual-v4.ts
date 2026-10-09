import { productCatalog } from '@atv/domain';

export const visualUniverses = [
	'meu-ceu',
	'ciclos',
	'amor',
	'proposito',
	'tarot',
	'sonhos'
] as const;
export type VisualUniverse = (typeof visualUniverses)[number];
const aliases: Record<string, VisualUniverse> = {
	'meu-ceu': 'meu-ceu',
	'ciclos-tempo': 'ciclos',
	ciclos: 'ciclos',
	horoscopo: 'ciclos',
	'amor-relacoes': 'amor',
	amor: 'amor',
	'proposito-prosperidade': 'proposito',
	proposito: 'proposito',
	'bussola-de-carreira': 'proposito',
	'tarot-arcanos': 'tarot',
	tarot: 'tarot',
	'sonhos-simbolos': 'sonhos',
	sonhos: 'sonhos'
};
const cut = (id: string) => `/brand/v4/CARDS/recortes/${id}.webp`;
export const visualV4 = {
	mandala: '/brand/v4/MATERIAS/ZODIACO_V003/mandala-autonoma-640-v003.webp',
	figures: {
		'meu-ceu': [cut('B01-figure-1')],
		ciclos: [cut('B02-figure-1')],
		amor: [cut('B03-figure-1'), cut('B03-figure-2'), cut('B03-figure-3')],
		proposito: [cut('B04-figure-1'), cut('B04-figure-2')],
		tarot: [cut('B05-figure-1')],
		sonhos: [cut('B06-figure-1'), cut('B06-figure-2')]
	} satisfies Record<VisualUniverse, string[]>
};
export function visualProduct(value: string) {
	const product = productCatalog.find((item) => [item.id, item.slug, item.name].includes(value));
	return product ? { ...product, visualUniverse: aliases[product.universe] } : undefined;
}
export function visualUniverse(value: string): VisualUniverse | undefined {
	return aliases[value] || visualProduct(value)?.visualUniverse;
}
export function visualContext(pathname: string, search = '', productId = '') {
	const parts = pathname.split('/').filter(Boolean);
	const params = new URLSearchParams(search);
	const candidate =
		productId ||
		parts.find((part) => visualProduct(part)) ||
		params.get('product') ||
		params.get('tema') ||
		parts[0] ||
		'';
	return { universe: visualUniverse(candidate), home: pathname === '/' };
}
