import { env } from '$env/dynamic/private';
import { shopCart } from '$lib/server/shop/shop-http';
import { json } from '@sveltejs/kit';
import { memberPricingSnapshot } from '$lib/server/member-pricing';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, fetch, getClientAddress, locals }) => {
	const result = await shopCart(request, env, fetch, getClientAddress());
	if (!result.ok) return result;
	const snapshot = await memberPricingSnapshot(locals);
	const headers = new Headers(result.headers);
	headers.set('Cache-Control', 'private, no-store');
	headers.delete('ETag');
	headers.delete('Last-Modified');
	return json(
		{
			...((await result.json()) as Record<string, unknown>),
			memberPricing: { snapshot, memberCheckoutSupported: false }
		},
		{ status: result.status, headers }
	);
};
