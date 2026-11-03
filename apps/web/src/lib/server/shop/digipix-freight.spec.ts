import { describe, expect, it, vi } from 'vitest';
import { approvedShopProducts } from './shop-catalog-map';
import { digipixAvailable, digipixRate, digipixSku } from './digipix-freight';
import { physicalOffer, supplierItem } from './national-freight';
import reviewedOffers from '$lib/data/shop-reviewed-offers.json' with { type: 'json' };

const cep = '35160001';
const sku = '9250';
const quoteHtml = `<select name="iddecoracao"><option value="9250" selected>Pôster</option></select>
<input name="cep_dc" value="35160001"><input name="quantidade_dc" value="1">
<div class="box-val-decoracao col-xs-12"><div class="table-responsive"><table>
<tr><td>Cidade:</td><td>Ipatinga</td></tr><tr><td>UF:</td><td>MG</td></tr>
<tr><td>Entrega Convencional:</td><td><b>R$ 41,90</b></td><td>em aproximadamente 10 dias úteis.</td></tr>
<tr><td>Entrega Econômica:</td><td><b>R$ 32,90</b></td><td>em aproximadamente 15 dias úteis.</td></tr>
</table></div></div>`;
const url = 'https://www.digipix.com.br/produto/poster';
const catalogOffer = {
	'@type': 'Offer',
	sku,
	price: 14.9,
	priceCurrency: 'BRL',
	availability: 'https://schema.org/InStock',
	url
};
const catalog = (rows: unknown[]) =>
	'<script type="application/ld+json">' +
	JSON.stringify({ '@type': 'Product', url, offers: { offers: rows } }) +
	'</script>';
const fetchHtml = (html: string, latin = false) =>
	vi.fn<typeof fetch>(
		async () => new Response(latin ? Uint8Array.from(html, (c) => c.charCodeAt(0)) : html)
	);

