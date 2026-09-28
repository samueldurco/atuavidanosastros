import { json, type RequestEvent } from '@sveltejs/kit';
import {
	CONTINUITY_CONSENT_VERSION,
	parseContinuityConsent,
	parseContinuityItem,
	parseContinuitySelection,
	type ContinuityItem
} from '@atv/domain';
import { readSmallJson } from './request-json';
import { parseContinuityAccess } from '$lib/product-continuity-access';

const headers = {
	'cache-control': 'private, no-store',
	'referrer-policy': 'no-referrer',
	'x-robots-tag': 'noindex, nofollow'
};
const reply = (value: unknown, status = 200) => json(value, { status, headers });
const fail = (error: string, status: number) => reply({ error }, status);
const object = (v: unknown): v is Record<string, unknown> =>
	!!v && typeof v === 'object' && !Array.isArray(v);
const exact = (v: Record<string, unknown>, keys: string[]) =>
	Object.keys(v).length === keys.length && keys.every((k) => Object.hasOwn(v, k));
const uuid = (v: unknown): v is string =>
	typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v);
const revision = (v: unknown, min = 0): v is number =>
	Number.isInteger(v) && Number(v) >= min && Number(v) <= 2147483647;
const runIds = (v: unknown): v is string[] =>
	Array.isArray(v) && v.length <= 100 && v.every(uuid) && new Set(v).size === v.length;
const timestamp = (v: unknown): v is string =>
	typeof v === 'string' &&
	v.length <= 40 &&
	/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+-]\d{2}:\d{2})$/.test(v) &&
	Number.isFinite(Date.parse(v));
const errors: Record<string, number> = {
	auth_required: 401,
	profile_unavailable: 403,
	invalid_selection: 400,
	continuity_disabled: 409,
	consent_required: 409,
	source_unavailable: 409,
	item_unavailable: 409,
	revision_conflict: 409,
	item_limit: 429
};
type Action = 'read' | 'consent' | 'save' | 'delete' | 'access' | 'clear-access';
type Event = Pick<RequestEvent, 'request' | 'url' | 'locals'>;
type ManagedItem = Omit<ContinuityItem, 'ownerId' | 'version'> & {
	revision: number;
	updatedAt: string;
};

/** Management only, NOT the selected-context reader or an availability attestation. */
export function parseContinuityManagement(v: unknown, ownerId: string) {
	if (
		!uuid(ownerId) ||
		!object(v) ||
		!exact(v, ['enabled', 'consent', 'consentRevision', 'items']) ||
		typeof v.enabled !== 'boolean' ||
		!revision(v.consentRevision) ||
		!Array.isArray(v.items) ||
		v.items.length > 100 ||
		JSON.stringify(v).length > 196608
	)
		return null;
	const consent = parseContinuityConsent(v.consent);
	if (
		!consent ||
		consent.ownerId !== ownerId ||
		!runIds(consent.runIds) ||
		(consent.state === 'revoked' && consent.runIds.length !== 0) ||
		(v.consentRevision === 0 && (consent.state !== 'revoked' || v.items.length !== 0))
	)
		return null;
	const items: ManagedItem[] = [];
	const seen = new Set<string>();
	for (const entry of v.items) {
		if (
			!object(entry) ||
			!exact(entry, ['item', 'revision', 'updatedAt']) ||
			!revision(entry.revision, 1) ||
			!timestamp(entry.updatedAt)
		)
			return null;
		const item = parseContinuityItem(entry.item);
		if (
			!item ||
			item.ownerId !== ownerId ||
			!uuid(item.id) ||
			!uuid(item.runId) ||
			seen.has(item.id)
		)
			return null;
		seen.add(item.id);
		items.push({
			id: item.id,
			runId: item.runId,
			productId: item.productId,
			relevance: item.relevance,
			selection: item.selection,
			revision: entry.revision,
			updatedAt: entry.updatedAt
		});
	}
	return {
		enabled: v.enabled,
		consent: {
			version: consent.version,
			purpose: consent.purpose,
			state: consent.state,
			runIds: consent.runIds,
			revision: v.consentRevision
		},
		items
	};
}

