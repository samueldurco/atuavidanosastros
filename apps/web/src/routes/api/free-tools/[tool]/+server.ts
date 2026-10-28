import { json } from '@sveltejs/kit';
import { isFreeToolId } from '$lib/free-tools';
import { calculatePublicFreeTool } from '$lib/server/free-tools-runtime';
import { readSmallJson } from '$lib/server/request-json';
import {
	freeToolLedger,
	freeToolInputHash,
	FreeToolLedgerError
} from '$lib/server/free-tool-ledger';
import type { RequestHandler } from './$types';

const headers = {
	'cache-control': 'private, no-store',
	'x-content-type-options': 'nosniff',
	'referrer-policy': 'no-referrer'
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const validDay = (value: string) =>
	/^\d{4}-\d{2}-\d{2}$/.test(value) &&
	Number.isFinite(Date.parse(value)) &&
	new Date(value).toISOString().slice(0, 10) === value;

/** Public calculations have the same nominal server limits for anonymous and account subjects. */
export const GET: RequestHandler = async (event) => {
	if (!isFreeToolId(event.params.tool))
		return json({ code: 'invalid_tool' }, { status: 404, headers });
	if (event.request.headers.get('sec-fetch-site') === 'cross-site')
		return json({ code: 'cross_origin_denied' }, { status: 403, headers });
	try {
		const tool = event.params.tool === 'tarot-sim-ou-nao' ? 'carta-do-amor' : event.params.tool;
		const ledger = await freeToolLedger(event);
		if (event.url.searchParams.get('historico') === '1') {
			if (tool !== 'registro-de-sonho')
				return json({ code: 'invalid_tool' }, { status: 400, headers });
			const before = event.url.searchParams.get('antes');
			const target = event.url.searchParams.get('resultado');
			if ((before && (!validDay(before) || target)) || (target && !uuid.test(target)))
				return json({ code: 'invalid_input' }, { status: 400, headers });
			return json(await ledger.history(before, target), { headers });
		}
		return json(await ledger.read(tool), { headers });
	} catch (failure) {
		return json(
			{ code: failure instanceof FreeToolLedgerError ? failure.code : 'quota_unavailable' },
			{ status: failure instanceof FreeToolLedgerError ? failure.status : 503, headers }
		);
	}
};
export const POST: RequestHandler = async (event) => {
	const { request, url, params } = event;
	const origin = request.headers.get('origin');
	if ((origin && origin !== url.origin) || request.headers.get('sec-fetch-site') === 'cross-site')
		return json({ code: 'cross_origin_denied' }, { status: 403, headers });
	if (!isFreeToolId(params.tool)) return json({ code: 'invalid_tool' }, { status: 404, headers });
	const tool = params.tool === 'tarot-sim-ou-nao' ? 'carta-do-amor' : params.tool;
	const input = await readSmallJson(request, 32768);
	if (input === null) return json({ code: 'invalid_input' }, { status: 400, headers });
	try {
		const ledger = await freeToolLedger(event);
		let state = await ledger.read(tool);
		const expectedOwner = request.headers.get('x-atv-owner');
		if (expectedOwner && expectedOwner !== state.owner)
			return json({ code: 'session_changed' }, { status: 409, headers });
		const targetId = request.headers.get('x-atv-result-id');
		if (targetId) {
			if (tool !== 'registro-de-sonho' || !uuid.test(targetId))
				return json({ code: 'invalid_input' }, { status: 400, headers });
			const target = (await ledger.history(null, targetId)).history.find(
				(entry) => entry.result?.id === targetId
			);
			if (!target?.result) return json({ code: 'result_not_found' }, { status: 404, headers });
			state = target;
		}
		if (
			state.result &&
			(state.quota.mode === 'daily-draw' ||
				(await freeToolInputHash(state.input)) === (await freeToolInputHash(input)))
		)
			return json(state, { headers });
		if (
			tool === 'combinacao-do-casal' &&
			state.result &&
			request.headers.get('x-atv-pair-correction') !== 'same-pair'
		)
			return json({ code: 'pair_confirmation_required' }, { status: 400, headers });
		if (
			state.result &&
			state.quota.mode === 'corrections' &&
			state.quota.remainingCorrections === 0
		)
			return json({ code: 'quota_exceeded', quota: state.quota }, { status: 429, headers });
		const calculated = await calculatePublicFreeTool(event, tool, input);
		if (tool === 'registro-de-sonho' && state.result) {
			calculated.result.id = state.result.id;
			calculated.result.createdAt = state.result.createdAt;
		}
		// The locked commit can return a result committed by a concurrent request. Only that
		// canonical envelope is exposed, so a second draw/calculation cannot bypass the quota.
		return json(await ledger.commit(tool, input, calculated.result), { headers });
	} catch (failure) {
		if (failure instanceof FreeToolLedgerError)
			return json({ code: failure.code }, { status: failure.status, headers });
		const code = failure && typeof failure === 'object' && 'code' in failure ? failure.code : null;
		if (code === 'invalid_input') return json({ code }, { status: 400, headers });
		if (code === 'ascendant_unavailable' || code === 'houses_unavailable')
			return json({ code }, { status: 422, headers });
		if (failure && typeof failure === 'object' && 'status' in failure && failure.status === 503)
			return json({ code: 'calculation_unavailable' }, { status: 503, headers });
		return json({ code: 'calculation_failed' }, { status: 422, headers });
	}
};
