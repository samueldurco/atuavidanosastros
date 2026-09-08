import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { readLibraryResult } from './library-reader';
import { parseSavedCompass } from '$lib/library-result';

const owner = '00000000-0000-0000-0000-000000000001';
const other = '00000000-0000-0000-0000-000000000002';
const itemId = '00000000-0000-0000-0000-000000000003';
const sourceId = '00000000-0000-0000-0000-000000000004';
const position = {
	midheaven: 280.5,
	sign: 'Capricórnio',
	degree: 10.5,
	status: 'ok',
	warning: null
};
const provenance = {
	provider: 'fixture',
	providerVersion: '1',
	calculatedAt: '2026-09-08T09:00:00Z'
};
const item = {
	id: itemId,
	user_id: owner,
	title: 'Resultado sintético',
	universe: 'proposito-prosperidade',
	item_type: 'COMPASS_RESULT',
	source_id: sourceId,
	archived_at: null,
	created_at: '2026-09-08T09:00:00Z'
};
const calculation = {
	id: sourceId,
	user_id: owner,
	kind: 'MIDHEAVEN',
	result: position,
	provenance,
	input_fingerprint: 'not-for-browser'
};

function database(
	items: Record<string, unknown>[] = [item],
	results: Record<string, unknown>[] = [calculation]
) {
	const calls: { table: string; filters: [string, unknown][]; selected: string }[] = [];
	const client = {
		from(table: string) {
			const call = { table, filters: [] as [string, unknown][], selected: '' };
			calls.push(call);
			const query = {
				select(fields: string) {
					call.selected = fields;
					return query;
				},
				eq(key: string, value: unknown) {
					call.filters.push([key, value]);
					return query;
				},
				is(key: string, value: unknown) {
					call.filters.push([key, value]);
					return query;
				},
				async maybeSingle() {
					const row = (table === 'library_items' ? items : results).find((r) =>
						call.filters.every(([key, value]) => r[key] === value)
					);
					return { data: row ?? null, error: null };
				}
			};
			return query;
		}
	} as unknown as SupabaseClient;
	return { client, calls };
}

describe('leitor privado da Biblioteca', () => {
	it('recupera o resultado do proprietário e filtra cada tabela por usuário', async () => {
		const { client, calls } = database();
		const read = await readLibraryResult(client, owner, itemId);
		expect(read.state).toBe('ready');
		expect(
			calls.every((c) => c.filters.some(([key, value]) => key === 'user_id' && value === owner))
		).toBe(true);
		expect(calls[0].filters).toContainEqual(['archived_at', null]);
		expect(JSON.stringify(read)).not.toContain('not-for-browser');
		expect(calls[1].selected).toBe('result,provenance');
	});
	it('item de outro proprietário e item inexistente têm a mesma resposta', async () => {
		const { client } = database();
		expect(await readLibraryResult(client, other, itemId)).toEqual({ state: 'not-found' });
		expect(await readLibraryResult(client, owner, other)).toEqual({ state: 'not-found' });
	});
	it('não recupera item arquivado ou origem pertencente a outra pessoa', async () => {
		expect(
			(
				await readLibraryResult(
					database([{ ...item, archived_at: '2026-09-08' }]).client,
					owner,
					itemId
				)
			).state
		).toBe('not-found');
		expect(
			(
				await readLibraryResult(
					database([item], [{ ...calculation, user_id: other }]).client,
					owner,
					itemId
				)
			).state
		).toBe('unavailable');
	});
	it('rejeita identificador inválido sem consultar banco', async () => {
		const { client, calls } = database();
		expect((await readLibraryResult(client, owner, '../other')).state).toBe('not-found');
		expect(calls).toHaveLength(0);
	});
	it('não publica dado inconsistente ou formato ainda sem leitor', async () => {
		expect(
			(
				await readLibraryResult(
					database([item], [{ ...calculation, result: { ...position, degree: 15 } }]).client,
					owner,
					itemId
				)
			).state
		).toBe('unavailable');
		expect(
			(
				await readLibraryResult(
					database([{ ...item, item_type: 'FUTURE_FORMAT' }]).client,
					owner,
					itemId
				)
			).state
		).toBe('unsupported');
	});
	it('erro de transporte não vaza mensagem interna', async () => {
		const client = {
			from() {
				throw new Error('INTERNAL_ONLY');
			}
		} as unknown as SupabaseClient;
		expect(await readLibraryResult(client, owner, itemId)).toEqual({
			state: 'unavailable',
			item: null,
			result: null
		});
	});
});

it('validação de resultado recusa longitude/signo/grau inválidos e minimiza a proveniência', () => {
	for (const invalid of [
		{ ...position, midheaven: 360 },
		{ ...position, sign: 'Áries' },
		{ ...position, degree: -1 },
		{ ...position, status: 'unknown' }
	])
		expect(parseSavedCompass(invalid, provenance)).toBeNull();
	expect(
		parseSavedCompass(position, { ...provenance, privateField: 'not-for-browser' })?.provenance
	).not.toHaveProperty('privateField');
});
