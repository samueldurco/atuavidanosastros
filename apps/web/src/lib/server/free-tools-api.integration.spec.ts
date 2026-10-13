import { describe, expect, it, vi } from 'vitest';
import type { FreeToolResponse } from '../free-tools';
import { parseFreeToolResult } from '../free-tool-result';
import { verifyFreeToolReceipt } from './free-tool-receipt';
import { POST } from '../../routes/api/free-tools/[tool]/+server';

// Environment isolation only: no result, provider, calculation or receipt fixture.
vi.mock('$app/environment', () => ({ dev: false }));
vi.mock('$env/dynamic/private', () => ({ env: {} }));
vi.mock('$env/dynamic/public', () => ({ env: {} }));
const key = 'synthetic-free-tools-api-key-for-tests';
const natal = {
	utcInstant: '2000-01-01T12:00:00.000Z',
	localDateTime: '2000-01-01T09:00:00',
	timezone: 'UTC-03:00',
	latitude: -23.5505,
	longitude: -46.6333,
	locationSource: 'synthetic-api-test'
};

function event(
	tool: string,
	value: unknown,
	options: { key?: string; origin?: string; raw?: string; type?: string } = {}
) {
	const url = new URL(`http://127.0.0.1/api/free-tools/${tool}`);
	return {
		url,
		params: { tool },
		platform: { env: { FREE_TOOL_RECEIPT_KEY: options.key } },
		// An anonymous calculation must never consult authenticated locals or database services.
		get locals() {
			throw new Error('public_calculation_attempted_to_read_session');
		},
		request: new Request(url, {
			method: 'POST',
			headers: {
				'content-type': options.type ?? 'application/json',
				origin: options.origin ?? url.origin
			},
			body: options.raw ?? JSON.stringify(value)
		})
	} as unknown as Parameters<typeof POST>[0];
}

describe('rota pública real e anônima', () => {
	it('entrega seis ferramentas sem conta, mantendo resultado versionado e recibo válido', async () => {
		const inputs = {
			ascendente: natal,
			'mapa-astral': natal,
			'carta-do-dia': {},
			'tarot-sim-ou-nao': { focus: 'Qual ação concreta posso avaliar hoje?' },
			'combinacao-do-casal': {
				first: natal,
				second: { ...natal, latitude: -22.9, longitude: -43.2 },
				consent: true
			},
			'registro-de-sonho': {
				date: '2026-10-13',
				narrative: 'Relato inteiramente sintético: caminhei por uma casa.',
				emotions: ['curiosidade'],
				associations: ['uma lembrança pessoal']
			}
		};
		for (const [tool, input] of Object.entries(inputs)) {
			const response = await POST(event(tool, input, { key }));
			expect(response.status).toBe(200);
			expect(response.headers.get('cache-control')).toBe('private, no-store');
			expect(response.headers.get('set-cookie')).toBeNull();
			const envelope = (await response.json()) as FreeToolResponse;
			expect(parseFreeToolResult(envelope.result)).toEqual(envelope.result);
			expect(envelope.result.tool).toBe(tool);
			expect(await verifyFreeToolReceipt(envelope.result, envelope.receipt, key)).toBe(true);
			if (tool === 'mapa-astral') {
				expect(envelope.result.chart?.positions).toHaveLength(10);
				expect(envelope.result.chart?.cusps).toHaveLength(12);
				expect(envelope.result.chart?.ascendant).toEqual(expect.any(Number));
			}
		}
	});
	it('entrega cálculo real sem chave e informa honestamente recibo indisponível', async () => {
		const response = await POST(event('ascendente', natal));
		expect(response.status).toBe(200);
		const envelope = (await response.json()) as FreeToolResponse;
		expect(envelope.result.facts[0]?.id).toBe('ascendant');
		expect(envelope.receipt).toBeNull();
	});
	it('gera UUID de execução no servidor e recusa escolha de carta ou seed no cliente', async () => {
		const one = (await (await POST(event('carta-do-dia', {}, { key }))).json()) as FreeToolResponse;
		const two = (await (await POST(event('carta-do-dia', {}, { key }))).json()) as FreeToolResponse;
		expect(one.result.id).not.toBe(two.result.id);
		const invalid = await POST(
			event('carta-do-dia', { cardId: one.result.draw!.cardId, seed: 'chosen' }, { key })
		);
		expect(invalid.status).toBe(400);
		expect(await invalid.json()).toEqual({ code: 'invalid_input' });
	});
	it('rejeita payload excessivo, JSON inválido, origem diferente e produto pago antigo', async () => {
		const cases = [
			[event('ascendente', natal, { raw: 'x'.repeat(32769) }), 400, 'invalid_input'],
			[event('ascendente', natal, { raw: '{broken' }), 400, 'invalid_input'],
			[event('ascendente', natal, { type: 'text/plain' }), 400, 'invalid_input'],
			[
				event('ascendente', natal, { origin: 'https://elsewhere.invalid' }),
				403,
				'cross_origin_denied'
			],
			[event('daily-card', {}), 404, 'invalid_tool']
		] as const;
		for (const [request, status, code] of cases) {
			const response = await POST(request);
			expect(response.status).toBe(status);
			expect(await response.json()).toEqual({ code });
		}
	});
	it('recusa ASC polar real e mantém indisponibilidade explícita', async () => {
		const response = await POST(event('ascendente', { ...natal, latitude: 66 }));
		expect(response.status).toBe(422);
		expect(await response.json()).toEqual({ code: 'ascendant_unavailable' });
	});
});
