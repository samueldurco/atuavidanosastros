import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { tarotMethods } from '@atv/domain';

for (const width of [390, 1440])
	for (const method of tarotMethods) {
		test(`${method.id}: complete positions and reader at ${width}px`, async ({ page }) => {
			await page.setViewportSize({ width, height: 900 });
			await page.goto(`/testar-produtos/_spec?product=${method.id}`);
			await expect(page.getByRole('heading', { name: method.name, exact: true })).toBeVisible();
			const positions = page.getByRole('list', { name: 'Cartas e funções das posições' });
			await expect(positions.getByRole('button')).toHaveCount(method.positions.length);
			const last = positions.getByRole('button').last();
			await expect(last).toBeEnabled();
			await last.click();
			await expect(page.locator('article h2').first()).toContainText(
				`${method.positions.length}. ${method.positions.at(-1)!.name}`
			);
			await expect(
				page.getByRole('navigation', { name: 'Outros métodos de Tarot' }).getByRole('link')
			).toHaveCount(method.related.length);
			expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
				true
			);
			expect(
				(await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
					.violations
			).toEqual([]);
			await page.screenshot({
				path: `test-results/reconstruction-${method.id}-${width}.png`,
				fullPage: true
			});
		});
	}
