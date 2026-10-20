import { expect, test } from '@playwright/test';
import { freeTools } from '../src/lib/data/free-tools';
import { publicEditorialAuthor } from '../src/lib/data/editorial-author';
import { scanAccessibility } from './fixtures/accessibility';
import {
	bundledEditorial,
	datedForecasts,
	publishedEditorial
} from './fixtures/editorial-inventory';

const news = publishedEditorial.filter((document) => document.path.startsWith('/noticias/'));
const today = new Date().toISOString().slice(0, 10);
const dailyHistory = datedForecasts.filter(
	(document) =>
		document.path.includes('/daily/') &&
		document.path.split('/').at(-1)?.startsWith(today.slice(0, 4))
);
const expectedFreeToolPaths = [
	'/ferramentas/ascendente',
	'/ferramentas/mapa-astral',
	'/ferramentas/horoscopo',
	'/ferramentas/combinacao-do-casal',
	'/ferramentas/meio-do-ceu',
	'/ferramentas/dinheiro-no-mapa',
	'/ferramentas/carta-do-dia',
	'/ferramentas/carta-do-amor',
	'/ferramentas/registro-de-sonho'
];

test('the purpose landing keeps its existing URL and one canonical without a redirect', async ({
	request
}) => {
	for (const method of ['GET', 'HEAD']) {
		const response = await request.fetch('/mapa-de-proposito?origem=qa', {
			method,
			maxRedirects: 0
		});
		expect(response.status()).toBe(200);
		expect(response.headers()['location']).toBeUndefined();
		if (method === 'GET') {
			const html = await response.text();
			expect(html.match(/rel="canonical"/g)).toHaveLength(1);
			expect(html).toContain('href="https://atuavidanosastros.com.br/mapa-de-proposito"');
			expect(html).toContain('Mapa de Carreira');
		}
	}
});

