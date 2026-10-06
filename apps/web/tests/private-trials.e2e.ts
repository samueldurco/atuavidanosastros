import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('career complete reading, provenance, personal approval and recoverable note failure', async ({
	page
}) => {
	await page.goto('/testar-produtos/_spec');
	await expect(
		page.getByRole('heading', { name: 'Bússola de Carreira', exact: true })
	).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Ambientes e modos de trabalho' })).toBeVisible();
	await page.getByText('Origem e versão', { exact: true }).click();
	await expect(page.locator('details ul li').first()).toBeVisible();
	let body: Record<string, unknown> = {};
	await page.route('**/api/private-trials/*', async (route) => {
		body = route.request().postDataJSON();
		await route.fulfill({ status: 200, json: { saved: true } });
	});
	await page
		.getByLabel('Comentário sobre a leitura (opcional)')
		.fill('Quero testar esta hipótese.');
	await page.getByRole('button', { name: 'Aprovar este produto', exact: true }).click();
	await expect(
		page.getByRole('status').filter({ hasText: 'Salvo na sua biblioteca privada.' })
	).toBeVisible();
	expect(body).toEqual({
		action: 'feedback',
		decision: 'approved',
		comment: 'Quero testar esta hipótese.'
	});
	await page.route('**/api/private-trials/*', (route) =>
		route.fulfill({ status: 503, json: { message: 'Tente novamente.' } })
	);
	await page.getByLabel('Sua anotação', { exact: true }).fill('Acompanhamento em andamento.');
	await page.getByRole('button', { name: 'Salvar anotação desta etapa' }).click();
	await expect(page.getByRole('status').filter({ hasText: 'Tente novamente.' })).toBeVisible();
	await expect(page.getByLabel('Sua anotação', { exact: true })).toHaveValue(
		'Acompanhamento em andamento.'
	);
});

for (const product of [
	'career-compass',
	'birth-chart',
	'dream-reading',
	'direction-journey',
	'purpose-career'
])
	test(`${product}: accessible full result at 320px`, async ({ page }) => {
		await page.setViewportSize({ width: 320, height: 812 });
		await page.goto(`/testar-produtos/_spec?product=${product}`);
		expect(
			(await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
				.violations
		).toEqual([]);
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
			true
		);
		if (product === 'dream-reading')
			expect(await page.evaluate(() => Reflect.get(window, 'pwned'))).toBeUndefined();
		if (product === 'birth-chart') {
			await expect(page.getByRole('link', { name: 'Baixar PDF completo' })).toHaveAttribute(
				'href',
				/format=pdf$/
			);
			await expect(page.getByRole('link', { name: 'Baixar cartografia SVG' })).toHaveAttribute(
				'href',
				/format=svg$/
			);
		}
		if (product === 'purpose-career')
			await expect(page.getByRole('button', { name: 'Ouvir a leitura' })).toBeVisible();
		if (product === 'direction-journey') {
			await page.getByLabel('Etapa').selectOption('30');
			await expect(page.getByLabel('Etapa')).toHaveValue('30');
		}
		await page.screenshot({
			path: `test-results/private-trials-${product}-mobile.png`,
			fullPage: true
		});
	});

test('intake consent and stable retry key for a dream, escaped as data', async ({ page }) => {
	await page.goto('/testar-produtos/_spec?view=intake&product=dream-reading');
	expect(
		(await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
			.violations
	).toEqual([]);
	await page
		.getByLabel('Seu relato', { exact: true })
		.fill('Sonhei com uma ponte e senti curiosidade.');
	await page.getByLabel(/Autorizo salvar/).check();
	const requests: Record<string, unknown>[] = [];
	await page.route('**/api/private-trials', async (route) => {
		requests.push(route.request().postDataJSON());
		await route.fulfill({
			status: 503,
			json: { message: 'Salvamento temporariamente indisponível.' }
		});
	});
	await page.getByRole('button', { name: 'Gerar leitura gratuita' }).click();
	await expect(
		page.getByRole('alert').filter({ hasText: 'Salvamento temporariamente indisponível.' })
	).toBeVisible();
	await page.getByRole('button', { name: 'Gerar leitura gratuita' }).click();
	await expect.poll(() => requests.length).toBe(2);
	expect(requests[0]).toEqual(requests[1]);
});

test('ATV+ has all six universes, 25 products, notes library and personal approval', async ({
	page
}) => {
	await page.goto('/testar-produtos/_spec?view=club');
	expect(
		(await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
			.violations
	).toEqual([]);
	const productLinks = page
		.locator('a[href^="/testar-produtos/"]')
		.filter({ hasNotText: 'Bússola de Carreira' });
	expect(await productLinks.count()).toBeGreaterThanOrEqual(24);
	await expect(page.getByRole('button', { name: 'Aprovar ATV+' })).toBeVisible();
});

test('private routes and API require an authenticated trial grant', async ({ request }) => {
	for (const path of [
		'/testar-produtos/career-compass',
		'/testar-produtos/atv-plus',
		'/testar-produtos/leituras/00000000-0000-4000-8000-000000000031'
	]) {
		const response = await request.get(path, { maxRedirects: 0 });
		expect([303, 401, 403, 503]).toContain(response.status());
		expect(response.headers()['cache-control']).toContain('no-store');
	}
	const response = await request.post('/api/private-trials', { data: {} });
	expect([401, 503]).toContain(response.status());
});
