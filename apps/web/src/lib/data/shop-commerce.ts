import ariesRoute from './shop-aries-route.json';
import slugs from './shop-commerce-slugs.json';
import reviewedOffers from './shop-reviewed-offers.json' with { type: 'json' };
import reviewedDestinations from './shop-reviewed-destinations.json' with { type: 'json' };

export const shopCommerceSlugs: readonly string[] = slugs;
const eligible = new Set<string>(shopCommerceSlugs);
const reviewedSlugs = new Set(reviewedOffers.map((offer) => offer.slug));
const reviewedPrices = new Map(reviewedOffers.map((offer) => [offer.variantId, offer.priceBrl]));
const destinations = new Map(
	reviewedDestinations.map((entry) => [entry.postalCode.replace('-', ''), entry])
);

export const isShopCommerceEligible = (slug: string, restricted = false): boolean =>
	restricted ? reviewedSlugs.has(slug) : eligible.has(slug);

export const reviewedUnitPrice = (variantId: string) => reviewedPrices.get(variantId);

export function reviewedDestination(value: unknown) {
	if (typeof value !== 'string' || !/^\d{5}-?\d{3}$/.test(value.trim())) return undefined;
	return destinations.get(value.trim().replace('-', ''));
}

export const shopAriesRoute = ariesRoute;
export const shopSingleUnitTerms =
	'Vendemos uma peça por pedido. Consulte o CEP para ver o prazo de fabricação e entrega após a aprovação do pagamento. Esse prazo inclui até dois dias úteis para a ATVNA pagar a produção. Se a liberação do saldo atrasar, entraremos em contato e ofereceremos cancelamento com reembolso.';

export const shopDelivery = { priceBrl: 29.9 } as const;
