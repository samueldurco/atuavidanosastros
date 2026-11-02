import { describe, expect, it, vi } from 'vitest';
import { testShopSeller } from '../../../../tests/fixtures/shop-seller';
import { readShopSale } from './seller-identity';

const enabled = {
	FEATURE_PHYSICAL_CHECKOUT: 'true',
	SHOP_SELLER_DISCLOSURE_APPROVED: 'true',
	SHOP_ARIES_SINGLE_UNIT_ONLY: 'true',
	SHOP_DELIVERY_MAX_BUSINESS_DAYS: '8',
	SHOP_VERIFIED_FLAT_SHIPPING_BRL: '29.90',
	...testShopSeller
};

describe('public seller disclosure', () => {
	it('returns only the four approved seller fields', () => {
		expect(readShopSale(enabled)?.seller).toEqual({
			name: enabled.SHOP_SELLER_PUBLIC_NAME,
			document: enabled.SHOP_SELLER_PUBLIC_DOCUMENT,
			email: enabled.SHOP_SELLER_PUBLIC_EMAIL,
			address: enabled.SHOP_SELLER_PUBLIC_ADDRESS
		});
	});
	it('logs only field names once per isolate and never reports when commerce is disabled', async () => {
		vi.resetModules();
		const { readShopSale: read } = await import('./seller-identity');
		const log = vi.spyOn(console, 'warn').mockImplementation(() => {});
		try {
			const invalid = {
				...enabled,
				SHOP_SELLER_PUBLIC_NAME: 'ATVNA',
				SHOP_SELLER_PUBLIC_DOCUMENT: 'invalid',
				SHOP_SELLER_PUBLIC_ADDRESS: 'Rua do Lírio, nº 21, CEP 00000-001'
			};
			expect(read({ ...invalid, FEATURE_PHYSICAL_CHECKOUT: 'false' })).toBeNull();
			expect(log).not.toHaveBeenCalled();
			expect(read(invalid)).toBeNull();
			expect(read(invalid)).toBeNull();
			expect(log.mock.calls).toEqual([
				['shop_seller_identity_blocked', 'name,reserved_address,document']
			]);
		} finally {
			log.mockRestore();
		}
	});
	it.each([
		undefined,
		'',
		'null',
		'not json',
		'{}',
		'{"street":"Rua","number":"21"}',
		'{"street":"Lua","number":null}'
	])('rejects incomplete address exclusion %#', (privateLocation) => {
		expect(
			readShopSale({ ...enabled, SHOP_SELLER_PRIVATE_RETURN_LOCATION: privateLocation })
		).toBeNull();
	});
	it.each([
		'Rua do Lírio, nº 21',
		'R. DO LIRIO - N.º 021',
		'do lírio 21 / sala 1',
		'Rua/do-Lírio, número: 21'
	])('rejects the return address in any equivalent format %#', (line) => {
		expect(
			readShopSale({
				...enabled,
				SHOP_SELLER_PUBLIC_ADDRESS: line + ', Centro, Vila Azul/MG, CEP 00000-001'
			})
		).toBeNull();
	});
	it('allows another number on the same street', () => {
		expect(
			readShopSale({
				...enabled,
				SHOP_SELLER_PUBLIC_ADDRESS: 'Rua do Lírio, 210, Vila Azul, MG, CEP 00000-001'
			})
		).not.toBeNull();
	});
	it.each([
		'ATVNA',
		'Loja ATVNA',
		'A Tua Vida nos Astros',
		'Responsável de exemplo',
		'Nome completo',
		'Pendente',
		'Samuel'
	])('does not publish a brand or an incomplete name %#', (name) => {
		expect(readShopSale({ ...enabled, SHOP_SELLER_PUBLIC_NAME: name })).toBeNull();
	});
	it.each([
		'000.000.001-90',
		'11111111111',
		'000.000.001-91x',
		'CNPJ: 000.000.001-91',
		'00000000000000',
		'12.ABC.345/01DE-34'
	])('rejects invalid documents %#', (document) => {
		expect(readShopSale({ ...enabled, SHOP_SELLER_PUBLIC_DOCUMENT: document })).toBeNull();
	});
	it.each(['CPF: 000.000.001-91', 'CNPJ: 12.ABC.345/01DE-35', '11.222.333/0001-81'])(
		'accepts valid public identifiers %#',
		(document) => {
			expect(readShopSale({ ...enabled, SHOP_SELLER_PUBLIC_DOCUMENT: document })).not.toBeNull();
		}
	);
});
