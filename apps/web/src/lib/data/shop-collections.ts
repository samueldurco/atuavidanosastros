import rules from './shop-collection-rules.json';
import { shopPreviews, type ShopPreview } from './shop-products';
import { signNames } from './site';

const modelIds: Record<string, string> = {
	'Quadro vertical 30 × 40 cm · moldura preta': 'GE-quadro-12x16',
	'Gildan 64000 · camiseta unissex de gola redonda': 'GE-camiseta-unissex',
	'Regata unissex premium': 'GE-regata-unissex',
	'Top esportivo acolchoado com estampa integral': 'PF-top-esportivo-acolchoado',
	'Legging de yoga com estampa integral': 'PF-legging-yoga',
	'Pochete com estampa integral': 'PF-pochete',
	'AS Colour 4062': 'PF-cropped-feminino',
	'AS Colour 5082': 'PF-oversized',
	'Ecobag clássica': 'GE-ecobag-classica',
	'Caneca branca de cerâmica · 11 oz': 'GE-caneca-branca',
	'Garrafa térmica branca de 17 oz': 'GE-garrafa-500ml',
	'Pôster vertical 30 × 40 cm': 'GE-poster-30x40',
	'Caderno espiral · 140 páginas pontilhadas': 'PF-caderno-espiral',
	'Yupoong 6245CM · boné ajustável': 'PF-bone-bordado',
	'Yupoong 1501KC · gorro com dobra': 'PF-gorro-bordado'
};

export interface ShopCollection {
	id: string;
	slug: string;
	name: string;
	href: string;
	products: ShopPreview[];
}

/** Membership follows the POD rules; the same piece keeps one product page. */
export const shopCollections: ShopCollection[] = rules.collections.map((collection) => {
	const slug = collection.collection_identity.replace(/^COL-/, '');
	return {
		id: collection.collection_identity,
		slug,
		name: slug === 'casal' ? 'Namorados e Sinastria' : collection.name,
		href: slug in signNames ? `/loja/signo/${slug}` : `/loja/colecao/${slug}`,
		products: shopPreviews.filter((piece) => {
			if (collection.rule.subject_kind === 'canonical_pair') {
				return (
					piece.subjectKind === 'canonical_pair' &&
					!!piece.pairId &&
					collection.rule.subject_in.includes(piece.pairId) &&
					collection.rule.model_id_in.includes(modelIds[piece.model])
				);
			}
			const subject = Object.entries(signNames).find(([, name]) => name === piece.sign)?.[0];
			return (
				collection.rule.subject_kind === 'single_sign' &&
				!!subject &&
				collection.rule.subject_in.includes(subject) &&
				collection.rule.model_id_in.includes(modelIds[piece.model])
			);
		})
	};
});

export const visibleShopCollections = shopCollections.filter(
	(collection) => collection.products.length
);
export const getShopCollection = (slug: string) =>
	visibleShopCollections.find((collection) => collection.slug === slug);
