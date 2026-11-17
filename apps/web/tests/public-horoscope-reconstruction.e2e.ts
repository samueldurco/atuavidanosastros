import { expect, test } from '@playwright/test';
import { scanAccessibility } from './fixtures/accessibility';
import { datedForecasts } from './fixtures/editorial-inventory';
import { horoscopeRange } from '../src/lib/public-horoscope';
const HOROSCOPE_FOLLOW_KEY = 'atv.public-horoscope.follow.v1';
const legacyPath = '/horoscopo/aries/daily/2026-11-16';

test('the free tool opens the full reading on the sign page and leaves the dated archive available', async ({
	page,
	request
}, testInfo) => {
	const response = await request.get('/api/free-tools/horoscopo?sign=aries&period=daily');
	expect(response.status()).toBe(200);
	const result = await response.json();
	expect(result.hasHistory).toBe(datedForecasts.some((document) => document.path === legacyPath));
	await page.setViewportSize({ width: 390, height: 900 });
	await page.goto('/ferramentas/horoscopo');
	await page.getByRole('button', { name: 'Recusar opcionais' }).click();
	await page.getByRole('button', { name: 'Consultar meu signo', exact: true }).click();
	await expect(page).toHaveURL(/\/horoscopo\/aries$/);
	const reading = page.locator('.current');
	const offer = page.locator('[data-free-offer="week-reading"]');
	if (result.current) {
		expect(result.current.readingPath).toBe('/horoscopo/aries');
		await expect(reading.getByRole('heading', { level: 2 })).toHaveText(result.current.title);
		expect(result.current.sections.length).toBeGreaterThan(0);
		for (const section of result.current.sections) {
			await expect(
				reading.getByRole('heading', { level: 3, name: section.heading, exact: true })
			).toBeVisible();
			for (const paragraph of section.paragraphs) {
				await expect(reading.getByText(paragraph, { exact: true }).first()).toBeVisible();
			}
		}
		await expect(offer.getByRole('link')).toHaveAttribute(
			'href',
			'/produtos/horoscopo-semanal-pessoal?ferramenta=horoscopo&origem=ferramenta&leitura=' +
				encodeURIComponent(result.current.path) +
				'&revisao=' +
				result.current.revision +
				'&volta=signo'
		);
	} else {
		await expect(reading.getByRole('heading', { level: 2 })).toContainText(
			/ainda não foi publicada|temporariamente indisponível/
		);
		await expect(offer).toHaveCount(0);
		if (result.lastDaily) {
			await expect(reading).toContainText('Edição anterior · ' + horoscopeRange(result.lastDaily));
			await expect(reading.locator('section p').first()).toBeVisible();
		}
		if (result.currentWeek) {
			const weekly = reading.getByRole('link', { name: /Ler o semanal vigente/ });
			await expect(weekly).toHaveAttribute('href', '/horoscopo/aries?period=weekly');
		}
	}
	const guides = page.getByRole('region', { name: 'Para entender os ciclos' });
	await expect(guides.getByRole('link')).toHaveCount(2);
	await expect(page.locator('.history-list a[href="' + legacyPath + '"]')).toBeVisible();
	await scanAccessibility(page, testInfo);
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
		true
	);
	const published = await page.goto(legacyPath);
	expect(published?.status()).toBe(200);
	await expect(page).toHaveURL(/\/horoscopo\/aries\/daily\/2026-11-16$/);
	await expect(page.locator('h1')).toContainText('Dividir sem perder a clareza');
});

test('the selector opens the requested sign and period with JavaScript disabled', async ({
	browser
}) => {
	const context = await browser.newContext({ javaScriptEnabled: false });
	try {
		const page = await context.newPage();
		await page.goto('/ferramentas/horoscopo');
		await page.getByLabel('Seu signo').selectOption('touro');
		await page.getByLabel('Período').selectOption('monthly');
		await page.getByRole('button', { name: 'Consultar meu signo', exact: true }).click();
		await expect(page).toHaveURL(/\/horoscopo\/touro\?period=monthly$/);
		await expect(page.locator('h1')).toHaveText('Horóscopo de Touro');
		await expect(page.getByRole('link', { name: 'Mês', exact: true })).toHaveAttribute(
			'aria-current',
			'page'
		);
	} finally {
		await context.close();
	}
});

