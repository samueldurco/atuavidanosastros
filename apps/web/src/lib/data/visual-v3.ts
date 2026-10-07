import visual from './visual-v3.generated.json';
import { customerProducts } from './product-copy';

export type VisualUniverse = keyof typeof visual.themes;
const themes: Record<string, VisualUniverse> = {
	'meu-ceu': 'B01',
	'ciclos-tempo': 'B02',
	ciclos: 'B02',
	'amor-relacoes': 'B03',
	amor: 'B03',
	'proposito-prosperidade': 'B04',
	proposito: 'B04',
	'tarot-arcanos': 'B05',
	tarot: 'B05',
	'sonhos-simbolos': 'B06',
	sonhos: 'B06',
	'bussola-de-carreira': 'B04'
};
export const visualV3 = visual;
export function visualProduct(value: string) {
	const id = value in visual.products ? value : customerProducts.find((p) => p.name === value)?.id;
	return id ? visual.products[id as keyof typeof visual.products] : undefined;
}
export function visualUniverse(value: string): VisualUniverse {
	return themes[value] || (visualProduct(value)?.universe as VisualUniverse | undefined) || 'B01';
}
export function visualContext(pathname: string, search: string, productId?: string) {
	const parts = pathname.split('/').filter(Boolean);
	const params = new URLSearchParams(search);
	const candidate =
		productId ||
		parts.find((p) => p in visual.products) ||
		params.get('product') ||
		params.get('tema') ||
		parts[0] ||
		'';
	const universe = visualUniverse(candidate);
	const dense =
		/\/(?:biblioteca|dashboard|conta|admin|testar-produtos|bussola-de-carreira|entrar|cadastro|auth)(?:\/|$)/.test(
			pathname
		);
	return { universe, dense, theme: visual.themes[universe] };
}
