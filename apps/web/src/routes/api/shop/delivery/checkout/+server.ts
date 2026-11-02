import { env } from '$env/dynamic/private';
import { checkoutDatabase } from '$lib/server/shop/checkout-database';
import { nationalCheckout } from '$lib/server/shop/national-checkout';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = ({ request, platform, fetch, getClientAddress }) =>
	nationalCheckout('checkout', request, env, checkoutDatabase(platform), fetch, getClientAddress());
