import { describe, expect, it, vi } from 'vitest';
import { testShopSeller } from '../../../../tests/fixtures/shop-seller';
import { publicAddressIssue } from './seller-fields';
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
	it.each(['12345678', '12345-678', '12.345-678', '12345 678'])(
		'accepts a Brazilian commercial address with postal code %s',
		(postcode) => {
			expect(
				readShopSale({
					...enabled,
					SHOP_SELLER_PUBLIC_ADDRESS: `Rua do Vendedor, s/n, Vila Azul/MG, CEP ${postcode}`
				})
			).not.toBeNull();
		}
	);
	it.each([
		['', 'address_missing'],
		['Rua das Flores, 50, CEP 1234-678', 'address_postcode'],
		['Rua das Flores, 50, CEP 123456789', 'address_postcode'],
		['CEP 12.345-678', 'address_location_missing'],
		['12345678', 'address_location_missing'],
		['Endereço: CEP 12345-678', 'address_location_missing'],
		['Endereço do vendedor, CEP 12345-678', 'address_placeholder'],
		['Endereço informado depois, CEP 12345-678', 'address_placeholder'],
		['Local a cadastrar, CEP 12345-678', 'address_placeholder'],
		['Endereço a informar, CEP 12345-678', 'address_placeholder'],
		['Endereço a definir, CEP 12345-678', 'address_placeholder'],
		['Não informado, CEP 12345-678', 'address_placeholder'],
		['Pendente, CEP 12345-678', 'address_placeholder'],
		['Rua do Lírio, 021, CEP 12.345-678', 'reserved_address']
	])('reports only the reason for an unusable address %#', (address, issue) => {
		expect(publicAddressIssue(address, testShopSeller.SHOP_SELLER_PRIVATE_RETURN_LOCATION)).toBe(
			issue
		);
	});
	const commercialStreet = 'Rua da Aurora, 210, Centro, Vila Azul, MG';
	const separatePostcode = {
		...enabled,
		SHOP_SELLER_PUBLIC_ADDRESS: commercialStreet,
		SHOP_SELLER_PUBLIC_POSTCODE: '00000-001'
	};
	it.each(['00000001', '00.000-001', '00000-001', '00000 001'])(
		'appends a complete, separately supplied commercial postcode %#',
		(postcode) => {
			expect(
				readShopSale({ ...separatePostcode, SHOP_SELLER_PUBLIC_POSTCODE: postcode })?.seller.address
			).toBe(`${commercialStreet}, CEP 00000-001`);
		}
	);
	it('replaces only an unambiguous trailing numeric CEP', () => {
		const prefix = commercialStreet + ' — ';
		expect(
			readShopSale({ ...separatePostcode, SHOP_SELLER_PUBLIC_ADDRESS: prefix + 'Cep: 0000-001' })
				?.seller.address
		).toBe(prefix + 'CEP 00000-001');
	});
	it('preserves an existing recognizable commercial postcode literally', () => {
		const original = commercialStreet + ', CEP 00.000-002';
		expect(
			readShopSale({ ...separatePostcode, SHOP_SELLER_PUBLIC_ADDRESS: original })?.seller.address
		).toBe(original);
	});
	it.each([undefined, '', '0000-001', '000000001', 'CEP 00000-001', '00000-001 e 00000-002'])(
		'does not complete an address from an invalid standalone postcode %#',
		(postcode) => {
			expect(
				readShopSale({ ...separatePostcode, SHOP_SELLER_PUBLIC_POSTCODE: postcode })
			).toBeNull();
		}
	);
	it.each([
		'',
		'CEP: 0000-001',
		'Rua do Lírio, nº 21',
		'Endereço do vendedor',
		commercialStreet + ', CEP 0000-001, CEP 0000-002',
		commercialStreet + ', CEP 0000-001, outra localidade',
		commercialStreet + ', CEP 0000-001 0000-002',
		commercialStreet + ', CEP 0000-001-002',
		commercialStreet + ', 0000-001',
		commercialStreet + ', CEP',
		commercialStreet + ', CEP 0000-001-A'
	])('leaves absent, reserved, placeholder and ambiguous addresses unusable %#', (address) => {
		expect(readShopSale({ ...separatePostcode, SHOP_SELLER_PUBLIC_ADDRESS: address })).toBeNull();
	});
	it('keeps the private location, document and shipping checks with a separate postcode', () => {
		expect(
			readShopSale({ ...separatePostcode, SHOP_SELLER_PRIVATE_RETURN_LOCATION: undefined })
		).toBeNull();
		expect(
			readShopSale({ ...separatePostcode, SHOP_SELLER_PUBLIC_DOCUMENT: 'invalid' })
		).toBeNull();
		expect(
			readShopSale({ ...separatePostcode, SHOP_VERIFIED_FLAT_SHIPPING_BRL: '0.00' })
		).toBeNull();
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
