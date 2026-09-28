/** Bound asynchronous waiting, not SQL execution. A timeout must never imply rollback or retry. */
export async function withRpcDeadline<T>(
	operation: (signal: AbortSignal) => PromiseLike<T>
): Promise<T> {
	const controller = new AbortController();
	let timer: ReturnType<typeof setTimeout> | undefined;
	const deadline = new Promise<never>((_, reject) => {
		timer = setTimeout(() => {
			// Reject first: a transport may resolve synchronously in its abort listener.
			reject(new Error('rpc_deadline'));
			controller.abort();
		}, 10000);
	});
	try {
		return await Promise.race([operation(controller.signal), deadline]);
	} finally {
		clearTimeout(timer);
	}
}
