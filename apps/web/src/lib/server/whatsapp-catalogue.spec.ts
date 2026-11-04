import { atvPlusCommercialOffers } from '@atv/domain';
import { describe, expect, it, vi } from 'vitest';
import { loadConsultationCatalogue } from './whatsapp-catalogue';
import { replyToConsultation } from './whatsapp-consultation';

function publicRow(index = 0, totalMinor = 12_345) {
	const definition = atvPlusCommercialOffers[index];
	return {
		id: definition.id,
		plan_id: definition.planId,
		term_months: definition.termMonths,
		commercial_enabled: true,
		total_minor: totalMinor,
		currency: 'BRL'
	};
}

function fixture(data: unknown) {
	const abortSignal = vi.fn(async () => ({ data, error: null as unknown }));
	const rpc = vi.fn(() => ({ abortSignal }));
	return { client: { rpc }, abortSignal, rpc };
}

it('does not query commerce with the commercial checkout gate closed', async () => {
	const { client, rpc } = fixture([publicRow()]);
	const result = await loadConsultationCatalogue({
		client,
		checkoutEnabled: false
	});
	expect(rpc).not.toHaveBeenCalled();
	expect(result.products).toEqual([]);
	expect(result).not.toHaveProperty('freeToolIds');
});

it('reads only public offers with a timeout and links the canonical authenticated purchase page', async () => {
	const { client, rpc, abortSignal } = fixture([publicRow()]);
	const catalogue = await loadConsultationCatalogue({ client, checkoutEnabled: true });
	expect(rpc).toHaveBeenCalledExactlyOnceWith('atv_plus_public_offers');
	expect(abortSignal).toHaveBeenCalledExactlyOnceWith(expect.any(AbortSignal));
	expect(catalogue.products).toHaveLength(1);
	expect(catalogue.products[0]).toMatchObject({
		id: 'atv-plus',
		href: '/atv-mais',
		available: true,
		checkoutAvailable: true,
		commercialType: 'paid',
		currency: 'BRL',
		paidPricesMinor: [12_345]
	});
	expect(catalogue.products[0].priceText.replaceAll('\u00a0', ' ')).toBe(
		'Pagamento único por período:\nEssencial · 3 meses: R$ 123,45'
	);
	const reply = replyToConsultation({ text: 'Quero receber previsões regularmente', catalogue });
	expect(reply.productId).toBe('atv-plus');
	expect(reply.destination).toBe('https://atuavidanosastros.com.br/atv-mais');
	expect(reply.reply).toContain('Essencial · 3 meses');
	expect(reply.reply).toContain('programação do plano');
	expect(reply.reply).toContain('PDF pelo WhatsApp');
	expect(reply.reply).not.toMatch(/24 horas|pay\.hotmart|sck=/);
});

it('aggregates every authorized plan and term in canonical order without picking a default', async () => {
	const rows = atvPlusCommercialOffers.map((_, index) => publicRow(index, 2_147_483_647));
	const { client } = fixture(rows.toReversed());
	const catalogue = await loadConsultationCatalogue({ client, checkoutEnabled: true });
	const { products } = catalogue;
	expect(products).toHaveLength(1);
	expect(products[0].paidPricesMinor).toEqual(Array(9).fill(2_147_483_647));
	const lines = products[0].priceText.split('\n');
	expect(lines).toHaveLength(10);
	expect(lines.slice(1).map((line) => line.split(':')[0])).toEqual([
		'Essencial · 3 meses',
		'Essencial · 6 meses',
		'Essencial · 12 meses',
		'Ampliado · 3 meses',
		'Ampliado · 6 meses',
		'Ampliado · 12 meses',
		'Premium · 3 meses',
		'Premium · 6 meses',
		'Premium · 12 meses'
	]);
	expect(products[0].priceText.length).toBeLessThanOrEqual(500);
	expect(products[0].scope.length).toBeLessThanOrEqual(700);
	const reply = replyToConsultation({ text: 'Quero receber previsões regularmente', catalogue });
	expect(reply.productId).toBe('atv-plus');
	expect(reply.destination).toBe('https://atuavidanosastros.com.br/atv-mais');
	for (const line of lines.slice(1)) expect(reply.reply).toContain(line);
	expect(reply.reply.length).toBeLessThanOrEqual(4096);
});

describe('fails closed without inventing an available reading', () => {
	it.each(['ascendente', 'p02-free-launch'])(
		'excludes free tools and P02 free launches (%s) from the commercial catalogue',
		async (id) => {
			const { client } = fixture([{ ...publicRow(), id, total_minor: 0 }]);
			const catalogue = await loadConsultationCatalogue({ client, checkoutEnabled: true });
			expect(catalogue.products).toEqual([]);
			expect(catalogue).not.toHaveProperty('freeToolIds');
		}
	);
	it.each(
		[
			undefined,
			null,
			{},
			[],
			[null],
			[publicRow(), publicRow()],
			[{ ...publicRow(), id: 'synthetic-unregistered' }],
			[{ ...publicRow(), plan_id: 'premium' }],
			[{ ...publicRow(), term_months: 12 }],
			[{ ...publicRow(), commercial_enabled: false }],
			[{ ...publicRow(), commercial_enabled: 'true' }],
			[{ ...publicRow(), currency: 'USD' }],
			[{ ...publicRow(), total_minor: null }],
			[{ ...publicRow(), total_minor: '12345' }],
			[{ ...publicRow(), total_minor: 0 }],
			[{ ...publicRow(), total_minor: -1 }],
			[{ ...publicRow(), total_minor: 1.5 }],
			[{ ...publicRow(), total_minor: 2_147_483_648 }]
		].map((data) => ({ data }))
	)('closes malformed, disabled or absent commercial snapshot %#', async ({ data }) => {
		const { client } = fixture(data);
		const result = await loadConsultationCatalogue({
			client,
			checkoutEnabled: true
		});
		expect(result.products).toEqual([]);
		expect(result).not.toHaveProperty('freeToolIds');
	});
	it('keeps individual paid readings closed even when ATV+ is available', async () => {
		const { client } = fixture([publicRow()]);
		const catalogue = await loadConsultationCatalogue({ client, checkoutEnabled: true });
		expect(catalogue.products.map((product) => product.id)).toEqual(['atv-plus']);
		expect(
			replyToConsultation({ text: 'Quero meu horóscopo semanal', catalogue }).productId
		).toBeUndefined();
	});
	it.each(['rpc-error', 'timeout'])(
		'closes on %s without suggesting a free fallback',
		async (kind) => {
			const { client, abortSignal } = fixture([publicRow()]);
			if (kind === 'rpc-error') abortSignal.mockResolvedValue({ data: [publicRow()], error: {} });
			else abortSignal.mockRejectedValue(new Error('synthetic timeout'));
			const catalogue = await loadConsultationCatalogue({
				client,
				checkoutEnabled: true
			});
			expect(catalogue.products).toEqual([]);
			expect(catalogue).not.toHaveProperty('freeToolIds');
		}
	);
});
