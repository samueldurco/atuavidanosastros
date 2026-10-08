import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
import { PDFDocument } from 'pdf-lib';

test('career complete reading, provenance, personal approval and recoverable note failure', async ({
	page
}) => {
	await page.goto('/testar-produtos/_spec');
	await expect(
		page.getByRole('heading', { name: 'Bússola de Carreira', exact: true })
	).toBeVisible();
	await page
		.getByRole('button', { name: 'O ambiente também participa da escolha', exact: true })
		.click();
	await expect(
		page.getByRole('heading', { name: 'O ambiente também participa da escolha' })
	).toBeVisible();
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
	'purpose-career',
	'couple-dossier',
	'three-pillars',
	'horoscope'
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
			await expect(
				page.getByRole('link', { name: 'Guardar leitura em PDF', exact: true })
			).toHaveAttribute('href', /format=pdf$/);
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

test('chapter changes and bookmarks persist without blocking reading on a failed save', async ({
	page
}) => {
	const updates: Record<string, unknown>[] = [];
	await page.route('**/api/private-trials/*', async (route) => {
		updates.push(route.request().postDataJSON());
		await route.fulfill({ status: 200, json: { saved: true } });
	});
	await page.goto('/testar-produtos/_spec');
	await page.getByRole('button', { name: 'Sua página de decisão', exact: true }).click();
	await expect(
		page.getByRole('heading', { name: 'Sua página de decisão', exact: true })
	).toBeVisible();
	await page.getByRole('button', { name: '☆ Marcar capítulo', exact: true }).click();
	await expect(page.getByRole('button', { name: '★ Marcado', exact: true })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
	await expect.poll(() => updates.at(-1)?.bookmarks).toEqual([7]);
	await page.route('**/api/private-trials/*', (route) =>
		route.fulfill({ status: 503, json: { message: 'Não foi possível salvar agora.' } })
	);
	await page.getByRole('button', { name: 'Sua direção em cinco minutos', exact: true }).click();
	await expect(
		page.getByRole('heading', { name: 'Sua direção em cinco minutos', exact: true })
	).toBeVisible();
	await expect(
		page.getByRole('status').filter({ hasText: 'Não foi possível salvar agora.' })
	).toBeVisible();
});

test('couple charts and sharing require explicit consent and recover from HTML failures', async ({
	page
}) => {
	await page.goto('/testar-produtos/_spec?product=couple-dossier');
	await expect(page.locator('svg[role="img"]')).toHaveCount(2);
	const share = page.getByRole('button', { name: 'Criar link por sete dias', exact: true });
	await expect(share).toBeDisabled();
	await page.getByLabel(/Tenho autorização da outra pessoa e quero compartilhar/).check();
	await page.route('**/api/private-trials/*', (route) =>
		route.fulfill({
			status: 503,
			contentType: 'text/html',
			body: '<!doctype html><title>1102</title>'
		})
	);
	await share.click();
	await expect(page.getByRole('status').filter({ hasText: /Tente novamente/ })).toBeVisible();
	await expect(page.getByText('Unexpected token')).toHaveCount(0);
});

test('three pillars have distinct navigation and horoscope remains a web reading', async ({
	page
}) => {
	await page.route('**/api/private-trials/*', (route) =>
		route.fulfill({ status: 200, json: { saved: true } })
	);
	await page.goto('/testar-produtos/_spec?product=three-pillars');
	await page.getByRole('button', { name: /Lua · necessidades/ }).click();
	await expect(page.locator('article[aria-label="Capítulo selecionado"] h2')).toContainText('Lua');
	await page.goto('/testar-produtos/_spec?product=horoscope');
	await expect(page.getByRole('link', { name: 'Guardar leitura em PDF', exact: true })).toHaveCount(
		0
	);
});

test('pair preview displays both calculated three-factor charts and the desire chapter', async ({
	page
}) => {
	await page.route('**/api/private-trials/*', (route) =>
		route.fulfill({ status: 200, json: { saved: true } })
	);
	await page.goto('/testar-produtos/_spec?product=pair-preview');
	await expect(page.locator('svg[role="img"]')).toHaveCount(2);
	await expect(page.locator('svg[role="img"] [data-body]')).toHaveCount(6);
	await page.getByRole('button', { name: 'Desejo, iniciativa e limites', exact: true }).click();
	await expect(page.locator('article[aria-label="Capítulo selecionado"]')).toContainText(
		'não calcula aspectos entre os mapas'
	);
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
		'/testar-produtos/leituras/00000000-0000-4000-8000-000000000031',
		'/testar-produtos/leituras/00000000-0000-4000-8000-000000000031/baixar'
	]) {
		const response = await request.get(path, { maxRedirects: 0 });
		expect([303, 401, 403, 503]).toContain(response.status());
		expect(response.headers()['cache-control']).toContain('no-store');
	}
	const response = await request.post('/api/private-trials', { data: {} });
	expect([401, 503]).toContain(response.status());
});

test('Atlas da Vida offers distinct priorities rather than an unexplained text field', async ({
	page
}) => {
	await page.goto('/testar-produtos/_spec?view=intake&product=life-atlas');
	await expect(page.getByRole('combobox', { name: 'Prioridade 1', exact: true })).toHaveValue(
		'Autocuidado'
	);
	await expect(
		page
			.getByRole('combobox', { name: 'Prioridade 2', exact: true })
			.locator('option[value="Autocuidado"]')
	).toHaveJSProperty('disabled', true);
	await page.getByRole('combobox', { name: 'Prioridade 1', exact: true }).selectOption('Família');
	await expect(
		page
			.getByRole('combobox', { name: 'Prioridade 2', exact: true })
			.locator('option[value="Autocuidado"]')
	).toHaveJSProperty('disabled', false);
	await expect(
		page
			.getByRole('combobox', { name: 'Prioridade 2', exact: true })
			.locator('option[value="Família"]')
	).toHaveJSProperty('disabled', true);
});

test('an HTML resource-limit response preserves the form and has a useful retry message', async ({
	page
}) => {
	await page.goto('/testar-produtos/_spec?view=intake&product=dream-reading');
	await page
		.getByLabel('Seu relato', { exact: true })
		.fill('Sonhei com uma ponte e senti curiosidade.');
	await page.getByLabel(/Autorizo salvar/).check();
	const requests: unknown[] = [];
	await page.route('**/api/private-trials', async (route) => {
		requests.push(route.request().postDataJSON());
		await route.fulfill({
			status: 503,
			contentType: 'text/html',
			body: '<!DOCTYPE html><h1>Error 1102</h1>'
		});
	});
	await page.getByRole('button', { name: 'Gerar leitura gratuita' }).click();
	await expect(page.getByRole('alert')).toContainText('Seus dados preenchidos foram mantidos');
	await expect(page.getByLabel('Seu relato', { exact: true })).toHaveValue(
		'Sonhei com uma ponte e senti curiosidade.'
	);
	await page.getByRole('button', { name: 'Gerar leitura gratuita' }).click();
	await expect.poll(() => requests.length).toBe(2);
	expect(requests[0]).toEqual(requests[1]);
});

test('the browser produces and downloads the full private PDF', async ({ page }) => {
	const downloadPromise = page.waitForEvent('download', { timeout: 45000 });
	await page.goto('/testar-produtos/_spec?view=download&product=birth-chart');
	const download = await downloadPromise;
	expect(download.suggestedFilename()).toMatch(/^birth-chart-.*\.pdf$/);
	const path = await download.path();
	expect(path).not.toBeNull();
	const bytes = await readFile(path!);
	expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
	expect((await PDFDocument.load(bytes)).getPageCount()).toBeGreaterThan(5);
	await expect(page.getByRole('status')).toContainText('PDF pronto');
	await expect(page.getByRole('link', { name: 'Baixar PDF completo' })).toHaveAttribute(
		'href',
		/^blob:/
	);
});
