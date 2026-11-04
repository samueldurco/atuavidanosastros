import { dev } from '$app/environment';
import { error, type RequestEvent } from '@sveltejs/kit';
import { trialRuntimeConfigured, trialServiceBindings } from './runtime-bindings';
import {
	validateLaunchRuntimeResult,
	type LaunchRuntimeRequest,
	type LaunchRuntimeResult
} from './launch-runtime-contract';

type RuntimeEvent = Pick<RequestEvent, 'url' | 'fetch' | 'platform' | 'request'>;
const maximumResponseBytes = 2_000_000;

/** Hosted CPU work always uses the existing authenticated Edge service; no Pages fallback. */
export async function runLaunchRuntime(
	event: RuntimeEvent,
	request: LaunchRuntimeRequest
): Promise<LaunchRuntimeResult> {
	try {
		if (dev || ['localhost', '127.0.0.1', '[::1]'].includes(event.url.hostname)) {
			const { executeLaunchRuntime } = await import('./launch-computation');
			return await validateLaunchRuntimeResult(request, await executeLaunchRuntime(request));
		}
		const config = trialServiceBindings(event);
		if (!trialRuntimeConfigured(config)) throw new Error('launch_runtime_unconfigured');
		const response = await event.fetch(`${config.url}/functions/v1/atv-trial-runtime`, {
			method: 'POST',
			redirect: 'error',
			headers: {
				authorization: `Bearer ${config.serviceRoleKey}`,
				apikey: config.serviceRoleKey,
				'x-atv-runtime-key': config.runtimeKey,
				'content-type': 'application/json'
			},
			body: JSON.stringify(request),
			signal: AbortSignal.any([event.request.signal, AbortSignal.timeout(60000)])
		});
		if (
			!response.ok ||
			!/^application\/json(?:;|$)/i.test(response.headers.get('content-type') ?? '') ||
			Number(response.headers.get('content-length')) > maximumResponseBytes
		)
			throw new Error('launch_runtime_unavailable');
		const reader = response.body?.getReader();
		if (!reader) throw new Error('launch_runtime_empty');
		const chunks: Uint8Array[] = [];
		let size = 0;
		while (true) {
			const next = await reader.read();
			if (next.done) break;
			size += next.value.byteLength;
			if (size > maximumResponseBytes) {
				await reader.cancel();
				throw new Error('launch_runtime_oversize');
			}
			chunks.push(next.value);
		}
		const bytes = new Uint8Array(size);
		let offset = 0;
		for (const chunk of chunks) {
			bytes.set(chunk, offset);
			offset += chunk.byteLength;
		}
		const body = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
		if (body?.protocol !== 'atv-trial-runtime/1') throw new Error('launch_runtime_protocol');
		return await validateLaunchRuntimeResult(request, body.result);
	} catch {
		error(
			503,
			'Não foi possível concluir agora. Seus dados continuam salvos para uma nova tentativa gratuita.'
		);
	}
}
