import { error, redirect } from '@sveltejs/kit';
import { productCatalog } from '@atv/domain';
import { privateTrial } from '$lib/server/private-trials';
import { trialSvg, trialText } from '$lib/server/trial-exports';
import { reviewTrial } from '$lib/server/trial-runtime';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
	const saved = await privateTrial(event.locals, event.params.id);
	if (!(await reviewTrial(event, saved)))
		error(409, 'A revisão desta versão precisa ser conferida antes do download.');
	const product = productCatalog.find((p) => p.id === saved.product_id)!;
	const format = event.url.searchParams.get('format') ?? 'txt';
	if (format !== 'txt' && !product.delivery.some((d) => d === format))
		error(400, 'Formato indisponível neste produto.');
	if (format === 'pdf') redirect(303, `/testar-produtos/leituras/${saved.id}/baixar`);
	let body: BodyInit, type: string;
	try {
		if (format === 'svg') {
			body = trialSvg(saved);
			type = 'image/svg+xml; charset=utf-8';
		} else if (format === 'txt') {
			body = trialText(saved);
			type = 'text/plain; charset=utf-8';
		} else error(400, 'Formato indisponível neste download.');
	} catch (e) {
		if (e && typeof e === 'object' && 'status' in e) throw e;
		error(503, 'Não foi possível preparar o arquivo. Sua leitura continua salva; tente novamente.');
	}
	return new Response(body, {
		headers: {
			'content-type': type,
			'content-disposition': `attachment; filename="${saved.product_id}-${saved.id}.${format}"`,
			'cache-control': 'private, no-store',
			'x-content-type-options': 'nosniff',
			'content-security-policy': "default-src 'none'; sandbox"
		}
	});
};
