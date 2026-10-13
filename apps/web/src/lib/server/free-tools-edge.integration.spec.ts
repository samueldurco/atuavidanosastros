import { describe, expect, it } from 'vitest';
import { freeToolsRuntimeHandler } from '../../../../../supabase/functions/atv-free-tools-runtime/handler';
import { parseFreeToolResult } from '../free-tool-result';
import type { FreeToolResponse } from '../free-tools';
import { verifyFreeToolReceipt } from './free-tool-receipt';

const key = 'synthetic-public-edge-free-tool-key-for-tests';
const handler = freeToolsRuntimeHandler(key);
function request(payload: unknown, headers: Record<string, string> = {}) {
	return new Request('https://synthetic.invalid/functions/v1/atv-free-tools-runtime', {
		method: 'POST',
		headers: { 'content-type': 'application/json', ...headers },
		body: JSON.stringify(payload)
	});
}

describe('runtime público Edge real', () => {
	it('aceita relato válido de 6000 caracteres mesmo acima de 16 KiB em UTF-8', async () => {
		const narrative = '漢'.repeat(6000);
		const input = {
			date: '2026-10-13',
			narrative,
			emotions: ['curiosidade'],
			associations: ['uma memória sintética']
		};
		const payload = { tool: 'registro-de-sonho', input };
		expect(new TextEncoder().encode(JSON.stringify(payload)).byteLength).toBeGreaterThan(16384);
		const response = await handler(request(payload));
		expect(response.status).toBe(200);
		const envelope = (await response.json()) as FreeToolResponse;
		expect(parseFreeToolResult(envelope.result)).not.toBeNull();
		expect(envelope.result.sections.some((section) => section.body === narrative)).toBe(true);
		expect(await verifyFreeToolReceipt(envelope.result, envelope.receipt, key)).toBe(true);
	});

	it('limita bytes reais do corpo mesmo quando Content-Length está ausente', async () => {
		const payload = { tool: 'registro-de-sonho', input: { narrative: '漢'.repeat(12000) } };
		const streamed = request(payload);
		expect(streamed.headers.has('content-length')).toBe(false);
		expect((await handler(streamed)).status).toBe(400);
		expect((await handler(request({}, { 'content-length': '32769' }))).status).toBe(400);
	});

	it('mantém sorteio no servidor, cache privado e recibo verificável sem credencial do chamador', async () => {
		const first = await handler(request({ tool: 'carta-do-dia', input: {} }));
		const second = await handler(request({ tool: 'carta-do-dia', input: {} }));
		expect(first.status).toBe(200);
		expect(first.headers.get('cache-control')).toBe('private, no-store');
		expect(first.headers.get('set-cookie')).toBeNull();
		const a = (await first.json()) as FreeToolResponse;
		const b = (await second.json()) as FreeToolResponse;
		expect(a.result.id).not.toBe(b.result.id);
		expect(await verifyFreeToolReceipt(a.result, a.receipt, key)).toBe(true);
		expect(
			(await handler(request({ tool: 'carta-do-dia', input: { cardId: 'major-00' } }))).status
		).toBe(400);
	});

	it('fecha chave ausente, método, ferramenta antiga e UTF-8 inválido com respostas limitadas', async () => {
		expect(
			(await freeToolsRuntimeHandler(undefined)(request({ tool: 'carta-do-dia', input: {} })))
				.status
		).toBe(503);
		expect((await handler(new Request('https://synthetic.invalid/'))).status).toBe(405);
		expect((await handler(request({ tool: 'one-card', input: {} }))).status).toBe(404);
		const invalidUtf8 = new Request('https://synthetic.invalid/', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: new Uint8Array([0xff])
		});
		expect((await handler(invalidUtf8)).status).toBe(400);
	});
});
