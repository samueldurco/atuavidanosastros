import { isUuid } from './library-result';

export const LIBRARY_PAGE_SIZE = 50;

export interface LibraryListItem {
	id: string;
	title: string;
	universe: string;
	item_type: string;
	source_id: string | null;
	occurred_at: string;
	created_at: string;
}

export interface LibraryPageData {
	preview: boolean;
	items: LibraryListItem[];
	libraryError: boolean;
	pagination: { before: string | null; next: string | null; expired: boolean };
}

export const libraryCursor = (before: string | null): string | null =>
	before && isUuid(before) ? before.toLowerCase() : null;

export const libraryReturnCursor = (params: URLSearchParams): string | null => {
	const values = params.getAll('fromBefore');
	return values.length === 1 ? libraryCursor(values[0]) : null;
};

export const libraryPageHref = (before: string | null) => {
	const cursor = libraryCursor(before);
	return cursor ? `/biblioteca?before=${cursor}` : '/biblioteca';
};

export const libraryItemHref = (id: string, before: string | null) => {
	if (!isUuid(id)) return '/biblioteca';
	const cursor = libraryCursor(before);
	return `/biblioteca/${id.toLowerCase()}${cursor ? `?fromBefore=${cursor}` : ''}`;
};
