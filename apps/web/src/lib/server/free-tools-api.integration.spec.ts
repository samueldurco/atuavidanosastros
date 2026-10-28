import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FreeToolResponse, FreeToolResult } from '../free-tools';
import type { FreeToolState } from '../free-tool-state';
import { parseFreeToolResult } from '../free-tool-result';
import { verifyFreeToolReceipt } from './free-tool-receipt';
import { GET, POST } from '../../routes/api/free-tools/[tool]/+server';
import { POST as CLAIM } from '../../routes/api/free-tools/claim/+server';

// Real calculations and HTTP adapter. Only RPC transport is isolated; SQL transaction
// semantics are covered separately by the database integration suite.
vi.mock('$app/environment', () => ({ dev: false }));
vi.mock('$env/dynamic/private', () => ({ env: {} }));
vi.mock('$env/dynamic/public', () => ({ env: {} }));
const rpcMock = vi.hoisted(() => vi.fn());
vi.mock('@supabase/supabase-js', () => ({
	createClient: () => ({
		rpc: (name: string, args: unknown) => ({ abortSignal: () => rpcMock(name, args) })
	})
}));
const key = 'synthetic-free-tools-api-key-for-tests';
const natal = {
	utcInstant: '2000-01-01T12:00:00.000Z',
	localDateTime: '2000-01-01T09:00:00',
	timezone: 'UTC-03:00',
	latitude: -23.5505,
	longitude: -46.6333,
	locationSource: 'synthetic-api-test'
};
const states = new Map<string, FreeToolState>();
const emptyState = (tool: string): FreeToolState => ({
	result: null,
	input: null,
	receipt: null,
	profile: null,
	quota: {
		mode: tool.startsWith('carta-')
			? 'daily-draw'
			: tool === 'registro-de-sonho'
				? 'daily-entry'
				: 'corrections',
		remainingCorrections: tool.startsWith('carta-') || tool === 'registro-de-sonho' ? null : 2,
		resetsAt: '2026-10-29T03:00:00.000Z',
		profileRevision: 0,
		stale: false
	}
});
beforeEach(() => {
	states.clear();
	rpcMock.mockReset();
	rpcMock.mockImplementation(async (name: string, args: Record<string, unknown>) => {
		const id = `${args.p_subject}:${args.p_tool}`;
		const state = states.get(id) ?? emptyState(String(args.p_tool));
		if (name === 'read_free_tool_state') return { data: state, error: null };
		if (name === 'read_free_tool_history')
			return {
				data: {
					history: [...states.entries()]
						.filter(
							([id, s]) =>
								id.startsWith(String(args.p_subject) + ':') &&
								s.result?.tool === 'registro-de-sonho' &&
								(!args.p_result_id || s.result.id === args.p_result_id)
						)
						.map(([, s]) => s),
					nextCursor: null
				},
				error: null
			};
		if (name === 'claim_free_tool_subject') return { data: { ok: true }, error: null };
		if (name === 'commit_free_tool_result') {
			const next = { ...state, input: args.p_input, result: args.p_result as FreeToolResult };
			states.set(id, next);
			return { data: next, error: null };
		}
		return { data: null, error: { message: 'invalid_input' } };
	});
});
function event(
	tool: string,
	value: unknown,
	options: {
		key?: string | null;
		origin?: string;
		raw?: string;
		type?: string;
		jar?: Map<string, string>;
		headers?: Record<string, string>;
		method?: 'GET' | 'POST';
		query?: string;
		userId?: string;
	} = {}
) {
	const url = new URL(`http://127.0.0.1/api/free-tools/${tool}${options.query ?? ''}`);
	const jar = options.jar ?? new Map<string, string>();
	const method = options.method ?? 'POST';
	return {
		url,
		params: { tool },
		platform: {
			env: {
				FREE_TOOL_RECEIPT_KEY: options.key === null ? undefined : (options.key ?? key),
				PUBLIC_SUPABASE_URL: 'https://synthetic.supabase.co',
				SUPABASE_SERVICE_ROLE_KEY: 'synthetic-service-role'
			}
		},
		locals: {
			supabase: options.userId
				? {
						auth: {
							getClaims: async () => ({ data: { claims: { sub: options.userId } }, error: null })
						}
					}
				: null
		},
		cookies: {
			get: (name: string) => jar.get(name),
			set: (name: string, value: string) => jar.set(name, value)
		},
		request: new Request(url, {
			method,
			headers: {
				'content-type': options.type ?? 'application/json',
				origin: options.origin ?? url.origin,
				...options.headers
			},
			...(method === 'POST' ? { body: options.raw ?? JSON.stringify(value) } : {})
		})
	} as unknown as Parameters<typeof POST>[0];
}

