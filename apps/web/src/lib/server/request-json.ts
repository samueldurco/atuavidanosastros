/** Bounded JSON parsing for small public calculation payloads; never log raw input. */
export async function readSmallJson(request: Request, maxBytes = 4096): Promise<unknown | null> {
	if (
		request.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() !==
			'application/json' ||
		!request.body
	)
		return null;
	const reader = request.body.getReader();
	const decoder = new TextDecoder('utf-8', { fatal: true });
	let size = 0;
	let body = '';
	try {
		for (;;) {
			const { done, value } = await reader.read();
			if (done) break;
			size += value.byteLength;
			if (size > maxBytes) {
				await reader.cancel();
				return null;
			}
			body += decoder.decode(value, { stream: true });
		}
		body += decoder.decode();
		return JSON.parse(body);
	} catch {
		return null;
	} finally {
		reader.releaseLock();
	}
}
