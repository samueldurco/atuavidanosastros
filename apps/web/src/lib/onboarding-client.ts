import {
	parseOnboardingSnapshot,
	type OnboardingCommand,
	type OnboardingSnapshot
} from './onboarding';

type OnboardingReply =
	{ ok: true; snapshot: OnboardingSnapshot } | { ok: false; status: number; error: string };

/** Bounds headers and JSON together. No retry: a lost POST can already be committed. */
export async function requestOnboarding(
	transport: typeof fetch,
	options: { command?: OnboardingCommand; intake?: boolean } = {}
): Promise<OnboardingReply> {
	const controller = new AbortController();
	let timer: ReturnType<typeof setTimeout> | undefined;
	const deadline = new Promise<never>((_, reject) => {
		timer = setTimeout(
			() => {
				// Settle first, including when the transport completes synchronously on abort.
				reject(new Error('onboarding_deadline'));
				controller.abort();
			},
			options.intake && !options.command ? 10000 : 15000
		);
	});
	try {
		return await Promise.race([
			(async (): Promise<OnboardingReply> => {
				const response = await transport('/api/onboarding', {
					method: options.command ? 'POST' : 'GET',
					credentials: 'same-origin',
					cache: 'no-store',
					redirect: 'error',
					signal: controller.signal,
					...(options.command
						? {
								headers: { 'content-type': 'application/json' },
								body: JSON.stringify(options.command)
							}
						: {})
				});
				if (controller.signal.aborted) throw new Error('onboarding_deadline');
				const payload: unknown = await response.json();
				if (controller.signal.aborted) throw new Error('onboarding_deadline');
				if (
					!payload ||
					typeof payload !== 'object' ||
					Array.isArray(payload) ||
					Object.keys(payload).length !== 1
				)
					throw new Error('invalid_response');
				if (!response.ok) {
					if (!('error' in payload) || typeof payload.error !== 'string')
						throw new Error('invalid_response');
					return { ok: false, status: response.status, error: payload.error };
				}
				const snapshot =
					'onboarding' in payload ? parseOnboardingSnapshot(payload.onboarding) : null;
				if (!snapshot) throw new Error('invalid_response');
				return { ok: true, snapshot };
			})(),
			deadline
		]);
	} finally {
		clearTimeout(timer);
	}
}
