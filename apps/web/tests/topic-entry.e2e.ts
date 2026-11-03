import { expect, test } from '@playwright/test';
import { datedForecasts } from './fixtures/editorial-inventory';

test.describe('Caminhos de descoberta no HTML inicial', () => {
	test.use({ javaScriptEnabled: false });

	test('o índice de horóscopo leva às datas dos signos', async ({ page }) => {
		await page.goto('/horoscopo');
		await page.getByRole('link', { name: 'datas dos 12 signos' }).click();
		await expect(page).toHaveURL((url) => url.pathname === '/signos');
		await expect(page.getByRole('table', { name: /signos em ordem zodiacal/i })).toBeVisible();
	});

	test('os guias de carreira apontam diretamente para a ferramenta e os guias relacionados', async ({
		page,
		request
	}) => {
		const tool = '/ferramentas/meio-do-ceu';
		for (const path of [
			'/meio-do-ceu',
			'/mapa-de-proposito',
			'/carreira-no-mapa-astral',
			'/vocacao-no-mapa-astral'
		]) {
			expect((await page.goto(path))?.status(), path).toBe(200);
			await expect(page.getByRole('link', { name: /calcular meu meio do céu/i })).toHaveAttribute(
				'href',
				tool
			);
			if (path === '/meio-do-ceu') {
				for (const guide of ['/casa-10', '/carreira-no-mapa-astral']) {
					await expect(page.locator(`a[href="${guide}"]`).first()).toBeVisible();
				}
			}
			if (path === '/mapa-de-proposito') {
				await expect(
					page.getByRole('link', { name: 'Como ler a vocação no mapa astral' })
				).toHaveAttribute('href', '/vocacao-no-mapa-astral');
			}
		}
		expect((await request.get(tool, { maxRedirects: 0 })).status()).toBe(200);
	});
});

const entries = [
	['mapa-astral', '/mapa-astral', '/ferramentas/mapa-astral'],
	[
		'amor',
		'/noticias/2026/10/sinastria-e-combinacao-de-signos',
		'/ferramentas/combinacao-do-casal'
	],
	['carreira', '/noticias/2026/10/meio-do-ceu-e-reflexao-de-carreira', '/ferramentas/meio-do-ceu'],
	['tarot', '/noticias/2026/10/arcanos-maiores-e-menores', '/ferramentas/carta-do-dia'],
	['sonhos', '/noticias/2026/10/diario-de-sonhos', '/ferramentas/registro-de-sonho']
];

test.use({ viewport: { width: 390, height: 844 } });
test.beforeEach(async ({ page }) => {
	await page.addInitScript(() => localStorage.setItem('atv-analytics-consent', 'denied'));
});

for (const [slug, guide, tool] of entries) {
	test(`o hub ${slug} liga a pergunta inicial ao guia e à experiência gratuita`, async ({
		page
	}) => {
		await page.goto('/temas/' + slug);
		await page.getByRole('link', { name: 'Por onde começar?' }).click();
		const entry = page.locator('#por-onde-comecar');
		await expect(entry.getByRole('heading', { level: 2 })).toBeInViewport();
		const action = entry.locator(`a[href="${tool}"]`);
		await expect(action).toBeVisible();
		await expect(action).toHaveAttribute('data-atv-event', 'tool_select');
		await expect(action).toHaveAttribute('data-atv-tool', tool.split('/').at(-1)!);
		if (slug === 'mapa-astral') {
			await expect(entry.getByRole('link', { name: 'Conhecer os 12 signos' })).toHaveAttribute(
				'href',
				'/signos'
			);
		}
		if (slug === 'carreira') {
			const paths = await page
				.getByRole('navigation', { name: 'Outros caminhos para explorar carreira' })
				.getByRole('link')
				.evaluateAll((links) => links.map((link) => link.getAttribute('href')));
			expect(paths).toEqual([
				'/carreira-no-mapa-astral',
				'/casa-10',
				'/vocacao-no-mapa-astral',
				'/meio-do-ceu',
				'/mapa-de-proposito'
			]);
		}
		expect(
			await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
		).toBeLessThanOrEqual(1);
		await entry.locator(`a[href="${guide}"]`).click();
		await expect(page).toHaveURL((url) => url.pathname === guide);
		await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
	});
}

test('o hub de previsões separa guias e histórico e leva ao horóscopo de Capricórnio', async ({
	page
}) => {
	await page.goto('/temas/previsoes');
	await page.getByRole('link', { name: 'Por onde começar?' }).click();
	const signs = page.getByRole('navigation', { name: 'Horóscopo por signo' });
	const archivedSigns = new Set(datedForecasts.map((doc) => doc.path.split('/')[2]));
	await expect(signs.getByRole('link')).toHaveCount(archivedSigns.size);
	await expect(
		page.locator('link[rel="preload"][as="image"][fetchpriority="high"]')
	).toHaveAttribute('href', '/brand/mvp/assets/universos/fundo-ciclos.webp');
	const guides = page.locator('.article-grid');
	await expect(guides.locator('h3 a')).toHaveCount(2);
	await expect(guides.locator('a[href^="/horoscopo/"]')).toHaveCount(0);
	await signs.getByRole('link', { name: 'Horóscopo de Capricórnio' }).click();
	await expect(page).toHaveURL(/\/horoscopo\/capricornio$/);
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Horóscopo de Capricórnio');
	await expect(
		page.getByRole('navigation', { name: 'Período da leitura' }).getByRole('link')
	).toHaveCount(3);
	await page.getByRole('link', { name: 'Conhecer a leitura personalizada da semana' }).click();
	await expect(page).toHaveURL(/\/produtos\/horoscopo-semanal-pessoal$/);
});
