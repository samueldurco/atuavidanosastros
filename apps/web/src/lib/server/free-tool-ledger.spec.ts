import { describe, it, expect } from 'vitest';
import {
	signAnonymousSubject,
	verifyAnonymousSubject,
	freeToolInputHash
} from './free-tool-ledger';

describe('identificador opaco e hash do ledger gratuito', () => {
	const secret = 'ledger-cookie-fixture-'.repeat(3);
	const id = 'ba93fab2-f581-46d6-95a5-fbcab1adcdab';
	it('valida assinatura, prazo e identidade; rejeita adulteração e expiração', async () => {
		const now = Date.now();
		const token = await signAnonymousSubject(id, now + 3600000, secret);
		expect(await verifyAnonymousSubject(token, secret, now)).toBe(`anon:${id}`);
		expect(await verifyAnonymousSubject(token, secret + 'changed', now)).toBeNull();
		expect(
			await verifyAnonymousSubject(
				token.replace(id, 'ca93fab2-f581-46d6-95a5-fbcab1adcdab'),
				secret,
				now
			)
		).toBeNull();
		expect(await verifyAnonymousSubject(token, secret, now + 3600000)).toBeNull();
		expect(await verifyAnonymousSubject(token + '.suffix', secret, now)).toBeNull();
		expect(await verifyAnonymousSubject(undefined, secret, now)).toBeNull();
	});
	it('hash independe da ordem das chaves, mas muda com os dados e ordem das listas', async () => {
		expect(await freeToolInputHash({ b: 2, a: { z: 1, y: 2 } })).toBe(
			await freeToolInputHash({ a: { y: 2, z: 1 }, b: 2 })
		);
		expect(await freeToolInputHash({ a: [1, 2] })).not.toBe(await freeToolInputHash({ a: [2, 1] }));
	});
});
