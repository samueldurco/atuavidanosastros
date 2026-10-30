import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { createClient } from '@supabase/supabase-js';
import { json, type RequestEvent } from '@sveltejs/kit';
import { readSmallJson } from './request-json';
import { withRpcDeadline } from './rpc-deadline';

export const NEWS_CONSENT_POLICY = 'atv-news-consent/2026-10-30';
export const NEWS_CONSENT_SOURCE = 'free-reading-pdf';
const headers = {
	'cache-control': 'private, no-store',
	'referrer-policy': 'no-referrer',
	'x-content-type-options': 'nosniff'
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LIFETIME = 15 * 60 * 1000;
const reply = (code: string, status: number) => json({ code }, { status, headers });

async function bindingKey(secret: string) {
	return crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign', 'verify']
	);
}
const bindingPayload = (userId: string, issued: number) =>
	new TextEncoder().encode(`${NEWS_CONSENT_POLICY}:${userId}:${issued}`);
async function ownerBinding(userId: string, issued: number, secret: string) {
	const value = await crypto.subtle.sign(
		'HMAC',
		await bindingKey(secret),
		bindingPayload(userId, issued)
	);
	return `${issued}.${Array.from(new Uint8Array(value), (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

/** No subscription, email dispatch or reading mutation: append only the account's explicit choice. */
export async function newsConsentApi(event: RequestEvent, write: boolean) {
	const origin = event.request.headers.get('origin');
	if (
		event.request.headers.get('sec-fetch-site') === 'cross-site' ||
		(write ? origin !== event.url.origin : origin !== null && origin !== event.url.origin)
	)
		return reply('cross_origin_denied', 403);
	try {
		if (!event.locals.supabase) return reply('auth_required', 401);
		const { data, error } = await event.locals.supabase.auth.getUser();
		const user = data?.user;
		if (error || !user?.email_confirmed_at || !UUID.test(user.id))
			return reply('auth_required', 401);
		const secret = event.platform?.env?.FREE_TOOL_RECEIPT_KEY ?? env.FREE_TOOL_RECEIPT_KEY;
		if (!secret || secret.length < 32) return reply('consent_unavailable', 503);
		if (!write)
			return json({ owner: await ownerBinding(user.id, Date.now(), secret) }, { headers });
		const body = await readSmallJson(event.request, 1024);
		if (
			!body ||
			typeof body !== 'object' ||
			Array.isArray(body) ||
			Object.keys(body).length !== 2 ||
			!('granted' in body) ||
			typeof body.granted !== 'boolean' ||
			!('owner' in body) ||
			typeof body.owner !== 'string' ||
			!/^\d{13}\.[a-f0-9]{64}$/.test(body.owner)
		)
			return reply('invalid_input', 400);
		const issued = Number(body.owner.split('.')[0]);
		if (
			issued > Date.now() + 5000 ||
			Date.now() - issued > LIFETIME ||
			!(await crypto.subtle.verify(
				'HMAC',
				await bindingKey(secret),
				Uint8Array.from(body.owner.split('.')[1].match(/../g)!, (hex) => parseInt(hex, 16)),
				bindingPayload(user.id, issued)
			))
		)
			return reply('account_changed', 409);
		const url = event.platform?.env?.PUBLIC_SUPABASE_URL ?? publicEnv.PUBLIC_SUPABASE_URL;
		const serviceKey =
			event.platform?.env?.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY;
		if (!url?.startsWith('https://') || !serviceKey?.trim())
			return reply('consent_unavailable', 503);
		const client = createClient(url, serviceKey, {
			auth: { persistSession: false, autoRefreshToken: false }
		});
		const result = await withRpcDeadline((signal) =>
			client
				.from('consent_events')
				.insert({
					user_id: user.id,
					consent_type: 'MARKETING',
					granted: body.granted,
					policy_version: NEWS_CONSENT_POLICY,
					source: NEWS_CONSENT_SOURCE
				})
				.abortSignal(signal)
		);
		if (result.error) return reply('consent_unavailable', 503);
		return json({ saved: true, granted: body.granted }, { headers });
	} catch {
		return reply('consent_unavailable', 503);
	}
}
