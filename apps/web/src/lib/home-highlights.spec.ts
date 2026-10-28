import { describe, expect, it } from 'vitest';
import { selectHomeHighlights, type HomeHighlight } from './home-highlights';

const now = Date.parse('2026-10-28T15:00:00Z');
const item = (id: string, overrides: Partial<HomeHighlight> = {}): HomeHighlight => ({
	id,
	title: `Leitura ${id}`,
	href: `/revista/${id}`,
	status: 'PUBLISHED',
	publishedAt: '2026-10-27T12:00:00Z',
	topicId: 'mapa-astral',
	image: '/brand/approved.webp',
	...overrides
});

describe('automatic contextual home news', () => {
	it('does not promote drafts, undated products or scheduled publications as news', () => {
		const entries = [
			item('published'),
			item('preparing', { status: 'PREPARING' }),
			item('draft', { status: 'DRAFT' }),
			item('paused', { status: 'PAUSED' }),
			item('undated', { publishedAt: undefined }),
			item('invalid-date', { publishedAt: 'not-a-date' }),
			item('future', { publishedAt: '2026-10-29T00:00:00Z' })
		];
		expect(selectHomeHighlights(entries, { now }).map((entry) => entry.id)).toEqual(['published']);
	});

	it('requires a usable local destination, a title and approved visual support', () => {
		const entries = [
			item('no-title', { title: '' }),
			item('external', { href: 'https://example.invalid/article' }),
			item('protocol-relative', { href: '//example.invalid/article' }),
			item('no-art', { image: undefined }),
			item('fallback', { image: undefined, fallbackIllustration: '/brand/approved.svg' })
		];
		expect(selectHomeHighlights(entries, { now }).map((entry) => entry.id)).toEqual(['fallback']);
	});

	it('uses the context and excludes adjacent placements without filling from another universe', () => {
		const entries = [
			item('already-used'),
			item('same-universe'),
			item('other-universe', { topicId: 'sonhos' })
		];
		expect(
			selectHomeHighlights(entries, {
				now,
				topic: 'mapa-astral',
				excluded: ['/revista/already-used']
			}).map((entry) => entry.id)
		).toEqual(['same-universe']);
	});

	it('chooses the newest valid entry per destination and applies the count after deduplication', () => {
		const entries = [
			item('older-copy', { href: '/revista/shared', publishedAt: '2026-10-21T00:00:00Z' }),
			item('third', { publishedAt: '2026-10-23T00:00:00Z' }),
			item('newer-copy', { href: '/revista/shared', publishedAt: '2026-10-27T00:00:00Z' }),
			item('second', { publishedAt: '2026-10-25T00:00:00Z' })
		];
		const originalOrder = entries.map((entry) => entry.id);
		expect(selectHomeHighlights(entries, { now, limit: 2 }).map((entry) => entry.id)).toEqual([
			'newer-copy',
			'second'
		]);
		expect(entries.map((entry) => entry.id)).toEqual(originalOrder);
	});

	it('leaves the slot empty when no publication is eligible', () => {
		expect(selectHomeHighlights([item('not-live', { status: 'PREPARING' })], { now })).toEqual([]);
	});
});
