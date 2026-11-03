export async function supplierText(
	fetcher: typeof fetch,
	url: string,
	init: RequestInit,
	maxBytes: number,
	encoding: 'utf-8' | 'latin1' = 'utf-8'
) {
	const res = await fetcher(url, {
		...init,
		redirect: 'manual',
		signal: AbortSignal.timeout(7000)
	});
	if (!res.ok) throw new Error('upstream');
	const reader = res.body?.getReader();
	if (!reader) throw new Error('upstream');
	const bytes: Uint8Array[] = [];
	let n = 0;
	try {
		for (;;) {
			const { value, done } = await reader.read();
			if (done) break;
			n += value.length;
			if (n > maxBytes) {
				await reader.cancel();
				throw new Error('upstream');
			}
			bytes.push(value);
		}
	} finally {
		reader.releaseLock();
	}
	const all = new Uint8Array(n);
	let pos = 0;
	for (const b of bytes) {
		all.set(b, pos);
		pos += b.length;
	}
	if (encoding === 'latin1') {
		let text = '';
		for (let i = 0; i < n; i += 8192) text += String.fromCharCode(...all.subarray(i, i + 8192));
		return text;
	}
	return new TextDecoder('utf-8', { fatal: true }).decode(all);
}
