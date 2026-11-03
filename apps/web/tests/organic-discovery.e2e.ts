import { expect, test } from '@playwright/test';
import { datedForecasts } from './fixtures/editorial-inventory';

const origin = 'https://atuavidanosastros.com.br';

for (const path of ['/canais-oficiais', '/fale-conosco']) {
	test(`${path} tem uma única URL canônica`, async ({ page }) => {
		expect((await page.goto(path))?.status()).toBe(200);
		const canonical = page.locator('head link[rel="canonical"]');
		await expect(canonical).toHaveCount(1);
		await expect(canonical).toHaveAttribute('href', origin + path);
	});
}

for (const path of ['/horoscopo', '/ferramentas/horoscopo']) {
	test(`${path} identifica o horóscopo com um único H1`, async ({ page }) => {
		expect((await page.goto(path))?.status()).toBe(200);
		const heading = page.getByRole('heading', { level: 1 });
		await expect(heading).toHaveCount(1);
		await expect(heading).toContainText(/horóscopo/i);
	});
}

test('a tabela de signos liga leituras reais e identifica as ferramentas para mensuração com consentimento', async ({
	page,
	request
}) => {
	expect((await page.goto('/signos'))?.status()).toBe(200);
	await expect(page.locator('head link[rel="canonical"]')).toHaveAttribute(
		'href',
		origin + '/signos'
	);
	await expect(page.locator('head meta[name="robots"]')).toHaveAttribute(
		'content',
		'noindex, nofollow'
	);
	const rows = page.getByRole('table', { name: /signos em ordem zodiacal/i }).locator('tbody tr');
	await expect(rows).toHaveCount(12);
	await expect(rows.first().locator('th[scope="row"]')).toHaveText('Áries');
	await expect(rows.first()).toContainText('21 mar – 19 abr');
	await expect(rows.first()).toContainText('Fogo');
	await expect(rows.last().locator('th[scope="row"]')).toHaveText('Peixes');
	const readings = await rows
		.locator('a')
		.evaluateAll((links) => links.map((link) => link.getAttribute('href')!));
	expect(readings.length).toBeGreaterThan(0);
	for (const path of new Set(readings)) {
		expect(path).toMatch(/^\/(signos|horoscopo)\/[a-z-]+(?:\/|$)/);
		expect((await request.get(path, { maxRedirects: 0 })).status(), path).toBe(200);
	}
	for (const tool of ['mapa-astral', 'ascendente']) {
		const cta = page.locator(`a[data-atv-tool="${tool}"]`);
		await expect(cta).toHaveAttribute('href', '/ferramentas/' + tool);
		await expect(cta).toHaveAttribute('data-atv-event', 'tool_select');
		await expect(cta).toHaveAttribute('data-atv-universe', 'meu-ceu');
		await expect(cta).toHaveAttribute('data-atv-context', 'universe');
	}
	const sitemap = await request.get('/sitemap-pages.xml');
	expect(sitemap.status()).toBe(200);
	expect(await sitemap.text()).toContain('<loc>' + origin + '/signos</loc>');
});

test('a pesquisa livre da revista informa noindex e omite canonical', async ({ page }) => {
	expect((await page.goto('/revista?q=tarot'))?.status()).toBe(200);
	await expect(page.locator('head meta[name="robots"]')).toHaveAttribute('content', /\bnoindex\b/);
	await expect(page.locator('head link[rel="canonical"]')).toHaveCount(0);
});

test('os dois perfis editoriais e duas edições do mesmo horóscopo têm títulos distintos', async ({
	page
}) => {
	const authors = [
		['/pessoas/atvna', 'Guias e artigos'],
		['/pessoas/atvna-horoscopo-automatizado', 'Horóscopos por signo']
	];
	for (const [path, label] of authors) {
		expect((await page.goto(path))?.status(), path).toBe(200);
		expect(await page.title()).toContain(label);
	}
	const groups = new Map<string, string[]>();
	for (const { path } of datedForecasts) {
		if (!/^\/horoscopo\/[^/]+\/[^/]+\/\d{4}-\d{2}-\d{2}$/.test(path)) continue;
		const key = path.slice(0, path.lastIndexOf('/'));
		groups.set(key, [...(groups.get(key) ?? []), path]);
	}
	const editions = Array.from(groups.values()).find((paths) => paths.length >= 2);
	expect(editions, 'duas edições publicadas para o mesmo signo e período').toBeDefined();
	const titles = new Set<string>();
	for (const path of editions!.slice(0, 2)) {
		expect((await page.goto(path))?.status(), path).toBe(200);
		const title = await page.title();
		expect(title).toContain(path.split('/').at(-1)!.split('-').reverse().join('/'));
		titles.add(title);
	}
	expect(titles.size).toBe(2);
});

test('a home conecta WebSite e Organization e o preload respeita a largura da tela', async ({
	page
}) => {
	for (const [path, hero] of [
		['/', 'home'],
		['/temas/tarot', 'tarot']
	]) {
		expect((await page.goto(path))?.status(), path).toBe(200);
		const href = `/brand/mvp/assets/universos/fundo-${hero}.webp`;
		const preload = page.locator(`head link[rel="preload"][as="image"][href="${href}"]`);
		await expect(preload).toHaveCount(1);
		await expect(preload).toHaveAttribute('fetchpriority', 'high');
		await expect(preload).toHaveAttribute('media', '(min-width: 681px)');
		const section = page.locator(path === '/' ? '.approved-hero .hero-art' : '.universe-hero');
		await expect(section).toHaveCSS('background-image', new RegExp('fundo-' + hero + '\\.webp'));
		if (path === '/') {
			const graph = (
				await page.locator('head script[type="application/ld+json"]').allTextContents()
			).flatMap((value) => JSON.parse(value)['@graph'] ?? []);
			const website = graph.find((node) => node['@type'] === 'WebSite');
			const organization = graph.find((node) => node['@type'] === 'Organization');
			expect(website?.url).toBe(origin);
			expect(organization?.['@id']).toBeTruthy();
			expect(website.publisher['@id']).toBe(organization['@id']);
		}
	}
});

for (const width of [390, 680, 681, 1440]) {
	test(`as imagens da home e do Tarot são baixadas uma única vez em ${width}px`, async ({
		page
	}) => {
		await page.setViewportSize({ width, height: 844 });
		for (const [path, theme] of [
			['/', 'home'],
			['/temas/tarot', 'tarot']
		]) {
			await page.goto(path!);
			const file = `/brand/mvp/assets/universos/fundo-${theme}.webp`;
			await expect
				.poll(() =>
					page.evaluate(
						(file) =>
							performance
								.getEntriesByName(new URL(file, location.href).href)
								.map((entry) => (entry as PerformanceResourceTiming).initiatorType),
						file
					)
				)
				.toEqual([width <= 680 ? 'css' : 'link']);
		}
	});
}
