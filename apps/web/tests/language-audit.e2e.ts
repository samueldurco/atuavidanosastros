import { test, expect } from '@playwright/test';
import { productCatalog } from '../../../packages/domain/src/catalog';
import { editorialPages, universes } from '../src/lib/data/site';

test('public pages have concrete titles and no discarded editorial slogans', async ({ page }) => {
	for (const path of [
		'/',
		'/metodo',
		'/caderno',
		'/loja',
		'/noticias',
		'/signos',
		'/horoscopo',
		'/compatibilidade',
		...universes.map((item) => `/${item.slug}`),
		...Object.keys(editorialPages).map((slug) => `/${slug}`)
	]) {
		const response = await page.goto(path);
		expect(response?.status(), path).toBe(200);
		await expect(page.locator('h1'), path).toHaveCount(1);
		const text = await page.locator('main').innerText();
		expect(text, path).not.toMatch(
			/cartografia celeste|atlas editorial|cálculo quando há cálculo|sem transformar tendência em sentença|sem receitas prontas|que direção pede/i
		);
	}
});

for (const product of productCatalog) {
	test(`${product.id}: public offer explains input, formats and actual availability`, async ({
		page
	}) => {
		await page.goto(`/produtos/${product.slug}`);
		await expect(
			page.getByRole('heading', { level: 1, name: product.name, exact: true })
		).toBeVisible();
		await expect(page.getByRole('heading', { name: 'O que você precisa informar' })).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Formatos previstos' })).toBeVisible();
		await expect(page.getByRole('status').getByText('Produto em preparação')).toBeVisible();
		await expect(page.locator('a[href*="checkout"], button[type="submit"]')).toHaveCount(0);
		await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
			'content',
			'noindex, nofollow'
		);
		if (product.personalized) {
			await page.goto(`/biblioteca/nova/${product.id}`);
			await expect(page).toHaveURL(
				new RegExp(`/entrar\\?next=${encodeURIComponent(`/biblioteca/nova/${product.id}`)}$`, 'i')
			);
		}
	});
}

test('home CTA introduces the requested map and cookie preferences remain accessible', async ({
	page
}) => {
	await page.goto('/');
	await expect(
		page.getByRole('link', { name: 'Conhecer meu mapa astral', exact: true })
	).toHaveAttribute('href', '/meu-ceu');
	await page.evaluate(() => ((window as Window & { taskMarker?: string }).taskMarker = 'active'));
	await page.getByRole('button', { name: 'Recusar opcionais' }).click();
	await expect(page.getByRole('button', { name: 'Recusar opcionais' })).toHaveCount(0);
	expect(await page.evaluate(() => (window as Window & { taskMarker?: string }).taskMarker)).toBe(
		'active'
	);
	await page.getByRole('button', { name: 'Preferências de cookies' }).click();
	await expect(page.getByRole('button', { name: 'Aceitar opcionais' })).toBeVisible();
});

test('revoking optional cookies reloads without starting analytics again', async ({ page }) => {
	let analyticsRequests = 0;
	await page.route('https://www.googletagmanager.com/**', async (route) => {
		analyticsRequests++;
		await route.fulfill({ contentType: 'application/javascript', body: '' });
	});
	await page.addInitScript(() => {
		if (!localStorage.getItem('atv-analytics-consent'))
			localStorage.setItem('atv-analytics-consent', 'granted');
	});
	await page.goto('/');
	await expect.poll(() => analyticsRequests).toBe(1);
	await page.getByRole('button', { name: 'Preferências de cookies' }).click();
	await Promise.all([
		page.waitForEvent('load'),
		page.getByRole('button', { name: 'Recusar opcionais' }).click()
	]);
	expect(await page.evaluate(() => localStorage.getItem('atv-analytics-consent'))).toBe('denied');
	expect(analyticsRequests).toBe(1);
	await expect(page.getByRole('button', { name: 'Recusar opcionais' })).toHaveCount(0);
});

for (const width of [1440, 390, 320]) {
	test(`clear product offer at ${width}px`, async ({ page }, info) => {
		await page.setViewportSize({ width, height: 900 });
		await page.goto('/produtos/mapa-astral');
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
			true
		);
		await page.screenshot({ path: info.outputPath(`mapa-${width}.png`), fullPage: true });
	});
}
