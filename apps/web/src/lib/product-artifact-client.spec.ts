import { afterEach, describe, expect, it, vi } from 'vitest';
import { artifactFormats, type ArtifactManifest } from '@atv/domain';
import { exportFixture } from '../../tests/fixtures/product-export';
import { listStoredArtifacts, recoverStoredArtifact } from './product-artifact-client';

afterEach(() => {
	vi.restoreAllMocks();
	vi.useRealTimers();
});

function deferred<T>() {
	let resolve!: (value: T) => void;
	let reject!: (error: Error) => void;
	const promise = new Promise<T>((yes, no) => {
		resolve = yes;
		reject = no;
	});
	return { promise, resolve, reject };
}

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

describe('bounded stored artifact waits', () => {
	for (const operation of ['list', 'recover'] as const) {
		for (const ending of ['timeout', 'parent-abort'] as const) {
			for (const stage of ['headers', 'body'] as const) {
				it(`${operation}: ${ending} settles despite stalled ${stage} and stream cancellation`, async () => {
					const { run, artifact, bytes, headers } = await fixture();
					vi.useFakeTimers();
					const parent = new AbortController();
					const late = deferred<Response>();
					const cancel = vi.fn(() => new Promise<void>(() => {}));
					const stream = new ReadableStream<Uint8Array>({ cancel });
					const response = new Response(stream, {
						headers: operation === 'list' ? { 'content-type': 'application/json' } : headers
					});
					const read = vi.spyOn(stream, 'getReader');
					const request = vi
						.fn<typeof fetch>()
						.mockImplementation(() =>
							stage === 'headers' ? late.promise : Promise.resolve(response)
						);
					const promise =
						operation === 'list'
							? listStoredArtifacts(run, request, parent.signal)
							: recoverStoredArtifact(run, artifact, request, parent.signal);
					const fulfilled = vi.fn();
					const rejected = vi.fn();
					const observed = promise.then(fulfilled, rejected);
					await vi.advanceTimersByTimeAsync(29999);
					expect(rejected).not.toHaveBeenCalled();
					if (ending === 'timeout') await vi.advanceTimersByTimeAsync(1);
					else parent.abort();
					await observed;
					expect(rejected).toHaveBeenCalledOnce();
					expect(rejected.mock.calls[0][0].message).toContain('consulta foi interrompida');
					expect(request.mock.calls[0][1]?.signal?.aborted).toBe(true);
					expect(fulfilled).not.toHaveBeenCalled();
					expect(vi.getTimerCount()).toBe(0);
					if (stage === 'headers') {
						late.resolve(response);
						await vi.advanceTimersByTimeAsync(0);
						expect(read).not.toHaveBeenCalled();
					} else {
						expect(cancel).toHaveBeenCalledOnce();
						expect(stream.locked).toBe(false);
					}
					expect(fulfilled).not.toHaveBeenCalled();
					expect(request).toHaveBeenCalledOnce();
					// An explicit new consultation still works; no automatic retry took place.
					if (operation === 'list')
						expect(
							await listStoredArtifacts(
								run,
								async () => Response.json({ artifacts: [artifact] }),
								signal()
							)
						).toEqual([artifact]);
					else
						expect(
							await recoverStoredArtifact(
								run,
								artifact,
								async () => new Response(bytes, { headers }),
								signal()
							)
						).toBeInstanceOf(Blob);
					expect(vi.getTimerCount()).toBe(0);
				});
			}
		}
		it(`${operation}: pre-aborted work never reaches transport and late rejection is handled`, async () => {
			const { run, artifact } = await fixture();
			vi.useFakeTimers();
			const parent = new AbortController();
			parent.abort();
			const late = deferred<Response>();
			const request = vi.fn<typeof fetch>().mockReturnValue(late.promise);
			const act = (s: AbortSignal) =>
				operation === 'list'
					? listStoredArtifacts(run, request, s)
					: recoverStoredArtifact(run, artifact, request, s);
			await expect(act(parent.signal)).rejects.toThrow();
			expect(request).not.toHaveBeenCalled();
			const observed = act(signal()).catch((error: Error) => error);
			await vi.advanceTimersByTimeAsync(30000);
			expect(await observed).toBeInstanceOf(Error);
			late.reject(new Error('synthetic late transport failure'));
			await vi.advanceTimersByTimeAsync(0);
			expect(vi.getTimerCount()).toBe(0);
		});
	}

	it('headers and stream share one budget and parent listeners are removed', async () => {
		const { run } = await fixture();
		vi.useFakeTimers();
		const parent = new AbortController();
		const remove = vi.spyOn(parent.signal, 'removeEventListener');
		const late = deferred<Response>();
		const observed = listStoredArtifacts(run, () => late.promise, parent.signal).catch(
			(error: Error) => error
		);
		await vi.advanceTimersByTimeAsync(20000);
		late.resolve(
			new Response(new ReadableStream(), { headers: { 'content-type': 'application/json' } })
		);
		await vi.advanceTimersByTimeAsync(10000);
		expect(await observed).toBeInstanceOf(Error);
		expect(remove).toHaveBeenCalledWith('abort', expect.any(Function));
		expect(vi.getTimerCount()).toBe(0);
	});

	it('hash verification is bounded and a late digest cannot return a downloadable blob', async () => {
		const { run, artifact, bytes, headers } = await fixture();
		vi.useFakeTimers();
		const late = deferred<ArrayBuffer>();
		const digest = vi.spyOn(crypto.subtle, 'digest').mockReturnValue(late.promise);
		const fulfilled = vi.fn();
		const observed = recoverStoredArtifact(
			run,
			artifact,
			async () => new Response(bytes, { headers }),
			signal()
		).then(fulfilled, (error: Error) => error);
		await vi.advanceTimersByTimeAsync(0);
		expect(digest).toHaveBeenCalledOnce();
		await vi.advanceTimersByTimeAsync(30000);
		expect(await observed).toBeInstanceOf(Error);
		late.resolve(Uint8Array.from(Buffer.from(artifact.sha256, 'hex')).buffer);
		await vi.advanceTimersByTimeAsync(0);
		expect(fulfilled).not.toHaveBeenCalled();
		expect(vi.getTimerCount()).toBe(0);
	});

	it('deadline wins even when an abort listener resolves the transport synchronously', async () => {
		const { run } = await fixture();
		vi.useFakeTimers();
		const request: typeof fetch = async (_, init) =>
			new Promise<Response>((resolve) => {
				init?.signal?.addEventListener('abort', () => resolve(Response.json({ artifacts: [] })), {
					once: true
				});
			});
		const observed = listStoredArtifacts(run, request, signal()).catch((error: Error) => error);
		await vi.advanceTimersByTimeAsync(30000);
		expect(await observed).toBeInstanceOf(Error);
		expect(vi.getTimerCount()).toBe(0);
	});

	it('fast failure removes timer and parent listener without leaking server text', async () => {
		const { run } = await fixture();
		vi.useFakeTimers();
		const parent = new AbortController();
		const remove = vi.spyOn(parent.signal, 'removeEventListener');
		await expect(
			listStoredArtifacts(run, async () => new Response('private', { status: 401 }), parent.signal)
		).rejects.toThrow('Entre novamente');
		expect(remove).toHaveBeenCalledWith('abort', expect.any(Function));
		expect(vi.getTimerCount()).toBe(0);
	});
});
