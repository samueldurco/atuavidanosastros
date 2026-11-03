import { render } from 'svelte/server';
import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { EditorialDocument } from '$lib/server/editorial';
import EditorialArticle from './EditorialArticle.svelte';

it('uses the reviewed action once and keeps separate related reading', () => {
	const previous: EditorialDocument = JSON.parse(
		readFileSync(resolve('../../docs/editorial/release-2026-10-06/P04/document.json'), 'utf8')
	);
	const document = { ...previous, revision: 4 };
	const related = [
		{ path: '/ascendente', title: 'Ascendente' },
		{ path: '/mapa-astral', title: 'Mapa astral' }
	];
	const article = (entry: EditorialDocument) =>
		render(EditorialArticle, { props: { document: entry, related } }).body;
	const approved = article(document);
	expect(approved.match(/href="\/ascendente"/g)).toHaveLength(1);
	expect(approved).toContain('Entender o ascendente');
	expect(approved).toContain('href="/mapa-astral"');

	for (const other of [
		{ ...document, revision: 3 },
		{ ...document, id: 'another-guide' }
	]) {
		const html = article(other);
		expect(html).not.toContain('Entender o ascendente');
		expect(html).toMatch(/href="\/ascendente"[^>]*>Ascendente/);
	}
});
