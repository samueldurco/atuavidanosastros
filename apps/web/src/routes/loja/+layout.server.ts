import * as env from '$app/env/private';
import { readShopSellerIdentity } from '$lib/server/shop/seller-identity';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = () => ({
	shopSeller: readShopSellerIdentity(env)
});
