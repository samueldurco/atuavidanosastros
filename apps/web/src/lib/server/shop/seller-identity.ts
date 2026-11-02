import { shopDelivery } from '$lib/data/shop-commerce';

export type ShopSellerIdentity = {
	name: string;
	address: string;
	email: string;
	document: string;
};

// Only explicitly public fields may cross the server/client boundary.
// Values are configured at runtime, never embedded in source or build fixtures.
export function readShopSale(
	env: Record<string, string | undefined>
): { seller: ShopSellerIdentity; deliveryBusinessDays: number } | null {
	if (env.FEATURE_PHYSICAL_CHECKOUT !== 'true' || env.SHOP_SELLER_DISCLOSURE_APPROVED !== 'true')
		return null;
	const days = env.SHOP_DELIVERY_MAX_BUSINESS_DAYS ?? '';
	if (!/^[1-9][0-9]?$/.test(days)) return null;
	if (env.SHOP_VERIFIED_FLAT_SHIPPING_BRL !== shopDelivery.priceBrl.toFixed(2)) return null;
	const name = env.SHOP_SELLER_PUBLIC_NAME?.trim();
	const address = env.SHOP_SELLER_PUBLIC_ADDRESS?.trim();
	const email = env.SHOP_SELLER_PUBLIC_EMAIL?.trim();
	if (!name || !address || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
	const document = env.SHOP_SELLER_PUBLIC_DOCUMENT?.trim();
	return document
		? { seller: { name, address, email, document }, deliveryBusinessDays: Number(days) }
		: null;
}
