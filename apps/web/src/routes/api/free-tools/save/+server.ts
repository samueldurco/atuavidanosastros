import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { createClient } from '@supabase/supabase-js';
import { parseFreeToolResult } from '$lib/free-tool-result';
import { verifyFreeToolReceipt } from '$lib/server/free-tool-receipt';
import { readSmallJson } from '$lib/server/request-json';
import { withRpcDeadline } from '$lib/server/rpc-deadline';
import type { RequestHandler } from './$types';

const headers = {
	'cache-control': 'private, no-store',
	'x-robots-tag': 'noindex, nofollow',
	'referrer-policy': 'no-referrer'
};
export const POST: RequestHandler = async ({ request, url, locals, platform }) => {
	if (request.headers.get('origin') && request.headers.get('origin') !== url.origin)
		return json({ code: 'invalid_origin' }, { status: 403, headers });
	if (!locals.supabase) return json({ code: 'auth_unavailable' }, { status: 503, headers });
	const { data, error } = await locals.supabase.auth.getClaims();
	const userId = !error ? data?.claims?.sub : undefined;
	if (!userId) return json({ code: 'auth_required' }, { status: 401, headers });
	const body = (await readSmallJson(request, 110000)) as {
		result?: unknown;
		receipt?: unknown;
	} | null;
	const result = parseFreeToolResult(body?.result);
	if (
		!result ||
		!(await verifyFreeToolReceipt(
			result,
			body?.receipt,
			platform?.env?.FREE_TOOL_RECEIPT_KEY ?? env.FREE_TOOL_RECEIPT_KEY
		))
	)
		return json({ code: 'invalid_result' }, { status: 400, headers });
	try {
		const client = locals.supabase;
		const supabaseUrl = platform?.env?.PUBLIC_SUPABASE_URL ?? publicEnv.PUBLIC_SUPABASE_URL;
		const serviceKey = platform?.env?.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY;
		if (!supabaseUrl || !serviceKey)
			return json({ code: 'storage_unavailable' }, { status: 503, headers });
		// Only this verified server path can insert signed results. Direct account writes are denied.
		const writer = createClient(supabaseUrl, serviceKey, {
			auth: { persistSession: false, autoRefreshToken: false }
		});
		const { error: writeError } = await withRpcDeadline((signal) =>
			writer
				.from('free_tool_results')
				.upsert(
					{ id: result.id, user_id: userId, tool: result.tool, result },
					{ onConflict: 'user_id,id', ignoreDuplicates: true }
				)
				.abortSignal(signal)
		);
		if (writeError) return json({ code: 'storage_unavailable' }, { status: 503, headers });
		const { data: item, error: readError } = await withRpcDeadline((signal) =>
			client
				.from('library_items')
				.select('id')
				.eq('user_id', userId)
				.eq('item_type', 'FREE_TOOL_RESULT')
				.eq('source_id', result.id)
				.is('archived_at', null)
				.abortSignal(signal)
				.maybeSingle()
		);
		if (readError || !item) return json({ code: 'library_unavailable' }, { status: 503, headers });
		return json({ id: item.id, href: `/biblioteca/${item.id}` }, { status: 201, headers });
	} catch {
		return json({ code: 'storage_unavailable' }, { status: 503, headers });
	}
};
