import offers from '$lib/data/shop-reviewed-offers.json' with { type: 'json' };
import industrialSkus from './national-skus.json' with { type: 'json' };
import { graphimaxAvailable, graphimaxNotebook, graphimaxRate } from './graphimax-freight';
import { reviewedDestination } from '$lib/data/shop-commerce';
import { config, readApprovedProduct } from './shop-http';
import { hasControlCharacters } from './shopify-storefront';

import { digipixAvailable, digipixRate, digipixSku, type DigipixSku } from './digipix-freight';
import guboSkus from './national-gubo-skus.json' with { type: 'json' };
import { guboAvailable, guboRate, type GuboVariant } from './gubo-freight';
import { fail, provider, record, zip, type PrivateEnv } from './freight-provider';
export { fail, provider, record, zip, type PrivateEnv } from './freight-provider';

export const normal = (v: string) =>
	v.normalize('NFD').replace(/\p{M}/gu, '').toUpperCase().replace(/\s+/g, ' ').trim();
const uf = /^(AC|AL|AM|AP|BA|CE|DF|ES|GO|MA|MG|MS|MT|PA|PB|PE|PI|PR|RJ|RN|RO|RR|RS|SC|SE|SP|TO)$/;
export interface Offer {
	slug: string;
	variantId: string;
	priceBrl: number;
	dimonaSku?: string;
	dimonaRetailProductionDays?: number;
	gubo?: GuboVariant;
	digipixSku?: DigipixSku;
	graphimaxSku?: '143';
}
export function physicalOffer(id: unknown): Offer {
	const o = (offers as Offer[]).find((o) => o.variantId === id);
	if (!o) return fail('product_unavailable', 409);
	const variant = o.variantId.split('/').at(-1)!;
	const dimonaSku = (industrialSkus as Record<string, string>)[variant];
	const gubo = (guboSkus as Record<string, GuboVariant>)[variant];
	const wall = digipixSku(o.slug, o.variantId);
	const notebook = graphimaxNotebook(o.slug, o.variantId);
	const retailMug = o.dimonaRetailProductionDays !== undefined;
	if ([dimonaSku, gubo, wall, notebook, retailMug].filter(Boolean).length > 1)
		return fail('product_unavailable', 409);
	if (retailMug) {
		const days = o.dimonaRetailProductionDays!;
		if (!/^caneca-[a-z]+$/.test(o.slug) || !Number.isInteger(days) || days < 1 || days > 60)
			return fail('product_unavailable', 409);
		return o;
	}
	if (gubo) return { ...o, gubo };
	if (notebook) return { ...o, graphimaxSku: '143' };
	if (wall) return { ...o, digipixSku: wall };
	if (/^[A-Za-z0-9_-]{1,40}$/.test(dimonaSku ?? '')) return { ...o, dimonaSku };
	return fail('product_unavailable', 409);
}
export function supplierItem(o: Offer) {
	if (o.graphimaxSku) return 'graphimax/' + o.graphimaxSku;
	if (o.digipixSku) return 'digipix/' + o.digipixSku;
	return o.gubo ? 'gubo:' + o.gubo.sku : (o.dimonaSku ?? 'varejo-94');
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
	if (offer.graphimaxSku) return graphimaxAvailable(fetcher);
	if (offer.digipixSku) return digipixAvailable(fetcher, offer.digipixSku);
	if (offer.gubo) return guboAvailable(env, fetcher, offer.gubo);
	if (!env.DIMONA_FRETE_TOKEN) return fail('carrier_unavailable', 503);
	// The reviewed retail model 94 and the Dropsimples SKU for 310 ml are distinct.
	return offer.dimonaRetailProductionDays !== undefined
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
export function shippingRate(
	raw: unknown,
	retailDays?: number,
	secret = ''
): Rate & { basis: string } {
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
	const result =
		retailDays !== undefined
			? { ...first, days: first.days + retailDays + 2 }
			: {
					name: 'Entrega padrão',
					id: 'standard',
					cents: Math.max(first.cents, standard.cents),
					days: Math.max(first.days, standard.days) + 6
				};
	if (result.days > 90 || result.cents > 50000) return fail('delivery_unavailable');
	// Both lists can determine the standard service. Seal their identities and terms so
	// replacing one carrier with another at the same price still requires a fresh quote.
	return {
		...result,
		basis: JSON.stringify(retailDays !== undefined ? [first] : [first, standard])
	};
}
export async function rateFor(
	env: PrivateEnv,
	fetcher: typeof fetch,
	cep: string,
	offer: Offer
): Promise<Rate & { basis: string; destination?: { city: string; provinceCode: string } }> {
	if (offer.graphimaxSku) return graphimaxRate(fetcher, cep);
	if (offer.digipixSku) return digipixRate(fetcher, offer.digipixSku, cep);
	if (offer.gubo) return guboRate(env, fetcher, cep, offer.gubo);
	if (!env.DIMONA_FRETE_TOKEN) return fail('carrier_unavailable', 503);
	return shippingRate(
		await provider(fetcher, dimona + '/shipping', {
			method: 'POST',
			headers: supplierHeaders(env),
			body: JSON.stringify({ zipcode: cep, quantity: '1' })
		}),
		offer.dimonaRetailProductionDays,
		env.DIMONA_FRETE_TOKEN
	);
}
