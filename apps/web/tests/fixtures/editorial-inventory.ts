import { readFileSync } from 'node:fs';
import { editorialTopicPaths } from '../../src/lib/data/editorial-topics';
import type { EditorialDocument, EditorialSummary } from '../../src/lib/server/editorial';

// Expected release inventory, independent of the runtime's verification and discovery code.
// Invalid signatures still fail runtime gates; this fixture never authorizes publication.
const release = JSON.parse(
	readFileSync(
		new URL('../../src/lib/server/editorial-release/registry.json', import.meta.url),
		'utf8'
	)
) as { packages: { document: EditorialDocument }[] };
const datedIndex = JSON.parse(
	readFileSync(
		new URL('../../src/lib/server/editorial-release/dated-index.json', import.meta.url),
		'utf8'
	)
) as { entries: { index: { documents: EditorialSummary[] } }[] };
const isPublished = (document: EditorialSummary) =>
	document.state === 'PUBLISHED' &&
	Date.parse(document.publishedAt) <= Date.now() &&
	Date.parse(document.modifiedAt) <= Date.now();

export const bundledEditorial = release.packages.map((entry) => entry.document).filter(isPublished);
export const publishedEditorial = [
	...bundledEditorial,
	...datedIndex.entries.flatMap((entry) => entry.index.documents).filter(isPublished)
];
export const datedForecasts = publishedEditorial.filter(
	(document) => document.kind === 'horoscope'
);
export const expectedTopicPaths: Record<string, readonly string[]> = {
	...editorialTopicPaths,
	ciclos: [...editorialTopicPaths.ciclos, ...datedForecasts.map((document) => document.path)]
};
const today = new Date().toISOString().slice(0, 10);
export const currentForecasts = datedForecasts
	.filter(
		(document) =>
			document.path.split('/').at(-1)! <= today &&
			today < document.calculation!.coverageEnd.slice(0, 10)
	)
	.sort((a, b) => b.path.split('/').at(-1)!.localeCompare(a.path.split('/').at(-1)!));
