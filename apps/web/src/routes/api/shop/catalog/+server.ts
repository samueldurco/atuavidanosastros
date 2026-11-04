import { env } from '$env/dynamic/private';
import { shopCatalog } from '$lib/server/shop/shop-http';
import { withShopMemberPricing } from '$lib/server/member-pricing';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ fetch, getClientAddress, url, locals }) =>
	withShopMemberPricing(
		await shopCatalog(env, fetch, getClientAddress(), url.searchParams.get('cursor') ?? undefined),
		locals
	);
