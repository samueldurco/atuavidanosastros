import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { interestNavigation } from '../src/lib/data/public-navigation';
import { datedForecasts, expectedTopicPaths } from './fixtures/editorial-inventory';

test.beforeEach(async ({ page }) => {
	await page.addInitScript(() => localStorage.setItem('atv-analytics-consent', 'denied'));
});

for (const width of [390, 1440]) {
	test(`encontrar a capa, o acervo e os guias em ${width}px`, async ({ page }, testInfo) => {
		await page.setViewportSize({ width, height: 900 });
		await page.goto('/');
		if (width <= 960) await page.locator('.mobile-menu').click();
		await page.locator('.nav-trigger[aria-controls="nav-revista"]').click();
		await page.locator('#nav-revista a[href="/revista"]').click();
		await expect(page).toHaveURL(/\/revista$/);
		await expect(page.locator('#em-destaque article')).toHaveCount(3);
		await expect(page.locator('#acervo .article-card')).toHaveCount(9);
		await expect(page.locator('#horoscopo-da-semana a[href*="?period=weekly"]')).toHaveCount(12);
		await expect(page.getByRole('searchbox', { name: 'Buscar na Revista' })).toHaveCount(1);
		const accessibility = await new AxeBuilder({ page })
			.include('main')
			.withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
			.analyze();
		expect(accessibility.violations).toEqual([]);
		expect(
			await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
		).toBeLessThanOrEqual(1);
		await page.screenshot({ path: testInfo.outputPath(`revista-${width}.png`), fullPage: true });

		for (const item of interestNavigation) {
			await page
				.locator('#guias-e-artigos')
				.getByRole('link', { name: item.label, exact: true })
				.click();
			await expect(page).toHaveURL(new RegExp(`/revista\\?tema=${item.id}#acervo$`));
			await expect(
				page.getByRole('heading', { level: 2, name: item.label, exact: true })
			).toBeVisible();
			const cards = page.locator('#acervo .article-card h3 a');
			const paths = expectedTopicPaths[item.id].filter(
				(path) => !datedForecasts.some((forecast) => forecast.path === path)
			);
			await expect(cards).toHaveCount(Math.min(9, paths.length));
			for (const link of await cards.all())
				expect(paths).toContain(await link.getAttribute('href'));
			await cards.first().click();
			const breadcrumb = page.getByRole('navigation', { name: 'Caminho do artigo' });
			await expect(
				breadcrumb.getByRole('link', { name: 'Revista ATVNA', exact: true })
			).toHaveAttribute('href', '/revista');
			await expect(page.getByRole('region', { name: 'Boletim ATVNA' })).toBeVisible();
			await breadcrumb.getByRole('link', { name: item.label, exact: true }).click();
			await page.getByRole('link', { name: 'Voltar à capa' }).click();
			await expect(page).toHaveURL(/\/revista$/);
		}
	});
}

test('o acervo tem páginas rastreáveis e a busca encontra títulos e signos sem acentos', async ({
	page,
	request
}) => {
	await page.goto('/revista?tema=desconhecido');
	await expect(page.getByRole('heading', { name: 'Em destaque', exact: true })).toBeVisible();
	await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
		'href',
		'https://atuavidanosastros.com.br/revista'
	);
	const cards = page.locator('#acervo .article-card');
	const titles = await cards.locator('h3, summary').allTextContents();
	await page.getByRole('link', { name: 'Página 2', exact: true }).click();
	await expect(page).toHaveURL(/\/revista\?pagina=2#acervo$/);
	await expect(page.locator('#em-destaque')).toHaveCount(0);
	await expect(page.getByRole('link', { name: 'Página 2', exact: true })).toHaveAttribute(
		'aria-current',
		'page'
	);
	for (const title of await cards.locator('h3, summary').allTextContents())
		expect(titles).not.toContain(title);
	await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
		'href',
		'https://atuavidanosastros.com.br/revista?pagina=2'
	);
	const search = page.getByRole('searchbox', { name: 'Buscar na Revista' });
	await search.fill('retrogrado mercurio');
	await page.getByRole('button', { name: 'Buscar', exact: true }).click();
	await expect(page.getByRole('heading', { name: 'Resultados da busca' })).toBeVisible();
	await expect(cards.locator('a[href="/mercurio-retrogrado"]')).toBeVisible();
	await search.fill('horoscopo de aries');
	await search.press('Enter');
	await expect(cards.locator('a[href^="/horoscopo/aries/"]').first()).toBeVisible();
	expect((await request.get('/revista?pagina=99999')).status()).toBe(404);
});

test('os destinos do acervo ficam acessíveis no HTML das páginas', async ({ request }) => {
	const seen = new Set<string>();
	let url: string | undefined = '/revista';
	while (url) {
		const response = await request.get(url);
		expect(response.status()).toBe(200);
		const html = await response.text();
		expect(html).toContain('CollectionPage');
		expect(html).toContain('ItemList');
		for (const match of html.matchAll(/href="([^"]+)"/g)) seen.add(match[1]);
		const next = html.match(/href="([^"]+)" rel="next"/)?.[1];
		await response.dispose();
		url = next?.split('#')[0];
	}
	for (const path of Object.values(expectedTopicPaths).flat()) expect(seen).toContain(path);
});

test('o boletim grava somente inscrições com consentimento e tolera cadastro repetido', async ({
	page,
	request,
	baseURL
}) => {
	const reply = await request.post('/revista?/boletim', {
		headers: { origin: baseURL! },
		form: { email: 'sem-consentimento@example.com' }
	});
	expect(reply.status()).toBe(400);
	await page.goto('/revista#boletim');
	const form = page.getByRole('region', { name: 'Boletim ATVNA' });
	for (const email of ['Revista-Teste@example.com', 'revista-teste@example.com']) {
		await form.getByRole('textbox', { name: 'Seu e-mail' }).fill(email);
		await form.getByRole('checkbox').check();
		await form.getByRole('button', { name: 'Inscrever-se' }).click();
		await expect(form.getByRole('status')).toContainText('Cadastro recebido');
	}
});