describe('Digipix national fulfillment', () => {
	it('identifies the 28 existing single-variant wall pieces and notebooks and respects the separate commercial review', () => {
		const pieces = Object.values(approvedShopProducts).filter((p) =>
			/^(?:poster|quadro|caderno)-/.test(p.handle)
		);
		expect(pieces).toHaveLength(28);
		for (const p of pieces) {
			const id = p.variantIds[0];
			const skuByType = { poster: '12', caderno: '2176', quadro: '3467' } as const;
			expect(digipixSku(p.handle, id)).toBe(
				skuByType[p.handle.split('-')[0] as keyof typeof skuByType]
			);
			expect(digipixSku(p.handle, id + '0')).toBeUndefined();
			if (!reviewedOffers.some((o) => o.variantId === id))
				expect(() => physicalOffer(id)).toThrow();
		}
		expect(
			supplierItem({ slug: 'poster-aries', priceBrl: 39.9, variantId: 'test', digipixSku: sku })
		).toBe('digipix/9250');
	});
	it('uses the price, stock, currency and identity of the exact catalog offer', async () => {
		expect(await digipixAvailable(fetchHtml(catalog([catalogOffer])), sku)).toBe(true);
		for (const diff of [
			{ price: 15 },
			{ availability: 'https://schema.org/OutOfStock' },
			{ priceCurrency: 'USD' },
			{ sku: '9249' }
		]) {
			expect(await digipixAvailable(fetchHtml(catalog([{ ...catalogOffer, ...diff }])), sku)).toBe(
				false
			);
		}
		expect(await digipixAvailable(fetchHtml(catalog([catalogOffer, catalogOffer])), sku)).toBe(
			false
		);
	});
	it('returns the cheaper quoted service and adds two days for the manual Pix', async () => {
		const request = fetchHtml(quoteHtml, true);
		const rate = await digipixRate(request, sku, cep);
		expect(rate).toMatchObject({
			id: 'digipix-economica',
			name: 'Entrega Econômica',
			cents: 3290,
			destination: { city: 'Ipatinga', provinceCode: 'MG' },
			days: 17
		});
		expect(request.mock.calls[0][1]?.body?.toString()).toBe(
			'iddecoracao=9250&quantidade_dc=1&cep_dc=35160001'
		);
		const frame = await digipixRate(
			fetchHtml(quoteHtml.replace('value="9250"', 'value="3462"'), true),
			'3467',
			cep
		);
		expect(frame.basis).not.toBe(rate.basis);
	});
	it.each([
		['3461', '3456', 114.9, 'quadro-classic'],
		['12', 'photo', 3.19, 'fotos-premium']
	] as const)(
		'quotes the optional format %s without changing any existing offer',
		async (sku, model, price, path) => {
			const offerUrl = 'https://www.digipix.com.br/produto/' + path;
			const offer = { ...catalogOffer, sku, price, url: offerUrl };
			expect(await digipixAvailable(fetchHtml(catalog([offer]).replace(url, offerUrl)), sku)).toBe(
				true
			);
			const photoFields =
				'<select name="tamanho_ft"><option selected value="15 x 21 ">15 x 21</option></select>' +
				'<select name="tipopapel_ft"><option selected value=" Fosco ">Fosco</option></select>' +
				'<select name="corpb_ft"><option selected value=" Cor">Cor</option></select>' +
				'<input name="cep" value="35160001"><input name="copias_ft" value="1">';
			const photoTable = quoteHtml
				.slice(quoteHtml.indexOf('<div'))
				.replace('box-val-decoracao', 'box-val-photo')
				.replace('32,90', '26,90');
			const html =
				model === 'photo'
					? quoteHtml + photoFields + photoTable
					: quoteHtml
							.replace('value="9250"', 'value="3456"')
							.replace('41,90', '74,90')
							.replace('32,90', '59,90');
			const fetcher = fetchHtml(html, true);
			const actual = await digipixRate(fetcher, sku, cep);
			expect(actual).toMatchObject({
				cents: model === 'photo' ? 2690 : 5990,
				days: 17,
				destination: { city: 'Ipatinga', provinceCode: 'MG' }
			});
			const form = fetcher.mock.calls[0][1]?.body as URLSearchParams;
			expect(Object.fromEntries(form)).toEqual(
				model === 'photo'
					? {
							tamanho_ft: '15 x 21 ',
							tipopapel_ft: ' Fosco ',
							corpb_ft: ' Cor',
							copias_ft: '1',
							cep
						}
					: { iddecoracao: '3456', quantidade_dc: '1', cep_dc: cep }
			);
			if (model === 'photo') {
				for (const bad of [
					'15 x 21 ',
					' Fosco ',
					' Cor',
					'name="copias_ft" value="1"',
					'name="cep" value="35160001"',
					'box-val-photo'
				]) {
					await expect(
						digipixRate(fetchHtml(html.replace(bad, 'missing'), true), sku, cep)
					).rejects.toThrow();
				}
			}
		}
	);
	it('quotes the printed Colegial notebook using its dedicated form and response table', async () => {
		const offerUrl = 'https://www.digipix.com.br/produto/cadernos';
		const offer = { ...catalogOffer, sku: '2176', price: 39.9, url: offerUrl };
		expect(await digipixAvailable(fetchHtml(catalog([offer]).replace(url, offerUrl)), '2176')).toBe(
			true
		);
		const notebookHtml = quoteHtml
			.replace('iddecoracao', 'idfotopresente')
			.replace('value="9250"', 'value="2176"')
			.replace('cep_dc', 'cep_fp')
			.replace('quantidade_dc', 'quantidade_fp')
			.replace('box-val-decoracao', 'box-val-fotopresente')
			.replace('41,90', '33,90')
			.replace('32,90', '26,90');
		const otherTable =
			'<div class="box-val-fotopresente box-val-estojo col-xs-12"><div><table></table></div></div>';
		const fetcher = fetchHtml(quoteHtml + otherTable + notebookHtml, true);
		expect(await digipixRate(fetcher, '2176', cep)).toMatchObject({ cents: 2690, days: 17 });
		expect(Object.fromEntries(fetcher.mock.calls[0][1]?.body as URLSearchParams)).toEqual({
			idfotopresente: '2176',
			quantidade_fp: '1',
			cep_fp: cep
		});
		for (const field of [
			'value="2176"',
			'name="cep_fp"',
			'name="quantidade_fp"',
			'box-val-fotopresente'
		]) {
			await expect(
				digipixRate(fetchHtml(quoteHtml + notebookHtml.replace(field, ''), true), '2176', cep)
			).rejects.toThrow();
		}
	});
	it.each([
		['wrong CEP', quoteHtml.replace(cep, '36960000')],
		['wrong geometry', quoteHtml.replace('value="9250"', 'value="3462"')],
		['wrong quantity', quoteHtml.replace('value="1"', 'value="2"')],
		['unexpected prices', quoteHtml.replace('R$ 32,90', 'USD 2,00')],
		['duplicated service', quoteHtml.replace('Convencional', 'Econômica')],
		['no service', quoteHtml.replace(/<table>[\s\S]*?<\/table>/, '<table></table>')],
		['oversized response', 'x'.repeat(513 * 1024)]
	])('rejects %s', async (_name, html) => {
		await expect(digipixRate(fetchHtml(html, true), sku, cep)).rejects.toThrow();
	});
});
