import { env } from '$env/dynamic/private';
import { shopProduct } from '$lib/server/shop/shop-http';
import { withShopMemberPricing } from '$lib/server/member-pricing';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, fetch, getClientAddress, locals }) =>
	withShopMemberPricing(await shopProduct(env, fetch, params.slug, getClientAddress()), locals);
