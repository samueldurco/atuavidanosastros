export type ShopSellerIdentity = {
	name: string;
	address: string;
	email: string;
	document?: string;
};

// Only explicitly public fields may cross the server/client boundary.
// Values are configured at runtime, never embedded in source or build fixtures.
export function readShopSellerIdentity(
	env: Record<string, string | undefined>
): ShopSellerIdentity | null {
	const name = env.SHOP_SELLER_PUBLIC_NAME?.trim();
	const address = env.SHOP_SELLER_PUBLIC_ADDRESS?.trim();
	const email = env.SHOP_SELLER_PUBLIC_EMAIL?.trim();
	if (!name || !address || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
	const document = env.SHOP_SELLER_PUBLIC_DOCUMENT?.trim();
	return { name, address, email, ...(document ? { document } : {}) };
}
