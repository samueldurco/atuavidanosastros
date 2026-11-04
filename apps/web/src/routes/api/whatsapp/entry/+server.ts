import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { whatsappEntry } from '$lib/server/whatsapp-entry';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ platform }) => {
	const destination = whatsappEntry({ ...publicEnv, ...env, ...platform?.env });
	const headers = { 'cache-control': 'private, no-store', 'referrer-policy': 'no-referrer' };
	if (!destination)
		return new Response('O canal de consultas está indisponível no momento.', {
			status: 503,
			headers
		});
	return new Response(null, { status: 302, headers: { ...headers, location: destination } });
};
