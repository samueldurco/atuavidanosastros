import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import type { RequestEvent } from '@sveltejs/kit';
import { parseFreeToolResult } from '$lib/free-tool-result';
import { FreeToolInputError, type FreeToolResponse } from '$lib/free-tools';
import { signFreeToolResult, verifyFreeToolReceipt } from './free-tool-receipt';

/** Public calculations have their own runtime and signing key, independent of private trial grants. */
export async function calculatePublicFreeTool(
	event: RequestEvent,
	tool: string,
	input: unknown
): Promise<FreeToolResponse> {
	const secret = event.platform?.env?.FREE_TOOL_RECEIPT_KEY ?? env.FREE_TOOL_RECEIPT_KEY;
	if (dev || ['localhost', '127.0.0.1'].includes(event.url.hostname)) {
		const { calculateFreeToolResult } = await import('./free-tools-calculation');
		const result = await calculateFreeToolResult(tool, input);
		return { result, receipt: await signFreeToolResult(result, secret) };
	}
	const base = event.platform?.env?.PUBLIC_SUPABASE_URL ?? publicEnv.PUBLIC_SUPABASE_URL;
	if (!base) throw Object.assign(new Error('public_runtime_unavailable'), { status: 503 });
	const response = await fetch(`${base}/functions/v1/atv-free-tools-runtime`, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ tool, input }),
		signal: AbortSignal.timeout(30000)
	}).catch(() => {
		throw Object.assign(new Error('public_runtime_unavailable'), { status: 503 });
	});
	if (!response.ok) {
		const detail = await response.json().catch(() => null);
		const code = detail && typeof detail === 'object' && 'code' in detail ? detail.code : null;
		if (response.status === 400 && code === 'invalid_input')
			throw new FreeToolInputError('invalid_input');
		if (
			response.status === 422 &&
			(code === 'ascendant_unavailable' || code === 'houses_unavailable')
		)
			throw new FreeToolInputError(code);
		throw Object.assign(new Error('public_runtime_unavailable'), { status: 503 });
	}
	const raw = await response.text();
	if (raw.length > 110000) throw new Error('public_runtime_invalid');
	const envelope = JSON.parse(raw) as FreeToolResponse;
	const result = parseFreeToolResult(envelope.result);
	if (
		!result ||
		result.tool !== tool ||
		!(await verifyFreeToolReceipt(result, envelope.receipt, secret))
	)
		throw new Error('public_runtime_invalid');
	return { result, receipt: envelope.receipt };
}
