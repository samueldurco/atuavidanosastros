import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { offeredProductIds } from '@atv/domain';

test('test index preserves all private login return paths', async ({ page }) => {
	const response = await page.goto('/testar-produtos');
	expect(response?.status()).toBe(200);
	expect(response?.headers()['x-robots-tag']).toBe('noindex, nofollow');
	await expect(page.getByRole('heading', { name: 'Teste os produtos' })).toBeVisible();
	const links = page.locator('.products a[href^="/testar-produtos/"]');
	await expect(links).toHaveCount(19);
	const targets = await links.evaluateAll((nodes) =>
		nodes.map((node) => node.getAttribute('href'))
	);
	expect(targets.sort()).toEqual(offeredProductIds.map((id) => `/testar-produtos/${id}`).sort());
	await expect(
		page.getByRole('heading', { name: 'Entre para acessar seus testes gratuitos' })
	).toBeVisible();
	await expect(page.getByRole('link', { name: 'Explorar os planos do ATV+' })).toHaveAttribute(
		'href',
		'/atv-mais'
	);
	await links.filter({ hasText: 'Sol, Lua e Ascendente' }).click();
	await expect(page).toHaveURL(
		(url) =>
			url.pathname === '/entrar' &&
			url.searchParams.get('next') === '/testar-produtos/three-pillars'
	);
});

test('test index is accessible and fits a narrow viewport', async ({ page }) => {
	await page.setViewportSize({ width: 375, height: 812 });
	await page.goto('/testar-produtos');
	expect(
		(await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
			.violations
	).toEqual([]);
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
		true
	);
	await page.screenshot({ path: 'test-results/product-test-index-mobile.png', fullPage: true });
});
