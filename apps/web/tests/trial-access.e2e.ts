import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { offeredProductIds, productOffers } from '@atv/domain';
test('all 19 offered catalog pages open the free trial for an authorized account', async ({
	page
}) => {
	expect(productOffers).toHaveLength(19);
	for (const product of productOffers) {
		await page.goto(`/testar-produtos/_spec?view=catalog&product=${product.id}`);
		await expect(page.getByRole('heading', { name: 'Teste gratuito disponível' })).toBeVisible();
		await expect(page.getByRole('link', { name: /Testar .* grátis/ })).toHaveAttribute(
			'href',
			`/testar-produtos/${product.id}`
		);
		await expect(
			page.getByText('Esta leitura ainda não está disponível.', { exact: false })
		).toHaveCount(0);
	}
});
test('the authorized test index and library expose products, ATV+ and saved readings', async ({
	page
}) => {
	await page.goto('/testar-produtos/_spec?view=index');
	const offeredLinks = page.locator('.products').getByRole('link', { name: /^Testar / });
	await expect(offeredLinks).toHaveCount(19);
	expect(
		await offeredLinks.evaluateAll((links) => links.map((link) => link.getAttribute('href')).sort())
	).toEqual(offeredProductIds.map((id) => `/testar-produtos/${id}`).sort());
	const library = page.getByRole('region', { name: 'Suas leituras de teste' });
	await expect(library.getByRole('link', { name: 'Conhecer os planos do ATV+' })).toHaveAttribute(
		'href',
		'/atv-mais'
	);
	await expect(library.getByRole('link', { name: 'Leituras e anotações' })).toHaveAttribute(
		'href',
		'/testar-produtos/atv-plus'
	);
	await page.goto('/testar-produtos/_spec?view=library');
	const edition = page
		.getByRole('article')
		.filter({ has: page.getByRole('heading', { name: 'Bússola de Carreira' }) });
	await expect(edition.getByRole('link', { name: 'Continuar leitura' })).toHaveAttribute(
		'href',
		/\/testar-produtos\/leituras\//
	);
});
test('free catalog and saved reading navigation fit mobile and pass accessibility checks', async ({
	page
}) => {
	await page.setViewportSize({ width: 375, height: 812 });
	for (const view of ['catalog', 'library', 'index']) {
		await page.goto(`/testar-produtos/_spec?view=${view}&product=birth-chart`);
		expect(
			(await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
				.violations
		).toEqual([]);
		expect(
			await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
		).toBe(true);
		await page.screenshot({ path: `test-results/trial-access-${view}-mobile.png`, fullPage: true });
	}
});
