import { artifactFormats, parseArtifactManifest, type ArtifactManifest } from '@atv/domain';
import type { ProductRunView } from './product-run';

export class ArtifactRecoveryError extends Error {}
const unavailable = () =>
	new ArtifactRecoveryError('Não foi possível recuperar os arquivos. Tente novamente.');
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
async function bounded(response: Response, max: number) {
	if (!response.body) throw unavailable();
	const reader = response.body.getReader();
	const chunks: Uint8Array[] = [];
	let size = 0;
	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			size += value.byteLength;
			if (size > max) throw unavailable();
			chunks.push(value);
		}
	} finally {
		await reader.cancel().catch(() => {});
		reader.releaseLock();
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
	const context = reading(run);
	const response = await request(`/api/workflows/${context.id}/artifacts`, options(signal));
	check(response);
	if (!response.headers.get('content-type')?.startsWith('application/json')) throw unavailable();
	const payload: unknown = JSON.parse(new TextDecoder().decode(await bounded(response, 131072)));
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
	const manifest = parseArtifactManifest(artifact, reading(run));
	if (!manifest || (manifest.format === 'svg' && !run.cartography)) throw unavailable();
	const policy = artifactFormats[manifest.format];
	const response = await request(
		`/api/workflows/${run.id}/artifacts/${manifest.id}`,
		options(signal)
	);
	check(response);
	if (
		response.headers.get('content-type') !== policy.mime ||
		response.headers.get('x-atv-artifact-id') !== manifest.id ||
		response.headers.get('x-atv-export-version') !== manifest.rendererVersion ||
		response.headers.get('x-atv-artifact-sha256') !== manifest.sha256
	)
		throw unavailable();
	const bytes = await bounded(response, manifest.bytes);
	const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), (v) =>
		v.toString(16).padStart(2, '0')
	).join('');
	if (bytes.length !== manifest.bytes || digest !== manifest.sha256) throw unavailable();
	signal.throwIfAborted();
	return new Blob([bytes], { type: policy.mime });
}
