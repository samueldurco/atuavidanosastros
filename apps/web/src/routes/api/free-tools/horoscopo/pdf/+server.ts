import { json } from '@sveltejs/kit';
import {
	publicHoroscopeOperationId,
	publishedHoroscopeForDownload
} from '$lib/server/public-horoscope-download';
import { FreeToolPdfCharacterError, renderPublicHoroscopePdf } from '$lib/server/free-tool-pdf';
import type { RequestHandler } from './$types';

const headers = {
	'cache-control': 'private, no-store',
	'x-content-type-options': 'nosniff',
	'referrer-policy': 'no-referrer'
};
export const GET: RequestHandler = async (event) => {
	if (event.request.headers.get('sec-fetch-site') === 'cross-site')
		return json({ code: 'cross_origin_denied' }, { status: 403, headers });
	if (!event.locals.supabase) return json({ code: 'auth_required' }, { status: 401, headers });
	const { data, error } = await event.locals.supabase.auth.getUser();
	if (error || !data.user?.email_confirmed_at)
		return json({ code: 'auth_required' }, { status: 401, headers });
	try {
		const document = await publishedHoroscopeForDownload(event.url, event.fetch);
		if (!document) return json({ code: 'result_not_found' }, { status: 404, headers });
		const pdf = await renderPublicHoroscopePdf(document);
		if (!pdf) return json({ code: 'pdf_unavailable' }, { status: 503, headers });
		return new Response(new Uint8Array(pdf), {
			headers: {
				...headers,
				'content-type': 'application/pdf',
				'content-disposition': 'attachment; filename="atvna-horoscopo.pdf"',
				'x-atv-result-id': await publicHoroscopeOperationId(document.id, document.revision)
			}
		});
	} catch (failure) {
		return json(
			failure instanceof FreeToolPdfCharacterError
				? { code: failure.code, codePoint: failure.codePoint }
				: { code: 'pdf_unavailable' },
			{ status: failure instanceof FreeToolPdfCharacterError ? 422 : 503, headers }
		);
	}
};
