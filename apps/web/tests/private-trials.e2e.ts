import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { offeredProductIds, atvPlusPlans } from '@atv/domain';
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
		.getByRole('button', { name: 'Ambientes: condições que permitem contribuir', exact: true })
		.click();
	await expect(
		page.getByRole('heading', { name: 'Ambientes: condições que permitem contribuir' })
	).toBeVisible();
	await page.getByText('Dados usados nesta leitura', { exact: true }).click();
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
	await page
		.getByRole('button', { name: 'Modo de trabalhar: pensar, iniciar e concluir', exact: true })
		.click();
	await expect(
		page.getByRole('heading', {
			name: 'Modo de trabalhar: pensar, iniciar e concluir',
			exact: true
		})
	).toBeVisible();
	await page.getByRole('button', { name: '☆ Marcar capítulo', exact: true }).click();
	await expect(page.getByRole('button', { name: '★ Marcado', exact: true })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
	await expect.poll(() => updates.at(-1)?.bookmarks).toEqual([5]);
	await page.route('**/api/private-trials/*', (route) =>
		route.fulfill({ status: 503, json: { message: 'Não foi possível salvar agora.' } })
	);
	await page
		.getByRole('button', { name: 'Contribuição: do ângulo à entrega', exact: true })
		.click();
	await expect(
		page.getByRole('heading', { name: 'Contribuição: do ângulo à entrega', exact: true })
	).toBeVisible();
	await expect(
		page.getByRole('status').filter({ hasText: 'Não foi possível salvar agora.' })
	).toBeVisible();
});

test('couple charts and sharing require explicit consent and recover from HTML failures', async ({
	page
}) => {
	await page.goto('/testar-produtos/_spec?product=couple-dossier');
	await expect(
		page.getByRole('region', { name: 'Fatores natais das duas pessoas' }).locator('svg[role="img"]')
	).toHaveCount(2);
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
	await expect(page.locator('article[aria-label="Capítulo selecionado"] h2')).toContainText(
		'Afinidades'
	);
	await expect(page.getByRole('link', { name: 'Guardar leitura em PDF', exact: true })).toHaveCount(
		0
	);
	await page.goto('/testar-produtos/_spec?product=horoscope');
	await expect(page.getByRole('link', { name: 'Guardar leitura em PDF', exact: true })).toHaveCount(
		0
	);
});

test('pair preview displays both three-factor comparisons and the direction chapter', async ({
	page
}) => {
	await page.route('**/api/private-trials/*', (route) =>
		route.fulfill({ status: 200, json: { saved: true } })
	);
	await page.goto('/testar-produtos/_spec?product=pair-preview');
	await page.getByText('Referências calculadas e informadas', { exact: true }).click();
	await expect(page.getByText('Pessoa A · Sol:', { exact: false }).first()).toBeVisible();
	await expect(page.getByText('Pessoa B · Ascendente:', { exact: false }).first()).toBeVisible();
	await page
		.getByRole('button', { name: 'Direções que cada pessoa quer construir', exact: true })
		.click();
	await expect(page.locator('article[aria-label="Capítulo selecionado"]')).toContainText('Sol em');
});

