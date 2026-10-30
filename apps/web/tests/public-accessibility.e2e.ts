import { expect, test } from '@playwright/test';
import { customerOffers } from '../src/lib/data/product-copy';
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
			// The existing physical catalog renders 319 cards; scan all of them without reducing coverage.
			if (path === '/loja') test.setTimeout(180_000);
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
	const menu = page.locator('button[aria-controls="approved-navigation"]');
	await menu.focus();
	await page.keyboard.press('Enter');
	await expect(menu).toHaveAttribute('aria-expanded', 'true');
	await scan(page, testInfo);
	await page.keyboard.press('Escape');
	await expect(menu).toBeFocused();
	await expect(menu).toHaveAttribute('aria-expanded', 'false');
});

for (const width of [320, 1440]) {
	test(`home integra ferramentas, seis temas, revista, loja e assinatura em ${width}px`, async ({
		page
	}, testInfo) => {
		await page.setViewportSize({ width, height: 1000 });
		await page.goto('/');
		await page.getByRole('button', { name: 'Recusar opcionais' }).click();
		await page.screenshot({ path: testInfo.outputPath(`home-${width}.png`), fullPage: true });
		const main = page.getByRole('main');
		for (const name of [
			'Ferramentas grátis',
			'Leituras para você. Um tema de cada vez.',
			'Por onde seu olhar quer caminhar?',
			'Uma pausa para ler.',
			'O seu universo, perto de você.'
		]) {
			await expect(main.getByRole('heading', { level: 2, name, exact: true })).toBeVisible();
		}
		const themes = page.locator('#universos');
		const themeCards = themes.locator('.home-universe');
		await expect(themeCards).toHaveCount(6);
		const themeHeadings = themeCards.getByRole('heading', { level: 3 });
		await expect(themeHeadings).toHaveText([
			'Mapa astral',
			'Previsões',
			'Amor e relacionamentos',
			'Dinheiro e carreira',
			'Tarot',
			'Sonhos'
		]);
		const themeLinks = themeCards.locator('.universe-main');
		await expect(themeLinks).toHaveCount(6);
		expect(
			await themeLinks.evaluateAll((links) => links.map((link) => link.getAttribute('href')))
		).toEqual([
			'/temas/mapa-astral',
			'/temas/previsoes',
			'/temas/amor',
			'/temas/carreira',
			'/temas/tarot',
			'/temas/sonhos'
		]);
		await expect(
			page.locator('footer').getByRole('link', { name: 'Nosso método', exact: true })
		).toHaveAttribute('href', '/metodo');
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
			true
		);
		const free = page.locator('#ferramentas');
		await expect(free.locator('.tool-card[data-tool]')).toHaveCount(9);
		const firstTool = free.locator('.tool-card[data-tool]').first();
		await firstTool.locator('button.tool-open').click();
		await expect(
			free.locator('[data-tool-panel]:not([hidden])').getByLabel('Data de nascimento')
		).toBeVisible();
		await expect(page).toHaveURL('/');
		await expect(
			main.locator('.showcase-card.subscription a[href="/atv-mais"]').first()
		).toHaveAttribute('href', '/atv-mais');
		await page.goto('/');
		const magazine = page.locator('#revista');
		await expect(magazine.locator('article')).toHaveCount(3);
		if (width <= 960) await page.locator('.mobile-menu').click();
		await page.locator('.nav-trigger[aria-controls="nav-produtos"]').click();
		await page.locator('#nav-produtos .nav-item[href="/leituras"]').click();
		await expect(page).toHaveURL('/leituras');
		await expect(page.locator('.public-product-card')).toHaveCount(19);
		await expect(
			page.locator('.public-product-card').getByText('Em preparação', { exact: true })
		).toHaveCount(19);
		const topic = page.getByRole('navigation', { name: 'Temas das leituras' });
		await topic.getByRole('link', { name: 'Amor e relacionamentos', exact: true }).click();
		await expect(page).toHaveURL('/leituras?tema=amor#catalogo');
		await expect(
			topic.getByRole('link', { name: 'Amor e relacionamentos', exact: true })
		).toHaveAttribute('aria-current', 'page');
		const loveOffers = customerOffers.filter((product) => product.universe === 'amor-relacoes');
		await expect(page.locator('.public-product-card')).toHaveCount(loveOffers.length);
		for (const product of loveOffers) {
			await expect(page.locator(`.public-product-card h3 a[href="${product.href}"]`)).toBeVisible();
		}
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
