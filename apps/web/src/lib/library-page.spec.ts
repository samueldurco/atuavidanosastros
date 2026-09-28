import { describe, expect, it } from 'vitest';
import {
	libraryCursor,
	libraryItemHref,
	libraryPageHref,
	libraryReturnCursor
} from './library-page';

const cursor = 'AB000000-0000-4000-8000-000000000004';
const item = '00000000-0000-4000-8000-000000000003';
describe('private library return navigation', () => {
	it('round-trips one canonical cursor without notes, filters or arbitrary return URLs', () => {
		const href = libraryItemHref(item, cursor);
		expect(href).toBe(`/biblioteca/${item}?fromBefore=${cursor.toLowerCase()}`);
		const params = new URL(href, 'https://local.test').searchParams;
		expect(libraryPageHref(libraryReturnCursor(params))).toBe(
			`/biblioteca?before=${cursor.toLowerCase()}`
		);
	});
	it('keeps first-page and direct links unchanged', () => {
		expect(libraryItemHref(item, null)).toBe(`/biblioteca/${item}`);
		expect(libraryPageHref(libraryReturnCursor(new URLSearchParams()))).toBe('/biblioteca');
	});
	it.each([
		'',
		'https://external.test',
		'//external.test',
		'/admin',
		`${cursor}&x=1`,
		` ${cursor}`,
		`${cursor}\n`,
		'not-a-uuid'
	])('rejects malformed cursor %j', (value) => {
		expect(libraryCursor(value)).toBeNull();
		expect(libraryReturnCursor(new URLSearchParams({ fromBefore: value }))).toBeNull();
		expect(libraryPageHref(value)).toBe('/biblioteca');
		expect(libraryItemHref(item, value)).toBe(`/biblioteca/${item}`);
	});
	it('rejects repetition even for equal values', () => {
		for (const second of [cursor, '', 'https://external.test']) {
			const params = new URLSearchParams([
				['fromBefore', cursor],
				['fromBefore', second]
			]);
			expect(libraryReturnCursor(params)).toBeNull();
		}
	});
	it('ignores unrelated query fields and rejects unsafe item paths', () => {
		expect(
			libraryReturnCursor(
				new URLSearchParams({ before: cursor, returnTo: 'https://external.test' })
			)
		).toBeNull();
		expect(libraryItemHref('../admin', cursor)).toBe('/biblioteca');
	});
});
