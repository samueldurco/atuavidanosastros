import type { ShopPreview } from './shop-products';
import { signNames, type SignSlug } from './site';
import reviewedOffers from './shop-reviewed-offers.json';

export type CatalogOrder = 'featured' | 'price-asc' | 'price-desc' | 'name';
export const catalogPageSize = 24;

const prices = new Map<string, number>();
for (const offer of reviewedOffers) {
	prices.set(offer.slug, Math.min(prices.get(offer.slug) ?? Infinity, offer.priceBrl));
}
export const catalogPrice = (slug: string) => prices.get(slug);
export const formatCatalogPrice = (value: number) =>
	new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
const normalize = (value: string) =>
	value
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLocaleLowerCase('pt-BR');

export function filterCatalog(
	products: readonly ShopPreview[],
	filters: { query: string; sign: string; partner: string; category: string; available: boolean },
	order: CatalogOrder,
	canBuy: (slug: string) => boolean
) {
	const terms = normalize(filters.query.trim()).split(/\s+/).filter(Boolean);
	return products
		.filter((piece) => {
			const signs = piece.signs?.length
				? piece.signs.map((slug) => signNames[slug as SignSlug] ?? slug)
				: piece.sign.split(' + ');
			const search = normalize(
				[piece.title, piece.sign, piece.category, piece.description].join(' ')
			);
			return (
				terms.every((term) => search.includes(term)) &&
				(!filters.sign || signs.includes(filters.sign)) &&
				(!filters.partner || (signs.length > 1 && signs.includes(filters.partner))) &&
				(!(filters.sign && filters.sign === filters.partner) ||
					signs.every((name) => name === filters.sign)) &&
				(!filters.category || piece.category === filters.category) &&
				(!filters.available || canBuy(piece.slug))
			);
		})
		.sort((a, b) => {
			if (order === 'price-asc' || order === 'price-desc') {
				const pa = canBuy(a.slug) ? catalogPrice(a.slug) : undefined;
				const pb = canBuy(b.slug) ? catalogPrice(b.slug) : undefined;
				if (pa === undefined || pb === undefined)
					return Number(pa === undefined) - Number(pb === undefined);
				return order === 'price-asc' ? pa - pb : pb - pa;
			}
			if (order === 'name') return a.title.localeCompare(b.title, 'pt-BR');
			return Number(canBuy(b.slug)) - Number(canBuy(a.slug));
		});
}
