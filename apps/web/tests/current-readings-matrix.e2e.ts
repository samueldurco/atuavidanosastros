import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { offeredProductIds } from '../../../packages/domain/src/catalog';
import { offerNames20261015 } from '../src/lib/trials/offer-names';

// This route calculates and approves a fresh synthetic delivery. Saved editions have separate tests.
// Keep visual evidence outside the checkout, including when run without an explicit destination.
const evidence = process.env.ATV_E2E_EVIDENCE_DIR ?? join(tmpdir(), 'atvna-current-readings');

test.beforeAll(async () => {
	await mkdir(evidence, { recursive: true });
});

for (const width of [390, 1440]) {
	for (const productId of offeredProductIds) {
		test(`Edição atual: ${productId}, capítulos, acesso e apresentação em ${width}px`, async ({
			page
		}, testInfo) => {
			test.setTimeout(120_000);
			const errors: string[] = [];
			page.on('pageerror', (error) => errors.push(error.message));
			await page.setViewportSize({ width, height: 900 });
			const response = await page.goto(`/testar-produtos/_spec?product=${productId}`);
			expect(response?.status()).toBe(200);
			expect(response?.headers()['cache-control']).toContain('no-store');
			expect(response?.headers()['x-robots-tag']).toContain('noindex');
			await page.getByRole('button', { name: 'Recusar opcionais', exact: true }).click();
			await expect(
				page.getByRole('heading', { name: offerNames20261015[productId], exact: true })
			).toBeVisible();
			const intro = page.locator('.page-intro');
			const titleBox = await intro.getByRole('heading', { level: 1 }).boundingBox();
			expect(titleBox).not.toBeNull();
			for (const artwork of await intro.locator('img').all()) {
				await expect(artwork).toBeVisible();
				const artworkBox = await artwork.boundingBox();
				expect(artworkBox).not.toBeNull();
				if (titleBox && artworkBox) {
					expect(
						artworkBox.x + artworkBox.width <= titleBox.x ||
							titleBox.x + titleBox.width <= artworkBox.x ||
							artworkBox.y + artworkBox.height <= titleBox.y ||
							titleBox.y + titleBox.height <= artworkBox.y
					).toBe(true);
				}
			}
			await intro.screenshot({ path: join(evidence, `${productId}-${width}-intro.png`) });
			await expect(page.getByText('Há uma nova edição desta leitura', { exact: true })).toHaveCount(
				0
			);
			const navigation = page.getByRole('navigation', { name: 'Capítulos da leitura' });
			const article = page.getByRole('article', { name: 'Capítulo selecionado' });
			const buttons = navigation.getByRole('button');
			const titles = (await buttons.allTextContents()).map((title) => title.trim());
			expect(titles.length).toBeGreaterThan(0);
			expect(new Set(titles).size).toBe(titles.length);
			expect(titles).not.toContain('Referências desta leitura');
			for (const [index, button] of (await buttons.all()).entries()) {
				await button.focus();
				await expect(button).toBeFocused();
				await page.keyboard.press('Enter');
				await expect(button).toHaveAttribute('aria-current', 'step');
				await expect(article.getByRole('heading')).toHaveText(titles[index]);
				await expect(article.locator('.prose').first()).not.toBeEmpty();
				expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
					true
				);
				await article.screenshot({
					path: join(
						evidence,
						`${productId}-${width}-chapter-${String(index + 1).padStart(2, '0')}.png`
					)
				});
			}
			await buttons.first().click();
			expect(
				await page.evaluate(() => (window as Window & { pwned?: boolean }).pwned)
			).toBeUndefined();
			expect(errors).toEqual([]);
			const accessibility = await new AxeBuilder({ page })
				.withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
				.analyze();
			expect(accessibility.violations).toEqual([]);
			const screenshot = join(evidence, `${productId}-${width}-reader.png`);
			await page.screenshot({ path: screenshot, fullPage: true });
			await testInfo.attach(`${productId}-${width}`, {
				path: screenshot,
				contentType: 'image/png'
			});
		});
	}
}
