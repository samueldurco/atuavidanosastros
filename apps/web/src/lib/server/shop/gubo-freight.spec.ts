import { describe, expect, it, vi } from 'vitest';
import { guboAvailable, guboRate } from './gubo-freight';
import { fulfillmentKey, manufacturingAvailable, rateFor, type Offer } from './national-freight';

const env = { GUBO_FRETE_TOKEN: 'gubo_live_fixture' };
const v = { sku: 'CAM01-BR-P', product: 'CAM01', size: 'P', maxCostCents: 6480 };
const offer: Offer = { slug: 'camiseta-fixture', priceBrl: 99.9, variantId: 'fixture', gubo: v };
const catalogItem = {
	objeto: 'variante',
	sku: v.sku,
	produto: v.product,
	cor: { nome: 'Branco' },
	tamanho: 'P',
	disponivel: true,
	preco_unitario_centavos: 6480
};
const cep = '35160001';
const op = {
	servico: 'jadlog',
	preco_centavos: 1776,
	prazo_transporte_dias_uteis: 5,
	prazo_producao_dias_uteis: 7,
	prazo_total_dias_uteis: 12
};
function quote() {
	return {
		objeto: 'cotacao_frete',
		id: 'cot_Ab123',
		situacao: 'pronta',
		cep: '35160-001',
		simulada: false,
		valida_ate: new Date(Date.now() + 1_800_000).toISOString(),
		pacote: { pecas: 1 },
		itens: [{ sku: v.sku, produto: v.product, tamanho: v.size, quantidade: 1 }],
		opcoes: [op],
		escolha: { servico: 'jadlog', regra: 'mais_barata', preco_centavos: 1776 },
		sem_escolha: null
	};
}
const response = (data: unknown, headers?: HeadersInit) => Response.json(data, { headers });
describe('Gubo national checkout', () => {
	it('reads exact variant and quotes one unit for this CEP, without ordering or using the public simulator', async () => {
		const fetcher = vi.fn<typeof fetch>().mockImplementation(async (url, init) => {
			expect(new URL(String(url)).hostname).toBe(
				'kx75xapy8azwdvdnd4brts7y098e5qvg.buildprintusercontent.com'
			);
			expect(new Headers(init?.headers).get('authorization')).toBe('Bearer gubo_live_fixture');
			if (String(url).endsWith('/catalogo/variantes?sku=CAM01-BR-P&disponivel=true'))
				return response({ objeto: 'lista', dados: [catalogItem] });
			expect(String(url)).toMatch(/\/fretes\/cotacoes$/);
			expect(init?.method).toBe('POST');
			expect(JSON.parse(String(init?.body))).toEqual({
				cep,
				itens: [{ sku: v.sku, quantidade: 1 }],
				entrega: { preferencia: 'mais_barata' }
			});
			return response(quote());
		});
		expect(await manufacturingAvailable(env, fetcher, offer)).toBe(true);
		expect(await rateFor(env, fetcher, cep, offer)).toMatchObject({
			cents: 1776,
			days: 14,
			id: 'gubo-jadlog'
		});
		expect(fetcher).toHaveBeenCalledTimes(2);
		expect(fulfillmentKey(offer)).toBe('gubo:CAM01-BR-P');
	});
	it.each([{}, { GUBO_FRETE_TOKEN: 'gubo_test_fixture' }])(
		'requires a production key before contacting the supplier',
		async (config) => {
			const fetcher = vi.fn();
			await expect(guboRate(config, fetcher, cep, v)).rejects.toMatchObject({
				code: 'carrier_unavailable'
			});
			expect(fetcher).not.toHaveBeenCalled();
		}
	);
	it.each([
		{ sku: 'OTHER' },
		{ produto: 'OTHER' },
		{ tamanho: 'XGG' },
		{ cor: { nome: 'Preto' } },
		{ disponivel: false },
		{ preco_unitario_centavos: 6990 },
		{ preco_unitario_centavos: 0 }
	])('rejects unavailable variants or changed commercial terms %j', async (change) => {
		const fetcher = vi
			.fn()
			.mockResolvedValue(response({ objeto: 'lista', dados: [{ ...catalogItem, ...change }] }));
		expect(await guboAvailable(env, fetcher, v)).toBe(false);
	});
	it.each([
		{ simulada: true },
		{ cep: '01310-100' },
		{ valida_ate: '2020-01-01T00:00:00Z' },
		{ itens: [] },
		{ pacote: { pecas: 2 } },
		{ id: '../x' },
		{ opcoes: [{ ...op, preco_centavos: 1200 }] },
		{ opcoes: [{ ...op, prazo_total_dias_uteis: 2 }] },
		{
			opcoes: [{ ...op, servico: 'gubo-teste-padrao' }],
			escolha: { servico: 'gubo-teste-padrao', preco_centavos: 1776, regra: 'mais_barata' }
		}
	])('rejects an unverified freight quote %j', async (change) => {
		await expect(
			guboRate(env, vi.fn().mockResolvedValue(response({ ...quote(), ...change })), cep, v)
		).rejects.toMatchObject({ code: 'carrier_unavailable' });
	});
	it('does not sell when no carrier serves the address', async () => {
		const fetcher = vi
			.fn()
			.mockResolvedValue(
				response({ ...quote(), escolha: null, sem_escolha: { codigo: 'frete_indisponivel' } })
			);
		await expect(guboRate(env, fetcher, cep, v)).rejects.toMatchObject({
			code: 'delivery_unavailable',
			status: 422
		});
	});
	it('polls the original pending quote only after the supplier delay', async () => {
		vi.useFakeTimers();
		try {
			const fetcher = vi
				.fn()
				.mockResolvedValueOnce(
					response(
						{ objeto: 'cotacao_frete', id: 'cot_Ab123', situacao: 'pendente' },
						{ 'Retry-After': '3' }
					)
				)
				.mockResolvedValueOnce(response(quote()));
			const rate = guboRate(env, fetcher, cep, v);
			await vi.advanceTimersByTimeAsync(2999);
			expect(fetcher).toHaveBeenCalledTimes(1);
			await vi.advanceTimersByTimeAsync(1);
			expect(await rate).toMatchObject({ id: 'gubo-jadlog' });
			expect(fetcher.mock.calls[1][0]).toMatch(/\/fretes\/cotacoes\/cot_Ab123$/);
		} finally {
			vi.useRealTimers();
		}
	});
});
