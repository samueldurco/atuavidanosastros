import { expect, test } from '@playwright/test';
test('home entrega proposta e navegação principal', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('heading', { level: 1 })).toContainText(
		'Conheça seu mapa. Explore seu momento.'
	);
	const chart = page.getByRole('link', { name: 'Conhecer meu mapa astral', exact: true });
	await expect(chart).toBeVisible();
	await expect(chart).toHaveAttribute('href', '/meu-ceu');
});
test('loja comunica preparação sem oferta fictícia', async ({ page }) => {
	await page.goto('/loja');
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Loja dos Signos');
	await expect(page.getByText('Compras ainda indisponíveis', { exact: true })).toBeVisible();
	await expect(page.getByRole('link', { name: /comprar|pagar|checkout/i })).toHaveCount(0);
});

test('healthcheck e autenticação degradam com segurança sem configuração', async ({
	page,
	request
}) => {
	const health = await request.get('/api/health');
	expect(health.ok()).toBeTruthy();
	await page.goto('/entrar');
	await expect(page.getByRole('button', { name: 'Continuar com Google' })).toBeDisabled();
});

test('Bússola calcula Meio do Céu sem cadastro', async ({ page }) => {
	await page.goto('/bussola-de-carreira');
	await page.getByLabel('Data de nascimento').fill('2000-01-01');
	await page.getByLabel('Hora de nascimento').fill('09:00');
	await page.getByLabel('Cidade de nascimento').fill('São Paulo, Brasil');
	await page.getByLabel('Latitude').fill('-23.5505');
	await page.getByLabel('Longitude').fill('-46.6333');
	await page.getByLabel('Fuso de nascimento (UTC)').fill('-03:00');
	await page.getByRole('button', { name: 'Calcular meu Meio do Céu' }).click();
	await expect(page.getByRole('heading', { name: /Meio do Céu em/ })).toBeVisible();
	await expect(page.getByText(/Dados de nascimento não são armazenados/)).toBeVisible();
	await expect(page.getByRole('link', { name: 'Entrar para guardar meus cálculos' })).toBeVisible();
});
