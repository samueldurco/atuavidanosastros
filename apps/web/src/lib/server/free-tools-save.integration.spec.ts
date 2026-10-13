import { beforeEach, describe, expect, it, vi } from 'vitest';
import { calculateFreeToolResult } from './free-tools-calculation';
import { signFreeToolResult } from './free-tool-receipt';
import { POST } from '../../routes/api/free-tools/save/+server';

const connection = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({ createClient: connection.createClient }));
vi.mock('$env/dynamic/private', () => ({ env: {} }));
vi.mock('$env/dynamic/public', () => ({ env: {} }));
const key = 'synthetic-public-free-tools-save-key-for-tests';
const owner = '00000000-0000-4000-8000-000000000001';
const other = '00000000-0000-4000-8000-000000000002';
const libraryId = '00000000-0000-4000-8000-000000000003';

function storage(options: { writeError?: unknown; readError?: unknown; item?: boolean } = {}) {
	const upsert = vi.fn(() => ({
		abortSignal: vi.fn(async () => ({ error: options.writeError ?? null }))
	}));
	const writer = { from: vi.fn(() => ({ upsert })) };
	connection.createClient.mockReturnValue(writer);
	const filters: [string, unknown][] = [];
	const query = {
		select: vi.fn(() => query),
		eq: vi.fn((column: string, value: unknown) => {
			filters.push([column, value]);
			return query;
		}),
		is: vi.fn(() => query),
		abortSignal: vi.fn(() => query),
		maybeSingle: vi.fn(async () => ({
			data: options.item === false ? null : { id: libraryId },
			error: options.readError ?? null
		}))
	};
	const session = {
		auth: { getClaims: vi.fn(async () => ({ data: { claims: { sub: owner } }, error: null })) },
		from: vi.fn(() => query)
	};
	return { session, writer, upsert, filters };
}
function event(
	value: unknown,
	session: unknown,
	options: { key?: string; serviceKey?: string; origin?: string } = {}
) {
	const url = new URL('https://synthetic.invalid/api/free-tools/save');
	return {
		url,
		platform: {
			env: {
				FREE_TOOL_RECEIPT_KEY: options.key,
				PUBLIC_SUPABASE_URL: 'https://synthetic-project.invalid',
				SUPABASE_SERVICE_ROLE_KEY: options.serviceKey
			}
		},
		locals: { supabase: session },
		request: new Request(url, {
			method: 'POST',
			headers: { 'content-type': 'application/json', origin: options.origin ?? url.origin },
			body: JSON.stringify(value)
		})
	} as unknown as Parameters<typeof POST>[0];
}
async function signed(now?: () => Date) {
	const result = await calculateFreeToolResult('carta-do-dia', {}, now ? { now } : {});
	return { result, receipt: await signFreeToolResult(result, key) };
}
beforeEach(() => connection.createClient.mockReset());

describe('salvamento público com origem e recibo reais', () => {
	it('grava pelo cliente privado somente após autenticação e HMAC, lendo pelo cliente da sessão', async () => {
		const envelope = await signed();
		// JSONB ordering and an attacker-supplied owner must not change trust or ownership.
		const result = Object.fromEntries(Object.entries(envelope.result).reverse());
		const db = storage();
		const response = await POST(
			event({ ...envelope, result, user_id: other }, db.session, {
				key,
				serviceKey: 'synthetic-server-only-service-key'
			})
		);
		expect(response.status).toBe(201);
		expect(response.headers.get('cache-control')).toBe('private, no-store');
		expect(response.headers.get('referrer-policy')).toBe('no-referrer');
		expect(await response.json()).toEqual({ id: libraryId, href: `/biblioteca/${libraryId}` });
		expect(connection.createClient).toHaveBeenCalledWith(
			'https://synthetic-project.invalid',
			'synthetic-server-only-service-key',
			{ auth: { persistSession: false, autoRefreshToken: false } }
		);
		expect(db.writer.from).toHaveBeenCalledWith('free_tool_results');
		expect(db.upsert).toHaveBeenCalledWith(
			{ user_id: owner, id: envelope.result.id, tool: envelope.result.tool, result },
			{ onConflict: 'user_id,id', ignoreDuplicates: true }
		);
		expect(db.session.from).toHaveBeenCalledWith('library_items');
		expect(db.filters).toContainEqual(['user_id', owner]);
		expect(db.filters).toContainEqual(['source_id', envelope.result.id]);
		expect(db.filters).toContainEqual(['item_type', 'FREE_TOOL_RESULT']);
	});

	it('recusa conta ausente e outra origem antes de criar qualquer cliente privilegiado', async () => {
		const db = storage();
		db.session.auth.getClaims.mockResolvedValue({ data: { claims: { sub: '' } }, error: null });
		expect((await POST(event(await signed(), db.session, { key }))).status).toBe(401);
		expect((await POST(event(await signed(), null, { key }))).status).toBe(503);
		expect((await POST(event({}, db.session, { origin: 'https://other.invalid' }))).status).toBe(
			403
		);
		expect(connection.createClient).not.toHaveBeenCalled();
	});

	it('recusa adulteração, recibo inválido, chave ausente e resultado expirado antes do INSERT', async () => {
		const db = storage();
		const envelope = await signed();
		const expired = await signed(() => new Date(Date.now() - 48 * 60 * 60 * 1000 - 60000));
		for (const body of [
			{ ...envelope, result: { ...envelope.result, summary: 'Texto adulterado' } },
			{ ...envelope, receipt: '0'.repeat(64) },
			expired,
			{ ...envelope, receipt: null }
		])
			expect((await POST(event(body, db.session, { key }))).status).toBe(400);
		expect((await POST(event(envelope, db.session))).status).toBe(400);
		expect(connection.createClient).not.toHaveBeenCalled();
		expect(db.upsert).not.toHaveBeenCalled();
	});

	it('chave de armazenamento ausente mantém o resultado sem simular salvamento', async () => {
		const db = storage();
		const response = await POST(event(await signed(), db.session, { key }));
		expect(response.status).toBe(503);
		expect(await response.json()).toEqual({ code: 'storage_unavailable' });
		expect(connection.createClient).not.toHaveBeenCalled();
	});

	it('falha de escrita/leitura devolve código limitado sem vazar erro privado', async () => {
		for (const failure of [
			{ writeError: new Error('SYNTHETIC_PRIVATE_DATABASE_DETAIL') },
			{ readError: new Error('SYNTHETIC_PRIVATE_DATABASE_DETAIL') },
			{ item: false }
		]) {
			const db = storage(failure);
			const response = await POST(
				event(await signed(), db.session, {
					key,
					serviceKey: 'synthetic-server-only-service-key'
				})
			);
			expect(response.status).toBe(503);
			expect(await response.text()).not.toContain('SYNTHETIC_PRIVATE_DATABASE_DETAIL');
		}
	});
});
