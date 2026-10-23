import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { interestNavigation } from '../src/lib/data/public-navigation';
import { expectedTopicPaths, publishedEditorial } from './fixtures/editorial-inventory';

test.beforeEach(async ({ page }) => {
	await page.addInitScript(() => localStorage.setItem('atv-analytics-consent', 'denied'));
});

for (const width of [390, 1440]) {
	test(`encontrar os conteúdos publicados pelo menu, assunto e retorno em ${width}px`, async ({
		page
	}, testInfo) => {
		await page.setViewportSize({ width, height: 900 });
		await page.goto('/');
		await page.getByRole('button', { name: 'Menu', exact: true }).click();
		await page
			.getByRole('navigation', { name: 'Navegação principal' })
			.locator('a[href="/revista"]')
			.click();
		await expect(page).toHaveURL(/\/revista$/);
		const articleCards = page.locator('main article.featured, main article.article-card');
		await expect(articleCards).toHaveCount(publishedEditorial.length);
		await page.screenshot({ path: testInfo.outputPath(`artigos-${width}.png`), fullPage: true });
		const accessibility = await new AxeBuilder({ page })
			.include('main')
			.withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
			.analyze();
		expect(accessibility.violations).toEqual([]);
		for (const item of interestNavigation) {
			await page
				.getByRole('navigation', { name: 'Assuntos da Revista' })
				.getByRole('link', { name: item.label, exact: true })
				.click();
			await expect(page).toHaveURL(new RegExp(`/revista\\?tema=${item.id}$`));
			await expect(page.getByRole('heading', { level: 1 })).toHaveText('Revista ATVNA');
			await expect(
				page.getByRole('heading', { level: 2, name: item.label, exact: true })
			).toBeVisible();
			await expect(
				page
					.getByRole('navigation', { name: 'Assuntos da Revista' })
					.getByRole('link', { name: item.label, exact: true })
			).toHaveAttribute('aria-current', 'page');
			const cards = articleCards;
			await expect(cards).toHaveCount(expectedTopicPaths[item.id].length);
			const destinations = await cards
				.locator('h3 a')
				.evaluateAll((links) => links.map((link) => link.getAttribute('href')));
			expect(destinations.sort()).toEqual([...expectedTopicPaths[item.id]].sort());
			await cards.first().getByRole('heading', { level: 3 }).getByRole('link').click();
			const breadcrumb = page.getByRole('navigation', { name: 'Caminho do artigo' });
			await expect(
				breadcrumb.getByRole('link', { name: 'Revista ATVNA', exact: true })
			).toHaveAttribute('href', '/revista');
			await breadcrumb.getByRole('link', { name: item.label, exact: true }).click();
			await expect(page).toHaveURL(new RegExp(`/revista\\?tema=${item.id}$`));
			await page
				.getByRole('navigation', { name: 'Assuntos da Revista' })
				.getByRole('link', { name: 'Todos os assuntos' })
				.click();
			await expect(page).toHaveURL(/\/revista$/);
			await expect(articleCards).toHaveCount(publishedEditorial.length);
		}
		expect(
			await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
		).toBeLessThanOrEqual(1);
	});
}

test('todos os destinos dos assuntos respondem sem repetir a prova por viewport', async ({
	request
}) => {
	test.setTimeout(120_000);
	const destinations = [
		...new Set(interestNavigation.flatMap((item) => expectedTopicPaths[item.id]))
	];
	let nextDestination = 0;
	await Promise.all(
		Array.from({ length: Math.min(3, destinations.length) }, async () => {
			while (nextDestination < destinations.length) {
				const path = destinations[nextDestination++];
				const response = await request.get(path, { timeout: 15_000 });
				try {
					expect(response.status(), path).toBe(200);
				} finally {
					await response.dispose();
				}
			}
		})
	);
});
test('a lista completa e seus destinos estão no HTML servido, sem depender de JavaScript', async ({
	request
}) => {
	const response = await request.get('/revista');
	expect(response.status()).toBe(200);
	const html = await response.text();
	for (const document of publishedEditorial) expect(html).toContain(`href="${document.path}"`);
	expect(html).toContain('CollectionPage');
	expect(html).toContain('ItemList');
});
