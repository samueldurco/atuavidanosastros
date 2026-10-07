import { expect, test } from '@playwright/test';
import { productCatalog } from '@atv/domain';
import { scanAccessibility } from './fixtures/accessibility';

const surfaces = [
	'/',
	'/leituras',
	'/meu-ceu',
	'/ciclos',
	'/amor',
	'/proposito',
	'/tarot',
	'/sonhos',
	'/produtos/bussola-de-carreira',
	'/bussola-de-carreira',
	'/entrar',
	'/privacidade',
	'/biblioteca/_spec/fluxo?state=ready&product=career-compass'
];

for (const width of [320, 390, 768, 1024, 1440]) {
	test(`V3: reflow and delivered artwork at ${width}px`, async ({ page }, testInfo) => {
		await page.setViewportSize({ width, height: 1000 });
		for (const path of surfaces) {
			const response = await page.goto(path);
			expect(response?.status(), path).toBe(200);
			await page.evaluate(() => document.fonts.ready);
			await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
			await expect
				.poll(
					() =>
						page.evaluate(() =>
							[...document.querySelectorAll<HTMLImageElement>('img[src*="/brand/v3/"]')]
								.filter(
									(image) =>
										image.loading !== 'lazy' || image.getBoundingClientRect().top < innerHeight
								)
								.every((image) => image.complete && image.naturalWidth > 0)
						),
					{ message: path }
				)
				.toBe(true);
			expect(
				await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
				path
			).toBe(true);
			if (path === '/' || path === '/produtos/bussola-de-carreira') {
				await page.evaluate(async () => {
					for (const image of document.querySelectorAll<HTMLImageElement>('img[loading="lazy"]')) {
						image.loading = 'eager';
						await image.decode().catch(() => {});
					}
				});
				await page.screenshot({
					path: testInfo.outputPath(`${path === '/' ? 'home' : 'career'}-${width}.png`),
					fullPage: true
				});
			}
		}
	});
}

test('V3: every catalog product retains its real route and accessible title', async ({ page }) => {
	for (const product of productCatalog) {
		const response = await page.goto(`/produtos/${product.slug}`);
		expect(response?.status(), product.id).toBe(200);
		await expect(page.getByRole('heading', { level: 1 })).toHaveText(product.name);
		await expect(page.locator('.v3-experience')).toHaveAttribute('data-v3-theme', /^B0[1-6]$/);
	}
});

test('V3: artwork failure preserves titles, long text and controls at 200% zoom', async ({
	page
}, testInfo) => {
	await page.route('**/brand/v3/**', (route) => route.abort());
	await page.setViewportSize({ width: 1440, height: 1000 });
	await page.goto('/produtos/bussola-de-carreira');
	await page.evaluate(() => {
		document.documentElement.style.zoom = '2';
	});
	const heading = page.getByRole('heading', { level: 1 });
	await expect(heading).toHaveText('Bússola de Carreira');
	await expect(heading.locator('span')).toHaveCSS('opacity', '1');
	await heading.locator('span').evaluate((element) => {
		element.textContent =
			'Bússola de Carreira: possibilidades profissionais, escolhas e próximos passos com tempo para refletir';
	});
	await expect(heading.locator('span')).toBeVisible();
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
		true
	);
	await scanAccessibility(page, testInfo);
});

for (const theme of ['meu-ceu', 'ciclos', 'amor', 'proposito', 'tarot', 'sonhos']) {
	test(`V3: themed contrast and semantics for ${theme}`, async ({ page }, testInfo) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto(`/${theme}`);
		await scanAccessibility(page, testInfo);
	});
}
