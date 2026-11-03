import { env } from '$env/dynamic/private';
import { error, fail, redirect } from '@sveltejs/kit';
import { isShopCommerceEligible } from '$lib/data/shop-commerce';
import { shopPreviews } from '$lib/data/shop-products';
import { openQuote } from '$lib/server/shop/national-draft';
import { physicalOffer } from '$lib/server/shop/national-freight';
import { readShopSale } from '$lib/server/shop/seller-identity';
import type { Actions, PageServerLoad } from './$types';

const cookie = 'atv_shop_quote';
async function resolveQuote(token: unknown, slug: string) {
	const sale = readShopSale(env);
	if (!sale || !env.ATVNA_CHECKOUT_SIGNING_KEY || !isShopCommerceEligible(slug, sale.ariesOnly))
		return null;
	try {
		const q = await openQuote(token, env.ATVNA_CHECKOUT_SIGNING_KEY, Math.floor(Date.now() / 1000));
		const offer = physicalOffer(q.variantId);
		if (
			offer.slug !== slug ||
			q.unit !== Math.round(offer.priceBrl * 100) ||
			!/^[a-f0-9-]{36}$/.test(q.nonce)
		)
			return null;
		return { q, factoryAddress: Boolean(offer.dimonaSku) };
	} catch {
		return null;
	}
}
export const actions: Actions = {
	default: async ({ params, request, cookies, url }) => {
		const token = (await request.formData()).get('token');
		const quote = await resolveQuote(token, params.slug);
		if (!quote || typeof token !== 'string' || params.quoteId)
			return fail(409, { unavailable: true });
		const path = '/loja/checkout/' + params.slug + '/' + quote.q.nonce;
		cookies.set(cookie, token, {
			path,
			secure: url.protocol === 'https:',
			httpOnly: true,
			sameSite: 'lax',
			maxAge: quote.q.expires - Math.floor(Date.now() / 1000)
		});
		redirect(303, path);
	}
};
export const load: PageServerLoad = async ({ params, cookies, setHeaders }) => {
	setHeaders({
		'cache-control': 'private, no-store',
		'referrer-policy': 'same-origin',
		'x-robots-tag': 'noindex, nofollow'
	});
	const piece = shopPreviews.find((item) => item.slug === params.slug);
	if (!piece) error(404, 'Peça não encontrada');
	const token = cookies.get(cookie);
	const resolved = token && params.quoteId ? await resolveQuote(token, params.slug) : null;
	const q = resolved?.q;
	return {
		slug: params.slug,
		title: piece.title,
		checkout:
			q && resolved && q.nonce === params.quoteId
				? {
						token: token!,
						variant: q.variantLabel,
						postalCode: q.postalCode,
						city: q.city,
						provinceCode: q.provinceCode,
						unit: q.unit,
						shipping: q.shipping,
						service: q.service,
						days: q.days,
						factoryAddress: resolved.factoryAddress
					}
				: null
	};
};
