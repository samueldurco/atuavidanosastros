import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import { isShopCommerceEligible } from '$lib/data/shop-commerce';
import { memberPricingSnapshot, reviewedShopMemberPrice } from '$lib/server/member-pricing';
import { readShopSale } from '$lib/server/shop/seller-identity';
import type { RequestHandler } from './$types';

const headers = { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow' };
export const GET: RequestHandler = async ({ locals, url }) => {
	if (
		[...url.searchParams.keys()].some(
			(key) =>
				(key !== 'variantId' && key !== 'profileId') || url.searchParams.getAll(key).length !== 1
		)
	)
		return json({ code: 'invalid_member_price_query' }, { status: 400, headers });
	const profileId = url.searchParams.get('profileId') ?? undefined;
	if (
		profileId !== undefined &&
		!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(profileId)
	)
		return json({ code: 'invalid_profile' }, { status: 400, headers });
	const snapshot = await memberPricingSnapshot(locals, profileId);
	if (snapshot.status === 'unavailable')
		return json({ snapshot, code: 'member_price_unavailable' }, { status: 503, headers });
	const variantId = url.searchParams.get('variantId');
	if (!variantId) return json({ snapshot }, { headers });
	const sale = readShopSale(env);
	const item = reviewedShopMemberPrice(snapshot, variantId);
	if (!sale || !item || !isShopCommerceEligible(item.slug, sale.ariesOnly))
		return json({ code: 'item_unavailable' }, { status: 404, headers });
	return json({ snapshot, item }, { headers });
};
