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

export const libraryPageHref = (before: string | null) =>
	before ? `/biblioteca?before=${encodeURIComponent(before)}` : '/biblioteca';
