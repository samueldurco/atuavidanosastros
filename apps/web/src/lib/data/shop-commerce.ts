import ariesRoute from './shop-aries-route.json';
import slugs from './shop-commerce-slugs.json';

/** Existing products included in the national, manually fulfilled MVP.
 * The server feature flag and live Shopify availability still control checkout.
 */
export const shopCommerceSlugs: readonly string[] = slugs;

const eligible = new Set<string>(shopCommerceSlugs);
export const isShopCommerceEligible = (slug: string, ariesOnly = false): boolean =>
	eligible.has(slug) && (!ariesOnly || slug === ariesRoute.slug);

export const shopAriesRoute = ariesRoute;
export const matchesAriesPostalCode = (value: unknown): boolean =>
	typeof value === 'string' &&
	(value.trim() === ariesRoute.postalCode ||
		value.trim() === ariesRoute.postalCode.replace('-', ''));

export const shopAriesTerms =
	'Enviamos uma unidade por pedido para o CEP ' +
	ariesRoute.postalCode +
	' (Pocrane–MG). A previsão é de até ' +
	ariesRoute.deliveryBusinessDays +
	' dias úteis após a aprovação do seu pagamento, desde que o valor da venda esteja disponível para a ATVNA pagar a produção em até dois dias úteis. A fabricação e o transporte levam até seis dias úteis a partir desse repasse. Se o saldo ficar retido e o repasse atrasar, entraremos em contato e ofereceremos cancelamento com reembolso.';

/** Merchant's fixed delivery price, independent of the carrier's quoted cost. */
export const shopDelivery = {
	priceBrl: 29.9
} as const;
