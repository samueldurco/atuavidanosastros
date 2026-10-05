import type { TikTokOAuthTokens } from '@atv/integrations';

export interface EncryptedTikTokTokens {
	ciphertext: string;
	iv: string;
}

function decodeBase64(value: string): Uint8Array<ArrayBuffer> {
	const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
	const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
	const binary = atob(padded);
	const bytes = new Uint8Array(binary.length);
	for (let index = 0; index < binary.length; index += 1) {
		bytes[index] = binary.charCodeAt(index);
	}
	return bytes;
}

function encodeBase64Url(value: Uint8Array): string {
	let binary = '';
	for (const byte of value) binary += String.fromCharCode(byte);
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/u, '');
}

async function importKey(encodedKey: string): Promise<CryptoKey> {
	const bytes = decodeBase64(encodedKey.trim());
	if (bytes.byteLength !== 32) {
		throw new Error('TIKTOK_TOKEN_ENCRYPTION_KEY deve conter exatamente 32 bytes em base64');
	}
	return crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function validateTikTokEncryptionKey(encodedKey: string): Promise<void> {
	await importKey(encodedKey);
}

export async function encryptTikTokTokens(
	tokens: TikTokOAuthTokens,
	encodedKey: string
): Promise<EncryptedTikTokTokens> {
	const key = await importKey(encodedKey);
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const plaintext = new TextEncoder().encode(JSON.stringify(tokens));
	const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
	return {
		ciphertext: encodeBase64Url(new Uint8Array(ciphertext)),
		iv: encodeBase64Url(iv)
	};
}

export async function decryptTikTokTokens(
	value: EncryptedTikTokTokens,
	encodedKey: string
): Promise<TikTokOAuthTokens> {
	const key = await importKey(encodedKey);
	const plaintext = await crypto.subtle.decrypt(
		{ name: 'AES-GCM', iv: decodeBase64(value.iv) },
		key,
		decodeBase64(value.ciphertext)
	);
	return JSON.parse(new TextDecoder().decode(plaintext)) as TikTokOAuthTokens;
}

export async function oauthStateMatches(expected: string, received: string): Promise<boolean> {
	if (!expected || !received) return false;
	const [left, right] = await Promise.all(
		[expected, received].map(async (value) => {
			const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
			return new Uint8Array(digest);
		})
	);
	let mismatch = left.byteLength ^ right.byteLength;
	for (let index = 0; index < Math.max(left.byteLength, right.byteLength); index += 1) {
		mismatch |= (left[index] ?? 0) ^ (right[index] ?? 0);
	}
	return mismatch === 0;
}
