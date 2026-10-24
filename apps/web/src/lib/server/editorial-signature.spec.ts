import { generateKeyPairSync, sign } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { editorialVerificationKey, verifyEditorialSignature } from './editorial-signature';

describe('native editorial signature verification', () => {
	it('verifies exact Ed25519 bytes and rejects altered content, signatures and keys', () => {
		const { publicKey, privateKey } = generateKeyPairSync('ed25519');
		const raw = publicKey.export({ type: 'spki', format: 'der' }).subarray(-32);
		const key = editorialVerificationKey(raw);
		const bytes = new TextEncoder().encode('exact signed editorial bytes');
		const signature = sign(null, bytes, privateKey);
		expect(verifyEditorialSignature(key, bytes, signature)).toBe(true);
		expect(verifyEditorialSignature(key, new TextEncoder().encode('altered'), signature)).toBe(
			false
		);
		const other = generateKeyPairSync('ed25519').publicKey;
		expect(verifyEditorialSignature(other, bytes, signature)).toBe(false);
		expect(verifyEditorialSignature(key, bytes, signature.subarray(0, 63))).toBe(false);
		expect(() => editorialVerificationKey(raw.subarray(0, 31))).toThrow(
			'Invalid Ed25519 public key'
		);
	});
});
