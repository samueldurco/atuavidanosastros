import { env } from '$env/dynamic/private';
import { nationalCheckout } from '$lib/server/shop/national-checkout';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = ({ request, platform, fetch, getClientAddress }) =>
	nationalCheckout(
		'checkout',
		request,
		env,
		(platform?.env as { ATVNA_CHECKOUT_DB?: D1Database } | undefined)?.ATVNA_CHECKOUT_DB,
		fetch,
		getClientAddress()
	);