test('editorial hubs reflect admitted content with one canonical', async ({ page, request }) => {
	for (const path of ['/noticias', '/signos', '/horoscopo', '/compatibilidade']) {
		const response = await request.get(path, { headers: { accept: 'text/html' } });
		expect(response.status()).toBe(200);
		const html = await response.text();
		if (path === '/noticias' && news.length > 0) {
			for (const document of news) expect(html).toContain(document.title);
		} else if (path === '/horoscopo') {
			expect(html).toContain('Horóscopo dos 12 signos');
			if (dailyHistory.length)
				for (const document of dailyHistory) expect(html).toContain(`href="${document.path}"`);
			else expect(html).toContain('Ainda não há leituras publicadas para este período e ano.');
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
		'/horoscopo/aries/daily/1900-01-01',
		'/compatibilidade/aries-touro',
		'/compatibilidade/touro-aries',
		'/noticias/2026/10/nao-publicado',
		'/pessoas/autor-sintetico',
		...(!publishedEditorial.some((document) => document.path === '/mercurio-retrogrado')
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
test('sign horoscope indexes show only admitted current readings and history', async ({ page }) => {
	await page.goto('/horoscopo/aries');
	await expect(page.locator('h1')).toHaveText('Horóscopo de Áries');
	const current = datedForecasts.find(
		(document) =>
			document.path.startsWith('/horoscopo/aries/daily/') &&
			document.path.split('/').at(-1)! <= today &&
			today < document.calculation!.coverageEnd.slice(0, 10)
	);
	if (current) {
		await expect(
			page.getByRole('heading', { level: 2, name: current.title, exact: true })
		).toBeVisible();
		await expect(
			page.getByRole('link', { name: 'Ler o horóscopo completo', exact: true })
		).toHaveAttribute('href', current.path);
	} else {
		await expect(
			page.getByRole('heading', { name: 'A leitura deste período ainda não foi publicada' })
		).toBeVisible();
	}
	const history = dailyHistory.filter((document) => document.path.startsWith('/horoscopo/aries/'));
	await expect(page.locator('.history-list h3 a')).toHaveCount(history.length);
	for (const document of history)
		await expect(page.locator(`.history-list a[href="${document.path}"]`)).toBeVisible();
	await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
	await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
		'href',
		'https://atuavidanosastros.com.br/horoscopo/aries'
	);
	await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
	await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0);
	await page.goto('/horoscopo/aries?year=1900');
	await expect(
		page.getByText('Ainda não há leituras publicadas para este período e ano.', { exact: true })
	).toBeVisible();
});
test('all nine free tools emit one primary metadata set in SSR and the browser', async ({
	page,
	request
}) => {
	expect(freeTools.map((tool) => tool.href).sort()).toEqual([...expectedFreeToolPaths].sort());
	for (const [legacyPath, canonicalPath] of [
		['/bussola-de-carreira', '/ferramentas/meio-do-ceu'],
		['/ferramentas/tarot-sim-ou-nao', '/ferramentas/carta-do-amor']
	]) {
		const response = await request.get(legacyPath, { maxRedirects: 0 });
		expect(response.status(), legacyPath).toBe(308);
		expect(response.headers()['location'], legacyPath).toBe(canonicalPath);
	}
	for (const tool of freeTools) {
		const response = await request.get(tool.href, { headers: { accept: 'text/html' } });
		expect(response.status(), tool.href).toBe(200);
		const head = (await response.text()).match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1];
		expect(head, tool.href).toBeDefined();
		expect(head?.match(/<title\b/gi), tool.href).toHaveLength(1);
		expect(head?.match(/<link\b[^>]*\brel=["']canonical["']/gi), tool.href).toHaveLength(1);
		expect(head?.match(/<meta\b[^>]*\bname=["']description["']/gi), tool.href).toHaveLength(1);
		await page.goto(tool.href);
		await expect(page.locator('head > title')).toHaveCount(1);
		await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
		await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
			'href',
			`https://atuavidanosastros.com.br${tool.href}`
		);
		await expect(page.locator('meta[name="description"]')).toHaveCount(1);
		await expect(page.locator('meta[name="description"]')).toHaveAttribute(
			'content',
			tool.description
		);
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
		if (path === '/sitemap-pages.xml') {
			const expectedPaths = [
				'',
				'/temas',
				'/temas/mapa-astral',
				'/temas/previsoes',
				'/temas/amor',
				'/temas/carreira',
				'/temas/tarot',
				'/temas/sonhos',
				'/ferramentas',
				...expectedFreeToolPaths,
				'/revista',
				'/meio-do-ceu',
				'/mapa-de-proposito',
				'/vocacao-no-mapa-astral',
				'/carreira-no-mapa-astral',
				'/casa-10',
				'/loja',
				'/leituras',
				'/atv-mais',
				'/canais-oficiais',
				'/fale-conosco',
				...(news.length > 0 ? ['/noticias'] : []),
				...(datedForecasts.length ? ['/horoscopo'] : []),
				...new Set(datedForecasts.map((document) => document.path.split('/').slice(0, 3).join('/')))
			];
			const locations = [...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
			expect(locations.sort()).toEqual(
				expectedPaths.map((path) => `https://atuavidanosastros.com.br${path}`).sort()
			);
		} else if (path === '/sitemap-editorial.xml') {
			const authorIds = new Set(
				publishedEditorial.map((document) => publicEditorialAuthor(document.author).id)
			);
			expect(body.match(/<url>/g) ?? []).toHaveLength(publishedEditorial.length + authorIds.size);
			for (const document of publishedEditorial) expect(body).toContain(document.path);
			for (const id of authorIds) expect(body).toContain(`/pessoas/${id}`);
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
		for (const document of bundledEditorial) {
			// Axe and screenshots can outlive the local server's idle keep-alive window.
			const response = await request.get(document.path, {
				headers: { Connection: 'close' }
			});
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
