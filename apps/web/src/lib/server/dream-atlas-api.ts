import { json, type RequestEvent } from '@sveltejs/kit';
import { parseDreamAtlasEntryInput, prepareDreamAtlasFacts, validDate } from '@atv/domain';
import { readSmallJson } from './request-json';
import { withRpcDeadline } from './rpc-deadline';
import { isUuid } from '$lib/library-result';

const headers = {
	'cache-control': 'private, no-store',
	'referrer-policy': 'no-referrer',
	'x-robots-tag': 'noindex, nofollow'
};
const reply = (value: unknown, status = 200) => json(value, { status, headers });
const fail = (error: string, status: number) => reply({ error }, status);
const object = (v: unknown): v is Record<string, unknown> =>
	v !== null && typeof v === 'object' && !Array.isArray(v);
const exact = (v: Record<string, unknown>, keys: string[]) =>
	Object.keys(v).length === keys.length && keys.every((key) => Object.hasOwn(v, key));
const uuid = (v: unknown): v is string => typeof v === 'string' && isUuid(v);
const revision = (v: unknown, min = 0): v is number =>
	Number.isInteger(v) && Number(v) >= min && Number(v) < 2147483647;
const timestamp = (v: unknown): v is string =>
	typeof v === 'string' &&
	v.length <= 40 &&
	/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+-]\d{2}:\d{2})$/.test(v) &&
	Number.isFinite(Date.parse(v));
const errors: Record<string, number> = {
	auth_required: 401,
	atlas_run_unavailable: 404,
	atlas_entry_unavailable: 404,
	atlas_unreleased: 409,
	invalid_atlas_entry: 400,
	invalid_atlas_period: 409,
	entry_outside_period: 400,
	revision_conflict: 409,
	atlas_entry_limit: 429
};
type Action = 'read' | 'save' | 'delete';
type Event = Pick<RequestEvent, 'request' | 'url' | 'locals'>;

function parseEntries(value: unknown, runId: string) {
	if (!Array.isArray(value) || value.length > 150) return null;
	const seen = new Set<string>();
	const entries = [];
	for (const item of value) {
		if (
			!object(item) ||
			!exact(item, [
				'version',
				'id',
				'runId',
				'dreamDate',
				'narrative',
				'emotions',
				'associations',
				'includeInSynthesis',
				'revision',
				'createdAt',
				'updatedAt'
			]) ||
			!uuid(item.id) ||
			item.runId !== runId ||
			seen.has(item.id) ||
			!revision(item.revision, 1) ||
			!timestamp(item.createdAt) ||
			!timestamp(item.updatedAt) ||
			!parseDreamAtlasEntryInput({
				version: item.version,
				dreamDate: item.dreamDate,
				narrative: item.narrative,
				emotions: item.emotions,
				associations: item.associations,
				includeInSynthesis: item.includeInSynthesis
			})
		)
			return null;
		seen.add(item.id);
		entries.push(item);
	}
	return entries;
}

/** Private diary management. No synthesis, historical selection, or release bypass. */
export async function dreamAtlasApi(event: Event, action: Action): Promise<Response> {
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
		const value = await readSmallJson(event.request, 40000);
		if (!object(value)) return fail('invalid_input', 400);
		let name: string;
		let args: Record<string, unknown>;
		if (action === 'read') {
			if (!exact(value, ['runId']) || !uuid(value.runId)) return fail('invalid_input', 400);
			name = 'read_dream_atlas_entries';
			args = { p_run_id: value.runId };
		} else if (action === 'save') {
			if (
				!exact(value, ['runId', 'entryId', 'expectedRevision', 'entry']) ||
				!uuid(value.runId) ||
				!uuid(value.entryId) ||
				!revision(value.expectedRevision)
			)
				return fail('invalid_input', 400);
			const entry = parseDreamAtlasEntryInput(value.entry);
			if (!entry) return fail('invalid_input', 400);
			name = 'save_dream_atlas_entry';
			args = {
				p_run_id: value.runId,
				p_entry_id: value.entryId,
				p_expected_revision: value.expectedRevision,
				p_dream_date: entry.dreamDate,
				p_narrative: entry.narrative,
				p_emotions: entry.emotions,
				p_associations: entry.associations,
				p_include_in_synthesis: entry.includeInSynthesis
			};
		} else {
			if (!exact(value, ['runId', 'entryId']) || !uuid(value.runId) || !uuid(value.entryId))
				return fail('invalid_input', 400);
			name = 'delete_dream_atlas_entry';
			args = { p_run_id: value.runId, p_entry_id: value.entryId };
		}
		const { data, error } = await withRpcDeadline((signal) =>
			client.rpc(name, args).abortSignal(signal)
		);
		if (error)
			return Object.hasOwn(errors, error.message)
				? fail(error.message, errors[error.message])
				: fail('atlas_service_unavailable', 503);
		if (action === 'read') {
			const entries = object(data) ? parseEntries(data.entries, String(value.runId)) : null;
			const facts =
				entries && object(data) && validDate(data.startDate)
					? prepareDreamAtlasFacts(data.startDate, entries)
					: null;
			return facts && object(data)
				? reply({ startDate: data.startDate, entries, facts })
				: fail('atlas_service_unavailable', 503);
		}
		if (action === 'delete')
			return typeof data === 'boolean'
				? reply({ deleted: data })
				: fail('atlas_service_unavailable', 503);
		return revision(data, 1) && data === Number(value.expectedRevision) + 1
			? reply({ revision: data })
			: fail('atlas_service_unavailable', 503);
	} catch {
		// An ambiguous write must be resolved by reading; never retry it blindly.
		return fail('atlas_service_unavailable', 503);
	}
}
