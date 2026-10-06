import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { EditorialDocument } from '../src/lib/server/editorial';
import { scanAccessibility } from './fixtures/accessibility';

const release = JSON.parse(
	readFileSync(resolve('src/lib/server/editorial-release/registry.json'), 'utf8')
) as { packages: { document: EditorialDocument }[] };
const published = release.packages.map((entry) => entry.document);
const news = published.filter((document) => document.path.startsWith('/noticias/'));

test('editorial hubs reflect admitted content with one canonical', async ({ page, request }) => {
	for (const path of ['/noticias', '/signos', '/horoscopo', '/compatibilidade']) {
		const response = await request.get(path, { headers: { accept: 'text/html' } });
		expect(response.status()).toBe(200);
		const html = await response.text();
		if (path === '/noticias' && news.length > 0) {
			for (const document of news) expect(html).toContain(document.title);
		} else expect(html).toContain('Nenhum artigo publicado ainda');
		expect(html).not.toContain('application/ld+json');
		await page.goto(path);
		await expect(page.locator('h1')).toHaveCount(1);
		await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
		await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
			'href',
			`https://atuavidanosastros.com.br${path}`
		);
		await expect(page.locator('meta[name="robots"]')).toHaveCount(1);
		await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
			'content',
			'noindex, nofollow'
		);
		await expect(page.locator('meta[property="og:title"]')).toHaveCount(1);
	}
});
test('draft/unknown editorial content, reverse pairs and invented authors return 404', async ({
	request
}) => {
	for (const path of [
		'/signos/aries',
		'/horoscopo/aries',
		'/compatibilidade/aries-touro',
		'/compatibilidade/touro-aries',
		'/noticias/2026/10/nao-publicado',
		'/pessoas/autor-sintetico',
		...(!published.some((document) => document.path === '/mercurio-retrogrado')
			? ['/mercurio-retrogrado']
			: []),
		'/calendario-astral',
		'/toString'
	]) {
		const response = await request.get(path, { headers: { accept: 'text/html' } });
		expect(response.status(), path).toBe(404);
		const body = await response.text();
		// A plain HTTP 404 is also non-indexable; only an HTML error shell owns metadata.
		if (/<html\b/i.test(body)) {
			expect(body, path).toContain('noindex, nofollow');
		} else {
			expect(body, path).toBe('Not Found');
		}
	}
});
test('sitemaps preserve real routes and do not include unpublished content', async ({
	request
}) => {
	const index = await request.get('/sitemap.xml');
	const indexBody = await index.text();
	for (const path of ['/sitemap-pages.xml', '/sitemap-editorial.xml', '/news-sitemap.xml']) {
		expect(indexBody).toContain(path);
		const response = await request.get(path);
		expect(response.status()).toBe(200);
		expect(response.headers()['content-type']).toContain('application/xml');
		const body = await response.text();
		expect(body).not.toContain('/signos/aries');
		expect(body).not.toContain('/dashboard');
		if (path === '/sitemap-pages.xml')
			expect(body.match(/<url>/g)).toHaveLength(14 + (news.length > 0 ? 1 : 0));
		else if (path === '/sitemap-editorial.xml') {
			expect(body.match(/<url>/g) ?? []).toHaveLength(
				published.length + (published.length ? 1 : 0)
			);
			for (const document of published) expect(body).toContain(document.path);
		} else expect(body).not.toContain('<url>');
	}
	expect((await request.get('/news-sitemap/2.xml')).status()).toBe(404);
});
test('RSS and robots expose no synthetic content or staging sitemap', async ({ request }) => {
	const rss = await request.get('/noticias/feed.xml');
	expect(rss.status()).toBe(200);
	expect(rss.headers()['content-type']).toContain('application/rss+xml');
	expect((await rss.text()).match(/<item>/g) ?? []).toHaveLength(news.length);
	const robots = await request.get('/robots.txt');
	const body = await robots.text();
	expect(body).toContain('Disallow: /admin');
	expect(body).toContain('Disallow: /conta');
	expect(body).not.toContain('Sitemap:');
});

for (const width of [1440, 390]) {
	test(`admitted guides have complete SSR, metadata and accessibility at ${width}px`, async ({
		page,
		request
	}, testInfo) => {
		test.setTimeout(240_000);
		await page.setViewportSize({ width, height: 1000 });
		for (const document of published) {
			const response = await request.get(document.path);
			expect(response.status(), document.path).toBe(200);
			const html = await response.text();
			expect(html).toContain(document.title);
			expect(html).toContain('application/ld+json');
			expect(html).not.toContain('NewsArticle');
			await page.goto(document.path);
			await expect(page.locator('h1')).toHaveText(document.title);
			await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
			await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
				'href',
				`https://atuavidanosastros.com.br${document.path}`
			);
			await expect(page.getByRole('heading', { name: 'Fontes e referências' })).toBeVisible();
			const article = JSON.parse(
				await page.locator('script[type="application/ld+json"]').innerText()
			);
			expect(article['@type']).toBe('Article');
			expect(article.author['@type']).toBe('Organization');
			expect(article.datePublished).toBe(document.publishedAt);
			expect(article.dateModified).toBe(document.modifiedAt);
			expect(
				await page.evaluate(() => window.document.documentElement.scrollWidth <= window.innerWidth)
			).toBe(true);
			await scanAccessibility(page, testInfo);
			await page.screenshot({
				path: testInfo.outputPath(`${document.id}-${width}.png`),
				fullPage: true
			});
		}
	});
}
test('legacy home and private pages keep a single, safe robots tag', async ({ page }) => {
	await page.goto('/?utm_source=synthetic');
	await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
		'href',
		'https://atuavidanosastros.com.br'
	);
	await expect(page.locator('meta[property="og:title"]')).toHaveCount(1);
	await expect(page.locator('meta[name="robots"]')).toHaveCount(1);
	await page.goto('/entrar');
	await expect(page.locator('meta[name="robots"]')).toHaveCount(1);
	await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,nofollow');
	await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
});
test('editorial shell remains legible on mobile without horizontal overflow', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/noticias');
	await page.getByRole('button', { name: 'Recusar opcionais', exact: true }).click();
	await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
		true
	);
	await page.screenshot({ path: '../../test-results/seo-noticias-mobile.png', fullPage: true });
	await page.setViewportSize({ width: 1440, height: 1000 });
	await page.screenshot({ path: '../../test-results/seo-noticias-desktop.png', fullPage: true });
});
