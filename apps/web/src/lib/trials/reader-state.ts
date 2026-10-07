export type ReaderState = { chapter: number; bookmarks: number[] };

/** A reading's actual chapter count is authoritative; client positions cannot escape it. */
export function parseReaderState(value: unknown, chapterCount: number): ReaderState | null {
	if (!value || typeof value !== 'object' || chapterCount < 1 || chapterCount > 60) return null;
	const body = value as Record<string, unknown>;
	const valid = (n: unknown): n is number =>
		Number.isInteger(n) && Number(n) >= 0 && Number(n) < chapterCount;
	if (
		!valid(body.chapter) ||
		!Array.isArray(body.bookmarks) ||
		body.bookmarks.length > chapterCount ||
		!body.bookmarks.every(valid)
	)
		return null;
	if (new Set(body.bookmarks).size !== body.bookmarks.length) return null;
	return { chapter: body.chapter, bookmarks: [...body.bookmarks].sort((a, b) => a - b) };
}
