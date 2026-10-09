import { SITE } from '$lib/data/site';
import { editorialHubs, legacyPublicPaths } from '$lib/seo';
import { hubDocuments, type EditorialDocument } from './editorial';
import { parseHoroscopeArchivePath } from '$lib/public-horoscope';

export const NEWS_WINDOW_MS = 48 * 60 * 60 * 1000;
export const NEWS_LIMIT = 1000;
const sitemapNamespace = 'http://www.sitemaps.org/schemas/sitemap/0.9';
export function xml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}
function urlset(body: string, news = false): string {
	return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="${sitemapNamespace}"${news ? ' xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"' : ''}>${body}</urlset>`;
}
export function recentNews(
	documents: readonly EditorialDocument[],
	now: Date
): EditorialDocument[] {
	return documents.filter(
		(document) =>
			document.kind === 'reporting' &&
			now.getTime() >= Date.parse(document.publishedAt) &&
			now.getTime() - Date.parse(document.publishedAt) < NEWS_WINDOW_MS
	);
}
export function newsChunks(
	documents: readonly EditorialDocument[],
	now: Date
): EditorialDocument[][] {
	const articles = recentNews(documents, now);
	return Array.from({ length: Math.max(1, Math.ceil(articles.length / NEWS_LIMIT)) }, (_, index) =>
		articles.slice(index * NEWS_LIMIT, (index + 1) * NEWS_LIMIT)
	);
}
export function sitemapIndex(documents: readonly EditorialDocument[], now: Date): string {
	const chunks = newsChunks(documents, now);
	const paths = [
		'/sitemap-pages.xml',
		'/sitemap-editorial.xml',
		...chunks.map((_, index) =>
			index === 0 ? '/news-sitemap.xml' : `/news-sitemap/${index + 1}.xml`
		)
	];
	return `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="${sitemapNamespace}">${paths.map((path) => `<sitemap><loc>${xml(SITE.url + path)}</loc></sitemap>`).join('')}</sitemapindex>`;
}
export function pagesSitemap(documents: readonly EditorialDocument[]): string {
	const horoscopeSigns = [
		...new Set(
			documents.flatMap((document) => {
				const archive =
					document.kind === 'horoscope' ? parseHoroscopeArchivePath(document.path) : null;
				return archive ? [`/horoscopo/${archive.sign}`] : [];
			})
		)
	];
	const hubs = Object.keys(editorialHubs).filter((path) =>
		path === '/horoscopo'
			? horoscopeSigns.length > 0
			: hubDocuments(documents, path as keyof typeof editorialHubs).length > 0
	);
	return urlset(
		[...legacyPublicPaths, ...hubs, ...horoscopeSigns]
			.map((path) => `<url><loc>${xml(SITE.url + (path === '/' ? '' : path))}</loc></url>`)
			.join('')
	);
}
export function editorialSitemap(documents: readonly EditorialDocument[]): string {
	const authors = [...new Set(documents.map((document) => document.author.id))];
	return urlset(
		documents
			.map(
				(document) =>
					`<url><loc>${xml(SITE.url + document.path)}</loc><lastmod>${xml(document.modifiedAt)}</lastmod></url>`
			)
			.join('') +
			authors.map((id) => `<url><loc>${xml(`${SITE.url}/pessoas/${id}`)}</loc></url>`).join('')
	);
}
export function newsSitemap(documents: readonly EditorialDocument[]): string {
	if (documents.length > NEWS_LIMIT) throw new Error('News sitemap requires chunking');
	return urlset(
		documents
			.map(
				(document) =>
					`<url><loc>${xml(SITE.url + document.path)}</loc><news:news><news:publication><news:name>${xml(SITE.name)}</news:name><news:language>pt</news:language></news:publication><news:publication_date>${xml(document.publishedAt)}</news:publication_date><news:title>${xml(document.title)}</news:title></news:news></url>`
			)
			.join(''),
		true
	);
}
export function editorialRss(documents: readonly EditorialDocument[]): string {
	const items = documents
		.filter((document) => document.path.startsWith('/noticias/'))
		.slice(0, 100);
	return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>${xml(SITE.name)}</title><link>${SITE.url}/noticias</link><description>Notícias, colunas e guias revisados</description><language>pt-BR</language><atom:link href="${SITE.url}/noticias/feed.xml" rel="self" type="application/rss+xml"/>${items.map((document) => `<item><title>${xml(document.title)}</title><link>${xml(SITE.url + document.path)}</link><guid isPermaLink="true">${xml(SITE.url + document.path)}</guid><description>${xml(document.description)}</description><pubDate>${new Date(document.publishedAt).toUTCString()}</pubDate></item>`).join('')}</channel></rss>`;
}
export function xmlResponse(body: string, rss = false): Response {
	return new Response(body, {
		headers: {
			'content-type': `${rss ? 'application/rss+xml' : 'application/xml'}; charset=utf-8`,
			'cache-control': 'public, max-age=0, must-revalidate',
			'x-content-type-options': 'nosniff',
			'x-robots-tag': 'noindex'
		}
	});
}
