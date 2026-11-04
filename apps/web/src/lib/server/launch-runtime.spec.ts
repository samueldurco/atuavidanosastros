import { beforeAll, beforeEach, expect, it, vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { LAUNCH_INPUT_VERSION, type LaunchInput } from '@atv/domain';
import { runLaunchRuntime } from './launch-runtime';
import {
	launchRuntimeDigest,
	validateLaunchRuntimeResult,
	type LaunchRuntimeRequest,
	type LaunchRuntimeResult
} from './launch-runtime-contract';
import { trialRuntimeHandler } from '../../../../../supabase/functions/atv-trial-runtime/handler';

const mocks = vi.hoisted(() => ({ execute: vi.fn(), fetch: vi.fn(), configured: true }));
vi.mock('$app/environment', () => ({ dev: false }));
vi.mock('./runtime-bindings', () => ({
	trialServiceBindings: () => ({
		url: 'https://synthetic.supabase.co',
		serviceRoleKey: 'synthetic-role',
		runtimeKey: 'synthetic-runtime'
	}),
	trialRuntimeConfigured: () => mocks.configured
}));
vi.mock('./launch-computation', () => ({ executeLaunchRuntime: mocks.execute }));

const input: LaunchInput = {
	version: LAUNCH_INPUT_VERSION,
	productId: 'ex-tarot',
	consent: { storage: true, policyVersion: 'atv-launch-consent/1' },
	answers: {
		episode: 'Uma mensagem depois de meses.',
		observedActions: 'Perguntou como estou.',
		question: 'Responder ou esperar?',
		boundaries: 'Não aceitar insistência.'
	}
};
const request: LaunchRuntimeRequest = {
	operation: 'launch-calculation',
	input,
	executionId: '8c6d9da2-d296-4b63-a30c-42ec8762f48f'
};
const event = () =>
	({
		url: new URL('https://atv.synthetic.test'),
		request: new Request('https://atv.synthetic.test'),
		fetch: mocks.fetch
	}) as unknown as RequestEvent;
const response = (result: unknown, protocol = 'atv-trial-runtime/1') =>
	new Response(JSON.stringify({ protocol, result }), {
		headers: { 'content-type': 'application/json' }
	});
let calculated: Extract<LaunchRuntimeResult, { operation: 'launch-calculation' }>;
let generated: Extract<LaunchRuntimeResult, { operation: 'launch-generate' }>;
let generateRequest: Extract<LaunchRuntimeRequest, { operation: 'launch-generate' }>;
let verifyRequest: Extract<LaunchRuntimeRequest, { operation: 'launch-verify' }>;
let execute: typeof import('./launch-computation').executeLaunchRuntime;

beforeAll(async () => {
	execute = (await vi.importActual<typeof import('./launch-computation')>('./launch-computation'))
		.executeLaunchRuntime;
	calculated = (await execute(request)) as typeof calculated;
	generateRequest = { operation: 'launch-generate', input, calculation: calculated.calculation };
	generated = (await execute(generateRequest)) as typeof generated;
	verifyRequest = {
		operation: 'launch-verify',
		input,
		calculation: calculated.calculation,
		reading: generated.reading
	};
});
beforeEach(() => {
	vi.clearAllMocks();
	mocks.configured = true;
});

it('executa cálculo, composição e revisão reais, com digests canônicos e aprovação privada', async () => {
	expect(await validateLaunchRuntimeResult(request, calculated)).toEqual(calculated);
	expect(await validateLaunchRuntimeResult(generateRequest, generated)).toEqual(generated);
	expect(generated.review.status).toBe('APPROVED_FOR_PRIVATE_TEST');
	expect(generated.reading.provenance.externalModelCalled).toBe(false);
	const verified = await execute(verifyRequest);
	expect(await validateLaunchRuntimeResult(verifyRequest, verified)).toEqual(verified);
	expect(verified).toMatchObject({
		readingDigest: generated.readingDigest,
		calculationDigest: calculated.calculationDigest
	});
});
it('usa o mesmo endpoint e credenciais somente no servidor, sem executar CPU em Pages', async () => {
	mocks.fetch.mockResolvedValue(response(calculated));
	expect(await runLaunchRuntime(event(), request)).toEqual(calculated);
	expect(mocks.execute).not.toHaveBeenCalled();
	expect(mocks.fetch).toHaveBeenCalledWith(
		'https://synthetic.supabase.co/functions/v1/atv-trial-runtime',
		expect.objectContaining({
			method: 'POST',
			redirect: 'error',
			body: JSON.stringify(request),
			headers: expect.objectContaining({
				authorization: 'Bearer synthetic-role',
				apikey: 'synthetic-role',
				'x-atv-runtime-key': 'synthetic-runtime'
			})
		})
	);
});
it.each(['unconfigured', 'http-error', 'wrong-protocol', 'wrong-mime', 'oversize'])(
	'falha fechado sem fallback hospedado: %s',
	async (kind) => {
		if (kind === 'unconfigured') mocks.configured = false;
		mocks.fetch.mockResolvedValue(
			kind === 'http-error'
				? new Response('Error 1102', { status: 500 })
				: kind === 'wrong-protocol'
					? response(calculated, 'old')
					: kind === 'wrong-mime'
						? new Response(JSON.stringify(calculated))
						: kind === 'oversize'
							? new Response(' '.repeat(2_000_001), {
									headers: { 'content-type': 'application/json' }
								})
							: response(calculated)
		);
		await expect(runLaunchRuntime(event(), request)).rejects.toMatchObject({ status: 503 });
		expect(mocks.execute).not.toHaveBeenCalled();
		if (kind === 'unconfigured') expect(mocks.fetch).not.toHaveBeenCalled();
	}
);
it.each(['executionId', 'productId', 'inputDigest', 'state', 'version'])(
	'rejeita fatos substituídos mesmo com digest recalculado: %s',
	async (key) => {
		const forged = structuredClone(calculated);
		Object.assign(forged.calculation, { [key]: 'forged' });
		forged.calculationDigest = await launchRuntimeDigest(forged.calculation);
		mocks.fetch.mockResolvedValue(response(forged));
		await expect(runLaunchRuntime(event(), request)).rejects.toMatchObject({ status: 503 });
	}
);
it.each([
	'calculation-digest',
	'reading-digest',
	'review-digest',
	'policy',
	'commercial',
	'false-approved-check'
])('rejeita edição/revisão sem vínculo válido: %s', async (kind) => {
	const forged = structuredClone(generated);
	if (kind === 'calculation-digest') forged.calculationDigest = '0'.repeat(64);
	if (kind === 'reading-digest') forged.readingDigest = '0'.repeat(64);
	if (kind === 'review-digest') forged.review.digest = '0'.repeat(64);
	if (kind === 'policy') Object.assign(forged.review, { policyVersion: 'old' });
	if (kind === 'commercial')
		Object.assign(forged.review.provenance, { commercialReleaseApproved: true });
	if (kind === 'false-approved-check') forged.review.checks[0].passed = false;
	mocks.fetch.mockResolvedValue(response(forged));
	await expect(runLaunchRuntime(event(), generateRequest)).rejects.toMatchObject({ status: 503 });
});
it('mantém execução local só para ambiente local e aplica o mesmo validador', async () => {
	mocks.execute.mockResolvedValue(calculated);
	expect(
		await runLaunchRuntime({ ...event(), url: new URL('http://127.0.0.1:4187') }, request)
	).toEqual(calculated);
	expect(mocks.fetch).not.toHaveBeenCalled();
});
it('rejeita campos extras e fatos de outra preparação antes de compor', async () => {
	await expect(execute({ ...request, owner_id: 'forged' })).rejects.toThrow();
	await expect(
		execute({
			...generateRequest,
			calculation: { ...calculated.calculation, inputDigest: '0'.repeat(64) }
		})
	).rejects.toThrow();
});
it('o handler existente autentica e despacha a operação P02 pelo protocolo atual', async () => {
	mocks.execute.mockResolvedValue(calculated);
	const handler = trialRuntimeHandler('synthetic-runtime');
	const res = await handler(
		new Request('https://synthetic.invalid', {
			method: 'POST',
			headers: { 'x-atv-runtime-key': 'synthetic-runtime', 'content-type': 'application/json' },
			body: JSON.stringify(request)
		})
	);
	expect(res.status).toBe(200);
	expect(await res.json()).toEqual({ protocol: 'atv-trial-runtime/1', result: calculated });
	expect(mocks.execute).toHaveBeenCalledExactlyOnceWith(request);
});