test('the reading area keeps 19 offers, saved readings and its own feedback separate from ATV+', async ({
	page
}) => {
	await page.goto('/testar-produtos/_spec?view=club');
	expect(
		(await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
			.violations
	).toEqual([]);
	const targets: string[] = [];
	for (const universe of [
		'Mapa Astral',
		'Previsões',
		'Amor e Relacionamentos',
		'Tarot',
		'Dinheiro e Carreira',
		'Sonhos'
	]) {
		const region = page.getByRole('region', { name: universe, exact: true });
		await expect(region.getByRole('heading', { name: universe, exact: true })).toBeVisible();
		targets.push(
			...(await region
				.getByRole('link')
				.evaluateAll((links) => links.map((link) => link.getAttribute('href')!)))
		);
	}
	expect(targets.sort()).toEqual(offeredProductIds.map((id) => `/testar-produtos/${id}`).sort());
	await expect(page.getByRole('region', { name: 'Suas leituras de teste' })).toBeVisible();
	await expect(
		page.getByRole('link', { name: 'três planos do ATV+', exact: true })
	).toHaveAttribute('href', '/atv-mais');
	await expect(page.locator('section.continuity').getByRole('checkbox')).not.toBeChecked();
	const posted: unknown[] = [];
	let subscriptionRequests = 0;
	page.on('request', (request) => {
		if (request.method() === 'POST' && new URL(request.url()).pathname === '/atv-mais')
			subscriptionRequests++;
	});
	await page.route('**/api/private-trials/club', async (route) => {
		posted.push(route.request().postDataJSON());
		await route.fulfill({ status: 200, json: { saved: true } });
	});
	const feedback = page.getByRole('region', { name: 'Sua avaliação desta área' });
	await feedback.getByLabel('Comentário para a revisão').fill('Biblioteca e anotações avaliadas.');
	await feedback.getByRole('button', { name: 'Aprovar esta área' }).click();
	await expect(feedback.getByRole('status')).toContainText('Sua avaliação desta área foi salva.');
	expect(posted).toEqual([{ decision: 'approved', comment: 'Biblioteca e anotações avaliadas.' }]);
	expect(subscriptionRequests).toBe(0);
	await expect(page.locator('section.continuity').getByRole('checkbox')).not.toBeChecked();
});

test('ATV+ shows three public plans while simulation stays restricted to the owner', async ({
	page,
	request
}) => {
	const response = await page.goto('/atv-mais');
	expect(response?.status()).toBe(200);
	expect(response?.headers()['cache-control']).toContain('no-store');
	await expect(page.getByRole('heading', { name: 'ATV+', exact: true })).toBeVisible();
	const plans = page.locator('.plans article');
	await expect(plans).toHaveCount(3);
	for (const plan of atvPlusPlans) {
		const card = plans.filter({ has: page.getByRole('heading', { name: plan.name, exact: true }) });
		await expect(card).toBeVisible();
		await expect(card.getByText('Assinaturas em preparação', { exact: true })).toBeVisible();
		await expect(card.locator('form')).toHaveCount(0);
	}
	await expect(page.getByRole('heading', { name: 'Experimente cada plano' })).toHaveCount(0);
	await expect(
		page.getByRole('button', { name: /Testar este plano|Reiniciar este teste|Encerrar simulação/ })
	).toHaveCount(0);
	await expect(page.locator('a[href*="atvPlusCycle"]')).toHaveCount(0);
	expect(
		(await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
			.violations
	).toEqual([]);
	const alias = await request.get('/atv-plus?source=library', { maxRedirects: 0 });
	expect(alias.status()).toBe(308);
	expect(alias.headers().location).toBe('/atv-mais?source=library');
	const origin = new URL(page.url()).origin;
	for (const action of ['start', 'cancel']) {
		const form =
			action === 'start'
				? { planId: 'premium', requestKey: '00000000-0000-4000-8000-000000000019' }
				: { cycleId: '00000000-0000-4000-8000-000000000019' };
		const unauthorized = await request.post(`/atv-mais?/${action}`, { headers: { origin }, form });
		expect([401, 503]).toContain(unauthorized.status());
		const crossOrigin = await request.post(`/atv-mais?/${action}`, {
			headers: { origin: 'https://example.invalid' },
			form
		});
		expect(crossOrigin.status()).toBe(403);
	}
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
	await expect(page.getByRole('combobox', { name: 'Prioridade 1', exact: true })).toHaveValue('');
	await page
		.getByRole('combobox', { name: 'Prioridade 1', exact: true })
		.selectOption('Autocuidado e rotina');
	await expect(
		page
			.getByRole('combobox', { name: 'Prioridade 2', exact: true })
			.locator('option[value="Autocuidado e rotina"]')
	).toHaveJSProperty('disabled', true);
	await page
		.getByRole('combobox', { name: 'Prioridade 1', exact: true })
		.selectOption('Casa e pertencimento');
	await expect(
		page
			.getByRole('combobox', { name: 'Prioridade 2', exact: true })
			.locator('option[value="Autocuidado e rotina"]')
	).toHaveJSProperty('disabled', false);
	await expect(
		page
			.getByRole('combobox', { name: 'Prioridade 2', exact: true })
			.locator('option[value="Casa e pertencimento"]')
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
