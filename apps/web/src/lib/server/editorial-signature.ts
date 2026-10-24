import { Buffer } from 'node:buffer';
import { createPublicKey, verify, type KeyObject } from 'node:crypto';

// RFC 8410 SubjectPublicKeyInfo for an Ed25519 raw public key (OID 1.3.101.112).
// Native verification consumes the exact signed bytes; it never admits a package.
const ed25519Spki = Buffer.from('302a300506032b6570032100', 'hex');

export function editorialVerificationKey(raw: Uint8Array): KeyObject {
	if (raw.length !== 32) throw new Error('Invalid Ed25519 public key');
	return createPublicKey({
		key: Buffer.concat([ed25519Spki, raw]),
		format: 'der',
		type: 'spki'
	});
}

export function verifyEditorialSignature(
	key: KeyObject,
	payload: Uint8Array,
	signature: Uint8Array
) {
	return signature.length === 64 && verify(null, payload, key, signature);
}
