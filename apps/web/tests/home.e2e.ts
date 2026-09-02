import { expect, test } from '@playwright/test';
test('home entrega proposta e navegação principal', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('heading', { level: 1 })).toContainText('atlas editorial');
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
