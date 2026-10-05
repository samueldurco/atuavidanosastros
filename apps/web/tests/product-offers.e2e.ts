import { expect, test } from '@playwright/test';
import { customerProducts } from '../src/lib/data/product-copy';

for (const product of customerProducts) {
	test(`public offer explains ${product.id} without opening a gated sale`, async ({
		page
	}, testInfo) => {
		await page.goto(product.href);
		await expect(
			page.getByRole('heading', { name: product.name, exact: true, level: 1 })
		).toBeVisible();
		await expect(page.locator('main')).toContainText(product.summary);
		await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
		await expect(page.locator('main form')).toHaveCount(0);
		if (product.id === 'birth-chart')
			await page.screenshot({
				path: testInfo.outputPath('mapa-astral-desktop.png'),
				fullPage: true
			});
		await expect(page.getByRole('button', { name: /Comprar|Pagar|Gerar agora/ })).toHaveCount(0);
		await expect(page.locator('main')).not.toContainText(
			/cartografia celeste|atlas editorial|Que direção pede/
		);
	});
}

test('Mapa Astral stays recognizable from homepage to its offer on mobile', async ({
	page
}, testInfo) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/');
	await page.getByRole('link', { name: 'Conhecer meu mapa astral', exact: true }).first().click();
	await expect(page).toHaveURL(/\/meu-ceu$/);
	await page.locator('a[href="/produtos/mapa-astral"]').first().click();
	await expect(page).toHaveURL(/\/produtos\/mapa-astral$/);
	await expect(
		page.getByRole('heading', { name: 'Mapa Astral', exact: true, level: 1 })
	).toBeVisible();
	await page.screenshot({ path: testInfo.outputPath('mapa-astral-mobile.png'), fullPage: true });
	const overflow = await page.evaluate(
		() => document.documentElement.scrollWidth > window.innerWidth
	);
	expect(overflow).toBe(false);
});
