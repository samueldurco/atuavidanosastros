import { json, type RequestEvent } from '@sveltejs/kit';
import { isUuid } from '$lib/library-result';
import { parseDateRequestInput } from '$lib/date-request';
import { readSmallJson } from './request-json';

const headers = {
	'cache-control': 'private, no-store',
	'referrer-policy': 'no-referrer',
	'x-robots-tag': 'noindex, nofollow'
};
const fail = (error: string, status: number) => json({ error }, { status, headers });
const errors: Record<string, number> = {
	invalid_input: 400,
	auth_required: 401,
	profile_unavailable: 409,
	revision_conflict: 409,
	natal_profile_required: 409,
	exact_time_required: 409,
	idempotency_conflict: 409,
	workflow_unreleased: 409,
	entitlement_required: 403,
	request_limit: 429
};
export async function dateRequestApi(
	event: Pick<RequestEvent, 'request' | 'url' | 'locals'>
): Promise<Response> {
	try {
		if (
			event.request.headers.get('origin') !== event.url.origin ||
			event.request.headers.get('sec-fetch-site') === 'cross-site'
		)
			return fail('same_origin_required', 403);
		const client = event.locals.supabase;
		if (!client) return fail('auth_unavailable', 503);
		const { data: session, error: authError } = await client.auth.getClaims();
		if (authError || !session?.claims?.sub || !isUuid(session.claims.sub))
			return fail('auth_required', 401);
		const body = await readSmallJson(event.request, 4096);
		if (
			!body ||
			typeof body !== 'object' ||
			Array.isArray(body) ||
			Object.keys(body).length !== 2 ||
			!('requestKey' in body) ||
			!('input' in body) ||
			typeof body.requestKey !== 'string' ||
			!isUuid(body.requestKey)
		)
			return fail('invalid_input', 400);
		const input = parseDateRequestInput(body.input);
		if (!input) return fail('invalid_input', 400);
		const { data, error } = await client.rpc('request_date_product_run', {
			p_request_key: body.requestKey,
			p_command: input
		});
		if (error)
			return Object.hasOwn(errors, error.message)
				? fail(error.message, errors[error.message])
				: fail('workflow_unavailable', 503);
		return typeof data === 'string' && isUuid(data)
			? json({ runId: data }, { status: 202, headers })
			: fail('workflow_unavailable', 503);
	} catch {
		return fail('workflow_unavailable', 503);
	}
}
