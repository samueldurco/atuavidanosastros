import { env } from '$env/dynamic/private';
import { checkoutDatabase } from '$lib/server/shop/checkout-database';
import { productionHandler } from '$lib/server/shop/production-handlers';
import type { RequestHandler } from './$types';
export const POST: RequestHandler = ({ request, platform, fetch }) =>
	productionHandler('paid', request, env, checkoutDatabase(platform), fetch, platform?.ctx);
