import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { launchProductDefinitions } from '@atv/domain';

const sections = ['/leituras', '/lancamentos', '/atv-mais'] as const;
const storeNavigation = (page: Page) =>
	page.getByRole('navigation', { name: 'Seções da loja de produtos digitais', exact: true });

async function expectWithinViewport(element: Locator) {
	await element.scrollIntoViewIfNeeded();
	await expect(element).toBeVisible();
	const bounds = await element.evaluate((node) => {
		const box = node.getBoundingClientRect();
		return { left: box.left, right: box.right, width: box.width, viewport: innerWidth };
	});
	expect(bounds.width).toBeGreaterThan(0);
	expect(bounds.left).toBeGreaterThanOrEqual(-1);
	expect(bounds.right).toBeLessThanOrEqual(bounds.viewport + 1);
}

async function expectIllustratedArtwork(artwork: Locator) {
	await expectWithinViewport(artwork);
	expect(
		await artwork.locator('svg, img').count(),
		'The product presentation contains an illustration'
	).toBeGreaterThan(0);
	for (const image of await artwork.locator('img').all()) {
		await image.scrollIntoViewIfNeeded();
		await expect
			.poll(() =>
				image.evaluate((node) => node.complete && node.naturalWidth > 0 && node.naturalHeight > 0)
			)
			.toBe(true);
	}
}

test.beforeEach(async ({ page }) => {
	await page.addInitScript(() => localStorage.setItem('atv-analytics-consent', 'denied'));
});

for (const width of [320, 768, 1440]) {
	test(`the three digital store sections remain connected and illustrated at ${width}px`, async ({
		page
	}, testInfo) => {
		test.setTimeout(120_000);
		await page.setViewportSize({ width, height: 1000 });
		const response = await page.goto(sections[0]);
		expect(response?.status()).toBe(200);
		for (const [index, path] of sections.entries()) {
			if (index) await storeNavigation(page).locator(`.store-section[href="${path}"]`).click();
			await expect(page).toHaveURL(new RegExp(`${path}$`));
			await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
			const navigation = storeNavigation(page);
			await expect(navigation).toHaveCount(1);
			await expect(navigation.locator('a[aria-current]')).toHaveCount(1);
			await expect(navigation.locator(`.store-section[href="${path}"]`)).toHaveAttribute(
				'aria-current',
				'page'
			);
			for (const destination of sections) {
				const link = navigation.locator(`.store-section[href="${destination}"]`);
				await expect(link).toHaveCount(1);
				await expectWithinViewport(link);
				await link.click({ trial: true });
			}
			if (path === '/leituras') {
				await expectIllustratedArtwork(
					page.locator('.public-product-card [data-product-artwork]').first()
				);
			} else if (path === '/lancamentos') {
				await expect(page.locator('[data-launch-product]')).toHaveCount(
					launchProductDefinitions.length
				);
				for (const product of launchProductDefinitions) {
					const card = page.locator(`[data-launch-product="${product.id}"]`);
					await expect(card.locator(`a[href="/produtos/${product.slug}"]`).first()).toBeAttached();
					await expectIllustratedArtwork(card.locator(`[data-product-artwork="${product.id}"]`));
				}
			} else {
				for (const mode of ['bundle', 'solar', 'inside']) {
					await expect(page.locator(`[data-atv-plus-art="${mode}"]`)).toHaveCount(1);
				}
				for (const mockup of await page.locator('[data-atv-plus-art]').all()) {
					await expectIllustratedArtwork(mockup);
				}
				const solar = page.locator('[data-atv-plus-art="solar"]');
				await expect(solar.locator('.imprint')).toHaveCSS('font-size', '7px');
				const imageHeight = await solar
					.locator('img')
					.evaluate((image) => image.getBoundingClientRect().height);
				expect(imageHeight).toBeGreaterThan(0);
				await testInfo.attach(`atv-plus-artwork-metrics-${width}`, {
					body: JSON.stringify({ imprintFontSize: '7px', solarImageHeight: imageHeight }),
					contentType: 'application/json'
				});
			}
			await expect
				.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
				.toBeLessThanOrEqual(1);
			await page.evaluate(() => document.fonts.ready);
			await page.screenshot({
				path: testInfo.outputPath(`${path.slice(1)}-${width}.png`),
				fullPage: true
			});
			if (path === '/atv-mais' && width === 320) {
				await page.evaluate(() => scrollTo(0, 0));
				await page.screenshot({ path: testInfo.outputPath('atv-mais-320-top.png') });
				await page.locator('[data-atv-plus-art="bundle"]').screenshot({
					path: testInfo.outputPath('atv-mais-320-hero-mockup.png')
				});
				await page.locator('.solar-art').screenshot({
					path: testInfo.outputPath('atv-mais-320-solar-mockup.png')
				});
			}
			if (width === 320) {
				const audit = await new AxeBuilder({ page })
					.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
					.analyze();
				await testInfo.attach(`axe-${path.slice(1)}`, {
					body: JSON.stringify(audit, null, 2),
					contentType: 'application/json'
				});
				expect(audit.violations).toEqual([]);
			}
		}
		await storeNavigation(page).locator('.store-section[href="/leituras"]').click();
		await expect(page).toHaveURL(/\/leituras$/);
		await expect(storeNavigation(page).locator('a[aria-current="page"]')).toHaveAttribute(
			'href',
			'/leituras'
		);
	});
}

