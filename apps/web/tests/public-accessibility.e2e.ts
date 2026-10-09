import { expect, test } from '@playwright/test';
import { scanAccessibility as scan } from './fixtures/accessibility';

const surfaces = [
	'/',
	'/entrar',
	'/bussola-de-carreira',
	'/meu-ceu',
	'/loja',
	'/metodo',
	'/leituras',
	'/caderno'
];
const viewports = [
	{ name: 'desktop', width: 1440, height: 1000 },
	{ name: 'mobile', width: 390, height: 844 }
];

for (const viewport of viewports) {
	for (const path of surfaces) {
		test(`acessibilidade pública ${viewport.name}: ${path}`, async ({ page }, testInfo) => {
			await page.setViewportSize(viewport);
			const response = await page.goto(path);
			expect(response?.status()).toBe(200);
			await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
			await expect(page.getByRole('button', { name: 'Recusar opcionais' })).toBeVisible();
			await scan(page, testInfo);
		});
	}

	test(`página não encontrada ${viewport.name}`, async ({ page }, testInfo) => {
		await page.setViewportSize(viewport);
		const response = await page.goto('/pagina-inexistente-a11y');
		expect(response?.status()).toBe(404);
		await expect(page.getByRole('heading', { level: 1 })).toHaveText('Página não encontrada');
		await expect(page).toHaveTitle('Página não encontrada — A Tua Vida nos Astros');
		await scan(page, testInfo);
		await page.getByRole('link', { name: 'Voltar ao início' }).click();
		await expect(page).toHaveURL('/');
	});

	test(`home após recusar cookies opcionais ${viewport.name}`, async ({ page }, testInfo) => {
		await page.setViewportSize(viewport);
		await page.goto('/');
		await page.getByRole('button', { name: 'Recusar opcionais' }).click();
		await expect(page.getByRole('complementary', { name: 'Preferências de cookies' })).toHaveCount(
			0
		);
		await scan(page, testInfo);
	});
}

test('menu público aberto por teclado no celular', async ({ page }, testInfo) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/');
	await page.getByRole('button', { name: 'Recusar opcionais' }).click();
	const menu = page.locator('button[aria-controls="primary-navigation"]');
	await menu.focus();
	await page.keyboard.press('Enter');
	await expect(menu).toHaveAttribute('aria-expanded', 'true');
	await scan(page, testInfo);
	await page.keyboard.press('Escape');
	await expect(menu).toBeFocused();
	await expect(menu).toHaveAttribute('aria-expanded', 'false');
});

for (const width of [320, 1440]) {
	test(`home organiza ferramentas, leituras, revista e produtos físicos em ${width}px`, async ({
		page
	}, testInfo) => {
		await page.setViewportSize({ width, height: 1000 });
		await page.goto('/');
		await page.getByRole('button', { name: 'Recusar opcionais' }).click();
		await page.screenshot({ path: testInfo.outputPath(`home-${width}.png`), fullPage: true });
		const sections = page.locator('main > section[aria-labelledby]');
		await expect(sections).toHaveCount(4);
		for (const [index, name] of [
			'Comece gratuitamente.',
			'Leituras e experiências.',
			'Revista ATVNA.',
			'Loja dos Signos.'
		].entries()) {
			await expect(sections.nth(index).getByRole('heading', { level: 2 })).toHaveText(name);
		}
		const free = page.getByRole('region', { name: 'Comece gratuitamente' });
		await expect(free.getByRole('link')).toHaveCount(1);
		await free.getByRole('link', { name: 'Calcular meu Meio do Céu grátis' }).click();
		await expect(page).toHaveURL('/bussola-de-carreira');
		await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
		await page.goto('/');
		const magazine = page.getByRole('region', { name: 'Revista ATVNA' });
		await expect(magazine.locator('article')).toHaveCount(3);
		await page.getByRole('link', { name: 'Ver todas as leituras' }).click();
		await expect(page).toHaveURL('/leituras');
		await expect(page.locator('.product-card')).toHaveCount(26);
		await expect(
			page.locator('.product-card').getByText('Em preparação', { exact: true })
		).toHaveCount(26);
		const topic = page.getByRole('navigation', { name: 'Temas das leituras' });
		await topic.getByRole('link', { name: 'Amor e relacionamentos', exact: true }).click();
		await expect(page).toHaveURL('/leituras?tema=amor');
		await expect(
			topic.getByRole('link', { name: 'Amor e relacionamentos', exact: true })
		).toHaveAttribute('aria-current', 'page');
		await expect(page.locator('.product-group')).toHaveCount(1);
		await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
			'href',
			'https://atuavidanosastros.com.br/leituras'
		);
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
			true
		);
	});
}

test('Meio do Céu público calcula sem conta com dados sintéticos', async ({ request }) => {
	const response = await request.post('/api/astrology/midheaven', {
		data: {
			utcInstant: '2000-01-01T12:00:00.000Z',
			localDateTime: '2000-01-01T09:00:00',
			timezone: 'UTC-03:00',
			latitude: -23.5505,
			longitude: -46.6333,
			locationSource: 'user-provided-coordinates'
		}
	});
	expect(response.status()).toBe(200);
	const result = await response.json();
	expect(result.sign).toEqual(expect.any(String));
	expect(result.degree).toBeGreaterThanOrEqual(0);
	expect(result.degree).toBeLessThan(30);
	expect(result.midheaven).toBeGreaterThanOrEqual(0);
	expect(result.midheaven).toBeLessThan(360);
	expect(result.provenance).toBeTruthy();
});
