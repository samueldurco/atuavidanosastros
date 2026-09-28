import { artifactFormats, parseArtifactManifest, type ArtifactManifest } from '@atv/domain';
import type { ProductRunView } from './product-run';

export class ArtifactRecoveryError extends Error {}
const unavailable = () =>
	new ArtifactRecoveryError('Não foi possível recuperar os arquivos. Tente novamente.');

async function withinDeadline<T>(parent: AbortSignal, work: (signal: AbortSignal) => Promise<T>) {
	parent.throwIfAborted();
	const controller = new AbortController();
	let stop!: () => void;
	const interrupted = new Promise<never>((_, reject) => {
		stop = () => {
			// Settle the wait before abort listeners can resolve a stale transport.
			reject(
				new ArtifactRecoveryError(
					'A consulta foi interrompida. Tente novamente; seu registro permanece salvo.'
				)
			);
			controller.abort();
		};
	});
	const timeout = setTimeout(stop, 30000);
	parent.addEventListener('abort', stop, { once: true });
	try {
		return await Promise.race([interrupted, work(controller.signal)]);
	} finally {
		clearTimeout(timeout);
		parent.removeEventListener('abort', stop);
	}
}
const reading = (run: ProductRunView) => {
	if (!run.released || !run.editorial || !run.calculation) throw unavailable();
	return {
		id: run.id,
		productId: run.productId,
		revision: run.revision,
		reviewDigest: run.editorial.reviewDigest,
		sectionCount: run.editorial.sections.length
	};
};
function check(response: Response) {
	if (response.status === 401)
		throw new ArtifactRecoveryError('Entre novamente para consultar seus arquivos.');
	if ([403, 404, 409].includes(response.status))
		throw new ArtifactRecoveryError(
			'O arquivo ou seu acesso não está disponível. Atualize o estado do registro.'
		);
	if (!response.ok || response.redirected) throw unavailable();
}
async function bounded(response: Response, max: number, signal: AbortSignal) {
	signal.throwIfAborted();
	if (!response.body) throw unavailable();
	const reader = response.body.getReader();
	let released = false;
	const cleanup = () => {
		if (released) return;
		released = true;
		// Stream cleanup must not extend the user's wait or retain a pending read lock.
		void reader.cancel().catch(() => {});
		reader.releaseLock();
	};
	signal.addEventListener('abort', cleanup, { once: true });
	const chunks: Uint8Array[] = [];
	let size = 0;
	try {
		while (true) {
			const { done, value } = await reader.read();
			signal.throwIfAborted();
			if (done) break;
			size += value.byteLength;
			if (size > max) throw unavailable();
			chunks.push(value);
		}
	} finally {
		signal.removeEventListener('abort', cleanup);
		cleanup();
	}
	const bytes = new Uint8Array(size);
	let offset = 0;
	for (const chunk of chunks) {
		bytes.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return bytes;
}
const options = (signal: AbortSignal): RequestInit => ({
	signal,
	cache: 'no-store',
	credentials: 'same-origin',
	redirect: 'error'
});

export async function listStoredArtifacts(
	run: ProductRunView,
	request: typeof fetch,
	signal: AbortSignal
): Promise<ArtifactManifest[]> {
	return withinDeadline(signal, (boundedSignal) => listArtifacts(run, request, boundedSignal));
}

async function listArtifacts(
	run: ProductRunView,
	request: typeof fetch,
	signal: AbortSignal
): Promise<ArtifactManifest[]> {
	const context = reading(run);
	const response = await request(`/api/workflows/${context.id}/artifacts`, options(signal));
	signal.throwIfAborted();
	check(response);
	if (!response.headers.get('content-type')?.startsWith('application/json')) throw unavailable();
	const payload: unknown = JSON.parse(
		new TextDecoder().decode(await bounded(response, 131072, signal))
	);
	if (
		!payload ||
		typeof payload !== 'object' ||
		!('artifacts' in payload) ||
		!Array.isArray(payload.artifacts) ||
		payload.artifacts.length > 200
	)
		throw unavailable();
	const artifacts = payload.artifacts.map((v) => parseArtifactManifest(v, context));
	if (
		artifacts.some((v) => !v || (v.format === 'svg' && !run.cartography)) ||
		new Set(artifacts.map((v) => v?.id)).size !== artifacts.length
	)
		throw unavailable();
	signal.throwIfAborted();
	return artifacts as ArtifactManifest[];
}

export async function recoverStoredArtifact(
	run: ProductRunView,
	artifact: ArtifactManifest,
	request: typeof fetch,
	signal: AbortSignal
): Promise<Blob> {
	return withinDeadline(signal, (boundedSignal) =>
		readArtifact(run, artifact, request, boundedSignal)
	);
}

async function readArtifact(
	run: ProductRunView,
	artifact: ArtifactManifest,
	request: typeof fetch,
	signal: AbortSignal
): Promise<Blob> {
	const manifest = parseArtifactManifest(artifact, reading(run));
	if (!manifest || (manifest.format === 'svg' && !run.cartography)) throw unavailable();
	const policy = artifactFormats[manifest.format];
	const response = await request(
		`/api/workflows/${run.id}/artifacts/${manifest.id}`,
		options(signal)
	);
	signal.throwIfAborted();
	check(response);
	if (
		response.headers.get('content-type') !== policy.mime ||
		response.headers.get('x-atv-artifact-id') !== manifest.id ||
		response.headers.get('x-atv-export-version') !== manifest.rendererVersion ||
		response.headers.get('x-atv-artifact-sha256') !== manifest.sha256
	)
		throw unavailable();
	const bytes = await bounded(response, manifest.bytes, signal);
	const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), (v) =>
		v.toString(16).padStart(2, '0')
	).join('');
	if (bytes.length !== manifest.bytes || digest !== manifest.sha256) throw unavailable();
	signal.throwIfAborted();
	return new Blob([bytes], { type: policy.mime });
}
