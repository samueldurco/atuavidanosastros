import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('test index exposes all private entries without claiming a released reading', async ({
	page
}) => {
	const response = await page.goto('/testar-produtos');
	expect(response?.status()).toBe(200);
	expect(response?.headers()['x-robots-tag']).toBe('noindex, nofollow');
	await expect(page.getByRole('heading', { name: 'Teste os produtos' })).toBeVisible();
	const links = page.locator('a[href^="/biblioteca/nova/"]');
	await expect(links).toHaveCount(25);
	const targets = await links.evaluateAll((nodes) =>
		nodes.map((node) => node.getAttribute('href'))
	);
	expect(new Set(targets).size).toBe(25);
	await expect(
		page.getByText('Os pedidos de novas leituras continuam bloqueados', { exact: false })
	).toBeVisible();
	await expect(page.getByRole('link', { name: 'Calcular meu Meio do Céu' })).toHaveAttribute(
		'href',
		'/bussola-de-carreira'
	);
	await expect(
		page.getByText('A assinatura não está disponível para teste ou compra.', { exact: false })
	).toBeVisible();
	await links.filter({ hasText: 'Sol, Lua e Ascendente' }).click();
	await expect(page).toHaveURL(
		(url) =>
			url.pathname === '/entrar' &&
			url.searchParams.get('next') === '/biblioteca/nova/three-pillars'
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
