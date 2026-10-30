import { env } from '$env/dynamic/private';
import { readShopSellerIdentity } from '$lib/server/shop/seller-identity';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = () => ({
	shopSeller: readShopSellerIdentity(env),
	shopCommerceEnabled: env.FEATURE_PHYSICAL_CHECKOUT === 'true'
});
