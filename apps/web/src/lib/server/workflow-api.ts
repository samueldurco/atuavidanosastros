import { json, type RequestEvent } from '@sveltejs/kit';
import { parseWorkflowInput } from '@atv/domain';
import { isUuid } from '$lib/library-result';
import { parseProductRun } from '$lib/product-run';
import { readSmallJson } from './request-json';

const headers = {
	'cache-control': 'private, no-store',
	'referrer-policy': 'no-referrer',
	'x-robots-tag': 'noindex, nofollow'
};
const reply = (data: unknown, status = 200) => json(data, { status, headers });
const fail = (code: string, status: number) => reply({ error: code }, status);
const errors: Record<string, number> = {
	workflow_unreleased: 409,
	entitlement_required: 403,
	request_limit: 429,
	idempotency_conflict: 409,
	invalid_input: 400,
	parent_not_found: 404,
	parent_not_reprocessable: 409
};
const databaseFailure = (message?: string) =>
	message && Object.hasOwn(errors, message)
		? fail(message, errors[message])
		: fail('workflow_unavailable', 503);
const object = (v: unknown): v is Record<string, unknown> =>
	!!v && typeof v === 'object' && !Array.isArray(v);
type Event = Pick<RequestEvent, 'request' | 'url' | 'locals'>;

async function session(event: Event, mutation: boolean) {
	if (
		mutation &&
		(event.request.headers.get('origin') !== event.url.origin ||
			event.request.headers.get('sec-fetch-site') === 'cross-site')
	)
		return fail('same_origin_required', 403);
	const client = event.locals.supabase;
	if (!client) return fail('auth_unavailable', 503);
	const { data, error } = await client.auth.getClaims();
	if (error || !data?.claims?.sub || !isUuid(data.claims.sub)) return fail('auth_required', 401);
	return client;
}

export async function workflowApi(
	event: Event,
	action: 'create' | 'read' | 'reprocess' | 'delete',
	id?: string
): Promise<Response> {
	try {
		const client = await session(event, action !== 'read');
		if (client instanceof Response) return client;
		if (action !== 'create' && (!id || !isUuid(id))) return fail('run_not_found', 404);
		if (action === 'delete') {
			const { data, error } = await client.rpc('delete_product_run', { p_id: id });
			if (error) return databaseFailure(error.message);
			return data === true ? reply({ deleted: true }) : fail('run_not_found', 404);
		}
		if (action === 'read') {
			const { data, error } = await client.rpc('read_product_run', { p_id: id });
			if (error) return databaseFailure(error.message);
			if (data === null) return fail('run_not_found', 404);
			const run = parseProductRun(data);
			return run && run.id === id ? reply({ run }) : fail('workflow_unavailable', 503);
		}
		const body = await readSmallJson(event.request, 20000);
		if (
			!object(body) ||
			typeof body.requestKey !== 'string' ||
			!isUuid(body.requestKey) ||
			Object.keys(body).some(
				(key) => !(action === 'create' ? ['requestKey', 'input'] : ['requestKey']).includes(key)
			)
		)
			return fail('invalid_input', 400);
		const input = action === 'create' ? parseWorkflowInput(body.input) : null;
		let productId = input?.productId;
		if (action === 'create' && !input) return fail('invalid_input', 400);
		if (action === 'reprocess') {
			const { data, error } = await client.rpc('read_product_run', { p_id: id });
			if (error) return databaseFailure(error.message);
			if (!data) return fail('run_not_found', 404);
			const run = parseProductRun(data);
			if (!run || run.id !== id) return fail('workflow_unavailable', 503);
			// The RPC owns entitlement/state checks; prechecking can break an idempotent retry after revocation.
			productId = run.productId;
		}
		const { data, error } = await client.rpc('request_product_run', {
			p_product_id: productId,
			p_request_key: body.requestKey,
			p_input: input,
			p_parent_id: action === 'reprocess' ? id : null
		});
		if (error) return databaseFailure(error.message);
		if (typeof data !== 'string' || !isUuid(data)) return fail('workflow_unavailable', 503);
		return reply({ runId: data }, 202);
	} catch {
		return fail('workflow_unavailable', 503);
	}
}
