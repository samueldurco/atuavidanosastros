import { expect, it } from 'vitest';
import { readSmallJson } from './request-json';

function request(body: string | Uint8Array, type = 'application/json') {
	return new Request('http://localhost/api/test', {
		method: 'POST',
		headers: { 'content-type': type },
		body: typeof body === 'string' ? body : new Uint8Array(body).buffer
	});
}
it('lê JSON válido e rejeita sintaxe/tipo inválidos', async () => {
	expect(await readSmallJson(request('{"synthetic":true}'))).toEqual({ synthetic: true });
	expect(await readSmallJson(request('{broken'))).toBeNull();
	expect(await readSmallJson(request('{}', 'text/plain'))).toBeNull();
	expect(await readSmallJson(request(new Uint8Array([255])))).toBeNull();
});
it('aplica limite em bytes, incluindo UTF-8 multibyte', async () => {
	expect(await readSmallJson(request(JSON.stringify({ text: 'á'.repeat(2100) })))).toBeNull();
	expect(await readSmallJson(request(' '.repeat(5000)))).toBeNull();
});
