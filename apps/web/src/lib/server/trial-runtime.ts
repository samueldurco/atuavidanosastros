import { dev } from '$app/environment';
import { env as privateEnv } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { error, type RequestEvent } from '@sveltejs/kit';
import type { WorkflowInput, DreamAtlasFactSource } from '@atv/domain';
import type {
	TrialEdition,
	TrialReview,
	TrialRuntimeRequest,
	TrialRuntimeResult
} from './trial-computation';

async function run(
	event: Pick<RequestEvent, 'url' | 'fetch'>,
	request: TrialRuntimeRequest
): Promise<TrialRuntimeResult> {
	// Local fixtures stay local. Hosted requests never fall back to a CPU-heavy Pages function.
	if (dev || ['localhost', '127.0.0.1', '[::1]'].includes(event.url.hostname)) {
		const { executeTrialRuntime } = await import('./trial-computation');
		return executeTrialRuntime(request);
	}
	const base = publicEnv.PUBLIC_SUPABASE_URL;
	const key = privateEnv.SUPABASE_SERVICE_ROLE_KEY;
	const runtimeKey = privateEnv.ATV_TRIAL_RUNTIME_KEY;
	if (!base || !key || !runtimeKey || !base.startsWith('https://'))
		error(503, 'O serviço de leituras está indisponível. Tente novamente.');
	try {
		const response = await event.fetch(`${base}/functions/v1/atv-trial-runtime`, {
			method: 'POST',
			headers: {
				authorization: `Bearer ${key}`,
				apikey: key,
				'x-atv-runtime-key': runtimeKey,
				'content-type': 'application/json'
			},
			body: JSON.stringify(request),
			signal: AbortSignal.timeout(60000)
		});
		if (!response.headers.get('content-type')?.includes('application/json'))
			throw new Error('runtime response');
		const text = await response.text();
		if (text.length > 2500000) throw new Error('runtime response size');
		const body = JSON.parse(text);
		if (
			response.status === 422 &&
			typeof body.error === 'string' &&
			/^(Confira|Salve|Autorize|Produto sem)/.test(body.error)
		)
			error(422, body.error);
		if (!response.ok || body.protocol !== 'atv-trial-runtime/1' || !Object.hasOwn(body, 'result'))
			throw new Error('runtime unavailable');
		return body.result;
	} catch (e) {
		if (e && typeof e === 'object' && 'status' in e) throw e;
		error(
			503,
			'Não foi possível concluir agora. Sua solicitação pode ser repetida sem cobrança. Tente novamente.'
		);
	}
}
function edition(value: TrialRuntimeResult, productId: string): TrialEdition | null {
	if (!value || typeof value !== 'object') return null;
	if (
		value.reading?.productId !== productId ||
		!Array.isArray(value.calculation?.facts) ||
		value.approval?.scope !== 'private-free-test' ||
		value.approval.status !== 'approved' ||
		!/^[a-f0-9]{64}$/.test(value.approval.digest)
	)
		return null;
	return value;
}
export async function computeTrial(
	event: RequestEvent,
	input: WorkflowInput,
	runId: string,
	sources: DreamAtlasFactSource[]
) {
	return edition(
		await run(event, { operation: 'generate', input, runId, sources }),
		input.productId
	);
}
export async function reviewTrial(event: RequestEvent, saved: TrialReview) {
	return (await run(event, { operation: 'verify', saved: reviewPayload(saved) })) === true;
}
export async function reissueTrial(event: RequestEvent, saved: TrialReview) {
	return edition(
		await run(event, { operation: 'revise', saved: reviewPayload(saved) }),
		saved.input.productId
	);
}
function reviewPayload(saved: TrialReview): TrialReview {
	return {
		input: saved.input,
		calculation: saved.calculation,
		reading: saved.reading,
		approval: saved.approval
	};
}
