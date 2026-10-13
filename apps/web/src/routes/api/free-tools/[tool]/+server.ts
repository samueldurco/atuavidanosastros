import { json } from '@sveltejs/kit';
import { isFreeToolId } from '$lib/free-tools';
import { calculatePublicFreeTool } from '$lib/server/free-tools-runtime';
import { readSmallJson } from '$lib/server/request-json';
import type { RequestHandler } from './$types';

const headers = { 'cache-control': 'private, no-store', 'x-content-type-options': 'nosniff' };

/** Computation is public. Saving a returned, signed execution is a separate authenticated request. */
export const POST: RequestHandler = async (event) => {
	const { request, url, params } = event;
	const origin = request.headers.get('origin');
	if (origin && origin !== url.origin)
		return json({ code: 'cross_origin_denied' }, { status: 403, headers });
	if (!isFreeToolId(params.tool)) return json({ code: 'invalid_tool' }, { status: 404, headers });
	const input = await readSmallJson(request, 32768);
	if (input === null) return json({ code: 'invalid_input' }, { status: 400, headers });
	try {
		return json(await calculatePublicFreeTool(event, params.tool, input), { headers });
	} catch (failure) {
		const code = failure && typeof failure === 'object' && 'code' in failure ? failure.code : null;
		if (code === 'invalid_input') return json({ code }, { status: 400, headers });
		if (code === 'ascendant_unavailable') return json({ code }, { status: 422, headers });
		if (failure && typeof failure === 'object' && 'status' in failure && failure.status === 503)
			return json({ code: 'calculation_unavailable' }, { status: 503, headers });
		return json({ code: 'calculation_failed' }, { status: 422, headers });
	}
};
