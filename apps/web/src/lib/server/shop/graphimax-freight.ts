import { approvedShopProducts } from './shop-catalog-map';
import { ShopHttpError } from './shop-http';
import { supplierText } from './supplier-response';

const product = 'https://www.graphimax.com.br/produto/caderno-capa-dura-a5';
const calculator = 'https://www.graphimax.com.br/_cdn/widgets/web2print/Webtoprint.ajax.php';
const options = { revestimento: '376', opcao: '379', acabamento: '380' };
const unavailable = () => new ShopHttpError('carrier_unavailable', 503);

export function graphimaxNotebook(slug: string, variantId: string) {
	const ids = approvedShopProducts[slug]?.variantIds;
	return slug.startsWith('caderno-') && ids?.length === 1 && ids[0] === variantId;
}

export async function graphimaxAvailable(fetcher: typeof fetch) {
	const html = await supplierText(fetcher, product, {}, 512 * 1024);
	const buy = html.match(/<button\b([^>]*\bproduto-pagina-botao-comprar\b[^>]*)>/i);
	if (!buy || /\bdisabled\b/i.test(buy[1])) return false;
	const tiers = html.match(
		/<div\b[^>]*\bid=["']produto-preco-demanda-lista["'][^>]*>([^<]+)<\/div>/i
	);
	if (!tiers) return false;
	const prices: unknown = JSON.parse(tiers[1]);
	if (!Array.isArray(prices)) return false;
	const one = prices.filter(
		(p) => p?.produto === '143' && Number(p.de) === 1 && Number(p.ate) >= 1
	);
	if (one.length !== 1 || one[0].preco_unit !== '29.95') return false;
	const description = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
	if (!description.includes('Código: DCFEC312') || !description.includes('Produção: 7 dias úteis'))
		return false;
	const available = [...html.matchAll(/<option\b([^>]*)>/gi)]
		.filter(([, tag]) => !/\bdisabled\b/i.test(tag))
		.map(([, tag]) =>
			Object.fromEntries(
				[...tag.matchAll(/\b([\w-]+)=["']([^"']*)["']/g)].map(([, k, v]) => [k, v])
			)
		);
	return Object.entries(options).every(([key, value]) =>
		available.some((o) => o.value === value && o['data-opcao'] === key && o['data-extra'] === '0')
	);
}

export async function graphimaxRate(fetcher: typeof fetch, cep: string) {
	if (!/^\d{8}$/.test(cep)) throw new ShopHttpError('invalid_postal_code', 422);
	const fields = new URLSearchParams({
		cep: cep.slice(0, 5) + '-' + cep.slice(5),
		ajax_acao: 'ajax_produto_frete_calcular',
		id: '143',
		quantidade: '1',
		tipo_arte: 'enviar'
	});
	for (const [group, value] of Object.entries(options))
		fields.set('variacoes[' + group + ']', value);
	const text = await supplierText(
		fetcher,
		calculator,
		{
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
				Origin: 'https://www.graphimax.com.br',
				Referer: product,
				'X-Requested-With': 'XMLHttpRequest'
			},
			body: fields.toString()
		},
		128 * 1024
	);
	const services: unknown = JSON.parse(text)?.fretes?.opcoes;
	if (!Array.isArray(services)) throw unavailable();
	const rates = [];
	for (const service of services) {
		if (service?.sucesso !== true || service.modulo !== 'melhorenvio') continue;
		const cents = Math.round(service.valor * 100);
		if (
			!Number.isSafeInteger(service.servico) ||
			service.servico < 1 ||
			typeof service.titulo !== 'string' ||
			!service.titulo.trim() ||
			service.titulo.length > 100 ||
			typeof service.valor !== 'number' ||
			!Number.isSafeInteger(cents) ||
			cents <= 0 ||
			cents > 50000 ||
			!Number.isSafeInteger(service.prazo) ||
			service.prazo < 1 ||
			service.prazo > 81
		)
			throw unavailable();
		const packs = service.packages;
		if (
			!Array.isArray(packs) ||
			packs.length !== 1 ||
			Number(packs[0]?.insurance_value) !== 29.95 ||
			packs[0]?.products?.length !== 1 ||
			packs[0].products[0]?.quantity !== 1
		)
			throw unavailable();
		rates.push({
			id: 'graphimax-' + service.servico,
			name: service.titulo.trim(),
			cents,
			days: service.prazo + 7 + 2
		});
	}
	if (!rates.length) throw new ShopHttpError('delivery_unavailable', 422);
	if (new Set(rates.map((r) => r.id)).size !== rates.length) throw unavailable();
	rates.sort((a, b) => a.cents - b.cents || a.days - b.days || a.id.localeCompare(b.id));
	const rate = rates[0];
	return { ...rate, basis: JSON.stringify(['143', options, cep, rate]) };
}
