import { env } from '$env/dynamic/private';
import { shopProduct } from '$lib/server/shop/shop-http';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ params, fetch, getClientAddress }) =>
	shopProduct(env, fetch, params.slug, getClientAddress());