describe('rotas públicas com sujeito nominal e cálculo real', () => {
	it('isola contas A e B no mesmo navegador sem rotacionar o sujeito nem liberar o anônimo vinculado', async () => {
		const delegate = rpcMock.getMockImplementation()!;
		const claims = new Map<string, string>();
		rpcMock.mockImplementation(async (name: string, args: Record<string, unknown>) => {
			if (name === 'claim_free_tool_subject') {
				const previous = claims.get(String(args.p_anonymous_subject));
				if (previous && previous !== args.p_user_subject)
					return { data: null, error: { message: 'subject_claimed' } };
				claims.set(String(args.p_anonymous_subject), String(args.p_user_subject));
			} else if (String(args.p_subject).startsWith('anon:') && claims.has(String(args.p_subject))) {
				return { data: null, error: { message: 'subject_claimed' } };
			}
			return delegate(name, args);
		});
		const userA = '11111111-1111-4111-8111-111111111111';
		const userB = '22222222-2222-4222-8222-222222222222';
		const jar = new Map<string, string>();
		const a = (await (
			await POST(event('ascendente', natal, { jar, userId: userA }))
		).json()) as FreeToolState & { result: FreeToolResult; owner: string };
		const b = (await (
			await POST(event('ascendente', { ...natal, latitude: -22 }, { userId: userB }))
		).json()) as FreeToolState & { result: FreeToolResult; owner: string };
		states.get(`user:${userA}:ascendente`)!.quota.remainingCorrections = 0;
		states.get(`user:${userB}:ascendente`)!.quota.remainingCorrections = 1;
		const originalCookie = jar.get('atv_free_subject');
		const before = JSON.stringify([...states]);
		const switched = await GET(event('ascendente', null, { jar, userId: userB, method: 'GET' }));
		const switchedState = (await switched.json()) as FreeToolState & { result: FreeToolResult };
		expect(switched.status).toBe(200);
		expect(switched.headers.get('cache-control')).toBe('private, no-store');
		expect(switchedState.result.id).toBe(b.result.id);
		expect(switchedState.result.id).not.toBe(a.result.id);
		expect(switchedState.quota.remainingCorrections).toBe(1);
		expect(switchedState.owner).toBe(b.owner);
		expect(a.owner).toMatch(/^[a-f0-9]{64}$/);
		expect(b.owner).not.toBe(a.owner);
		expect(JSON.stringify(switchedState)).not.toContain(userA);
		expect(JSON.stringify(switchedState)).not.toContain(userB);
		expect(jar.get('atv_free_subject')).toBe(originalCookie);
		expect(JSON.stringify([...states])).toBe(before);
		const loggedOut = await GET(event('ascendente', null, { jar, method: 'GET' }));
		expect(loggedOut.status).toBe(409);
		expect(await loggedOut.json()).toEqual({ code: 'subject_claimed' });
		const returnedA = (await (
			await GET(event('ascendente', null, { jar, userId: userA, method: 'GET' }))
		).json()) as FreeToolState & { result: FreeToolResult };
		expect(returnedA.result.id).toBe(a.result.id);
		expect(returnedA.quota.remainingCorrections).toBe(0);
		expect(jar.get('atv_free_subject')).toBe(originalCookie);
	});

	it('recusa envio de rascunho de outro dono antes de calcular ou consumir uma utilização', async () => {
		const jar = new Map<string, string>();
		const initial = (await (
			await GET(event('ascendente', null, { jar, method: 'GET' }))
		).json()) as FreeToolState & { owner: string };
		rpcMock.mockClear();
		const response = await POST(
			event('ascendente', natal, {
				jar,
				userId: '22222222-2222-4222-8222-222222222222',
				headers: { 'x-atv-owner': initial.owner }
			})
		);
		expect(response.status).toBe(409);
		expect(await response.json()).toEqual({ code: 'session_changed' });
		expect(rpcMock.mock.calls.some(([name]) => name === 'commit_free_tool_result')).toBe(false);
		expect(states.size).toBe(0);
	});

	it('entrega oito ferramentas sem conta com resultado canônico, cota e recibo', async () => {
		const inputs = {
			ascendente: natal,
			'mapa-astral': natal,
			'meio-do-ceu': natal,
			'dinheiro-no-mapa': natal,
			'carta-do-dia': {},
			'carta-do-amor': { focus: 'Que diálogo posso começar?' },
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
			const jar = new Map<string, string>();
			const response = await POST(event(tool, input, { jar }));
			expect(response.status).toBe(200);
			expect(response.headers.get('cache-control')).toBe('private, no-store');
			expect(jar.has('atv_free_subject')).toBe(true);
			const envelope = (await response.json()) as FreeToolState;
			expect(parseFreeToolResult(envelope.result)).toEqual(envelope.result);
			expect(envelope.result!.tool).toBe(tool);
			expect(await verifyFreeToolReceipt(envelope.result!, envelope.receipt, key)).toBe(true);
			expect(envelope.quota).toBeDefined();
			if (tool === 'mapa-astral') {
				expect(envelope.result!.chart?.positions).toHaveLength(10);
				expect(envelope.result!.chart?.cusps).toHaveLength(12);
			}
			const restored = await GET(
				event(tool, {}, { jar, method: 'GET' }) as Parameters<typeof GET>[0]
			);
			expect(((await restored.json()) as FreeToolState).result).toEqual(envelope.result);
		}
	});
	it('falha fechado sem chave e não calcula nem persiste', async () => {
		const response = await POST(event('ascendente', natal, { key: null }));
		expect(response.status).toBe(503);
		expect(await response.json()).toEqual({ code: 'quota_unavailable' });
		expect(rpcMock).not.toHaveBeenCalled();
	});
	it('mantém carta diária; alias antigo usa Carta do Amor sem terceira cota', async () => {
		const jar = new Map<string, string>();
		const one = (await (
			await POST(event('carta-do-amor', {}, { jar }))
		).json()) as FreeToolResponse;
		const two = (await (
			await POST(
				event('tarot-sim-ou-nao', { focus: 'Outra pergunta não libera outra carta' }, { jar })
			)
		).json()) as FreeToolResponse;
		expect(two.result).toEqual(one.result);
		expect(rpcMock.mock.calls.filter(([name]) => name === 'commit_free_tool_result')).toHaveLength(
			1
		);
		expect(
			(await POST(event('carta-do-dia', { cardId: one.result.draw!.cardId, seed: 'chosen' })))
				.status
		).toBe(400);
	});
	it('input idêntico é consulta; cota esgotada impede nova correção', async () => {
		const jar = new Map<string, string>();
		await POST(event('ascendente', natal, { jar }));
		const [id, state] = [...states.entries()][0]!;
		states.set(id, { ...state, quota: { ...state.quota, remainingCorrections: 0 } });
		expect((await POST(event('ascendente', natal, { jar }))).status).toBe(200);
		expect((await POST(event('ascendente', { ...natal, latitude: -21 }, { jar }))).status).toBe(
			429
		);
		expect(rpcMock.mock.calls.filter(([name]) => name === 'commit_free_tool_result')).toHaveLength(
			1
		);
	});
	it('exige declaração de mesmo casal para corrigir, sem alegar prova de identidade', async () => {
		const jar = new Map<string, string>();
		const input = { first: natal, second: { ...natal, latitude: -22 }, consent: true };
		await POST(event('combinacao-do-casal', input, { jar }));
		const corrected = { ...input, second: { ...natal, latitude: -21 } };
		const rejected = await POST(event('combinacao-do-casal', corrected, { jar }));
		expect(rejected.status).toBe(400);
		expect(await rejected.json()).toEqual({ code: 'pair_confirmation_required' });
		expect(
			(
				await POST(
					event('combinacao-do-casal', corrected, {
						jar,
						headers: { 'x-atv-pair-correction': 'same-pair' }
					})
				)
			).status
		).toBe(200);
	});
	it('edita sonho owned preservando ID/data; não aceita ID de outro sujeito', async () => {
		const jar = new Map<string, string>();
		const input = {
			date: '2026-10-13',
			narrative: 'Um sonho sintético com uma janela aberta.',
			emotions: [],
			associations: []
		};
		const first = (await (
			await POST(event('registro-de-sonho', input, { jar }))
		).json()) as FreeToolResponse;
		const history = await GET(
			event('registro-de-sonho', {}, { jar, method: 'GET', query: '?historico=1' }) as Parameters<
				typeof GET
			>[0]
		);
		expect(((await history.json()) as { history: unknown[] }).history).toHaveLength(1);
		const edited = (await (
			await POST(
				event(
					'registro-de-sonho',
					{ ...input, narrative: input.narrative + ' Depois, apareceu um pássaro.' },
					{ jar, headers: { 'x-atv-result-id': first.result.id } }
				)
			)
		).json()) as FreeToolResponse;
		expect(edited.result.id).toBe(first.result.id);
		expect(edited.result.createdAt).toBe(first.result.createdAt);
		expect(
			(
				await POST(
					event('registro-de-sonho', input, { headers: { 'x-atv-result-id': first.result.id } })
				)
			).status
		).toBe(404);
	});
	it('propaga conflitos e recusa entradas, origem e cálculo polar inválidos', async () => {
		for (const [message, status] of [
			['claim_conflict', 409],
			['subject_claimed', 409],
			['quota_exceeded', 429],
			['unknown-db-error', 503]
		] as const) {
			rpcMock.mockResolvedValueOnce({ data: null, error: { message } });
			expect((await POST(event('ascendente', natal))).status).toBe(status);
		}
		const cases = [
			[event('ascendente', natal, { raw: 'x'.repeat(32769) }), 400],
			[event('ascendente', natal, { raw: '{broken' }), 400],
			[event('ascendente', natal, { type: 'text/plain' }), 400],
			[event('ascendente', natal, { origin: 'https://elsewhere.invalid' }), 403],
			[event('daily-card', {}), 404]
		] as const;
		for (const [request, status] of cases) expect((await POST(request)).status).toBe(status);
		const polar = await POST(event('ascendente', { ...natal, latitude: 66 }));
		expect(polar.status).toBe(422);
		expect(await polar.json()).toEqual({ code: 'ascendant_unavailable' });
	});
	it('encaminha paginação/lookup owned e rejeita cursores inválidos antes da RPC de histórico', async () => {
		const jar = new Map<string, string>();
		const request = (query: string) =>
			event('registro-de-sonho', {}, { jar, method: 'GET', query }) as Parameters<typeof GET>[0];
		expect((await GET(request('?historico=1&antes=2026-09-27'))).status).toBe(200);
		expect(rpcMock).toHaveBeenLastCalledWith(
			'read_free_tool_history',
			expect.objectContaining({ p_before: '2026-09-27', p_result_id: null })
		);
		for (const query of [
			'?historico=1&antes=2026-13-29',
			'?historico=1&antes=2026-02-31',
			'?historico=1&resultado=bad',
			'?historico=1&antes=2026-09-27&resultado=ba93fab2-f581-46d6-95a5-fbcab1adcdab'
		])
			expect((await GET(request(query))).status).toBe(400);
	});
	it('vincula cookie à identidade verificada, exige resolução explícita de conflito e não aceita sobrescrita anônima', async () => {
		const jar = new Map<string, string>();
		const userId = 'ba93fab2-f581-46d6-95a5-fbcab1adcdab';
		await GET(event('ascendente', {}, { jar, method: 'GET' }) as Parameters<typeof GET>[0]);
		rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'claim_conflict' } });
		expect(
			(
				await GET(
					event('ascendente', {}, { jar, userId, method: 'GET' }) as Parameters<typeof GET>[0]
				)
			).status
		).toBe(409);
		expect(rpcMock).toHaveBeenLastCalledWith(
			'claim_free_tool_subject',
			expect.objectContaining({
				p_anonymous_subject: expect.stringMatching(/^anon:/),
				p_user_subject: `user:${userId}`,
				p_resolution: null
			})
		);
		const claim = (resolution: string, authenticated = true) =>
			event(
				'claim',
				{ resolution },
				{ jar, ...(authenticated ? { userId } : {}) }
			) as unknown as Parameters<typeof CLAIM>[0];
		expect((await CLAIM(claim('anonymous'))).status).toBe(400);
		expect((await CLAIM(claim('account', false))).status).toBe(401);
		expect((await CLAIM(claim('account'))).status).toBe(200);
		expect(rpcMock).toHaveBeenLastCalledWith(
			'claim_free_tool_subject',
			expect.objectContaining({ p_user_subject: `user:${userId}`, p_resolution: 'account' })
		);
	});
});
