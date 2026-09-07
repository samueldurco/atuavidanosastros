import { expect, test } from '@playwright/test';
test('home entrega proposta e navegação principal', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('heading', { level: 1 })).toContainText(
		'Uma linguagem para olhar a vida com mais clareza.'
	);
	await expect(
		page.getByRole('link', { name: 'Experimentar a Bússola de Carreira' })
	).toBeVisible();
});
test('loja comunica preparação sem oferta fictícia', async ({ page }) => {
	await page.goto('/loja');
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Loja dos Signos');
	await expect(
		page.getByText('Ainda não há produtos, preços, estoque, prazo ou avaliações publicados.')
	).toBeVisible();
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
	await page.getByLabel('Deslocamento UTC').fill('-03:00');
	await page.getByRole('button', { name: 'Calcular minha bússola' }).click();
	await expect(page.getByText(/Seu Meio do Céu está em/)).toBeVisible();
	await expect(page.getByText(/Dados de nascimento não são armazenados/)).toBeVisible();
	await expect(page.getByRole('link', { name: 'Entrar para salvar na Biblioteca' })).toBeVisible();
});
