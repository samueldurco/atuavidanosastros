import { json } from '@sveltejs/kit';
import { freeToolLedger, FreeToolLedgerError } from '$lib/server/free-tool-ledger';
import { readSmallJson } from '$lib/server/request-json';
import type { RequestHandler } from './$types';

const headers = { 'cache-control': 'private, no-store', 'referrer-policy': 'no-referrer' };
export const POST: RequestHandler = async (event) => {
	if (
		event.request.headers.get('origin') !== event.url.origin ||
		event.request.headers.get('sec-fetch-site') === 'cross-site'
	)
		return json({ code: 'cross_origin_denied' }, { status: 403, headers });
	const input = await readSmallJson(event.request, 512);
	const resolution =
		input && typeof input === 'object' && 'resolution' in input ? input.resolution : null;
	if (resolution !== 'account') return json({ code: 'invalid_input' }, { status: 400, headers });
	try {
		await freeToolLedger(event, resolution);
		return json({ ok: true }, { headers });
	} catch (failure) {
		return json(
			{ code: failure instanceof FreeToolLedgerError ? failure.code : 'quota_unavailable' },
			{ status: failure instanceof FreeToolLedgerError ? failure.status : 503, headers }
		);
	}
};
