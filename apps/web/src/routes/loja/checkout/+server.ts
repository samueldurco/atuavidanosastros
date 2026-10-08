import { env } from '$env/dynamic/private';
import { getP06Binding } from '$lib/server/shop/p06';
import { parseP06Intent, resolveP06Checkout } from '@atv/integrations';
import { json, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, url, setHeaders }) => {
	const headers = { 'cache-control': 'private, no-store', 'referrer-policy': 'no-referrer' };
	if (request.headers.get('origin') !== url.origin)
		return json({ code: 'invalid_origin' }, { status: 403, headers });
	if (
		request.headers.get('content-type')?.split(';')[0] !== 'application/x-www-form-urlencoded' ||
		Number(request.headers.get('content-length') ?? 0) > 4096 ||
		!request.body
	)
		return json({ code: 'invalid_intent' }, { status: 400, headers });
	let form: FormData;
	try {
		const reader = request.body.getReader();
		const chunks: Uint8Array[] = [];
		let length = 0;
		for (;;) {
			const { done, value } = await reader.read();
			if (done) break;
			length += value.byteLength;
			if (length > 4096) {
				await reader.cancel();
				return json({ code: 'invalid_intent' }, { status: 400, headers });
			}
			chunks.push(value);
		}
		const bytes = new Uint8Array(length);
		let offset = 0;
		for (const chunk of chunks) {
			bytes.set(chunk, offset);
			offset += chunk.byteLength;
		}
		form = new FormData();
		for (const [key, value] of new URLSearchParams(
			new TextDecoder('utf-8', { fatal: true }).decode(bytes)
		))
			form.append(key, value);
	} catch {
		return json({ code: 'invalid_intent' }, { status: 400, headers });
	}
	const intent = parseP06Intent(form);
	if (!intent) return json({ code: 'invalid_intent' }, { status: 400, headers });
	if (env.FEATURE_P06_CATALOG !== 'true')
		return json({ code: 'checkout_unavailable' }, { status: 503, headers });
	let destination: string | null = null;
	try {
		destination = resolveP06Checkout(intent.sku, await getP06Binding(intent.sku));
	} catch {
		/* Fail closed on provider/database outages. */
	}
	if (!destination) return json({ code: 'checkout_unavailable' }, { status: 503, headers });
	setHeaders(headers);
	redirect(303, destination);
};