test('launch search keeps the selected product and restores the full collection', async ({
	page
}) => {
	await page.setViewportSize({ width: 390, height: 900 });
	await page.goto('/lancamentos');
	const product = launchProductDefinitions[0];
	const cards = page.locator('[data-launch-product]');
	await expect(cards).toHaveCount(launchProductDefinitions.length);
	const search = page.locator('#launch-search');
	await search.fill(product.name);
	await expect(cards).toHaveCount(1);
	await expect(cards).toHaveAttribute('data-launch-product', product.id);
	await cards.locator(`a[href="/produtos/${product.slug}"]`).first().click();
	await expect(page).toHaveURL(new RegExp(`/produtos/${product.slug}$`));
	await expect(page.getByRole('heading', { level: 1 })).toHaveText(product.name);
	await page.goBack();
	await expect(page).toHaveURL(/\/lancamentos/);
	await search.fill('');
	await expect(cards).toHaveCount(launchProductDefinitions.length);
	await expect(page.locator('#launch-results-count')).toHaveAttribute('aria-live', 'polite');
});

test('launch phase and theme filters narrow the real collection without losing the other sections', async ({
	page
}) => {
	await page.setViewportSize({ width: 390, height: 900 });
	await page.goto('/lancamentos');
	const cards = page.locator('[data-launch-product]');
	const phases = page.getByRole('group', { name: 'Fase dos lançamentos', exact: true });
	const debut = phases.getByRole('button', { name: /^As três primeiras\b/ });
	await debut.click();
	await expect(debut).toHaveAttribute('aria-pressed', 'true');
	await expect(cards).toHaveCount(3);
	await phases.getByRole('button', { name: /^Todos\b/ }).click();
	await expect(cards).toHaveCount(launchProductDefinitions.length);
	const universe = launchProductDefinitions[0].universe;
	await page.locator('#launch-universe').selectOption(universe);
	const matching = launchProductDefinitions.filter((product) => product.universe === universe);
	await expect(cards).toHaveCount(matching.length);
	expect(
		await cards.evaluateAll((elements) =>
			elements.map((element) => element.getAttribute('data-launch-product'))
		)
	).toEqual(expect.arrayContaining(matching.map((product) => product.id)));
	await page.locator('#launch-universe').selectOption('all');
	await page.locator('#launch-search').fill('produto não cadastrado na coleção');
	await expect(cards).toHaveCount(0);
	await page.locator('#launch-search').fill('');
	await expect(cards).toHaveCount(launchProductDefinitions.length);
	await expect(storeNavigation(page).locator('.store-section')).toHaveCount(sections.length);
});
