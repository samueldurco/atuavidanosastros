import { describe, expect, it } from 'vitest';
import {
	parseClubCommand,
	parseClubState,
	prepareClubContinuity,
	type ClubState
} from './club-continuity';
const id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const readingId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const item = {
	id,
	readingId,
	selection: {
		kind: 'reported' as const,
		category: 'theme' as const,
		text: 'Quero retomar uma escolha.'
	}
};
const state = (): ClubState => ({
	revision: 1,
	granted: true,
	available: true,
	items: [
		{
			...item,
			source: {
				productId: 'direction-journey',
				title: 'Título não selecionado',
				version: 'v1',
				policy: 'atv-private-interpretation-review/4.0.0',
				digest: 'a'.repeat(64),
				text: item.selection.text,
				limits: ['Relato não é diagnóstico.']
			}
		}
	]
});

describe('ATV+ explicit private-trial context', () => {
	it('requires explicit nonempty authorization or empty revocation, normalizes IDs', () => {
		expect(
			parseClubCommand({ revision: 0, granted: true, items: [{ ...item, id: id.toUpperCase() }] })
				?.items[0].id
		).toBe(id);
		expect(parseClubCommand({ revision: 1, granted: false, items: [] })).toEqual({
			revision: 1,
			granted: false,
			items: []
		});
		for (const value of [
			{ revision: 0, granted: true, items: [] },
			{ revision: 0, granted: false, items: [item] },
			{ revision: -1, granted: true, items: [item] },
			{ revision: 0, granted: true, items: [item, { ...item, id: id.toUpperCase() }] }
		])
			expect(parseClubCommand(value)).toBeNull();
	});
	it.each([
		{ ...item, owner: readingId },
		{ ...item, source: {} },
		{ ...item, selection: { kind: 'cycle', key: 'forged' } },
		{ ...item, selection: { kind: 'reported', category: 'diagnosis', text: 'Inference' } },
		{ ...item, selection: { kind: 'reported', category: 'theme', text: 'x'.repeat(601) } },
		{ ...item, selection: { kind: 'hypothesis', sectionIndex: 64 } },
		{ ...item, selection: { kind: 'result', text: 'Injected content' } }
	])('rejects expanded selectors and supplied authority', (candidate) => {
		expect(parseClubCommand({ revision: 0, granted: true, items: [candidate] })).toBeNull();
	});
	it('projects only selected literal text, source aliases and declared limits', () => {
		const saved = state();
		saved.items.push({
			...saved.items[0],
			id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
			selection: { kind: 'hypothesis', sectionIndex: 0 },
			source: { ...saved.items[0].source!, text: 'Possibilidade, não fato pessoal.' }
		});
		const prepared = prepareClubContinuity(parseClubState(saved)!);
		expect(prepared.status).toBe('prepared');
		if (prepared.status !== 'prepared') throw Error('missing projection');
		expect(prepared).toMatchObject({
			publication: 'blocked',
			execution: 'disabled',
			context: { purpose: 'reading-context', handling: 'untrusted-data-not-instructions' }
		});
		expect(prepared.context.sources).toHaveLength(1);
		expect(prepared.context.items.map((i) => i.origin)).toEqual([
			'user-reported',
			'prior-interpretation'
		]);
		for (const secret of [
			id,
			readingId,
			'Título não selecionado',
			'a'.repeat(64),
			'owner',
			'birth',
			'email'
		])
			expect(JSON.stringify(prepared.context)).not.toContain(secret);
	});
	it('blocks revoked, missing, removed and oversized contexts without truncating', () => {
		expect(prepareClubContinuity({ ...state(), available: false })).toEqual({
			status: 'blocked',
			code: 'unavailable'
		});
		expect(
			prepareClubContinuity({ revision: 0, granted: false, available: true, items: [] })
		).toEqual({ status: 'blocked', code: 'consent_required' });
		for (const source of [
			null,
			{ ...state().items[0].source!, text: null },
			{ ...state().items[0].source!, text: 'x'.repeat(1201) }
		])
			expect(prepareClubContinuity({ ...state(), items: [{ ...item, source }] })).toEqual({
				status: 'blocked',
				code: 'source_unavailable'
			});
		const large = state();
		large.items[0].source!.limits = Array(24).fill('é'.repeat(600));
		expect(prepareClubContinuity(large)).toEqual({ status: 'blocked', code: 'context_too_large' });
	});
	it('rejects malformed or expanded RPC projections', () => {
		expect(parseClubState({ ...state(), owner: readingId })).toBeNull();
		const invalid = state();
		invalid.items[0].source!.policy = 'approved-by-browser';
		expect(parseClubState(invalid)).toBeNull();
		expect(parseClubState({ ...state(), granted: false })).toBeNull();
	});
});