/** Fixed POST paths keep notes/identifiers out of URLs. No model, selected context, retry or cache. */
export async function productContinuityApi(event: Event, action: Action): Promise<Response> {
	try {
		if (
			event.request.method !== 'POST' ||
			event.request.headers.get('origin') !== event.url.origin ||
			event.request.headers.get('sec-fetch-site') === 'cross-site'
		)
			return fail('same_origin_required', 403);
		if (
			event.url.search ||
			!['read', 'consent', 'save', 'delete', 'access', 'clear-access'].includes(action)
		)
			return fail('invalid_input', 400);
		const client = event.locals.supabase;
		if (!client) return fail('auth_unavailable', 503);
		const claims = await client.auth.getClaims();
		const ownerId = claims.data?.claims?.sub;
		if (claims.error || !uuid(ownerId)) return fail('auth_required', 401);
		const value = await readSmallJson(event.request, 8192);
		if (!object(value)) return fail('invalid_input', 400);
		let name: string, args: Record<string, unknown>, expectedRevision: number | undefined;
		if (action === 'read' || action === 'access' || action === 'clear-access') {
			if (!exact(value, [])) return fail('invalid_input', 400);
			name =
				action === 'read'
					? 'read_product_continuity'
					: action === 'access'
						? 'read_product_continuity_access'
						: 'clear_product_continuity_access';
			args = {};
		} else if (action === 'consent') {
			if (
				!exact(value, ['version', 'purpose', 'expectedRevision', 'runIds', 'granted']) ||
				value.version !== CONTINUITY_CONSENT_VERSION ||
				value.purpose !== 'reading-context' ||
				!revision(value.expectedRevision) ||
				value.expectedRevision === 2147483647 ||
				!runIds(value.runIds) ||
				typeof value.granted !== 'boolean' ||
				(value.granted ? value.runIds.length === 0 : value.runIds.length !== 0)
			)
				return fail('invalid_input', 400);
			expectedRevision = value.expectedRevision;
			name = 'set_product_continuity_consent';
			args = {
				p_expected_revision: expectedRevision,
				p_run_ids: value.runIds,
				p_granted: value.granted
			};
		} else if (action === 'save') {
			if (
				!exact(value, ['id', 'runId', 'expectedRevision', 'relevance', 'selection']) ||
				!uuid(value.id) ||
				!uuid(value.runId) ||
				!revision(value.expectedRevision) ||
				value.expectedRevision === 2147483647 ||
				!['relevant', 'irrelevant', 'unreviewed'].includes(String(value.relevance))
			)
				return fail('invalid_input', 400);
			const selection = parseContinuitySelection(value.selection);
			if (!selection) return fail('invalid_input', 400);
			expectedRevision = value.expectedRevision;
			name = 'save_product_continuity_item';
			args = {
				p_id: value.id,
				p_run_id: value.runId,
				p_expected_revision: expectedRevision,
				p_relevance: value.relevance,
				p_selection: selection
			};
		} else {
			if (!exact(value, ['id']) || !uuid(value.id)) return fail('invalid_input', 400);
			name = 'delete_product_continuity_item';
			args = { p_id: value.id };
		}
		const signal = AbortSignal.timeout(10000);
		const { data, error } = await client.rpc(name, args).abortSignal(signal);
		signal.throwIfAborted();
		if (error)
			return Object.hasOwn(errors, error.message)
				? fail(error.message, errors[error.message])
				: fail('continuity_service_unavailable', 503);
		if (action === 'read') {
			const management = parseContinuityManagement(data, ownerId);
			return management ? reply(management) : fail('continuity_service_unavailable', 503);
		}
		if (action === 'access') {
			const access = parseContinuityAccess(data);
			return access ? reply(access) : fail('continuity_service_unavailable', 503);
		}
		if (action === 'clear-access')
			return revision(data)
				? reply({ deleted: data })
				: fail('continuity_service_unavailable', 503);
		if (action === 'delete')
			return typeof data === 'boolean'
				? reply({ deleted: data })
				: fail('continuity_service_unavailable', 503);
		return revision(data, 1) && data === Number(expectedRevision) + 1
			? reply({ revision: data })
			: fail('continuity_service_unavailable', 503);
	} catch {
		// Commit may have happened before a lost response. Recover via read; never retry blindly.
		return fail('continuity_service_unavailable', 503);
	}
}
