import { json, type RequestEvent } from '@sveltejs/kit';
import { isUuid } from '$lib/library-result';
import { parseOnboardingCommand, parseOnboardingSnapshot } from '$lib/onboarding';
import { readSmallJson } from './request-json';

const headers = {
	'cache-control': 'private, no-store',
	'referrer-policy': 'no-referrer',
	'x-robots-tag': 'noindex, nofollow'
};
const reply = (data: unknown, status = 200) => json(data, { status, headers });
const fail = (error: string, status: number) => reply({ error }, status);
type Event = Pick<RequestEvent, 'request' | 'url' | 'locals'>;
export async function onboardingApi(event: Event, action: 'read' | 'write'): Promise<Response> {
	try {
		if (
			action === 'write' &&
			(event.request.headers.get('origin') !== event.url.origin ||
				event.request.headers.get('sec-fetch-site') === 'cross-site')
		)
			return fail('same_origin_required', 403);
		const client = event.locals.supabase;
		if (!client) return fail('auth_unavailable', 503);
		const { data: session, error: authError } = await client.auth.getClaims();
		if (authError || !session?.claims?.sub || !isUuid(session.claims.sub))
			return fail('auth_required', 401);
		const command =
			action === 'write' ? parseOnboardingCommand(await readSmallJson(event.request, 4096)) : null;
		if (action === 'write' && !command) return fail('invalid_input', 400);
		const { data, error } =
			action === 'read'
				? await client.rpc('read_natal_onboarding')
				: await client.rpc('update_natal_onboarding', { p_command: command });
		if (error) {
			const errors: Record<string, number> = {
				invalid_input: 400,
				revision_conflict: 409,
				profile_unavailable: 409,
				auth_required: 401
			};
			return Object.hasOwn(errors, error.message)
				? fail(error.message, errors[error.message])
				: fail('onboarding_unavailable', 503);
		}
		const snapshot = parseOnboardingSnapshot(data);
		return snapshot ? reply({ onboarding: snapshot }) : fail('onboarding_unavailable', 503);
	} catch {
		return fail('onboarding_unavailable', 503);
	}
}
