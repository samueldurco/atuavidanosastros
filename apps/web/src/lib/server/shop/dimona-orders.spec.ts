import { describe, expect, it, vi } from 'vitest';
import {
	createDimonaOrder,
	readDimonaOrder,
	verifyDimonaCallback,
	type DimonaOrderInput
} from './dimona-orders';

const env = { DIMONA_FRETE_TOKEN: 'fake-api-key-for-testing' };
const origin = 'https://atuavidanosastros.com.br';
const input: DimonaOrderInput = {
	orderId: '91234567',
	deliveryMethodId: '177',
	customer: { name: 'Destinatário de teste' },
	address: {
		street: 'Rua de teste',
		number: '10',
		neighborhood: 'Centro',
		city: 'Cidade',
		state: 'MG',
		zipcode: '35160-001'
	},
	items: [
		{
			sku: 'VAR-1',
			name: 'Peça',
			quantity: 2,
			dimonaSkuId: '010603110108',
			designs: { front: origin + '/arte/frente' },
			mocks: { front: origin + '/mock/frente' }
		}
	],
	webhookUrl: origin + '/api/shop/dimona/webhook'
};
const result = {
	seller_id: input.orderId,
	dimona_id: '064-435-556',
	status_id: 18,
	status: 'Aguardando Imagens',
	tracking_url: 'http://status.ondeestameupedido.com/tracking/1168/123123123',
	tracking_code: null
};
const mock = (data: unknown, status = 200) =>
	vi.fn<typeof fetch>(async () => new Response(JSON.stringify(data), { status }));

describe('Dimona factory API', () => {
	it('submits the reviewed front and quoted carrier under the merchant reference with no payment instruction', async () => {
		const fetcher = mock({ order: result.dimona_id });
		await expect(createDimonaOrder(env, fetcher, input)).resolves.toEqual({
			factoryOrderId: result.dimona_id
		});
		expect(fetcher).toHaveBeenCalledTimes(1);
		const [[url, init]] = fetcher.mock.calls;
		expect(url).toBe('https://admin.camisadimona.com.br/api/v2/order');
		expect(init?.method).toBe('POST');
		expect(init?.redirect).toBe('manual');
		expect(new Headers(init?.headers).get('api-key')).toBe(env.DIMONA_FRETE_TOKEN);
		expect(JSON.parse(init!.body as string)).toEqual({
			order_id: input.orderId,
			customer_name: input.customer.name,
			delivery_method_id: '177',
			address: { ...input.address, name: input.customer.name, country: 'BR', zipcode: '35160001' },
			items: [
				{
					name: 'Peça',
					sku: 'VAR-1',
					qty: 2,
					dimona_sku_id: '010603110108',
					designs: [input.items[0].designs.front],
					mocks: [input.items[0].mocks.front]
				}
			],
			webhook_url: input.webhookUrl
		});
	});
	it('rejects missing carrier IDs and third-party artwork before sending recipient information', async () => {
		const fetcher = mock({});
		for (const invalid of [
			{ ...input, deliveryMethodId: 'standard' },
			{
				...input,
				items: [{ ...input.items[0], designs: { front: 'https://example.org/foreign.png' } }]
			},
			{ ...input, webhookUrl: 'https://example.org/callback' }
		])
			await expect(createDimonaOrder(env, fetcher, invalid)).rejects.toMatchObject({
				code: 'dimona_invalid_order'
			});
		expect(fetcher).not.toHaveBeenCalled();
	});
	it('distinguishes a duplicate, a definitive validation failure, and an ambiguous submission', async () => {
		for (const [data, status, code] of [
			['O pedido ' + input.orderId + ' já existe', 422, 'dimona_order_exists'],
			[{ error: 'private recipient info' }, 422, 'dimona_order_rejected'],
			[{ error: 'private recipient info' }, 503, 'dimona_response_unknown'],
			[{}, 200, 'dimona_response_unknown'],
			[{}, 302, 'dimona_response_unknown']
		] as const) {
			const fetcher = mock(data, status);
			await expect(createDimonaOrder(env, fetcher, input)).rejects.toMatchObject({
				code,
				message: code
			});
			expect(fetcher).toHaveBeenCalledTimes(1);
		}
	});
	it('checks both order references and accepts a documented absent order', async () => {
		const fetcher = mock(result);
		expect((await readDimonaOrder(env, fetcher, result.dimona_id, input.orderId))?.shipped).toBe(
			false
		);
		expect(fetcher.mock.calls[0][0]).toBe(
			'https://admin.camisadimona.com.br/api/v2/order/' + result.dimona_id
		);
		await expect(readDimonaOrder(env, fetcher, result.dimona_id, '11111')).rejects.toMatchObject({
			code: 'dimona_response_unknown'
		});
		await expect(readDimonaOrder(env, fetcher, '111-222-333', input.orderId)).rejects.toMatchObject(
			{ code: 'dimona_response_unknown' }
		);
		await expect(
			readDimonaOrder(env, mock(null, 404), input.orderId, input.orderId)
		).resolves.toBeNull();
	});
	it('releases tracking only for a dispatched order with a usable code, regardless of an early URL', async () => {
		for (const [status, tracking_code, shipped] of [
			['Aguardando Imagens', 'BR12345', false],
			['Enviado', null, false],
			['Entregue', '<script>', false],
			['Enviado', 'BR12345', true],
			['Entregue', 'BR12345', true]
		] as const) {
			const data = await readDimonaOrder(
				env,
				mock({ ...result, status, tracking_code }),
				result.dimona_id,
				input.orderId
			);
			expect(data?.shipped).toBe(shipped);
			expect(data?.trackingUrl).toBe(
				'https://status.ondeestameupedido.com/tracking/1168/123123123'
			);
		}
		const untrusted = await readDimonaOrder(
			env,
			mock({ ...result, tracking_url: 'https://correios.com.br.example.org/track' }),
			result.dimona_id,
			input.orderId
		);
		expect(untrusted?.trackingUrl).toBeNull();
	});
	it('uses the callback only as an authenticated prompt for a fresh factory lookup', async () => {
		const event = {
			...result,
			api_key: env.DIMONA_FRETE_TOKEN,
			tracking_code: 'ATTACKER-CODE',
			status: 'Entregue'
		};
		await expect(verifyDimonaCallback(env, event)).resolves.toEqual({
			factoryOrderId: result.dimona_id,
			sellerOrderId: input.orderId
		});
		await expect(verifyDimonaCallback(env, { ...event, api_key: 'other' })).rejects.toMatchObject({
			code: 'dimona_callback_denied'
		});
		await expect(
			verifyDimonaCallback(env, { ...event, seller_id: [input.orderId] })
		).rejects.toMatchObject({ code: 'dimona_invalid_callback' });
		await expect(verifyDimonaCallback({}, event)).rejects.toMatchObject({
			code: 'dimona_callback_denied'
		});
	});
});
