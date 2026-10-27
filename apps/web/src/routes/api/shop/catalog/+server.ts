import { env } from '$env/dynamic/private';
import { shopCatalog } from '$lib/server/shop/shop-http';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ fetch, getClientAddress, url }) =>
	shopCatalog(env, fetch, getClientAddress(), url.searchParams.get('cursor') ?? undefined);
