import { describe, expect, it, vi } from 'vitest';
import { artifactFormats, type ArtifactManifest } from '@atv/domain';
import { exportFixture } from '../../tests/fixtures/product-export';
import { listStoredArtifacts, recoverStoredArtifact } from './product-artifact-client';

const signal = () => new AbortController().signal;
async function fixture() {
	const run = exportFixture();
	const bytes = new TextEncoder().encode('<p>Arquivo sintético</p>');
	const sha256 = Buffer.from(await crypto.subtle.digest('SHA-256', bytes)).toString('hex');
	const artifact: ArtifactManifest = {
		id: '00000000-0000-4000-8000-000000000002',
		runId: run.id,
		revision: run.revision,
		reviewDigest: run.editorial!.reviewDigest,
		format: 'web',
		section: -1,
		rendererVersion: artifactFormats.web.renderer,
		sha256,
		bytes: bytes.length,
		createdAt: run.createdAt
	};
	const headers = {
		'content-type': artifactFormats.web.mime,
		'x-atv-artifact-id': artifact.id,
		'x-atv-export-version': artifact.rendererVersion,
		'x-atv-artifact-sha256': sha256
	};
	return { run, bytes, artifact, headers };
}
describe('stored artifact client', () => {
	it('lists only strict current revision manifests through an uncached owner endpoint', async () => {
		const { run, artifact } = await fixture();
		const request = vi
			.fn<typeof fetch>()
			.mockResolvedValue(
				Response.json({ artifacts: [{ ...artifact, url: 'https://untrusted.invalid' }] })
			);
		expect(await listStoredArtifacts(run, request, signal())).toEqual([artifact]);
		expect(request).toHaveBeenCalledWith(
			`/api/workflows/${run.id}/artifacts`,
			expect.objectContaining({ cache: 'no-store', redirect: 'error', credentials: 'same-origin' })
		);
	});
	it('accepts honest empty lists and rejects stale, duplicate, oversized and malformed manifests', async () => {
		const { run, artifact } = await fixture();
		expect(
			await listStoredArtifacts(run, async () => Response.json({ artifacts: [] }), signal())
		).toEqual([]);
		for (const artifacts of [
			[{ ...artifact, revision: 1 }],
			[artifact, artifact],
			Array(201).fill(artifact),
			[null],
			[{ ...artifact, format: 'audio' }]
		]) {
			await expect(
				listStoredArtifacts(run, async () => Response.json({ artifacts }), signal())
			).rejects.toThrow();
		}
		await expect(
			listStoredArtifacts(
				run,
				async () =>
					new Response(' '.repeat(131073), { headers: { 'content-type': 'application/json' } }),
				signal()
			)
		).rejects.toThrow();
	});
	it('recovers identical verified bytes, not a regenerated document or external URL', async () => {
		const { run, artifact, bytes, headers } = await fixture();
		const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(bytes, { headers }));
		const blob = await recoverStoredArtifact(run, artifact, request, signal());
		expect(new Uint8Array(await blob.arrayBuffer())).toEqual(bytes);
		expect(request.mock.calls[0][0]).toBe(`/api/workflows/${run.id}/artifacts/${artifact.id}`);
	});
	it('rejects corrupted/truncated/oversized bytes and substituted receipt metadata', async () => {
		const { run, artifact, bytes, headers } = await fixture();
		for (const body of [
			bytes.slice(1),
			new Uint8Array(bytes.length),
			new Uint8Array(bytes.length + 1)
		]) {
			await expect(
				recoverStoredArtifact(run, artifact, async () => new Response(body, { headers }), signal())
			).rejects.toThrow();
		}
		for (const key of Object.keys(headers)) {
			await expect(
				recoverStoredArtifact(
					run,
					artifact,
					async () => new Response(bytes, { headers: { ...headers, [key]: 'wrong' } }),
					signal()
				)
			).rejects.toThrow();
		}
	});
	it('sanitizes denied, expired, unavailable and login HTML responses', async () => {
		const { run, artifact } = await fixture();
		for (const status of [401, 403, 404, 409, 503]) {
			const request = async () => new Response('private provider trace', { status });
			await expect(listStoredArtifacts(run, request, signal())).rejects.not.toThrow(
				'private provider trace'
			);
			await expect(recoverStoredArtifact(run, artifact, request, signal())).rejects.not.toThrow(
				'private provider trace'
			);
		}
		await expect(
			listStoredArtifacts(run, async () => new Response('<html>login</html>'), signal())
		).rejects.toThrow();
	});
	it('does not request revoked readings and suppresses completion after abort', async () => {
		const { run, artifact, bytes, headers } = await fixture();
		const request = vi.fn<typeof fetch>();
		await expect(
			listStoredArtifacts({ ...run, released: false }, request, signal())
		).rejects.toThrow();
		await expect(
			recoverStoredArtifact({ ...run, editorial: null }, artifact, request, signal())
		).rejects.toThrow();
		expect(request).not.toHaveBeenCalled();
		const controller = new AbortController();
		controller.abort();
		await expect(
			recoverStoredArtifact(
				run,
				artifact,
				async () => new Response(bytes, { headers }),
				controller.signal
			)
		).rejects.toThrow();
	});
});
