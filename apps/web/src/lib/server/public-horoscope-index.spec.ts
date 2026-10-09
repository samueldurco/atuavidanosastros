import { describe, expect, it } from 'vitest';
import { publicHoroscopeIndex, loadPublicHoroscopeIndex } from './public-horoscope-index';
import type { EditorialDocument } from './editorial';
import { pagesSitemap } from './editorial-feeds';
import {
	horoscopeRange,
	parseHoroscopeArchivePath,
	parseHoroscopeFollow,
	unreadHoroscopeEntries
} from '$lib/public-horoscope';

// Projection fixtures only: no editorial authority or publication is granted here.
function fixture(
	path: string,
	end: string,
	modifiedAt = '2026-10-08T01:00:00.000Z'
): EditorialDocument {
	return {
		id: path,
		revision: 1,
		kind: 'horoscope',
		path,
		title: 'Fixture de projeção',
		description: 'Somente teste.',
		publishedAt: '2026-10-01T00:00:00.000Z',
		modifiedAt,
		calculation: {
			engine: 'fixture',
			version: 'test',
			factsDigest: '0'.repeat(64),
			coverageStart: `${path.split('/').at(-1)}T00:00:00.000Z`,
			coverageEnd: `${end}T00:00:00.000Z`
		}
	} as EditorialDocument;
}
const now = new Date('2026-10-08T12:00:00.000Z');
const project = (documents: EditorialDocument[], query = '', sign: 'aries' | null = 'aries') =>
	publicHoroscopeIndex(documents, new URL(`https://example.org/horoscopo${query}`), sign, now);
const daily = fixture('/horoscopo/aries/daily/2026-10-08', '2026-10-09');
const weekly = fixture('/horoscopo/aries/weekly/2026-10-05', '2026-10-12');

describe('public horoscope archives', () => {
	it('exposes only sign indexes backed by admitted dated archives in the pages sitemap', () => {
		expect(pagesSitemap([fixture('/horoscopo/aries', '2026-10-09')])).not.toContain('/horoscopo');
		const body = pagesSitemap([daily]);
		expect(body).toContain('/horoscopo</loc>');
		expect(body).toContain('/horoscopo/aries</loc>');
		expect(body).not.toContain('/horoscopo/touro');
	});
	it('accepts only canonical, real dates and the twelve known signs', () => {
		expect(parseHoroscopeArchivePath(daily.path)).toEqual({
			sign: 'aries',
			period: 'daily',
			startDate: '2026-10-08'
		});
		for (const path of [
			'/horoscopo/aries/daily/2026-02-29',
			'/horoscopo/aries/monthly/2100-01-01',
			'/horoscopo/unknown/daily/2026-10-08',
			'/horoscopo/aries/annual/2026-10-08',
			'/horoscopo/aries/daily/2026-10-08/',
			'/horoscopo/aries'
		])
			expect(parseHoroscopeArchivePath(path)).toBeNull();
	});
	it('separates sign, cadence and start year; current coverage is independent of archive year', () => {
		const old = fixture('/horoscopo/aries/daily/2025-12-31', '2026-01-01');
		const other = fixture('/horoscopo/touro/daily/2026-10-08', '2026-10-09');
		const index = project([old, weekly, daily, other], '?year=2025');
		expect(index.history.map((entry) => entry.path)).toEqual([old.path]);
		expect(index.current?.path).toBe(daily.path);
		expect(project([weekly, daily], '?period=weekly').current?.path).toBe(weekly.path);
		expect(project([daily, other], '', null).history).toHaveLength(2);
	});
	it('excludes ambiguous legacy paths and prevents expired or future current readings', () => {
		const old = fixture('/horoscopo/aries/daily/2026-10-07', '2026-10-08');
		const future = fixture('/horoscopo/aries/daily/2026-10-09', '2026-10-10');
		const index = project([old, future, fixture('/horoscopo/aries', '2026-10-09')]);
		expect(index.current).toBeNull();
		expect(index.entries).toHaveLength(2);
		expect(index.history[0].path).toBe(future.path);
		expect(project([]).seo.indexable).toBe(false);
	});
	it.each(['?period=annual', '?year=1899', '?year=2100', '?year=2026.0', '?year=26'])(
		'rejects invalid filters %s',
		(query) => {
			expect(() => project([], query)).toThrow(expect.objectContaining({ status: 400 }));
		}
	);
	it('rejects an unknown sign before loading any registry', async () => {
		await expect(
			loadPublicHoroscopeIndex(new URL('https://example.org/horoscopo/unknown'), 'unknown')
		).rejects.toMatchObject({ status: 404 });
	});
	it('formats the last covered day rather than the exclusive end', () => {
		expect(horoscopeRange(project([daily]).entries[0])).toBe('08/10/2026');
		expect(horoscopeRange(project([weekly]).entries[0])).toBe('05/10/2026 a 11/10/2026');
	});
});

describe('consented browser-only horoscope preferences', () => {
	const follow = {
		version: 1 as const,
		sign: 'aries' as const,
		period: 'daily' as const,
		consentedAt: '2026-10-01T00:00:00.000Z',
		seenThrough: '2026-10-07T00:00:00.000Z'
	};
	it('accepts exactly the minimal known schema and rejects private or malformed data', () => {
		expect(parseHoroscopeFollow(JSON.stringify(follow))).toEqual(follow);
		for (const invalid of [
			null,
			'{',
			'x'.repeat(501),
			JSON.stringify({ ...follow, birthDate: '2000-01-01' }),
			JSON.stringify({ ...follow, version: 2 }),
			JSON.stringify({ ...follow, sign: 'unknown' }),
			JSON.stringify({ ...follow, period: 'annual' }),
			JSON.stringify({ ...follow, seenThrough: '2026-02-30T00:00:00.000Z' }),
			JSON.stringify({ ...follow, seenThrough: '2025-01-01T00:00:00.000Z' })
		])
			expect(parseHoroscopeFollow(invalid)).toBeNull();
	});
	it('alerts only matching publications modified after the last acknowledged time', () => {
		const entries = project([
			daily,
			weekly,
			fixture('/horoscopo/touro/daily/2026-10-08', '2026-10-09')
		]).entries;
		expect(unreadHoroscopeEntries(entries, null)).toEqual([]);
		expect(unreadHoroscopeEntries(entries, follow).map((entry) => entry.path)).toEqual([
			daily.path
		]);
		expect(unreadHoroscopeEntries(entries, { ...follow, seenThrough: daily.modifiedAt })).toEqual(
			[]
		);
	});
});
