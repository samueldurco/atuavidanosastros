import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { productDefinitionFor, tarotMethods } from '@atv/domain';

const lastPositionChapters: Record<string, string> = {
	'tarot-situation-challenge-advice': 'Uma resposta que muda a dinâmica',
	'tarot-peladan-cross': 'O centro da cruz',
	'tarot-celtic-cross': 'Expectativa e continuidade não são a mesma coisa',
	'tarot-aphrodite-temple': 'Como a tensão pode ganhar outra forma',
	'tarot-astrological-mandala': 'O fio que aproxima as áreas'
};

for (const width of [390, 1440])
	for (const method of tarotMethods) {
		test(`${method.id}: complete positions and reader at ${width}px`, async ({ page }) => {
			await page.setViewportSize({ width, height: 900 });
			await page.goto(`/testar-produtos/_spec?product=${method.id}`);
			await expect(
				page.getByRole('heading', {
					name: productDefinitionFor(method.id)!.name,
					level: 1,
					exact: true
				})
			).toBeVisible();
			const positions = page
				.getByRole('region', { name: 'Cartas da sua tiragem', exact: true })
				.getByRole('list', { name: 'Cartas e posições', exact: true });
			await expect(positions.getByRole('listitem')).toHaveCount(method.positions.length);
			await expect(positions.getByRole('button')).toHaveCount(method.positions.length);
			const artwork = positions.getByRole('img');
			await expect(artwork).toHaveCount(method.positions.length);
			await expect
				.poll(() =>
					artwork.evaluateAll((images) =>
						images.every(
							(image) =>
								image instanceof HTMLImageElement &&
								image.complete &&
								image.naturalWidth > 0 &&
								image.naturalHeight > 0
						)
					)
				)
				.toBe(true);
			await artwork.evaluateAll(async (images) => {
				await Promise.all(images.map((image) => (image as HTMLImageElement).decode()));
			});
			for (const card of await positions.getByRole('listitem').all()) {
				const name = await card.locator('figcaption strong').innerText();
				await expect(card.getByRole('img')).toHaveAttribute(
					'alt',
					`${name} — Tarot Rider–Waite–Smith`
				);
				await expect(card.getByRole('img')).toBeVisible();
			}
			expect(
				await artwork.evaluateAll((images) =>
					images.every((image) => {
						const bounds = image.getBoundingClientRect();
						const name = image.closest('figure')?.querySelector('figcaption strong');
						return (
							bounds.width >= 120 &&
							bounds.height >= bounds.width * 1.5 &&
							bounds.left >= 0 &&
							bounds.right <= innerWidth &&
							name !== null &&
							name !== undefined &&
							parseFloat(getComputedStyle(name).fontSize) >= 20
						);
					})
				)
			).toBe(true);
			const lastCard = positions.getByRole('listitem').last();
			const last = lastCard.getByRole('button', { name: 'Ler esta posição', exact: true });
			await expect(last).toBeEnabled();
			const cardName = await lastCard.locator('figcaption strong').innerText();
			const lastChapter =
				method.id === 'tarot-single-card'
					? `1. Tema central — ${cardName}`
					: lastPositionChapters[method.id];
			await last.focus();
			await expect(last).toBeFocused();
			await last.press('Enter');
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
