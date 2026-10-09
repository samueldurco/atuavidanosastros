import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const width of [390, 1440]) {
	test(`Jornada: chapters, missing stages, structured save and saved comparison at ${width}px`, async ({
		page
	}) => {
		await page.setViewportSize({ width, height: 900 });
		await page.goto('/testar-produtos/_spec?product=direction-journey');
		await page.getByRole('button', { name: 'Recusar opcionais', exact: true }).click();
		await expect(
			page.getByRole('heading', { name: 'Jornada de Direção — 30 dias', exact: true })
		).toBeVisible();
		const nav = page.getByRole('navigation', { name: 'Capítulos da leitura' });
		expect(await nav.getByRole('button').count()).toBe(11);
		for (const b of await nav.getByRole('button').all()) {
			const title = await b.innerText();
			await b.click();
			await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
		}
		await expect(page.locator('[data-direction-synthesis]')).toContainText(
			'Etapas pendentes: Ponto de partida, Dia 7, Dia 14, Dia 30.'
		);
		await expect(page.getByText('Há uma nova edição desta leitura', { exact: true })).toHaveCount(
			0
		);
		await expect(
			page.getByRole('link', { name: 'Guardar leitura em PDF', exact: true })
		).toHaveCount(0);
		await expect(page.locator('svg [data-layer="positions"]')).toHaveCount(0);
		const form = page.locator('[data-direction-journey] form');
		for (const field of await form.locator('textarea').all()) await field.fill('   ');
		await form.getByRole('button', { name: 'Salvar registro da Jornada', exact: true }).click();
		await expect(form.getByRole('alert')).toContainText('Preencha os quatro relatos');
		for (const [index, text] of [
			'Espero conhecer uma tarefa.',
			'Vinte minutos, sem despesa.',
			'A tarefa pode exigir tempo indisponível.',
			'Fazer uma amostra privada.'
		].entries())
			await form.locator('textarea').nth(index).fill(text);
		let posted: Record<string, unknown> = {};
		await page.route('**/api/private-trials/*', async (route) => {
			if (route.request().method() === 'POST' && route.request().postDataJSON()?.action === 'note')
				posted = route.request().postDataJSON();
			await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
		});
		await form.getByRole('button', { name: 'Salvar registro da Jornada', exact: true }).click();
		await expect(page.getByText('Salvo na sua biblioteca privada.', { exact: true })).toBeVisible();
		expect(posted.step).toBe(0);
		expect(JSON.parse(String(posted.text))).toMatchObject({
			observation: 'Espero conhecer uma tarefa.',
			decision: 'undecided'
		});
		// Reopening is a clearly labelled synthetic saved-state fixture; no hosted persistence claim.
		await page.goto('/testar-produtos/_spec?product=direction-journey&directionNotes=complete');
		const synthesis = page.locator('[data-direction-synthesis]');
		await expect(synthesis).toContainText('Quatro etapas registradas.');
		await expect(synthesis).toContainText('Espero conhecer uma tarefa sem perder descanso.');
		await expect(synthesis).toContainText(
			'Observei interesse, mas a tarefa inteira não coube no tempo.'
		);
		await expect(synthesis).toContainText('Ajustar');
		await expect(synthesis.getByText('Etapas pendentes:', { exact: false })).toHaveCount(0);
		await page.getByRole('button', { name: 'Reabrir dia 30', exact: true }).click();
		await expect(page.locator('[data-direction-journey] form textarea').first()).toHaveValue(
			'Observei interesse, mas a tarefa inteira não coube no tempo.'
		);
		await expect(page.getByRole('combobox', { name: /Sua decisão/ })).toHaveValue('adjust');
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
			true
		);
		expect(
			(await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
				.violations
		).toEqual([]);
		await page.screenshot({
			path: `test-results/reconstruction-direction-${width}.png`,
			fullPage: true
		});
		await page.locator('[data-direction-journey]').screenshot({
			path: `test-results/reconstruction-direction-notes-${width}.png`
		});
	});
}
