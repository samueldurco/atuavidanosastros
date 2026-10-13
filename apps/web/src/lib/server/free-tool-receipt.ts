import { parseFreeToolResult } from '../free-tool-result';
import type { FreeToolResult } from '../free-tools';

/** Sorting object keys keeps receipts valid after jsonb storage; array order remains meaningful. */
function canonical(value: unknown): string {
	if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
	if (value !== null && typeof value === 'object')
		return `{${Object.entries(value)
			.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
			.map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`)
			.join(',')}}`;
	return JSON.stringify(value);
}
async function receiptKey(secret: string): Promise<CryptoKey> {
	return crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign', 'verify']
	);
}
export async function signFreeToolResult(
	result: FreeToolResult,
	secret: string | undefined
): Promise<string | null> {
	if (!secret || secret.length < 32 || !parseFreeToolResult(result)) return null;
	const signature = await crypto.subtle.sign(
		'HMAC',
		await receiptKey(secret),
		new TextEncoder().encode(canonical(result))
	);
	return [...new Uint8Array(signature)].map((n) => n.toString(16).padStart(2, '0')).join('');
}
export async function verifyFreeToolReceipt(
	value: unknown,
	receipt: unknown,
	secret: string | undefined,
	now = Date.now()
): Promise<boolean> {
	const result = parseFreeToolResult(value);
	if (
		!result ||
		!secret ||
		secret.length < 32 ||
		typeof receipt !== 'string' ||
		!/^[0-9a-f]{64}$/.test(receipt)
	)
		return false;
	const age = now - Date.parse(result.createdAt);
	if (age < -60000 || age > 48 * 60 * 60 * 1000) return false;
	const signature = Uint8Array.from(receipt.match(/../g)!, (hex) => parseInt(hex, 16));
	return crypto.subtle.verify(
		'HMAC',
		await receiptKey(secret),
		signature,
		new TextEncoder().encode(canonical(result))
	);
}
