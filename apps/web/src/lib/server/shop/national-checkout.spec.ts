import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { describe, expect, it, vi } from 'vitest';
import { testShopSeller } from '../../../../tests/fixtures/shop-seller';
import { nationalCheckout } from './national-checkout';
import { ensureCheckoutSchema } from './checkout-schema';
import { draftToken } from './national-draft';
import { approvedShopProducts } from './shop-catalog-map';
import { checkOffer, locality, physicalOffer, shippingRate } from './national-freight';
const env = {
	FEATURE_PHYSICAL_CHECKOUT: 'true',
	SHOP_SELLER_DISCLOSURE_APPROVED: 'true',
	SHOP_ARIES_SINGLE_UNIT_ONLY: 'true',
	SHOP_DELIVERY_MAX_BUSINESS_DAYS: '8',
	SHOP_VERIFIED_FLAT_SHIPPING_BRL: '29.90',
	...testShopSeller,
	SHOPIFY_STORE_DOMAIN: 'test-shop.myshopify.com',
	SHOPIFY_STOREFRONT_PRIVATE_TOKEN: 'synthetic-private-token',
	SHOPIFY_STOREFRONT_API_VERSION: '2026-10',
	SHOPIFY_DRAFT_ORDERS_TOKEN: 'fixture-admin',
	DIMONA_FRETE_TOKEN: 'fixture-dimona',
	ATVNA_CHECKOUT_SIGNING_KEY: '1234567890'.repeat(4)
};
const product = approvedShopProducts['caneca-aries'],
	variantId = product.variantIds[0];
const rate = (value: string, name = 'J&T', delivery_method_id = '5', business_days = 9) => ({
	value,
	name,
	delivery_method_id,
	business_days
});
const now = 1900000000;
const newDB = (db = new DatabaseSync(':memory:')) => {
	function prepare(sql: string, vals: SQLInputValue[] = []) {
		return {
			bind: (...v: SQLInputValue[]) => prepare(sql, v),
			first: async () => db.prepare(sql).get(...vals) ?? null,
			run: async () => ({ success: true, meta: db.prepare(sql).run(...vals) })
		};
	}
	return {
		prepare,
		batch: async (xs: ReturnType<typeof prepare>[]) => Promise.all(xs.map((x) => x.run()))
	} as unknown as D1Database;
};
const req = (body: unknown) =>
	new Request('https://site.example/api/shop/delivery', {
		method: 'POST',
		headers: { origin: 'https://site.example', 'content-type': 'application/json' },
		body: JSON.stringify(body)
	});
const address = {
	firstName: 'Cliente',
	lastName: 'Teste',
	address1: 'Rua pública, 101',
	address2: 'Bloco A',
	city: 'Ipatinga',
	provinceCode: 'MG',
	postalCode: '35160-001'
};
const json = (v: unknown) =>
	new Response(JSON.stringify(v), { headers: { 'content-type': 'application/json' } });
