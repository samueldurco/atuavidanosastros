import { error } from '@sveltejs/kit';
import { productCatalog } from '@atv/domain';
import { privateTrial } from '$lib/server/private-trials';
import { trialPdf, trialSvg, trialText } from '$lib/server/trial-exports';
import { approveTrialReading } from '$lib/trials/reading';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
	const saved = await privateTrial(event.locals, event.params.id);
	const seal = await approveTrialReading(saved.input, saved.calculation, saved.reading);
	if (!seal || seal.digest !== saved.approval.digest)
		error(409, 'A revisão desta versão precisa ser conferida antes do download.');
	const product = productCatalog.find((p) => p.id === saved.product_id)!;
	const format = event.url.searchParams.get('format') ?? 'txt';
	if (format !== 'txt' && !product.delivery.some((d) => d === format))
		error(400, 'Formato indisponível neste produto.');
	let body: BodyInit, type: string;
	try {
		if (format === 'pdf') {
			const bytes = await trialPdf(saved);
			body = bytes.buffer.slice(
				bytes.byteOffset,
				bytes.byteOffset + bytes.byteLength
			) as ArrayBuffer;
			type = 'application/pdf';
		} else if (format === 'svg') {
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
