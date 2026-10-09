import { expect, test } from '@playwright/test';
import { scanAccessibility } from './fixtures/accessibility';
const HOROSCOPE_FOLLOW_KEY = 'atv.public-horoscope.follow.v1';

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
		await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
		expect(
			await page.evaluate((key) => localStorage.getItem(key), HOROSCOPE_FOLLOW_KEY)
		).toBeNull();
		await scanAccessibility(page, testInfo);
		await page.screenshot({
			path: testInfo.outputPath(`horoscope-hub-${width}.png`),
			fullPage: true
		});
		await page
			.getByRole('navigation', { name: 'Período da leitura' })
			.getByRole('link', { name: 'Semana', exact: true })
			.click();
		await expect(page).toHaveURL(/\/horoscopo\?period=weekly&year=\d{4}$/);
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
		await expect(page).toHaveURL(/\/horoscopo\/aries\?period=weekly&year=\d{4}$/);
		await expect(
			page.getByRole('heading', { name: 'A leitura deste período ainda não foi publicada' })
		).toBeVisible();
		await page.getByLabel('Ano de início da leitura').fill('2025');
		await page.getByRole('button', { name: 'Ver histórico', exact: true }).click();
		await expect(page).toHaveURL(/period=weekly&year=2025/);
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
		['/horoscopo/aries/daily/2026-10-08', 404]
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