function upstream() {
	let shipping = '15.50',
		extraTax = '0',
		carrier = 'J&T';
	let failAfterCreate = false;
	let stored: Record<string, unknown> | undefined;
	let transform: (draft: Record<string, unknown>) => void = () => undefined;
	let drafts = 0,
		deletes = 0;
	const fetcher = vi.fn<typeof fetch>(async (url, opts) => {
		const s = String(url);
		if (s.includes('brasilapi') || s.includes('viacep'))
			return json({ cep: '35160-001', city: 'Ipatinga', state: 'MG' });
		if (s.endsWith('/shipping')) return json([rate(shipping, carrier)]);
		if (s.includes('/admin/api/')) {
			const body = JSON.parse(String(opts?.body)) as {
				query: string;
				variables: {
					input: {
						shippingAddress: typeof address & { zip: string };
						tags: string[];
						shippingLine: { title: string };
					};
				};
			};
			if (body.query.includes('FindNationalDraft')) {
				return json({ data: { draftOrders: { nodes: stored ? [stored] : [] } } });
			}
			if (body.query.includes('draftOrderDelete')) {
				stored = undefined;
				deletes++;
				return json({
					data: { draftOrderDelete: { deletedId: 'gid://shopify/DraftOrder/123', userErrors: [] } }
				});
			}
			drafts++;
			const addr = body.variables.input.shippingAddress;
			const money = (n: number) => ({ shopMoney: { currencyCode: 'BRL', amount: n.toFixed(2) } });
			stored = {
				id: 'gid://shopify/DraftOrder/123',
				status: 'OPEN',
				tags: body.variables.input.tags,
				invoiceUrl: 'https://test-shop.myshopify.com/456/invoices/abC123',
				shippingLine: {
					custom: true,
					title: body.variables.input.shippingLine.title,
					originalPriceSet: money(Number(shipping))
				},
				shippingAddress: { ...addr, countryCodeV2: 'BR' },
				lineItems: { nodes: [{ quantity: 1, variant: { id: variantId } }] },
				totalPriceSet: money(79.9 + Number(shipping) + Number(extraTax)),
				subtotalPriceSet: money(79.9),
				totalShippingPriceSet: money(Number(shipping))
			};
			transform(stored);
			if (failAfterCreate) throw new Error('response lost after create');
			return json({ data: { draftOrderCreate: { userErrors: [], draftOrder: stored } } });
		}
		if (s.includes('graphql.json'))
			return json({
				data: {
					product: {
						id: product.productId,
						handle: product.handle,
						title: 'Caneca',
						description: 'Fixture',
						availableForSale: true,
						featuredImage: null,
						variants: {
							nodes: [
								{
									id: variantId,
									title: 'Caneca',
									availableForSale: true,
									price: { amount: '79.90', currencyCode: 'BRL' },
									selectedOptions: []
								}
							],
							pageInfo: { hasNextPage: false, endCursor: null }
						}
					}
				}
			});
		throw new Error('unexpected endpoint');
	});
	return {
		fetcher,
		changeShipping: () => (shipping = '16.50'),
		changeCarrier: () => (carrier = 'outra transportadora'),
		loseResponse: () => (failAfterCreate = true),
		changeDraft: (fn: typeof transform) => (transform = fn),
		addTax: () => (extraTax = '8'),
		created: () => drafts,
		removed: () => deletes
	};
}
function scenario() {
	const db = newDB(),
		up = upstream();
	const call = (kind: 'quote' | 'checkout', body: unknown, time = now) =>
		nationalCheckout(kind, req(body), env, db, up.fetcher, '203.0.113.44', time);
	return {
		call,
		up,
		quote: async () => {
			const res = await call('quote', { variantId, quantity: 1, postalCode: '35160001' });
			const result = (await res.json()) as { quote: { token: string; checkoutReady: boolean } };
			expect(res.status, JSON.stringify(result)).toBe(200);
			expect(result.quote).toMatchObject({
				checkoutReady: true,
				shippingBrl: 15.5,
				totalBrl: 95.4,
				deliveryBusinessDays: 14,
				city: 'Ipatinga',
				provinceCode: 'MG'
			});
			return result.quote.token as string;
		}
	};
}
describe('Entrega nacional com endereço e frete fixados no checkout', () => {
	it('prepara tabelas e índices no primeiro frete, inclusive antes da credencial Shopify, e preserva tentativas existentes', async () => {
		const sqlite = new DatabaseSync(':memory:');
		const db = newDB(sqlite);
		const tables = () =>
			sqlite
				.prepare("SELECT name FROM sqlite_schema WHERE name LIKE 'shop_checkout_%' ORDER BY name")
				.all()
				.map((row) => row.name);
		expect(tables()).toEqual([]);
		const response = await nationalCheckout(
			'quote',
			req({ variantId, quantity: 1, postalCode: '35160001' }),
			{ ...env, SHOPIFY_DRAFT_ORDERS_TOKEN: undefined },
			db,
			upstream().fetcher,
			'203.0.113.60',
			now
		);
		expect((await response.json()).quote.checkoutReady).toBe(false);
		expect(tables()).toEqual([
			'shop_checkout_attempt_expiry',
			'shop_checkout_attempts',
			'shop_checkout_limit_expiry',
			'shop_checkout_limits'
		]);
		sqlite.exec(
			"INSERT INTO shop_checkout_attempts VALUES ('keep','hash','pending',NULL,2000000000)"
		);
		await Promise.all([ensureCheckoutSchema(newDB(sqlite)), ensureCheckoutSchema(newDB(sqlite))]);
		expect(sqlite.prepare('SELECT nonce FROM shop_checkout_attempts').get()?.nonce).toBe('keep');
		sqlite.close();
	});
	it('conserva a cotação sem link se a instalação do schema falhar e repete a instalação na próxima consulta', async () => {
		const db = newDB();
		vi.spyOn(db, 'batch').mockRejectedValueOnce(new Error('binding unavailable'));
		const call = () =>
			nationalCheckout(
				'quote',
				req({ variantId, quantity: 1, postalCode: '35160001' }),
				env,
				db,
				upstream().fetcher,
				'203.0.113.61',
				now
			);
		expect((await (await call()).json()).quote).toMatchObject({
			checkoutReady: false,
			shippingBrl: 15.5
		});
		expect((await (await call()).json()).quote.checkoutReady).toBe(true);
	});
	it('informa o frete real sem D1 ou acesso de rascunhos, mas nunca emite link de pagamento', async () => {
		const readonly = {
			...env,
			SHOPIFY_DRAFT_ORDERS_TOKEN: undefined,
			ATVNA_CHECKOUT_SIGNING_KEY: undefined
		};
		const up = upstream(),
			ip = '203.0.113.45';
		const quote = await nationalCheckout(
			'quote',
			req({ variantId, quantity: 1, postalCode: '35160-001' }),
			readonly,
			undefined,
			up.fetcher,
			ip,
			now
		);
		expect(quote.status).toBe(200);
		const data = (await quote.json()) as { quote: { token?: string } };
		expect(data.quote).toMatchObject({ checkoutReady: false, shippingBrl: 15.5, totalBrl: 95.4 });
		expect(data.quote.token).toBeUndefined();
		expect(
			(
				await nationalCheckout(
					'checkout',
					req({ token: 'fake', address }),
					readonly,
					undefined,
					up.fetcher,
					ip,
					now
				)
			).status
		).toBe(503);
		expect(up.created()).toBe(0);
	});
	it('só aceita credencial de app dedicado com os escopos mínimos e renova sem chamar o grant a cada consulta', async () => {
		const dedicated = {
			SHOPIFY_DRAFT_CLIENT_ID: 'synthetic-client',
			SHOPIFY_DRAFT_CLIENT_SECRET: 'temporary-test-secret'
		};
		const domain = 'test-shop.myshopify.com';
		const grant = vi.fn<typeof fetch>(async (url, init) => {
			expect(url).toBe('https://test-shop.myshopify.com/admin/oauth/access_token');
			expect(new URLSearchParams(String(init?.body)).get('grant_type')).toBe('client_credentials');
			return json({
				access_token: 'test_token_authorized',
				expires_in: 86399,
				scope: 'read_products,write_draft_orders'
			});
		});
		await expect(draftToken(dedicated, grant, domain)).resolves.toBe('test_token_authorized');
		await expect(draftToken(dedicated, grant, domain)).resolves.toBe('test_token_authorized');
		expect(grant).toHaveBeenCalledTimes(1);
		const excess = vi.fn<typeof fetch>(async () =>
			json({
				access_token: 'test_token_authorized',
				expires_in: 86399,
				scope: 'read_products,write_draft_orders,write_orders'
			})
		);
		await expect(
			draftToken(
				{ ...dedicated, SHOPIFY_DRAFT_CLIENT_SECRET: 'different-test-secret' },
				excess,
				domain
			)
		).rejects.toThrow('national_checkout_not_configured');
		await expect(draftToken(dedicated, grant, 'outside.example')).rejects.toThrow(
			'national_checkout_not_configured'
		);
	});
	it('cota um CEP fora da tabela inicial e rejeita o CEP inexistente', async () => {
		const valid = vi.fn<typeof fetch>(async () =>
			json({ cep: '01311-001', localidade: 'São Paulo', uf: 'SP' })
		);
		expect(await locality(valid, '01311001')).toEqual({ city: 'São Paulo', provinceCode: 'SP' });
		const missing = vi.fn<typeof fetch>(async () => json({ erro: true }));
		await expect(locality(missing, '99999999')).rejects.toThrow('postal_code_not_found');
	});
	it('reconfere a variante real de ecobag com o estoque da base industrial reservada', async () => {
		const bag = approvedShopProducts['ecobag-aries'],
			id = bag.variantIds[0],
			offer = physicalOffer(id);
		expect(offer).toMatchObject({ priceBrl: 49.9, dimonaSku: 'bolsaecom' });
		let available = 0;
		const upstream = vi.fn<typeof fetch>(async (url) =>
			String(url).endsWith('/sku/bolsaecom/availability')
				? json({ bolsaecom: available })
				: json({
						data: {
							product: {
								id: bag.productId,
								handle: bag.handle,
								title: 'Ecobag',
								description: 'Fixture',
								availableForSale: true,
								featuredImage: null,
								variants: {
									nodes: [
										{
											id,
											title: 'Ecobag',
											availableForSale: true,
											price: { amount: '49.90', currencyCode: 'BRL' },
											selectedOptions: []
										}
									],
									pageInfo: { hasNextPage: false, endCursor: null }
								}
							}
						}
					})
		);
		await expect(checkOffer(env, upstream, offer, '203.0.113.44')).rejects.toThrow('offer_changed');
		available = 1;
		await expect(checkOffer(env, upstream, offer, '203.0.113.44')).resolves.toBeUndefined();
	});
	it('usa uma única fatura nas tentativas repetidas e recusa a troca do endereço', async () => {
		const s = scenario(),
			token = await s.quote();
		expect(
			(await s.call('checkout', { token, address: { ...address, postalCode: '36960000' } })).status
		).toBe(422);
		const result = await s.call('checkout', { token, address });
		expect(await result.json()).toMatchObject({
			ok: true,
			checkoutUrl: 'https://test-shop.myshopify.com/456/invoices/abC123'
		});
		expect((await s.call('checkout', { token, address })).status).toBe(200);
		expect(
			(await s.call('checkout', { token, address: { ...address, address1: 'Rua diversa, 22' } }))
				.status
		).toBe(409);
		expect(s.up.created()).toBe(1);
	});
	it('exige nova cotação quando o frete muda ou o prazo do token expira, e rejeita adulteração', async () => {
		const s = scenario(),
			token = await s.quote();
		s.up.changeShipping();
		expect((await s.call('checkout', { token, address })).status).toBe(409);
		expect((await s.call('checkout', { token, address }, now + 601)).status).toBe(409);
		expect((await s.call('checkout', { token: 'x' + token, address })).status).toBe(422);
		expect(s.up.created()).toBe(0);
	});
	it('descarta o rascunho se o total retornado pelo checkout inclui uma cobrança não cotada', async () => {
		const s = scenario(),
			token = await s.quote();
		s.up.addTax();
		expect((await s.call('checkout', { token, address })).status).toBe(409);
		expect(s.up.removed()).toBe(1);
		expect((await s.call('checkout', { token, address })).status).toBe(409);
		expect(s.up.created()).toBe(1);
	});
	it('rejeita endereço incompleto e não mistura o CEP com outra cidade ou UF', async () => {
		const s = scenario(),
			token = await s.quote();
		for (const change of [
			{ firstName: '' },
			{ lastName: '' },
			{ address1: 'Rua 13 de Maio' },
			{ city: 'São Paulo' },
			{ provinceCode: 'SP' }
		]) {
			expect((await s.call('checkout', { token, address: { ...address, ...change } })).status).toBe(
				422
			);
		}
		expect(s.up.created()).toBe(0);
		expect(
			(
				await s.call('checkout', {
					token,
					address: { ...address, address1: 'Rua pública, s/n', address2: '' }
				})
			).status
		).toBe(200);
	});
	it('recupera a fatura da Shopify quando a resposta do primeiro POST se perdeu', async () => {
		const s = scenario(),
			token = await s.quote();
		s.up.loseResponse();
		expect((await s.call('checkout', { token, address })).status).toBe(503);
		const retry = await s.call('checkout', { token, address });
		expect(retry.status).toBe(200);
		expect(await retry.json()).toMatchObject({
			checkoutUrl: 'https://test-shop.myshopify.com/456/invoices/abC123'
		});
		expect(s.up.created()).toBe(1);
	});
	it('dois cliques simultâneos não criam duas faturas', async () => {
		const s = scenario(),
			token = await s.quote();
		const results = await Promise.all([
			s.call('checkout', { token, address }),
			s.call('checkout', { token, address })
		]);
		expect(results.map((r) => r.status)).toContain(200);
		expect(results.every((r) => r.status === 200 || r.status === 409)).toBe(true);
		expect((await s.call('checkout', { token, address })).status).toBe(200);
		expect(s.up.created()).toBe(1);
	});
	it('exige nova cotação se a transportadora mudou, mesmo com preço e prazo idênticos', async () => {
		const s = scenario(),
			token = await s.quote();
		s.up.changeCarrier();
		expect((await s.call('checkout', { token, address })).status).toBe(409);
		expect(s.up.created()).toBe(0);
	});
	it.each([
		[
			'frete não pré-combinado',
			(draft: Record<string, unknown>) =>
				Object.assign(draft.shippingLine as object, { custom: false })
		],
		[
			'via de entrega diferente',
			(draft: Record<string, unknown>) =>
				Object.assign(draft.shippingLine as object, { title: 'Outro serviço' })
		],
		[
			'endereço sem rua ou número',
			(draft: Record<string, unknown>) =>
				Object.assign(draft.shippingAddress as object, { address1: null })
		],
		[
			'nome ausente',
			(draft: Record<string, unknown>) =>
				Object.assign(draft.shippingAddress as object, { lastName: null })
		]
	] as const)('descarta a fatura cujo retorno da Shopify tem %s', async (_, change) => {
		const s = scenario(),
			token = await s.quote();
		s.up.changeDraft(change);
		expect((await s.call('checkout', { token, address })).status).toBe(409);
		expect(s.up.created()).toBe(1);
		expect(s.up.removed()).toBe(1);
	});
	it('não promete entrega grátis ou em dólar; cobre a variação do serviço padrão do Dropsimples', () => {
		expect(() => shippingRate([], false)).toThrow('delivery_unavailable');
		expect(() => shippingRate([{ ...rate('12.74'), currency: 'USD' }], true)).toThrow(
			'carrier_unavailable'
		);
		expect(shippingRate([rate('15.50'), rate('22.80', 'PAC', '1', 12)], false)).toMatchObject({
			cents: 2280,
			days: 18
		});
	});
});
