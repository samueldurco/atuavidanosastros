import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { productDefinitionFor, tarotMethods } from '@atv/domain';

const lastPositionChapters: Record<string, string> = {
	'tarot-situation-challenge-advice': 'Uma resposta que muda a dinâmica',
	'tarot-peladan-cross': 'O centro da cruz',
	'tarot-celtic-cross': 'Expectativa e continuidade não são a mesma coisa',
	'tarot-aphrodite-temple': 'Como a tensão pode ganhar outra forma',
	'tarot-astrological-mandala': 'A carta central articula as áreas'
};

for (const width of [390, 1440])
	for (const method of tarotMethods) {
		test(`${method.id}: complete positions and reader at ${width}px`, async ({ page }) => {
			await page.setViewportSize({ width, height: 900 });
			await page.goto(`/testar-produtos/_spec?product=${method.id}`);
			await expect(
				page.getByRole('heading', {
					name: productDefinitionFor(method.id)!.name,
					exact: true
				})
			).toBeVisible();
			const positions = page.getByRole('list', { name: 'Cartas e funções das posições' });
			await expect(positions.getByRole('button')).toHaveCount(method.positions.length);
			const last = positions.getByRole('button').last();
			await expect(last).toBeEnabled();
			const cardName = (await last.locator('strong').innerText()).split(' · ')[1];
			const lastChapter =
				method.id === 'tarot-single-card'
					? `1. Tema central — ${cardName}`
					: lastPositionChapters[method.id];
			await last.click();
			const chapter = page.getByRole('article', { name: 'Capítulo selecionado' });
			await expect(chapter.getByRole('heading')).toHaveText(lastChapter);
			await expect(chapter).toContainText(cardName);
			await expect(
				page
					.getByRole('navigation', { name: 'Capítulos da leitura' })
					.getByRole('button', { name: lastChapter, exact: true })
			).toHaveAttribute('aria-current', 'step');
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
