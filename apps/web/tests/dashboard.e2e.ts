import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
	await page.goto('/dashboard/_spec');
	const reject = page.getByRole('button', { name: 'Recusar analytics' });
	await expect(reject).toBeVisible();
	await reject.click();
	await expect(reject).toHaveCount(0);
});

for (const [state, title, action] of [
	['preview', 'Seu contexto, quando você quiser.', 'Entrar na minha conta'],
	['new', 'Seu perfil natal ainda não foi iniciado.', 'Iniciar perfil natal'],
	['progress', 'Seu perfil natal está em andamento.', 'Retomar perfil natal'],
	['unavailable', 'Não foi possível recuperar seu perfil natal.', 'Recuperar perfil natal'],
	['exact', 'Seu perfil natal está salvo.', 'Revisar perfil natal'],
	['approximate', 'Seu perfil natal está salvo.', 'Revisar perfil natal']
]) {
	test(`recovered state ${state}`, async ({ page }) => {
		const response = await page.goto(`/dashboard/_spec?state=${state}`);
		expect(response?.headers()['cache-control']).toContain('no-store');
		await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
		await expect(page.getByRole('link', { name: `${action} →`, exact: true })).toHaveAttribute(
			'href',
			state === 'preview' ? '/entrar' : '/conta/nascimento'
		);
		if (state === 'approximate')
			await expect(page.getByText(/A hora foi informada como aproximada/)).toBeVisible();
		if (state === 'exact' || state === 'approximate')
			await expect(
				page.getByText(/Salvar o perfil não gera uma leitura nem libera produtos/)
			).toBeVisible();
	});
}

test('library failure is not an empty library; recovery restores independent states', async ({
	page
}) => {
	await page.goto('/dashboard/_spec?state=approximate&library=error');
	await expect(page.getByText('Sua Biblioteca não carregou agora.')).toBeVisible();
	await expect(page.getByText('Sua primeira leitura pode começar agora.')).toHaveCount(0);
	await expect(page.getByText('Seu perfil natal está salvo.')).toBeVisible();
	await page.goto('/dashboard/_spec?state=unavailable&library=saved');
	await expect(page.getByRole('heading', { name: 'Leitura sintética de teste' })).toBeVisible();
	await expect(
		page.getByRole('link', { name: 'Abrir Leitura sintética de teste' })
	).toHaveAttribute('href', '/biblioteca/00000000-0000-4000-8000-000000000052');
	await expect(page.getByText('Não foi possível recuperar seu perfil natal.')).toBeVisible();
	await expect(page.getByText('Sua Biblioteca não carregou agora.')).toHaveCount(0);
});

for (const [width, height] of [
	[1440, 1000],
	[820, 1180],
	[390, 844],
	[320, 800]
]) {
	test(`visual and keyboard ${width}`, async ({ page }, info) => {
		await page.setViewportSize({ width, height });
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await page.goto('/dashboard/_spec?state=approximate&library=saved');
		const link = page.getByRole('link', { name: 'Revisar perfil natal →', exact: true });
		await link.focus();
		await expect(link).toBeFocused();
		expect((await link.boundingBox())?.height).toBeGreaterThanOrEqual(44);
		expect(await link.evaluate((el) => getComputedStyle(el).outlineStyle)).not.toBe('none');
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
			true
		);
		await page.evaluate(() => scrollTo(0, 0));
		await page.screenshot({ path: info.outputPath(`dashboard-${width}.png`), fullPage: true });
		await link.focus();
		await page.keyboard.press('Enter');
		await expect(page).toHaveURL(/\/(conta\/nascimento|entrar)$/);
	});
}
