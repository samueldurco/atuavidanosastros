export type DownloadFormat = 'web' | 'pdf' | 'svg' | 'card';
export class ProductDownloadError extends Error {}
const unavailable = () =>
	new ProductDownloadError(
		'Não foi possível baixar o relatório. Tente novamente; seu registro permanece salvo.'
	);
const mime = {
	web: 'text/html',
	pdf: 'application/pdf',
	svg: 'image/svg+xml',
	card: 'image/svg+xml'
};

/** One wait bound spans headers and body, even if the transport ignores abort. */
export async function downloadProduct(
	id: string,
	format: DownloadFormat,
	section: number,
	request: typeof fetch,
	parent: AbortSignal
): Promise<Blob> {
	parent.throwIfAborted();
	const controller = new AbortController();
	let stop!: () => void;
	const interrupted = new Promise<never>((_, reject) => {
		stop = () => {
			reject(
				new ProductDownloadError(
					'O download foi interrompido. Tente novamente; seu registro permanece salvo.'
				)
			);
			controller.abort();
		};
	});
	const timeout = setTimeout(stop, 30000);
	parent.addEventListener('abort', stop, { once: true });
	async function read() {
		const response = await request(
			`/api/workflows/${encodeURIComponent(id)}/download?format=${format}${format === 'card' ? `&section=${section}` : ''}`,
			{
				signal: controller.signal,
				credentials: 'same-origin',
				cache: 'no-store',
				redirect: 'error'
			}
		);
		controller.signal.throwIfAborted();
		if (response.status === 401)
			throw new ProductDownloadError('Entre novamente para baixar seu relatório.');
		if ([403, 404, 409].includes(response.status))
			throw new ProductDownloadError(
				format === 'card'
					? 'Este card não está disponível. Atualize o estado do registro ou consulte o relatório completo.'
					: 'Este relatório não está disponível para download. Atualize o estado do registro.'
			);
		if (
			!response.ok ||
			response.redirected ||
			response.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== mime[format]
		)
			throw unavailable();
		const blob = await response.blob();
		controller.signal.throwIfAborted();
		if (!blob.size) throw unavailable();
		return blob;
	}
	try {
		return await Promise.race([interrupted, read()]);
	} catch (error) {
		throw error instanceof ProductDownloadError ? error : unavailable();
	} finally {
		clearTimeout(timeout);
		parent.removeEventListener('abort', stop);
	}
}
