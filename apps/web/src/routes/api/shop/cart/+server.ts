import { env } from '$env/dynamic/private';
import { shopCart } from '$lib/server/shop/shop-http';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = ({ request, fetch, getClientAddress }) =>
	shopCart(request, env, fetch, getClientAddress());
