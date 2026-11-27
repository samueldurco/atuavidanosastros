import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireLivrariaPreview } from '$lib/server/livraria/access';
import { previewAction, previewSnapshot } from '$lib/server/livraria/preview';
import { previewStoreForEvent } from '$lib/server/livraria/store';
import { PreviewError } from '$lib/server/livraria/domain';

export const GET: RequestHandler = async (event) => {
	const ownerId = await requireLivrariaPreview(event, true);
	try {
		return json(await previewSnapshot(previewStoreForEvent(event), ownerId));
	} catch (cause) {
		if (cause instanceof PreviewError) error(cause.status, cause.message);
		throw cause;
	}
};

export const POST: RequestHandler = async (event) => {
	const ownerId = await requireLivrariaPreview(event, true);
	// JSON requests need an explicit same-origin boundary; SvelteKit's form CSRF
	// protection alone does not cover application/json endpoints.
	if (event.request.headers.get('origin') !== event.url.origin)
		error(403, 'Origem não autorizada.');
	if (!event.request.headers.get('content-type')?.startsWith('application/json'))
		error(415, 'Envie application/json.');
	const raw = await event.request.text();
	if (raw.length > 10_000) error(413, 'Solicitação de teste muito grande.');
	let body: unknown;
	try {
		body = JSON.parse(raw);
	} catch {
		error(400, 'JSON inválido.');
	}
	try {
		return json(await previewAction(previewStoreForEvent(event), ownerId, body));
	} catch (cause) {
		if (cause instanceof PreviewError) error(cause.status, cause.message);
		throw cause;
	}
};
