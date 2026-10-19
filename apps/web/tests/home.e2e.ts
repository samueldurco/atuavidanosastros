import { selectCity } from './fixtures/city-search';
import { expect, test } from '@playwright/test';
test('home entrega proposta e navegação principal', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('heading', { level: 1 })).toContainText(
		'Conheça seu mapa. Explore seu momento.'
	);
	const chart = page.getByRole('link', { name: 'Experimente grátis', exact: true });
	await expect(chart).toBeVisible();
	await expect(chart).toHaveAttribute('href', '#ferramentas');
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

test('endereço anterior da Bússola abre o Meio do Céu sem cadastro', async ({ page }) => {
	await page.goto('/bussola-de-carreira');
	await expect(page).toHaveURL('/ferramentas/meio-do-ceu');
	await page.getByLabel('Data de nascimento').fill('2000-01-01');
	await page.getByLabel('Hora de nascimento').fill('09:00');
	await selectCity(
		page,
		'#meio-do-ceu-first-birth-city',
		'São Paulo',
		'São Paulo, São Paulo, Brasil'
	);
	await page.getByRole('button', { name: 'Calcular meu Meio do Céu' }).click();
	await expect(page.locator('.result-card')).toContainText('Meio do Céu');
	await expect(
		page.getByText('Não é preciso criar uma conta para ver o resultado.', { exact: false })
	).toBeVisible();
	await expect(page.getByRole('link', { name: 'Entrar para salvar e continuar' })).toBeVisible();
});
