import { json, type RequestEvent } from '@sveltejs/kit';
import {
	emailUuid,
	parseProductEmailCommand,
	parseProductEmailReceipt,
	parseProductEmailHistory
} from '$lib/product-email';
import { readSmallJson } from './request-json';
import { withRpcDeadline } from './rpc-deadline';

const headers = {
	'cache-control': 'private, no-store',
	'referrer-policy': 'no-referrer',
	'x-robots-tag': 'noindex, nofollow'
};
const reply = (value: unknown, status = 200) => json(value, { status, headers });
const fail = (error: string, status: number) => reply({ error }, status);
const errors: Record<string, number> = {
	auth_required: 401,
	profile_unavailable: 403,
	invalid_input: 400,
	email_disabled: 409,
	email_unavailable: 409,
	email_already_requested: 409,
	idempotency_conflict: 409,
	request_limit: 429
};
type Event = Pick<RequestEvent, 'request' | 'url' | 'locals'>;

/** Fixed POST paths keep recovery keys out of URLs. This API has no delivery transport. */
export async function productEmailApi(
	event: Event,
	action: 'request' | 'recover' | 'cancel' | 'history'
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
		if (claims.error || !emailUuid(claims.data?.claims?.sub)) return fail('auth_required', 401);
		const body = await readSmallJson(event.request, 3072);
		if (!body || typeof body !== 'object' || Array.isArray(body)) return fail('invalid_input', 400);
		const value = body as Record<string, unknown>;
		const keys =
			action === 'request'
				? ['requestKey', 'command']
				: action === 'recover'
					? ['requestKey']
					: action === 'history'
						? ['runId']
						: ['receiptId'];
		if (
			Object.keys(value).length !== keys.length ||
			keys.some((key) => !Object.hasOwn(value, key)) ||
			!emailUuid(
				value[action === 'history' ? 'runId' : action === 'cancel' ? 'receiptId' : 'requestKey']
			)
		)
			return fail('invalid_input', 400);
		const command = action === 'request' ? parseProductEmailCommand(value.command) : null;
		if (action === 'request' && !command) return fail('invalid_input', 400);
		const name =
			action === 'request'
				? 'request_product_email'
				: action === 'recover'
					? 'read_product_email_request'
					: action === 'history'
						? 'list_product_email_requests'
						: 'cancel_product_email_request';
		const args =
			action === 'request'
				? { p_request_key: value.requestKey, p_command: command }
				: action === 'recover'
					? { p_request_key: value.requestKey }
					: action === 'history'
						? { p_run_id: value.runId }
						: { p_id: value.receiptId };
		const { data, error } = await withRpcDeadline((signal) =>
			client.rpc(name, args).abortSignal(signal)
		);
		if (error)
			return Object.hasOwn(errors, error.message)
				? fail(error.message, errors[error.message])
				: fail('email_service_unavailable', 503);
		if (action === 'history') {
			const receipts = parseProductEmailHistory(data, value.runId as string);
			return receipts ? reply({ receipts }) : fail('email_service_unavailable', 503);
		}
		if (data === null && action !== 'request') return reply({ receipt: null });
		const receipt = parseProductEmailReceipt(data);
		if (
			!receipt ||
			(command &&
				(receipt.runId.toLowerCase() !== command.runId.toLowerCase() ||
					receipt.revision !== command.expectedRevision ||
					receipt.reviewDigest !== command.reviewDigest)) ||
			(action === 'cancel' &&
				(receipt.id.toLowerCase() !== String(value.receiptId).toLowerCase() ||
					receipt.state !== 'CANCELLED'))
		)
			return fail('email_service_unavailable', 503);
		return reply({ receipt }, action === 'request' ? 202 : 200);
	} catch {
		// A timeout can occur after commit. Recovery must precede any new key.
		return fail('email_service_unavailable', 503);
	}
}
