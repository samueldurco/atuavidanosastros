import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import type { FreeToolResponse } from '../src/lib/free-tools';

// These paths exercise the public handlers and calculation engine without fixtures or route mocks.
const cityLabel = 'São Paulo, São Paulo, Brasil';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

test.beforeEach(async ({ page }) => {
	await page.addInitScript(() => localStorage.setItem('atv-analytics-consent', 'denied'));
});

async function fillBirth(page: Page, prefix: string, date = '1990-01-15', time = '12:30') {
	prefix = `${new URL(page.url()).pathname.split('/').at(-1)}-${prefix}`;
	await expect(page.locator('form[data-hydrated]')).toHaveAttribute('data-hydrated', 'true');
	await page.locator(`#${prefix}-date`).fill(date);
	await page.locator(`#${prefix}-time`).fill(time);
	await page.locator(`#${prefix}-city`).fill('Sao Paulo');
	await page.getByRole('option', { name: cityLabel, exact: true }).getByRole('button').click();
	await expect(page.locator(`#${prefix}-city`)).toHaveValue(cityLabel);
}

async function generate(page: Page, tool: string): Promise<FreeToolResponse> {
	const responsePromise = page.waitForResponse(
		(response) =>
			new URL(response.url()).pathname === `/api/free-tools/${tool}` &&
			response.request().method() === 'POST'
	);
	await page.locator('form.tool-form button[type="submit"]').click();
	const response = await responsePromise;
	expect(response.status()).toBe(200);
	const envelope = (await response.json()) as FreeToolResponse;
	expect(envelope.result.id).toMatch(uuid);
	expect(envelope.receipt).toMatch(/^[0-9a-f]{64}$/);
	await expect(
		page.locator('.result-card').getByRole('heading', { name: envelope.result.title, exact: true })
	).toBeVisible();
	await expect(page.getByRole('link', { name: 'Entrar para salvar e continuar' })).toHaveAttribute(
		'href',
		`/entrar?next=${encodeURIComponent(`/ferramentas/${tool}`)}`
	);
	await expect(page.getByRole('button', { name: 'Salvar resultado', exact: true })).toHaveCount(0);
	return envelope;
}

async function stored(page: Page, tool: string): Promise<FreeToolResponse & { expiresAt: number }> {
	return page.evaluate((id) => JSON.parse(sessionStorage.getItem(`atv-free-tool:${id}`)!), tool);
}

