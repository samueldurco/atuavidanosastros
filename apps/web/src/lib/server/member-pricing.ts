import {
	activeMemberPriceMembership,
	resolveMemberPrice,
	type MemberPriceCondition,
	type MemberPriceItem,
	type MemberPriceMembership,
	type MemberPriceRelease
} from '@atv/domain';
import offers from '$lib/data/shop-reviewed-offers.json' with { type: 'json' };
import { json } from '@sveltejs/kit';

export interface MemberPricingSnapshot {
	status: 'anonymous' | 'inactive' | 'active' | 'unavailable';
	membership: MemberPriceMembership | null;
	checkedAt: string;
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const plans = new Set(['essencial', 'ampliado', 'premium']);
const statuses = new Set(['pending', 'active', 'cancelled', 'suspended', 'expired']);
function membershipRow(value: unknown): MemberPriceMembership | null {
	if (!value || typeof value !== 'object') return null;
	const row = value as Record<string, unknown>;
	const status = typeof row.status === 'string' ? row.status.toLowerCase() : '';
	if (
		typeof row.id !== 'string' ||
		!uuid.test(row.id) ||
		typeof row.plan_id !== 'string' ||
		!plans.has(row.plan_id) ||
		!statuses.has(status) ||
		typeof row.starts_at !== 'string' ||
		typeof row.ends_at !== 'string'
	)
		return null;
	return {
		id: row.id,
		planId: row.plan_id as MemberPriceMembership['planId'],
		status: status as MemberPriceMembership['status'],
		startsAt: row.starts_at,
		endsAt: row.ends_at
	};
}
/** Commercial membership only. A private evaluation cycle never grants a paid benefit. */
export async function memberPricingSnapshot(
	locals: App.Locals,
	profileId?: string,
	now = Date.now()
): Promise<MemberPricingSnapshot> {
	const checkedAt = new Date(now).toISOString();
	const snapshot = (
		status: MemberPricingSnapshot['status'],
		membership: MemberPriceMembership | null = null
	): MemberPricingSnapshot => ({ status, membership, checkedAt });
	if (!locals?.supabase) return snapshot('unavailable');
	if (profileId !== undefined && !uuid.test(profileId)) return snapshot('unavailable');
	try {
		const claims = await locals.supabase.auth.getClaims();
		if (claims.error)
			return snapshot(
				claims.error.name === 'AuthSessionMissingError' ? 'anonymous' : 'unavailable'
			);
		const ownerId = claims.data?.claims.sub;
		if (typeof ownerId !== 'string' || !uuid.test(ownerId)) return snapshot('anonymous');
		let query = locals.supabase
			.from('atv_plus_memberships')
			.select('id,plan_id,status,starts_at,ends_at')
			.eq('owner_id', ownerId)
			.in('status', ['ACTIVE', 'CANCELLED', 'active', 'cancelled'])
			.lte('starts_at', checkedAt)
			.gt('ends_at', checkedAt);
		if (profileId) query = query.eq('profile_id', profileId);
		const result = await query.limit(101).abortSignal(AbortSignal.timeout(10000));
		if (result.error || !Array.isArray(result.data) || result.data.length > 100)
			return snapshot('unavailable');
		const parsed = result.data.map(membershipRow);
		if (parsed.some((row) => row === null)) return snapshot('unavailable');
		const membership = activeMemberPriceMembership(parsed as MemberPriceMembership[], now);
		return snapshot(membership ? 'active' : 'inactive', membership);
	} catch {
		return snapshot('unavailable');
	}
}
/** Reuse from account, carts and checkout after loading authoritative item/offer data server-side. */
export function memberPriceForSnapshot(
	snapshot: MemberPricingSnapshot,
	item: MemberPriceItem,
	conditions: readonly MemberPriceCondition[] = [],
	release?: MemberPriceRelease
) {
	return resolveMemberPrice({
		item,
		membership: snapshot.membership,
		conditions,
		...(release ? { release } : {}),
		now: Date.parse(snapshot.checkedAt)
	});
}
export function reviewedShopMemberPrice(
	snapshot: MemberPricingSnapshot,
	variantId: string,
	currentPriceCents?: number
) {
	const offer = offers.find((item) => item.variantId === variantId);
	if (!offer) return null;
	const item: MemberPriceItem = {
		id: variantId,
		kind: 'physical-single',
		regularPriceCents: currentPriceCents ?? Math.round(offer.priceBrl * 100)
	};
	return {
		slug: offer.slug,
		canonicalUrl: '/loja/peca/' + offer.slug,
		currency: 'BRL' as const,
		priceSource:
			currentPriceCents === undefined ? ('reviewed-catalog' as const) : ('provider' as const),
		requiresCheckoutRevalidation: true,
		...memberPriceForSnapshot(snapshot, item),
		// No item has a complete approved cost/floor and checkout release yet.
		memberCheckoutSupported: false
	};
}
/** Add the shared rule to already gated catalog/product responses, using their live BRL values. */
export async function withShopMemberPricing(response: Response, locals: App.Locals) {
	if (!response.ok) return response;
	const body = (await response.json()) as Record<string, unknown>;
	const products = Array.isArray(body.products)
		? body.products
		: body.product
			? [body.product]
			: [];
	const snapshot = await memberPricingSnapshot(locals);
	const items = products.flatMap((product: unknown) => {
		if (
			!product ||
			typeof product !== 'object' ||
			!Array.isArray((product as { variants?: unknown }).variants)
		)
			return [];
		return (product as { variants: unknown[] }).variants.flatMap((value) => {
			if (!value || typeof value !== 'object') return [];
			const variant = value as {
				id?: unknown;
				price?: { amount?: unknown; currencyCode?: unknown };
			};
			if (
				typeof variant.id !== 'string' ||
				variant.price?.currencyCode !== 'BRL' ||
				typeof variant.price.amount !== 'string' ||
				!/^\d+(?:\.\d{1,2})?$/.test(variant.price.amount)
			)
				return [];
			const cents = Math.round(Number(variant.price.amount) * 100);
			if (!Number.isSafeInteger(cents) || cents < 0) return [];
			const price = reviewedShopMemberPrice(snapshot, variant.id, cents);
			return price ? [price] : [];
		});
	});
	const headers = new Headers(response.headers);
	headers.set('Cache-Control', 'private, no-store');
	headers.delete('ETag');
	headers.delete('Last-Modified');
	return json(
		{ ...body, memberPricing: { snapshot, items, memberCheckoutSupported: false } },
		{ status: response.status, headers }
	);
}
export async function shopMemberPriceFor(
	locals: App.Locals,
	variantId: string,
	profileId?: string,
	now = Date.now()
) {
	const snapshot = await memberPricingSnapshot(locals, profileId, now);
	return { snapshot, item: reviewedShopMemberPrice(snapshot, variantId) };
}
