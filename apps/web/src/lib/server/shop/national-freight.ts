import offers from '$lib/data/shop-reviewed-offers.json' with { type: 'json' };
import industrialSkus from './national-skus.json' with { type: 'json' };
import { reviewedDestination } from '$lib/data/shop-commerce';
import { config, readApprovedProduct, ShopHttpError } from './shop-http';
import { hasControlCharacters } from './shopify-storefront';

export type PrivateEnv = Record<string, string | undefined>;
export const fail = (code: string, status = 422): never => {
	throw new ShopHttpError(code, status);
};
export const record = (v: unknown): Record<string, unknown> =>
	v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
export const zip = (v: unknown): string =>
	typeof v === 'string' && /^\d{5}-?\d{3}$/.test(v.trim()) ? v.trim().replace('-', '') : '';
export const normal = (v: string) =>
	v.normalize('NFD').replace(/\p{M}/gu, '').toUpperCase().replace(/\s+/g, ' ').trim();
const uf = /^(AC|AL|AM|AP|BA|CE|DF|ES|GO|MA|MG|MS|MT|PA|PB|PE|PI|PR|RJ|RN|RO|RR|RS|SC|SE|SP|TO)$/;
export interface Offer {
	slug: string;
	variantId: string;
	priceBrl: number;
	dimonaSku?: string;
}
export function physicalOffer(id: unknown): Offer {
	const o = (offers as Offer[]).find((o) => o.variantId === id);
	const dimonaSku = o && (industrialSkus as Record<string, string>)[o.variantId.split('/').at(-1)!];
	if (!o || !(o.slug === 'caneca-aries' || /^[A-Za-z0-9_-]{1,40}$/.test(dimonaSku ?? '')))
		return fail('product_unavailable', 409);
	return { ...o, dimonaSku: o.slug === 'caneca-aries' ? undefined : dimonaSku };
}
export async function provider(fetcher: typeof fetch, url: string, init: RequestInit = {}) {
	const res = await fetcher(url, {
		...init,
		redirect: 'manual',
		signal: AbortSignal.timeout(7000)
	});
	if (!res.ok) throw new Error('upstream');
	const reader = res.body?.getReader();
	if (!reader) throw new Error('upstream');
	const bytes: Uint8Array[] = [];
	let n = 0;
	try {
		for (;;) {
			const { value, done } = await reader.read();
			if (done) break;
			n += value.length;
			if (n > 128 * 1024) {
				await reader.cancel();
				throw new Error('upstream');
			}
			bytes.push(value);
		}
	} finally {
		reader.releaseLock();
	}
	const all = new Uint8Array(n);
	let pos = 0;
	for (const b of bytes) {
		all.set(b, pos);
		pos += b.length;
	}
	return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(all)) as unknown;
}
export async function locality(fetcher: typeof fetch, cep: string) {
	const known = reviewedDestination(cep);
	if (known) return { city: known.city, provinceCode: known.provinceCode };
	const urls = [
		'https://brasilapi.com.br/api/cep/v1/' + cep,
		'https://viacep.com.br/ws/' + cep + '/json/'
	];
	let notFound = false;
	for (const url of urls) {
		try {
			const a = record(await provider(fetcher, url));
			const city = a.city ?? a.localidade,
				state = a.state ?? a.uf;
			if (a.erro === true || a.erro === 'true') notFound = true;
			if (
				zip(a.cep) === cep &&
				typeof city === 'string' &&
				city.length > 1 &&
				city.length <= 100 &&
				typeof state === 'string' &&
				uf.test(state)
			)
				return { city, provinceCode: state };
		} catch {
			/* An independent source may still resolve the postal code. */
		}
	}
	return fail(
		notFound ? 'postal_code_not_found' : 'postal_lookup_unavailable',
		notFound ? 422 : 503
	);
}
export const dimona = 'https://admin.camisadimona.com.br/api/v2';
const supplierHeaders = (env: PrivateEnv) => ({
	'api-key': env.DIMONA_FRETE_TOKEN!,
	Accept: 'application/json',
	'Content-Type': 'application/json'
});
export async function manufacturingAvailable(env: PrivateEnv, fetcher: typeof fetch, offer: Offer) {
	// The 325 ml mug is a retail pilot; the Dropsimples 310 ml SKU is a different item.
	return offer.slug === 'caneca-aries'
		? Promise.resolve(true)
		: provider(fetcher, dimona + '/sku/' + offer.dimonaSku + '/availability', {
				headers: supplierHeaders(env)
			}).then((raw) => {
				const data = record(raw),
					key = offer.dimonaSku!,
					value = data[key] ?? data[key.replace(/^0+(?=\d)/, '')];
				return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
			});
}
export async function checkOffer(
	env: PrivateEnv,
	fetcher: typeof fetch,
	offer: Offer,
	ip?: string
) {
	const store = config(env);
	if (!store) return fail('shop_not_configured', 503);
	const [product, hasStock] = await Promise.all([
		readApprovedProduct(store, fetcher, offer.slug, ip),
		manufacturingAvailable(env, fetcher, offer)
	]);
	const variant = product?.variants.find((v) => v.id === offer.variantId);
	if (
		!hasStock ||
		!product?.availableForSale ||
		!variant?.availableForSale ||
		variant.price.currencyCode !== 'BRL' ||
		Number(variant.price.amount) !== offer.priceBrl
	)
		fail('offer_changed', 409);
}
export interface Rate {
	id: string;
	name: string;
	cents: number;
	days: number;
}
export function shippingRate(raw: unknown, mug: boolean, secret = ''): Rate & { basis: string } {
	if (!Array.isArray(raw) || raw.length > 128) return fail('carrier_unavailable', 503);
	const rates: Rate[] = [];
	for (const item of raw) {
		const { value, name, business_days, delivery_method_id, currency, currency_code } =
			record(item);
		if (
			typeof name !== 'string' ||
			!name.trim() ||
			name.length > 100 ||
			hasControlCharacters(name, 0x7f) ||
			/[<>]/.test(name) ||
			(secret && name.includes(secret)) ||
			[currency, currency_code].some((v) => v != null && v !== 'BRL')
		)
			return fail('carrier_unavailable', 503);
		const price = String(value),
			id = String(delivery_method_id);
		if (
			!/^(?:0|[1-9]\d{0,5})(?:\.\d{1,2})?$/.test(price) ||
			!/^\d{1,15}$/.test(id) ||
			!Number.isInteger(business_days) ||
			Number(business_days) < 0
		)
			return fail('carrier_unavailable', 503);
		if (Number(price) <= 0) continue;
		rates.push({
			id,
			name: name.trim(),
			cents: Math.round(Number(price) * 100),
			days: Number(business_days)
		});
	}
	if (!rates.length) return fail('delivery_unavailable');
	rates.sort((a, b) => a.cents - b.cents || b.days - a.days || a.id.localeCompare(b.id));
	const first = rates[0],
		standard = rates.find((x) => ['16594', '1', '2'].includes(x.id)) ?? first;
	const result = mug
		? { ...first, days: first.days + 5 }
		: {
				name: 'Entrega padrão',
				id: 'standard',
				cents: Math.max(first.cents, standard.cents),
				days: Math.max(first.days, standard.days) + 6
			};
	if (result.days > 90 || result.cents > 50000) return fail('delivery_unavailable');
	// Both lists can determine the standard service. Seal their identities and terms so
	// replacing one carrier with another at the same price still requires a fresh quote.
	return { ...result, basis: JSON.stringify(mug ? [first] : [first, standard]) };
}
export async function rateFor(env: PrivateEnv, fetcher: typeof fetch, cep: string, offer: Offer) {
	return shippingRate(
		await provider(fetcher, dimona + '/shipping', {
			method: 'POST',
			headers: supplierHeaders(env),
			body: JSON.stringify({ zipcode: cep, quantity: '1' })
		}),
		offer.slug === 'caneca-aries',
		env.DIMONA_FRETE_TOKEN
	);
}
