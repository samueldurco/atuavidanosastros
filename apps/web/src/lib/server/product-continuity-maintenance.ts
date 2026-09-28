/** Internal single-batch port, NOT a public route, scheduler, retention decision or activation.
 * Only trusted infrastructure may supply the service-bound expiry-only RPC.
 * No owner, IDs, cutoff, batch size or content can be supplied by a browser.
 */
export type ContinuityMaintenanceResult =
	| { status: 'blocked'; code: 'disabled' }
	| { status: 'completed'; deleted: number; remaining: 'unknown' }
	| { status: 'unconfirmed'; code: 'maintenance_unavailable' };

export async function maintainContinuityAccess(input: {
	enabled?: boolean;
	purgeExpired: (signal: AbortSignal) => Promise<{ data: unknown; error: unknown }>;
}): Promise<ContinuityMaintenanceResult> {
	if (input.enabled !== true) return { status: 'blocked', code: 'disabled' };
	const controller = new AbortController();
	let timer: ReturnType<typeof setTimeout> | undefined;
	try {
		const deadline = new Promise<never>((_, reject) => {
			timer = setTimeout(() => {
				controller.abort();
				reject(new Error('maintenance_timeout'));
			}, 10000);
		});
		const { data, error } = await Promise.race([input.purgeExpired(controller.signal), deadline]);
		if (error || typeof data !== 'number' || !Number.isInteger(data) || data < 0 || data > 500)
			return { status: 'unconfirmed', code: 'maintenance_unavailable' };
		// SKIP LOCKED, new expiries and other workers preclude any backlog-complete assertion.
		return { status: 'completed', deleted: data, remaining: 'unknown' };
	} catch {
		// Timeout/errors may follow committed deletion. Never retry or leak raw provider errors.
		return { status: 'unconfirmed', code: 'maintenance_unavailable' };
	} finally {
		clearTimeout(timer);
	}
}
