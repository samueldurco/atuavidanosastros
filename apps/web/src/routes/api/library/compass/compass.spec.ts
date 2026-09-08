import { expect, it, vi } from 'vitest';
import { POST } from './+server';

vi.mock('$lib/server/midheaven', () => ({
	parseCalculationInput: (value: unknown) =>
		value && typeof value === 'object' && 'utcInstant' in value ? value : null,
	fingerprintMaterial: () => 'synthetic-fingerprint-input',
	calculateMidheaven: async () => ({
		midheaven: 280.5,
		sign: 'Capricórnio',
		degree: 10.5,
		status: 'ok',
		warning: null,
		provenance: { provider: 'fixture', providerVersion: '1' }
	})
}));
const owner = '00000000-0000-0000-0000-000000000001';
const libraryId = '00000000-0000-0000-0000-000000000002';
const resultId = '00000000-0000-0000-0000-000000000003';
function setup(claims = true) {
	const writes: { table: string; value: Record<string, unknown>; conflict: unknown }[] = [];
	const client = {
		auth: {
			getClaims: async () => ({ data: { claims: claims ? { sub: owner } : null }, error: null })
		},
		from(table: string) {
			return {
				upsert(value: Record<string, unknown>, conflict: unknown) {
					writes.push({ table, value, conflict });
					return {
						select() {
							return {
								async single() {
									return {
										data: { id: table === 'library_items' ? libraryId : resultId },
										error: null
									};
								}
							};
						}
					};
				}
			};
		}
	};
	const event = (body: string) =>
		({
			request: new Request('http://localhost/api/library/compass', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body
			}),
			locals: { supabase: client }
		}) as unknown as Parameters<typeof POST>[0];
	return { event, writes };
}
it('salvar devolve o ID do item recuperável e usa o usuário da sessão nas duas escritas', async () => {
	const { event, writes } = setup();
	const response = await POST(event('{"utcInstant":"2000-01-01T12:00:00Z","user_id":"attacker"}'));
	expect(response.status).toBe(201);
	expect(await response.json()).toEqual({ saved: true, resultId, libraryItemId: libraryId });
	expect(writes).toHaveLength(2);
	expect(writes.every((write) => write.value.user_id === owner)).toBe(true);
	expect(writes[1].value.source_id).toBe(resultId);
	expect(writes[1].conflict).toEqual({ onConflict: 'user_id,item_type,source_id' });
});
it('não grava sem sessão ou com JSON malformado', async () => {
	const denied = setup(false);
	expect((await POST(denied.event('{}'))).status).toBe(401);
	expect(denied.writes).toHaveLength(0);
	const malformed = setup();
	expect((await POST(malformed.event('{invalid'))).status).toBe(400);
	expect(malformed.writes).toHaveLength(0);
});
