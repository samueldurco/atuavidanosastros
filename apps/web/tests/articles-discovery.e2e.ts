import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { interestNavigation } from '../src/lib/data/public-navigation';
import { editorialTopicPaths } from '../src/lib/data/editorial-topics';

for (const width of [390, 1440]) {
	test(`encontrar os 12 guias pelo menu, assunto e retorno em ${width}px`, async ({
		page,
		request
	}, testInfo) => {
		await page.setViewportSize({ width, height: 900 });
		await page.goto('/');
		const consent = page.getByRole('button', { name: 'Recusar opcionais' });
		if (await consent.isVisible()) await consent.click();
		await page.getByRole('button', { name: 'Menu', exact: true }).click();
		await page
			.getByRole('navigation', { name: 'Navegação principal' })
			.getByRole('link', { name: 'Revista ATVNA', exact: true })
			.click();
		await expect(page).toHaveURL(/\/caderno$/);
		await expect(page.locator('.published-guide')).toHaveCount(12);
		await page.screenshot({ path: testInfo.outputPath(`artigos-${width}.png`), fullPage: true });
		const accessibility = await new AxeBuilder({ page })
			.include('main')
			.withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
			.analyze();
		expect(accessibility.violations).toEqual([]);
		for (const item of interestNavigation) {
			await page
				.getByRole('navigation', { name: 'Assuntos dos artigos' })
				.getByRole('link', { name: item.label, exact: true })
				.click();
			await expect(page).toHaveURL(new RegExp(`/caderno\\?tema=${item.id}$`));
			await expect(page.getByRole('heading', { level: 1 })).toHaveText(
				`Revista ATVNA: ${item.label}`
			);
			const cards = page.locator('.published-guide');
			await expect(cards).toHaveCount(editorialTopicPaths[item.id].length);
			const destinations = await cards
				.locator('h3 a')
				.evaluateAll((links) => links.map((link) => link.getAttribute('href')));
			expect(destinations.sort()).toEqual([...editorialTopicPaths[item.id]].sort());
			for (const path of editorialTopicPaths[item.id])
				expect((await request.get(path)).status(), path).toBe(200);
			await cards.first().getByRole('link').click();
			const breadcrumb = page.getByRole('navigation', { name: 'Caminho do artigo' });
			await expect(breadcrumb.getByRole('link', { name: 'Artigos', exact: true })).toHaveAttribute(
				'href',
				'/caderno'
			);
			await breadcrumb.getByRole('link', { name: item.label, exact: true }).click();
			await expect(page).toHaveURL(new RegExp(`/caderno\\?tema=${item.id}$`));
			await page
				.getByRole('navigation', { name: 'Assuntos dos artigos' })
				.getByRole('link', { name: 'Todos os temas' })
				.click();
			await expect(page).toHaveURL(/\/caderno$/);
			await expect(page.locator('.published-guide')).toHaveCount(12);
		}
		expect(
			await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
		).toBeLessThanOrEqual(1);
	});
}

test('a lista completa e seus destinos estão no HTML servido, sem depender de JavaScript', async ({
	request
}) => {
	const response = await request.get('/caderno');
	expect(response.status()).toBe(200);
	const html = await response.text();
	for (const path of Object.values(editorialTopicPaths).flat())
		expect(html).toContain(`href="${path}"`);
	expect(html).toContain('CollectionPage');
	expect(html).toContain('ItemList');
});
