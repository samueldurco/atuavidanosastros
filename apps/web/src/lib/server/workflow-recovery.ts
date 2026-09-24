import { json, type RequestEvent } from '@sveltejs/kit';
import { workflowFor } from '@atv/domain';
import { isUuid } from '$lib/library-result';
import { readSmallJson } from './request-json';

const headers = {
	'cache-control': 'private, no-store',
	'referrer-policy': 'no-referrer',
	'x-robots-tag': 'noindex, nofollow'
};
const fail = (error: string, status: number) => json({ error }, { status, headers });
const object = (value: unknown): value is Record<string, unknown> =>
	!!value && typeof value === 'object' && !Array.isArray(value);
const uuid = (value: unknown): value is string => typeof value === 'string' && isUuid(value);

/** POST keeps the correlation key out of URL/referrer logs; this never mutates a run. */
export async function recoverWorkflowRequest(
	event: Pick<RequestEvent, 'request' | 'url' | 'locals'>
): Promise<Response> {
	try {
		if (
			event.request.method !== 'POST' ||
			event.request.headers.get('origin') !== event.url.origin ||
			event.request.headers.get('sec-fetch-site') === 'cross-site'
		)
			return fail('same_origin_required', 403);
		if (event.url.search) return fail('invalid_input', 400);
		const client = event.locals.supabase;
		if (!client) return fail('auth_unavailable', 503);
		const claims = await client.auth.getClaims();
		if (claims.error || !uuid(claims.data?.claims?.sub)) return fail('auth_required', 401);
		const body = await readSmallJson(event.request, 1024);
		if (!object(body) || Object.keys(body).length !== 1 || !uuid(body.requestKey))
			return fail('invalid_input', 400);
		const { data, error } = await client
			.rpc('recover_product_request', { p_request_key: body.requestKey })
			.abortSignal(AbortSignal.timeout(10000));
		if (error) return fail('workflow_unavailable', 503);
		if (data === null) return json({ request: null }, { headers });
		if (
			!object(data) ||
			Object.keys(data).length !== 3 ||
			!uuid(data.runId) ||
			typeof data.productId !== 'string' ||
			!workflowFor(data.productId) ||
			!(data.libraryItemId === null || uuid(data.libraryItemId))
		)
			return fail('workflow_unavailable', 503);
		return json(
			{
				request: { runId: data.runId, productId: data.productId, libraryItemId: data.libraryItemId }
			},
			{ headers }
		);
	} catch {
		return fail('workflow_unavailable', 503);
	}
}
