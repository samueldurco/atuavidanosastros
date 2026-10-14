import { productCatalog } from '@atv/domain';
import { interestNavigation } from './public-navigation';
import { freeTools } from './free-tools';

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
// Approved MVP assets; resolver names retained for route compatibility.
const art = (name: string) => '/brand/mvp/assets/revisao/' + name + '.webp';
export const visualV4 = {
	mandala: art('mandala-gravada'),
	figures: {
		'meu-ceu': [art('mandala-gravada')],
		ciclos: [art('fases-lunares')],
		amor: [art('flor-gravada')],
		proposito: [art('bussola-gravada')],
		tarot: [art('cartas-gravadas')],
		sonhos: [art('sonhos-gravados')]
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
	const route = pathname.replace(/\/$/, '');
	const publicTopic =
		interestNavigation.find((topic) => topic.href === route)?.id ||
		freeTools.find((tool) => tool.href === route)?.topicId;
	const candidate =
		productId ||
		publicTopic ||
		parts.find((part) => visualProduct(part)) ||
		params.get('product') ||
		params.get('tema') ||
		parts[0] ||
		'';
	return { universe: visualUniverse(candidate), home: pathname === '/' };
}
