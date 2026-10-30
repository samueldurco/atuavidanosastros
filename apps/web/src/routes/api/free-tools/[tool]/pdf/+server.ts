import { json } from '@sveltejs/kit';
import { isFreeToolId } from '$lib/free-tools';
import { freeToolLedger, FreeToolLedgerError } from '$lib/server/free-tool-ledger';
import { FreeToolPdfCharacterError, renderFreeToolPdf } from '$lib/server/free-tool-pdf';
import type { RequestHandler } from './$types';

const headers = {
	'cache-control': 'private, no-store',
	'x-content-type-options': 'nosniff',
	'referrer-policy': 'no-referrer'
};
export const GET: RequestHandler = async (event) => {
	if (!isFreeToolId(event.params.tool))
		return json({ code: 'invalid_tool' }, { status: 404, headers });
	if (event.request.headers.get('sec-fetch-site') === 'cross-site')
		return json({ code: 'cross_origin_denied' }, { status: 403, headers });
	if (!event.locals.supabase) return json({ code: 'auth_required' }, { status: 401, headers });
	const { data, error } = await event.locals.supabase.auth.getUser();
	if (error || !data.user?.email_confirmed_at)
		return json({ code: 'auth_required' }, { status: 401, headers });
	try {
		const target = event.url.searchParams.get('resultado');
		if (
			target &&
			!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(target)
		)
			return json({ code: 'invalid_input' }, { status: 400, headers });
		const ledger = await freeToolLedger(event);
		const result =
			target && event.params.tool === 'registro-de-sonho'
				? (await ledger.history(null, target)).history.find((entry) => entry.result?.id === target)
						?.result
				: (await ledger.read(event.params.tool)).result;
		if (!result || (target && result.id !== target))
			return json({ code: 'result_not_found' }, { status: 404, headers });
		const pdf = await renderFreeToolPdf(result);
		if (!pdf) return json({ code: 'pdf_unavailable' }, { status: 503, headers });
		return new Response(new Uint8Array(pdf), {
			headers: {
				...headers,
				'content-type': 'application/pdf',
				'content-disposition': `attachment; filename="atvna-${event.params.tool}.pdf"`,
				'x-atv-result-id': result.id
			}
		});
	} catch (failure) {
		if (failure instanceof FreeToolPdfCharacterError)
			return json({ code: failure.code, codePoint: failure.codePoint }, { status: 422, headers });
		return json(
			{ code: failure instanceof FreeToolLedgerError ? failure.code : 'pdf_unavailable' },
			{ status: failure instanceof FreeToolLedgerError ? failure.status : 503, headers }
		);
	}
};
