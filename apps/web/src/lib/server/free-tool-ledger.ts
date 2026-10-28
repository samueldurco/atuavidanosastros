import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { createClient } from '@supabase/supabase-js';
import type { RequestEvent } from '@sveltejs/kit';
import type { FreeToolId, FreeToolResult } from '$lib/free-tools';
import { parseFreeToolState, type FreeToolState } from '$lib/free-tool-state';
import { signFreeToolResult } from './free-tool-receipt';
import { withRpcDeadline } from './rpc-deadline';

type Event = Pick<RequestEvent, 'cookies' | 'locals' | 'platform' | 'url'>;
const COOKIE = 'atv_free_subject';
const LIFETIME = 180 * 24 * 60 * 60;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export class FreeToolLedgerError extends Error {
	constructor(
		public readonly code: string,
		public readonly status = 503
	) {
		super(code);
	}
}
function secretFor(event: Event): string {
	const secret = event.platform?.env?.FREE_TOOL_RECEIPT_KEY ?? env.FREE_TOOL_RECEIPT_KEY;
	if (!secret || secret.length < 32) throw new FreeToolLedgerError('quota_unavailable');
	return secret;
}
async function hmac(secret: string) {
	return crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign', 'verify']
	);
}
export async function signAnonymousSubject(
	id: string,
	expires: number,
	secret: string
): Promise<string> {
	const payload = `${id}.${expires}`;
	const signature = await crypto.subtle.sign(
		'HMAC',
		await hmac(secret),
		new TextEncoder().encode(`atv-free-subject/1:${payload}`)
	);
	return `${payload}.${Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}
export async function verifyAnonymousSubject(
	value: string | undefined,
	secret: string,
	now = Date.now()
): Promise<string | null> {
	if (!value || value.length > 160) return null;
	const [id, expires, signature, extra] = value.split('.');
	if (
		extra ||
		!UUID.test(id ?? '') ||
		!/^\d{13}$/.test(expires ?? '') ||
		!/^[a-f0-9]{64}$/.test(signature ?? '') ||
		Number(expires) <= now ||
		Number(expires) > now + LIFETIME * 1000 + 60000
	)
		return null;
	const valid = await crypto.subtle.verify(
		'HMAC',
		await hmac(secret),
		Uint8Array.from(signature!.match(/../g)!, (part) => parseInt(part, 16)),
		new TextEncoder().encode(`atv-free-subject/1:${id}.${expires}`)
	);
	return valid ? `anon:${id}` : null;
}
function canonical(value: unknown): string {
	if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
	if (value && typeof value === 'object')
		return `{${Object.entries(value)
			.sort(([a], [b]) => a.localeCompare(b, 'en'))
			.map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
			.join(',')}}`;
	return JSON.stringify(value);
}
export async function freeToolInputHash(input: unknown): Promise<string> {
	const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical(input)));
	return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** The service key and signed cookie are never exposed to the browser or accepted in JSON. */
export async function freeToolLedger(event: Event, resolution?: 'account') {
	const secret = secretFor(event);
	const supabaseUrl = event.platform?.env?.PUBLIC_SUPABASE_URL ?? publicEnv.PUBLIC_SUPABASE_URL;
	const serviceKey =
		event.platform?.env?.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY;
	if (!supabaseUrl || !serviceKey) throw new FreeToolLedgerError('quota_unavailable');
	const client = createClient(supabaseUrl, serviceKey, {
		auth: { persistSession: false, autoRefreshToken: false }
	});
	async function rpc(name: string, args: Record<string, unknown>) {
		const { data, error } = await withRpcDeadline((signal) =>
			client.rpc(name, args).abortSignal(signal)
		);
		if (error) {
			const statuses: Record<string, number> = {
				quota_exceeded: 429,
				claim_conflict: 409,
				profile_conflict: 409,
				invalid_input: 400,
				subject_claimed: 409
			};
			throw new FreeToolLedgerError(
				Object.hasOwn(statuses, error.message) ? error.message : 'quota_unavailable',
				statuses[error.message] ?? 503
			);
		}
		return data;
	}
	let anonymous = await verifyAnonymousSubject(event.cookies.get(COOKIE), secret);
	if (!anonymous) {
		const id = crypto.randomUUID();
		anonymous = `anon:${id}`;
		event.cookies.set(
			COOKIE,
			await signAnonymousSubject(id, Date.now() + LIFETIME * 1000, secret),
			{
				path: '/',
				httpOnly: true,
				secure: event.url.protocol === 'https:',
				sameSite: 'lax',
				maxAge: LIFETIME
			}
		);
	}
	let userId: string | null = null;
	if (event.locals.supabase) {
		const { data, error } = await event.locals.supabase.auth.getClaims();
		if (!error && UUID.test(data?.claims?.sub ?? '')) userId = data!.claims!.sub!;
	}
	const subject = userId ? `user:${userId}` : anonymous;
	if (userId) {
		try {
			await rpc('claim_free_tool_subject', {
				p_anonymous_subject: anonymous,
				p_user_subject: subject,
				p_resolution: resolution ?? null
			});
		} catch (issue) {
			// A browser previously linked to another account cannot transfer that
			// account's data. Keep its tombstone/cookie, and use only this verified user.
			if (!(issue instanceof FreeToolLedgerError) || issue.code !== 'subject_claimed') throw issue;
		}
	} else if (resolution) throw new FreeToolLedgerError('auth_required', 401);
	const ownerSignature = await crypto.subtle.sign(
		'HMAC',
		await hmac(secret),
		new TextEncoder().encode(`atv-free-owner/1:${subject}`)
	);
	const owner = Array.from(new Uint8Array(ownerSignature), (byte) =>
		byte.toString(16).padStart(2, '0')
	).join('');
	async function envelope(data: unknown): Promise<FreeToolState> {
		const parsed = parseFreeToolState(data);
		if (!parsed) throw new FreeToolLedgerError('quota_unavailable');
		return {
			...parsed,
			owner,
			receipt: parsed.result ? await signFreeToolResult(parsed.result, secret) : null
		};
	}
	return {
		subject,
		history: async (before: string | null = null, resultId: string | null = null) => {
			const data = await rpc('read_free_tool_history', {
				p_subject: subject,
				p_tool: 'registro-de-sonho',
				p_before: before,
				p_result_id: resultId
			});
			const page = data as { history?: unknown; nextCursor?: unknown } | null;
			if (
				!Array.isArray(page?.history) ||
				page.history.length > 100 ||
				(page.nextCursor !== null &&
					(typeof page.nextCursor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(page.nextCursor)))
			)
				throw new FreeToolLedgerError('quota_unavailable');
			const history = await Promise.all(page.history.map(envelope));
			if (history.some((entry) => entry.result?.tool !== 'registro-de-sonho'))
				throw new FreeToolLedgerError('quota_unavailable');
			return { history, nextCursor: page.nextCursor as string | null, owner };
		},
		read: async (tool: FreeToolId) =>
			envelope(await rpc('read_free_tool_state', { p_subject: subject, p_tool: tool })),
		commit: async (tool: FreeToolId, input: unknown, result: FreeToolResult) =>
			envelope(
				await rpc('commit_free_tool_result', {
					p_subject: subject,
					p_tool: tool,
					p_input_hash: await freeToolInputHash(input),
					p_input: input,
					p_result: result
				})
			)
	};
}
