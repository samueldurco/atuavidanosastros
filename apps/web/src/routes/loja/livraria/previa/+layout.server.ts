import type { LayoutServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { requireLivrariaPreview } from '$lib/server/livraria/access';
import { previewSnapshot } from '$lib/server/livraria/preview';
import { previewStoreForEvent } from '$lib/server/livraria/store';
import { PreviewError } from '$lib/server/livraria/domain';

export const prerender = false;
export const load: LayoutServerLoad = async (event) => {
	const ownerId = await requireLivrariaPreview(event);
	try {
		return {
			preview: await previewSnapshot(previewStoreForEvent(event), ownerId)
		};
	} catch (cause) {
		if (cause instanceof PreviewError) error(cause.status, cause.message);
		throw cause;
	}
};
