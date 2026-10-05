import { describe, expect, it } from 'vitest';
import { authCallbackHref, authReturnPath, loginHref } from './auth-return';
import { productCatalog } from '@atv/domain';

describe('continuity through authentication', () => {
	it('keeps each personalized product through the login and callback URLs', () => {
		for (const product of productCatalog.filter((item) => item.personalized)) {
			const destination = `/biblioteca/nova/${product.id}`;
			const login = new URL(loginHref(destination), 'https://example.test');
			const callback = new URL(authCallbackHref(login.origin, login.searchParams.get('next')));
			expect(authReturnPath(callback.searchParams.get('next'))).toBe(destination);
		}
	});
	it('keeps a saved reading and the birth profile', () => {
		expect(authReturnPath('/biblioteca/12345678-1234-1234-1234-123456789abc')).toContain(
			'/biblioteca/'
		);
		expect(authReturnPath('/conta/nascimento')).toBe('/conta/nascimento');
	});
	it('rejects external, encoded, private and authentication-loop destinations', () => {
		for (const value of [
			null,
			'',
			'//evil.test',
			'https://evil.test',
			'/\\evil.test',
			'/%2f%2fevil.test',
			'/entrar',
			'/auth/callback',
			'/admin',
			'/biblioteca/nova/missing',
			'/biblioteca/nova/atv-plus',
			'/dashboard?email=private',
			'/dashboard#anchor',
			'/dashboard\n'
		]) {
			expect(authReturnPath(value)).toBe('/dashboard');
		}
	});
});
