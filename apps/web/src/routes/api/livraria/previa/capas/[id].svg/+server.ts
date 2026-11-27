import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireLivrariaPreview } from '$lib/server/livraria/access';
import { catalog, clubEditions } from '$lib/server/livraria/catalog';

const escape = (value: string) =>
	value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;');
export const GET: RequestHandler = async (event) => {
	await requireLivrariaPreview(event, true);
	const isClub = event.params.id?.startsWith('edition-');
	const book = isClub
		? clubEditions.find((item) => item.id === event.params.id)
		: catalog.find((item) => item.id === event.params.id);
	if (!book) error(404, 'Capa não encontrada.');
	const words = book.title.split(' ');
	const lines: string[] = [];
	for (const word of words) {
		if (!lines.length || `${lines.at(-1)} ${word}`.length > 17) lines.push(word);
		else lines[lines.length - 1] += ` ${word}`;
	}
	const title = lines
		.map(
			(line, index) =>
				`<text x="160" y="${190 + index * 34}" text-anchor="middle">${escape(line)}</text>`
		)
		.join('');
	const paper = isClub ? '#172f35' : '#ece4d6';
	const ink = isClub ? '#f1ddaf' : '#292923';
	const accent = isClub ? '#d3b77f' : '#80613c';
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="480" viewBox="0 0 320 480"><rect width="320" height="480" fill="${paper}"/><rect x="16" y="16" width="288" height="448" rx="2" fill="none" stroke="${accent}"/><circle cx="160" cy="103" r="42" fill="none" stroke="${accent}"/><path d="M160 55v96M112 103h96M126 69l68 68M126 137l68-68" stroke="${accent}" opacity=".55"/><g font-family="Georgia,serif" font-size="27" fill="${ink}">${title}</g><text x="160" y="390" text-anchor="middle" font-family="sans-serif" font-size="11" fill="${accent}">${isClub ? 'CÉU DE PAPEL · EDIÇÃO EXCLUSIVA' : `ATVNA · ${escape(book.theme.toUpperCase())}`}</text><text x="160" y="425" text-anchor="middle" font-family="sans-serif" font-size="10" fill="${accent}">CAPA PROVISÓRIA · PRÉVIA RESTRITA</text></svg>`;
	return new Response(svg, {
		headers: {
			'content-type': 'image/svg+xml; charset=utf-8',
			'content-security-policy': "default-src 'none'; style-src 'none'; sandbox",
			'cache-control': 'private, no-store',
			'x-robots-tag': 'noindex, nofollow, noarchive'
		}
	});
};
