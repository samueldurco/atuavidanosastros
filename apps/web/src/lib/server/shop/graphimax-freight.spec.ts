import { describe, expect, it, vi } from 'vitest';
import reviewed from '$lib/data/shop-reviewed-offers.json';
import { graphimaxAvailable, graphimaxNotebook, graphimaxRate } from './graphimax-freight';
import { approvedShopProducts } from './shop-catalog-map';
import { physicalOffer, supplierItem } from './national-freight';

const listing = `<p>Código: DCFEC312</p><p>Produção: 7 dias úteis</p>
<div id="produto-preco-demanda-lista">[{"produto":"143","de":"1","ate":"49","preco_unit":"29.95"}]</div>
<option value="376" data-extra="0" data-opcao="revestimento"></option>
<option value="379" data-extra="0" data-opcao="opcao"></option>
<option value="380" data-extra="0" data-opcao="acabamento"></option>`;
const carrier = {
	titulo: 'Jadlog - .Package',
	servico: 3,
	valor: 35.730000000000004,
	prazo: 12,
	modulo: 'melhorenvio',
	sucesso: true,
	packages: [{ insurance_value: '29.95', products: [{ id: '1', quantity: 1 }] }]
};
const text = (s: string) => vi.fn<typeof fetch>(async () => new Response(s));
const freight = (services: unknown[]) => text(JSON.stringify({ fretes: { opcoes: services } }));

describe('GraphiMax single-unit A5 notebooks', () => {
	it('recognizes only the exact existing variants without opening sales', () => {
		const pieces = Object.values(approvedShopProducts).filter((p) =>
			p.handle.startsWith('caderno-')
		);
		expect(pieces).toHaveLength(12);
		for (const p of pieces) {
			const id = p.variantIds[0];
			expect(graphimaxNotebook(p.handle, id)).toBe(true);
			expect(graphimaxNotebook(p.handle, 'different')).toBe(false);
			if (!reviewed.some((offer) => offer.variantId === id))
				expect(() => physicalOffer(id)).toThrow();
		}
		expect(
			supplierItem({
				slug: 'caderno-aries',
				variantId: pieces[0].variantIds[0],
				priceBrl: 69.9,
				graphimaxSku: '143'
			})
		).toBe('graphimax/143');
	});
	it('checks the manufacturing price and each option for one copy', async () => {
		expect(await graphimaxAvailable(text(listing))).toBe(true);
		for (const changed of [
			listing.replace('29.95', '30.95'),
			listing.replace('data-extra="0"', 'data-extra="4"'),
			listing.replace('DCFEC312', 'DCFEC316'),
			listing.replace('7 dias', '9 dias'),
			listing.replace('<option ', '<option disabled ')
		]) {
			expect(await graphimaxAvailable(text(changed))).toBe(false);
		}
	});
	it('uses the official calculator, a single unit and the selected options; includes production and Pix time', async () => {
		const fetcher = freight([
			carrier,
			{ ...carrier, servico: 1, titulo: 'Correios - SEDEX', valor: 78.02, prazo: 6 }
		]);
		const rate = await graphimaxRate(fetcher, '35160001');
		expect(rate).toMatchObject({ id: 'graphimax-3', cents: 3573, days: 21 });
		const init = fetcher.mock.calls[0][1];
		expect(fetcher.mock.calls[0][0]).toBe(
			'https://www.graphimax.com.br/_cdn/widgets/web2print/Webtoprint.ajax.php'
		);
		expect(Object.fromEntries(new URLSearchParams(String(init?.body)))).toEqual({
			cep: '35160-001',
			ajax_acao: 'ajax_produto_frete_calcular',
			id: '143',
			quantidade: '1',
			tipo_arte: 'enviar',
			'variacoes[opcao]': '379',
			'variacoes[acabamento]': '380',
			'variacoes[revestimento]': '376'
		});
		expect(rate.basis).toContain('35160001');
	});
	it('declines missing or changed offers instead of rounding down costs or guessing dates', async () => {
		await expect(graphimaxRate(freight([]), '00000000')).rejects.toMatchObject({
			code: 'delivery_unavailable'
		});
		for (const changed of [
			{ ...carrier, packages: [] },
			{ ...carrier, prazo: null },
			{ ...carrier, valor: 0 },
			{ ...carrier, packages: [{ insurance_value: '60', products: [{ quantity: 2 }] }] }
		]) {
			await expect(graphimaxRate(freight([changed]), '35160001')).rejects.toMatchObject({
				code: 'carrier_unavailable'
			});
		}
	});
});
