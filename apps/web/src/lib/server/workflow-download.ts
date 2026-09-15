import { json, type RequestEvent } from '@sveltejs/kit';
import { workflowApi } from './workflow-api';
import { EXPORT_CSP, renderProductWebExport, WEB_EXPORT_VERSION } from './product-export';

const headers = {
	'cache-control': 'private, no-store',
	'referrer-policy': 'no-referrer',
	'x-robots-tag': 'noindex, nofollow',
	'x-content-type-options': 'nosniff',
	'cross-origin-resource-policy': 'same-origin'
};
const fail = (error: string, status: number) => json({ error }, { status, headers });

export async function workflowDownload(
	event: Pick<RequestEvent, 'request' | 'url' | 'locals'>,
	id: string
): Promise<Response> {
	try {
		if (event.request.method !== 'GET') return fail('method_not_allowed', 405);
		const origin = event.request.headers.get('origin');
		if (
			(origin && origin !== event.url.origin) ||
			event.request.headers.get('sec-fetch-site') === 'cross-site'
		)
			return fail('same_origin_required', 403);
		// Always query the current owner projection; never reuse an earlier page load, public URL or service-role read.
		const response = await workflowApi(event, 'read', id);
		if (!response.ok) return response;
		const format = event.url.searchParams.get('format');
		if (
			!['web', 'pdf'].includes(format ?? '') ||
			[...event.url.searchParams.keys()].some((key) => key !== 'format') ||
			event.url.searchParams.getAll('format').length !== 1
		)
			return fail('format_unavailable', 400);
		const payload = await response.json();
		const run = payload && typeof payload === 'object' && 'run' in payload ? payload.run : null;
		let version = WEB_EXPORT_VERSION;
		let artifact: { bytes: Uint8Array<ArrayBuffer>; filename: string } | null;
		if (format === 'pdf') {
			const { renderProductPdf, PDF_EXPORT_VERSION } = await import('./product-pdf');
			version = PDF_EXPORT_VERSION;
			const pdf = await renderProductPdf(run);
			artifact = pdf ? { ...pdf, bytes: new Uint8Array(pdf.bytes) } : null;
		} else {
			const web = renderProductWebExport(run);
			artifact = web ? { bytes: new TextEncoder().encode(web.html), filename: web.filename } : null;
		}
		if (!artifact) return fail('delivery_unavailable', 409);
		const bytes = artifact.bytes;
		const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))]
			.map((byte) => byte.toString(16).padStart(2, '0'))
			.join('');
		return new Response(bytes, {
			headers: {
				...headers,
				'content-type': format === 'pdf' ? 'application/pdf' : 'text/html; charset=utf-8',
				'content-disposition': `attachment; filename="${artifact.filename}"`,
				'content-security-policy': `${EXPORT_CSP}; sandbox; frame-ancestors 'none'`,
				'x-atv-export-version': version,
				'x-atv-artifact-sha256': digest
			}
		});
	} catch {
		return fail('delivery_unavailable', 503);
	}
}
