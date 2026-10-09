import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const width of [390, 1440]) {
	test(`Pair Preview: three comparisons, bookmarks and references at ${width}px`, async ({
		page
	}) => {
		await page.setViewportSize({ width, height: 900 });
		await page.goto('/testar-produtos/_spec?product=pair-preview');
		await page.getByRole('button', { name: 'Recusar opcionais', exact: true }).click();
		await expect(
			page.getByRole('heading', { name: 'Combinação do Casal', exact: true })
		).toBeVisible();
		await expect(page.getByText('Há uma nova edição desta leitura', { exact: true })).toHaveCount(
			0
		);
		await expect(page.getByText('Lua, Vênus e Marte', { exact: true })).toHaveCount(0);
		const navigation = page.getByRole('navigation', { name: 'Capítulos da leitura' });
		await expect(navigation.getByRole('button')).toHaveCount(5);
		for (const title of [
			'Direções que cada pessoa quer construir',
			'O cuidado precisa ser reconhecido por quem recebe',
			'Como vocês chegam à mesma situação',
			'Antes de concluir o que a outra pessoa quis dizer',
			'O que aproxima e o que pede tradução'
		]) {
			await navigation.getByRole('button', { name: title, exact: true }).click();
			await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
		}
		await page.getByRole('button', { name: '☆ Marcar capítulo', exact: true }).click();
		await expect(page.getByRole('button', { name: '★ Marcado', exact: true })).toHaveAttribute(
			'aria-pressed',
			'true'
		);
		await expect(
			page.getByRole('link', { name: 'Guardar leitura em PDF', exact: true })
		).toBeVisible();
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
			true
		);
		expect(
			(await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
				.violations
		).toEqual([]);
		await page.evaluate(() => window.scrollTo(0, 0));
		await page.screenshot({
			path: `test-results/reconstruction-pair-${width}.png`,
			fullPage: true
		});
	});
}
