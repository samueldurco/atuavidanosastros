const encoder = new TextEncoder();
const context = 'atv-free-tools-runtime:v1';
const maxAgeMs = 60_000;

async function key(secret: string) {
	return crypto.subtle.importKey(
		'raw',
		encoder.encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign', 'verify']
	);
}

/** Dedicated request signature: result receipts cannot authorize runtime requests. */
export async function signFreeToolRuntimeRequest(
	body: string,
	secret: string | undefined,
	now = Date.now()
): Promise<Record<string, string>> {
	if (!secret || secret.length < 32) throw new Error('runtime_auth_unavailable');
	const timestamp = String(now);
	const signature = await crypto.subtle.sign(
		'HMAC',
		await key(secret),
		encoder.encode(`${context}\n${timestamp}\n${body}`)
	);
	return {
		'x-atv-runtime-time': timestamp,
		'x-atv-runtime-signature': [...new Uint8Array(signature)]
			.map((byte) => byte.toString(16).padStart(2, '0'))
			.join('')
	};
}

export async function verifyFreeToolRuntimeRequest(
	headers: Headers,
	body: string,
	secret: string | undefined,
	now = Date.now()
): Promise<boolean> {
	const timestamp = headers.get('x-atv-runtime-time') ?? '';
	const signature = headers.get('x-atv-runtime-signature') ?? '';
	if (
		!secret ||
		secret.length < 32 ||
		!/^\d{13}$/.test(timestamp) ||
		!/^[a-f0-9]{64}$/.test(signature)
	)
		return false;
	const age = now - Number(timestamp);
	if (age < -5_000 || age > maxAgeMs) return false;
	return crypto.subtle.verify(
		'HMAC',
		await key(secret),
		Uint8Array.from(signature.match(/../g)!, (part) => parseInt(part, 16)),
		encoder.encode(`${context}\n${timestamp}\n${body}`)
	);
}