for (const width of [320, 390, 1440]) {
	test(`public horoscope navigation, consent and history at ${width}px`, async ({
		page
	}, testInfo) => {
		await page.setViewportSize({ width, height: 900 });
		await page.goto('/horoscopo');
		await expect(
			page.getByRole('heading', { name: 'Horóscopo dos 12 signos', exact: true })
		).toBeVisible();
		await expect(page.locator('.sign-card')).toHaveCount(12);
		const guides = page.getByRole('region', { name: 'Para entender os ciclos' });
		await expect(guides.getByRole('link')).toHaveCount(2);
		await expect(guides).toContainText('Não são previsões para o período escolhido.');
		await expect(
			page.getByRole('link', { name: 'Conhecer a leitura personalizada da semana' })
		).toHaveAttribute('href', '/produtos/horoscopo-semanal-pessoal');
		await expect(page.locator('a[href="/testar-produtos/horoscope"]')).toHaveCount(0);
		await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
		expect(
			await page.evaluate((key) => localStorage.getItem(key), HOROSCOPE_FOLLOW_KEY)
		).toBeNull();
		await scanAccessibility(page, testInfo);
		await page.screenshot({
			path: testInfo.outputPath(`horoscope-hub-${width}.png`),
			fullPage: true
		});
		await page.getByRole('button', { name: 'Recusar opcionais' }).click();
		await expect(page.getByRole('complementary', { name: 'Preferências de cookies' })).toHaveCount(
			0
		);
		await page
			.getByRole('navigation', { name: 'Período da leitura' })
			.getByRole('link', { name: 'Semana', exact: true })
			.click();
		await expect(page).toHaveURL(/\/horoscopo\?period=weekly$/);
		await expect(
			page.getByRole('navigation', { name: 'Período da leitura' }).getByRole('link', {
				name: 'Semana',
				exact: true
			})
		).toHaveAttribute('aria-current', 'page');
		await page
			.locator('.sign-card')
			.filter({ has: page.getByRole('heading', { name: 'Áries', exact: true }) })
			.click();
		await expect(page).toHaveURL(/\/horoscopo\/aries\?period=weekly$/);
		const { current: weekly } = await (
			await page.request.get('/api/free-tools/horoscopo?sign=aries&period=weekly')
		).json();
		const reading = page.locator('.current');
		if (weekly) {
			await expect(reading.getByRole('heading', { level: 2 })).toHaveText(weekly.title);
			await expect(reading.locator('section p').first()).toBeVisible();
		} else {
			await expect(reading.getByRole('heading', { level: 2 })).toContainText(
				/ainda não foi publicada|temporariamente indisponível/
			);
		}
		await page.getByLabel('Ano de início da leitura').fill('1900');
		await page.getByRole('button', { name: 'Ver histórico', exact: true }).click();
		await expect(page).toHaveURL(/period=weekly&year=1900/);
		await expect(
			page.getByText('Ainda não há leituras publicadas para este período e ano.')
		).toBeVisible();
		await page.getByText('Ativar avisos neste navegador', { exact: true }).click();
		const save = page.getByRole('button', { name: 'Salvar preferência e ativar avisos' });
		await expect(save).toBeDisabled();
		await page.getByRole('combobox', { name: 'Signo', exact: true }).selectOption('touro');
		await page.getByRole('combobox', { name: 'Período', exact: true }).selectOption('monthly');
		await page.getByRole('checkbox').check();
		await save.click();
		await expect(page.getByText('Avisos ativados neste navegador.', { exact: true })).toBeVisible();
		const preference = await page.evaluate(
			(key) => JSON.parse(localStorage.getItem(key)!),
			HOROSCOPE_FOLLOW_KEY
		);
		expect(Object.keys(preference).sort()).toEqual([
			'consentedAt',
			'period',
			'seenThrough',
			'sign',
			'version'
		]);
		expect(preference).toMatchObject({ version: 1, sign: 'touro', period: 'monthly' });
		await page.reload();
		await expect(page.getByText('Touro · Mês', { exact: true })).toBeVisible();
		await scanAccessibility(page, testInfo);
		expect(
			await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
		).toBe(true);
		await page.screenshot({
			path: testInfo.outputPath(`horoscope-sign-follow-${width}.png`),
			fullPage: true
		});
		await page.getByRole('button', { name: 'Remover preferência e desativar avisos' }).click();
		expect(
			await page.evaluate((key) => localStorage.getItem(key), HOROSCOPE_FOLLOW_KEY)
		).toBeNull();
		await expect(page.getByText('Preferência removida.', { exact: true })).toBeVisible();
	});
}

test('unknown, malformed and unsigned archive URLs fail closed', async ({ page }) => {
	for (const [path, status] of [
		['/horoscopo/unknown', 404],
		['/horoscopo/aries?year=2100', 400],
		['/horoscopo?period=annual', 400],
		['/horoscopo/aries/daily/2026-02-29', 404],
		['/horoscopo/aries/daily/1900-01-01', 404]
	] as const) {
		const response = await page.goto(path);
		expect(response?.status()).toBe(status);
		await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
	}
});

test('malformed preferences are ignored and unavailable storage is reported without false success', async ({
	page
}) => {
	await page.addInitScript((key) => localStorage.setItem(key, '{'), HOROSCOPE_FOLLOW_KEY);
	await page.goto('/horoscopo');
	await expect(page.getByText('Ativar avisos neste navegador', { exact: true })).toBeVisible();
	await page.getByRole('button', { name: 'Recusar opcionais' }).click();
	await expect(page.getByRole('complementary', { name: 'Preferências de cookies' })).toHaveCount(0);
	await page.evaluate(() => {
		Storage.prototype.setItem = () => {
			throw new Error('storage unavailable in test');
		};
	});
	await page.getByText('Ativar avisos neste navegador', { exact: true }).click();
	await page.getByRole('checkbox').check();
	await page.getByRole('button', { name: 'Salvar preferência e ativar avisos' }).click();
	await expect(
		page.getByText('Não foi possível guardar a preferência neste navegador.', { exact: true })
	).toBeVisible();
	await expect(
		page.getByRole('button', { name: 'Remover preferência e desativar avisos' })
	).toHaveCount(0);
});