test('Ascendente e mapa real aparecem antes do cadastro; mandala, mobile e acessibilidade', async ({
	page
}, testInfo) => {
	await page.goto('/');
	await expect(
		page.getByRole('region', { name: 'Experimente uma ferramenta' }).locator('article')
	).toHaveCount(9);
	await expect(page.locator('.tool-open').first()).toBeVisible();
	await page.screenshot({
		path: testInfo.outputPath('home-free-tools-desktop.png'),
		fullPage: true
	});
	await page.goto('/ferramentas/ascendente');
	await fillBirth(page, 'first-birth');
	const ascendant = await generate(page, 'ascendente');
	expect(ascendant.result.facts.find((fact) => fact.id === 'ascendant')?.value).toContain('Áries');
	await expect(page.locator('.result-card')).toContainText('14.31°');
	await expect(
		page.locator('.continuation a[href="/produtos/sol-lua-e-ascendente"]')
	).toBeVisible();
	await expect(page).toHaveURL(/\/ferramentas\/ascendente$/);
	await page.screenshot({
		path: testInfo.outputPath('ascendente-anonymous-desktop.png'),
		fullPage: true
	});

	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/ferramentas/mapa-astral');
	await fillBirth(page, 'first-birth');
	const natal = await generate(page, 'mapa-astral');
	expect(natal.result.chart?.positions).toHaveLength(10);
	expect(natal.result.chart?.cusps).toHaveLength(12);
	expect(natal.result.chart?.svg).toContain('<svg');
	const chart = page.getByRole('img', { name: /^Seu mapa astral: roda/ });
	await expect(chart).toBeVisible();
	const wheel = decodeURIComponent((await chart.getAttribute('src'))!.split(',')[1]);
	expect(wheel).toContain('viewBox="40 40 820 820"');
	expect(wheel).not.toContain('data-layer="legend"');
	for (const position of natal.result.chart!.positions)
		expect(wheel).toContain(`data-longitude="${position.longitude}"`);
	await expect(page.locator('.result-card .facts')).toHaveCount(0);
	const positions = page.locator('.result-card .positions');
	await positions.locator('summary').click();
	await expect(positions.locator('tbody tr')).toHaveCount(12);
	await expect(positions.getByRole('rowheader', { name: 'Ascendente', exact: true })).toBeVisible();
	await positions.locator('summary').click();
	await expect(page.getByRole('link', { name: 'Baixar mapa completo em SVG' })).toHaveAttribute(
		'href',
		`data:image/svg+xml;charset=utf-8,${encodeURIComponent(natal.result.chart!.svg)}`
	);
	expect(await chart.evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(
		0
	);
	await expect(page.locator('.result-card')).toContainText('Capricórnio');
	await expect(page.locator('.result-card')).toContainText('Virgem');
	expect(
		await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
	).toBeLessThanOrEqual(1);
	const accessibility = await new AxeBuilder({ page })
		.include('.free-tool-page')
		.withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
		.analyze();
	expect(accessibility.violations).toEqual([]);
	await page.screenshot({
		path: testInfo.outputPath('mapa-astral-anonymous-390.png'),
		fullPage: true
	});
});

for (const tool of ['carta-do-dia', 'carta-do-amor']) {
	test(`${tool}: resultado público e retorno conservam UUID e carta sem novo sorteio`, async ({
		page
	}, testInfo) => {
		let calculations = 0;
		page.on('request', (request) => {
			if (
				new URL(request.url()).pathname === `/api/free-tools/${tool}` &&
				request.method() === 'POST'
			)
				calculations += 1;
		});
		await page.goto(`/ferramentas/${tool}`);
		await expect(page.locator('form.tool-form')).toHaveAttribute('data-hydrated', 'true');
		const focus = 'Como observar minha rotina com mais atenção?';
		await page.locator(`#${tool}-tarot-focus`).fill(focus);
		const original = await generate(page, tool);
		expect(original.result.draw?.cardId).toBeTruthy();
		expect(original.result.draw?.orientation).toBe('upright');
		await expect(page.locator('.result-card')).toContainText(original.result.draw!.name);
		await page.reload();
		await expect(page.locator('.result-card h2')).toHaveText(original.result.title);
		expect((await stored(page, tool)).result).toEqual(original.result);
		await expect(page.locator(`#${tool}-tarot-focus`)).toHaveValue(focus);
		await page.getByRole('link', { name: 'Entrar para salvar e continuar' }).click();
		await expect(page).toHaveURL(/\/entrar\?next=/);
		expect(new URL(page.url()).searchParams.get('next')).toBe(`/ferramentas/${tool}`);
		expect(page.url()).not.toContain('rotina');
		await page.goBack();
		await expect(page.locator('.result-card h2')).toHaveText(original.result.title);
		expect((await stored(page, tool)).result).toEqual(original.result);
		expect(calculations).toBe(1);
		await page.screenshot({ path: testInfo.outputPath(`${tool}-restored.png`), fullPage: true });
	});
}

test('Registro de sonho respeita relato, escape, privacidade e limpeza explícita', async ({
	page
}, testInfo) => {
	const tool = 'registro-de-sonho';
	const narrative =
		'Na biblioteca encontrei <img src=x onerror="document.body.dataset.dreamAttack=\'executed\'"> e um livro azul.';
	await page.goto(`/ferramentas/${tool}`);
	await page.locator(`#${tool}-dream-date`).fill('2026-10-13');
	await page.locator(`#${tool}-dream-narrative`).fill(narrative);
	await page.locator(`#${tool}-dream-emotions`).fill('curiosidade, tranquilidade');
	await page.locator(`#${tool}-dream-associations`).fill('minha escola, vontade de aprender');
	const original = await generate(page, tool);
	await expect(page.locator('.result-card')).toContainText(narrative);
	await expect(page.locator('.result-card img')).toHaveCount(0);
	expect(await page.evaluate(() => document.body.dataset.dreamAttack)).toBeUndefined();
	expect(original.result.sections.some((section) => section.body === narrative)).toBe(true);
	expect(original.result.facts.every((fact) => fact.kind === 'reported')).toBe(true);
	await expect(page.locator('.result-card')).toContainText('curiosidade');
	await expect(page.locator('.result-card')).toContainText('minha escola');
	expect(page.url()).not.toContain('biblioteca');
	expect(
		await page.evaluate(() => localStorage.getItem('atv-free-tool:registro-de-sonho'))
	).toBeNull();
	const cache = await stored(page, tool);
	expect(cache.expiresAt - Date.now()).toBeGreaterThan(0);
	expect(cache.expiresAt - Date.now()).toBeLessThanOrEqual(30 * 60 * 1000);
	await page.screenshot({
		path: testInfo.outputPath('registro-sonho-escaped.png'),
		fullPage: true
	});
	await page.getByRole('button', { name: 'Limpar dados e resultado desta página' }).click();
	await expect(page.locator('.result-card')).toHaveCount(0);
	await expect(page.locator(`#${tool}-dream-narrative`)).toHaveValue('');
	expect(
		await page.evaluate(() => sessionStorage.getItem('atv-free-tool:registro-de-sonho'))
	).toBeNull();
});

test('Combinação do Casal usa os dois mapas e requer autorização para comparar', async ({
	page
}) => {
	await page.goto('/ferramentas/combinacao-do-casal');
	await fillBirth(page, 'first-birth');
	await fillBirth(page, 'second-birth', '1992-08-20', '08:15');
	const consent = page.getByRole('checkbox', { name: /Tenho autorização para usar os dados/ });
	await expect(consent).toHaveAttribute('required', '');
	await consent.check();
	const pair = await generate(page, 'combinacao-do-casal');
	expect(pair.result.facts.filter((fact) => fact.kind === 'calculated')).not.toHaveLength(0);
	await expect(
		page.locator('.continuation a[href="/produtos/analise-astral-do-casal"]')
	).toBeVisible();
});

test('Bússola mantém cálculo ao voltar de Entrar e elimina dados ao limpar', async ({
	page
}, testInfo) => {
	let calculations = 0;
	page.on('request', (request) => {
		if (
			new URL(request.url()).pathname === '/api/free-tools/meio-do-ceu' &&
			request.method() === 'POST'
		)
			calculations += 1;
	});
	await page.goto('/bussola-de-carreira');
	await expect(page).toHaveURL(/\/ferramentas\/meio-do-ceu$/);
	await fillBirth(page, 'first-birth');
	const result = await generate(page, 'meio-do-ceu');
	await page.getByRole('link', { name: 'Entrar para salvar e continuar' }).click();
	await expect(page).toHaveURL(/\/entrar\?next=%2Fferramentas%2Fmeio-do-ceu$/);
	await page.goBack();
	await expect(page.locator('.result-card h2')).toHaveText(result.result.title);
	await expect(
		page.getByText('Seu resultado foi recuperado nesta aba.', { exact: false })
	).toBeVisible();
	await expect(page.locator('#meio-do-ceu-first-birth-date')).toHaveValue('1990-01-15');
	await expect(page.locator('#meio-do-ceu-first-birth-time')).toHaveValue('12:30');
	expect((await stored(page, 'meio-do-ceu')).result).toEqual(result.result);
	expect(calculations).toBe(1);
	await page.screenshot({ path: testInfo.outputPath('bussola-restored.png'), fullPage: true });
	await page.getByRole('button', { name: 'Limpar dados e resultado desta página' }).click();
	await expect(page.locator('#meio-do-ceu-first-birth-date')).toHaveValue('');
	expect(await page.evaluate(() => sessionStorage.getItem('atv-free-tool:meio-do-ceu'))).toBeNull();
});
