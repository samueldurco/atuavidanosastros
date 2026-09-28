import { afterEach, expect, it, vi } from 'vitest';
import { downloadProduct, type DownloadFormat } from './product-download-client';

const id = '00000000-0000-4000-8000-000000000001';
const signal = () => new AbortController().signal;
const response = (mime = 'text/html; charset=utf-8') =>
	new Response('fixture', { headers: { 'content-type': mime } });
function deferred<T>() {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((yes) => {
		resolve = yes;
	});
	return { promise, resolve };
}
afterEach(() => {
	vi.restoreAllMocks();
	vi.useRealTimers();
});

it.each([
	['web', 'text/html; charset=utf-8'],
	['pdf', 'application/pdf'],
	['svg', 'image/svg+xml'],
	['card', 'image/svg+xml; charset=utf-8']
] as const)(
	'recovers %s with private request options and exact section selection',
	async (format, mime) => {
		const request = vi.fn<typeof fetch>().mockResolvedValue(response(mime));
		expect(await (await downloadProduct(id, format, 2, request, signal())).text()).toBe('fixture');
		expect(request).toHaveBeenCalledOnce();
		expect(request).toHaveBeenCalledWith(
			`/api/workflows/${id}/download?format=${format}${format === 'card' ? '&section=2' : ''}`,
			expect.objectContaining({
				cache: 'no-store',
				credentials: 'same-origin',
				redirect: 'error',
				signal: expect.any(AbortSignal)
			})
		);
	}
);

it('bounds stalled headers and never consumes a late response or retries', async () => {
	vi.useFakeTimers();
	const pending = deferred<Response>();
	const request = vi.fn<typeof fetch>().mockReturnValue(pending.promise);
	const result = downloadProduct(id, 'web', 0, request, signal());
	const rejected = expect(result).rejects.toThrow('download foi interrompido');
	await vi.advanceTimersByTimeAsync(30000);
	await rejected;
	expect(request.mock.calls[0][1]?.signal?.aborted).toBe(true);
	const late = response();
	const body = vi.spyOn(late, 'blob');
	pending.resolve(late);
	await vi.advanceTimersByTimeAsync(1);
	expect(body).not.toHaveBeenCalled();
	expect(request).toHaveBeenCalledOnce();
	expect(vi.getTimerCount()).toBe(0);
});

it('uses one deadline for headers and a body that ignores abort, with explicit recovery', async () => {
	vi.useFakeTimers();
	const headers = deferred<Response>();
	const bytes = deferred<Blob>();
	const value = response();
	vi.spyOn(value, 'blob').mockReturnValue(bytes.promise);
	const request = vi
		.fn<typeof fetch>()
		.mockReturnValueOnce(headers.promise)
		.mockResolvedValue(response());
	const result = downloadProduct(id, 'web', 0, request, signal());
	const rejected = expect(result).rejects.toThrow('download foi interrompido');
	await vi.advanceTimersByTimeAsync(20000);
	headers.resolve(value);
	await vi.advanceTimersByTimeAsync(10000);
	await rejected;
	bytes.resolve(new Blob(['late']));
	await vi.advanceTimersByTimeAsync(1);
	expect(request).toHaveBeenCalledOnce();
	expect(await (await downloadProduct(id, 'web', 0, request, signal())).text()).toBe('fixture');
	expect(request).toHaveBeenCalledTimes(2);
	expect(vi.getTimerCount()).toBe(0);
});

it.each(['headers', 'body'])('parent cancellation bounds stalled %s immediately', async (stage) => {
	vi.useFakeTimers();
	const parent = new AbortController();
	const value = response();
	vi.spyOn(value, 'blob').mockReturnValue(new Promise(() => {}));
	const request = vi
		.fn<typeof fetch>()
		.mockImplementation(() =>
			stage === 'headers' ? new Promise(() => {}) : Promise.resolve(value)
		);
	const result = downloadProduct(id, 'web', 0, request, parent.signal);
	const rejected = expect(result).rejects.toThrow('interrompido');
	await vi.advanceTimersByTimeAsync(0);
	parent.abort();
	await rejected;
	expect(request.mock.calls[0][1]?.signal?.aborted).toBe(true);
	expect(vi.getTimerCount()).toBe(0);
});

it('never starts transport after parent cancellation', async () => {
	const parent = new AbortController();
	parent.abort();
	const request = vi.fn<typeof fetch>();
	await expect(downloadProduct(id, 'web', 0, request, parent.signal)).rejects.toThrow();
	expect(request).not.toHaveBeenCalled();
});

it.each([401, 403, 404, 409, 503])(
	'preserves recoverable status %s without consuming an error body',
	async (status) => {
		const value = new Response('private error', { status });
		const body = vi.spyOn(value, 'blob');
		await expect(downloadProduct(id, 'web', 0, async () => value, signal())).rejects.toThrow(
			status === 401
				? 'Entre novamente'
				: status === 503
					? 'registro permanece salvo'
					: 'não está disponível'
		);
		expect(body).not.toHaveBeenCalled();
	}
);

it('distinguishes unavailable cards', async () => {
	await expect(
		downloadProduct(id, 'card', 0, async () => new Response(null, { status: 409 }), signal())
	).rejects.toThrow('Este card');
});

it('rejects redirects, empty files and wrong or spoofed MIME', async () => {
	const redirected = response();
	Object.defineProperty(redirected, 'redirected', { value: true });
	for (const value of [
		redirected,
		response('text/html-malicious'),
		response('application/json'),
		new Response(null, { headers: { 'content-type': 'text/html' } })
	])
		await expect(downloadProduct(id, 'web', 0, async () => value, signal())).rejects.toThrow(
			'registro permanece salvo'
		);
});

it.each(['headers', 'body'])(
	'sanitizes %s transport failures and clears deadline/listener',
	async (stage) => {
		vi.useFakeTimers();
		const parent = new AbortController();
		const remove = vi.spyOn(parent.signal, 'removeEventListener');
		const value = response();
		vi.spyOn(value, 'blob').mockRejectedValue(new Error('SECRET'));
		const request = vi.fn<typeof fetch>().mockImplementation(async () => {
			if (stage === 'headers') throw new Error('SECRET');
			return value;
		});
		await expect(
			downloadProduct(id, 'web' as DownloadFormat, 0, request, parent.signal)
		).rejects.toThrow('registro permanece salvo');
		expect(vi.getTimerCount()).toBe(0);
		expect(remove).toHaveBeenCalledOnce();
	}
);
