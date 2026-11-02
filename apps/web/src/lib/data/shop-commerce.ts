import slugs from './shop-commerce-slugs.json';

/** Existing products included in the national, manually fulfilled MVP.
 * The server feature flag and live Shopify availability still control checkout.
 */
export const shopCommerceSlugs: readonly string[] = slugs;

const eligible = new Set<string>(shopCommerceSlugs);
export const isShopCommerceEligible = (slug: string): boolean => eligible.has(slug);

/** Merchant's fixed delivery price, independent of the carrier's quoted cost. */
export const shopDelivery = {
	priceBrl: 29.9
} as const;
