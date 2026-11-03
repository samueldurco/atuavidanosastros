import { approvedShopProducts } from './shop-catalog-map';
import { ShopHttpError } from './shop-http';
import { supplierText } from './supplier-response';

const models = {
	'12': { path: 'fotos-premium', shippingModel: 'photo', production: 3.19 },
	'3461': { path: 'quadro-classic', shippingModel: '3456', production: 114.9 },
	'9250': { path: 'poster', shippingModel: '9250', production: 14.9 },
	// The calculator groups all frames of the same size under a single geometry.
	'3467': { path: 'quadro-classic', shippingModel: '3462', production: 179.9 }
} as const;
export type DigipixSku = keyof typeof models;
const calculator = 'https://direto.digipix.com.br/navprazos.php';
const limit = 512 * 1024;
const unavailable = () => new ShopHttpError('carrier_unavailable', 503);
const photoSettings = { tamanho_ft: '15 x 21 ', tipopapel_ft: ' Fosco ', corpb_ft: ' Cor' };

function selectedValue(html: string, name: string, value: string) {
	const options = html.match(
		new RegExp('<select\\b[^>]*name="' + name + '"[^>]*>([\\s\\S]*?)</select>', 'i')
	)?.[1];
	const selected = [...(options ?? '').matchAll(/<option\b[^>]*\sselected\b[^>]*>/gi)];
	return selected.length === 1 && selected[0][0].match(/\svalue="([^"]*)"/i)?.[1] === value;
}

function inputValue(html: string, name: string, value: string) {
	const input = html.match(new RegExp('<input\\b[^>]*name="' + name + '"[^>]*>', 'i'))?.[0];
	return input?.match(/\svalue="([^"]*)"/i)?.[1] === value;
}

export function digipixSku(slug: string, variantId: string): DigipixSku | undefined {
	const variants = approvedShopProducts[slug]?.variantIds;
	if (variants?.length !== 1 || variants[0] !== variantId) return undefined;
	if (slug.startsWith('poster-')) return '9250';
	if (slug.startsWith('quadro-')) return '3467';
	return undefined;
}

export async function digipixAvailable(fetcher: typeof fetch, sku: DigipixSku) {
	const model = models[sku];
	const url = 'https://www.digipix.com.br/produto/' + model.path;
	const html = await supplierText(fetcher, url, {}, limit);
	for (const block of html.matchAll(
		/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi
	)) {
		const product = JSON.parse(block[1]);
		if (product?.['@type'] !== 'Product' || product.url !== url) continue;
		const offers: unknown = product.offers?.offers;
		if (!Array.isArray(offers)) return false;
		const found = offers.filter((offer) => offer?.sku === sku);
		return (
			found.length === 1 &&
			found[0]['@type'] === 'Offer' &&
			found[0].url === url &&
			found[0].availability === 'https://schema.org/InStock' &&
			found[0].priceCurrency === 'BRL' &&
			found[0].price === model.production
		);
	}
	return false;
}

export async function digipixRate(fetcher: typeof fetch, sku: DigipixSku, cep: string) {
	if (!/^\d{8}$/.test(cep)) throw new ShopHttpError('invalid_postal_code', 422);
	const { shippingModel } = models[sku];
	const photo = shippingModel === 'photo';
	const form = photo
		? new URLSearchParams({ ...photoSettings, copias_ft: '1', cep })
		: new URLSearchParams({ iddecoracao: shippingModel, quantidade_dc: '1', cep_dc: cep });
	const html = await supplierText(
		fetcher,
		calculator,
		{ method: 'POST', body: form },
		limit,
		'latin1'
	);
	const settings = photo ? photoSettings : { iddecoracao: shippingModel };
	if (
		!inputValue(html, photo ? 'cep' : 'cep_dc', cep) ||
		!inputValue(html, photo ? 'copias_ft' : 'quantidade_dc', '1') ||
		!Object.entries(settings).every(([name, value]) => selectedValue(html, name, value))
	) {
		throw unavailable();
	}
	const section = photo ? 'photo' : 'decoracao';
	const table = html.match(
		new RegExp(
			'<div\\s+class="box-val-' +
				section +
				'\\b[^"]*"[^>]*>\\s*<div[^>]*>\\s*<table[^>]*>([\\s\\S]*?)</table>',
			'i'
		)
	)?.[1];
	if (table === undefined) throw unavailable();
	const plain = table
		.replace(/<[^>]*>/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
	if (!plain) throw new ShopHttpError('delivery_unavailable', 422);
	const place = /^Cidade: (.{2,100}?) UF: ([A-Z]{2}) /.exec(plain);
	if (!place) throw unavailable();
	const rows = [
		...plain.matchAll(
			/Entrega (Convencional|Econômica): R\$ (\d{1,3}),(\d{2}) em aproximadamente (\d{1,2}) dias úteis\./g
		)
	];
	// Do not quote a partial table that contains a changed price field or unknown carrier.
	if (!rows.length || rows.length !== (plain.match(/Entrega /g) ?? []).length) throw unavailable();
	const rates = rows.map(([, service, reais, centavos, businessDays]) => ({
		id: 'digipix-' + (service === 'Econômica' ? 'economica' : 'convencional'),
		name: 'Entrega ' + service,
		cents: Number(reais) * 100 + Number(centavos),
		days: Number(businessDays) + 2
	}));
	if (
		new Set(rates.map(({ id }) => id)).size !== rates.length ||
		rates.some((r) => r.cents < 1 || r.cents > 50000 || r.days < 3 || r.days > 90)
	)
		throw unavailable();
	rates.sort((a, b) => a.cents - b.cents || a.days - b.days);
	const rate = rates[0];
	return {
		...rate,
		destination: { city: place[1], provinceCode: place[2] },
		basis: JSON.stringify([sku, shippingModel, cep, place[1], place[2], rate])
	};
}
