import { describe, expect, it } from 'vitest';
import { authCallbackHref, authReturnPath, loginHref } from './auth-return';
import { launchProductIds, productCatalog, productTrialHref } from '@atv/domain';

describe('continuity through authentication', () => {
	it('keeps every registered private trial through login and the callback', () => {
		for (const product of productCatalog.filter((item) => item.universe !== 'global')) {
			const destination = productTrialHref(product.id);
			const login = new URL(loginHref(destination), 'https://example.test');
			const callback = new URL(authCallbackHref(login.origin, login.searchParams.get('next')));
			expect(authReturnPath(callback.searchParams.get('next'))).toBe(destination);
		}
	});
	it('keeps the trial index, ATV+ and a saved private reading', () => {
		for (const destination of [
			'/testar-produtos',
			'/testar-lancamentos',
			'/testar-lancamentos/preparacoes/12345678-1234-1234-1234-123456789abc',
			'/testar-produtos/atv-plus',
			'/testar-produtos/leituras/12345678-1234-1234-1234-123456789abc'
		])
			expect(authReturnPath(destination)).toBe(destination);
	});
	it('canonicalizes old launch links without granting a legacy engine destination', () => {
		for (const id of launchProductIds) {
			expect(authReturnPath(`/testar-produtos/${id}`)).toBe(`/testar-lancamentos/${id}`);
		}
	});
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
			'/testar-produtos/missing',
			'/testar-produtos/_spec',
			'/testar-lancamentos/_spec',
			'/testar-lancamentos/missing',
			'/testar-lancamentos/birth-chart',
			'/testar-lancamentos/preparacoes/missing',
			'/testar-lancamentos/wedding-date-map?email=private',
			'/testar-produtos/leituras/missing',
			'/testar-produtos/birth-chart?email=private',
			'/testar-produtos/%62irth-chart',
			'/dashboard?email=private',
			'/dashboard#anchor',
			'/dashboard\n'
		]) {
			expect(authReturnPath(value)).toBe('/dashboard');
		}
	});
});
