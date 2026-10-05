import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
	await page.goto('/dashboard/_spec');
	const reject = page.getByRole('button', { name: 'Recusar opcionais' });
	await expect(reject).toBeVisible();
	await reject.click();
	await expect(reject).toHaveCount(0);
});

for (const [state, title, action] of [
	['preview', 'Dados de nascimento', 'Entrar na minha conta'],
	['new', 'Cadastre seus dados de nascimento', 'Cadastrar dados de nascimento'],
	['progress', 'Complete seus dados de nascimento', 'Completar dados de nascimento'],
	[
		'unavailable',
		'Não foi possível carregar seus dados de nascimento.',
		'Carregar dados de nascimento'
	],
	['exact', 'Dados de nascimento salvos', 'Revisar dados de nascimento'],
	['approximate', 'Dados de nascimento salvos', 'Revisar dados de nascimento']
]) {
	test(`recovered state ${state}`, async ({ page }) => {
		const response = await page.goto(`/dashboard/_spec?state=${state}`);
		expect(response?.headers()['cache-control']).toContain('no-store');
		await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
		await expect(page.getByRole('link', { name: `${action} →`, exact: true })).toHaveAttribute(
			'href',
			state === 'preview' ? '/entrar?next=%2Fconta%2Fnascimento' : '/conta/nascimento'
		);
		if (state === 'approximate')
			await expect(page.getByText(/Você informou uma hora aproximada/)).toBeVisible();
		if (state === 'exact')
			await expect(page.getByText(/Consulte, corrija ou exclua/)).toBeVisible();
	});
}

test('library failure is not an empty library; recovery restores independent states', async ({
	page
}) => {
	await page.goto('/dashboard/_spec?state=approximate&library=error');
	await expect(page.getByText('Sua Biblioteca não carregou agora.')).toBeVisible();
	await expect(page.getByText('Você ainda não tem leituras salvas.')).toHaveCount(0);
	await expect(page.getByText('Dados de nascimento salvos')).toBeVisible();
	await page.goto('/dashboard/_spec?state=unavailable&library=saved');
	await expect(
		page.getByRole('heading', { name: 'Leitura sintética de teste', level: 3 })
	).toBeVisible();
	await expect(
		page.getByRole('link', { name: 'Abrir Leitura sintética de teste' })
	).toHaveAttribute('href', '/biblioteca/00000000-0000-4000-8000-000000000052');
	await expect(page.getByText('Não foi possível carregar seus dados de nascimento.')).toBeVisible();
	await expect(page.getByText('Sua Biblioteca não carregou agora.')).toHaveCount(0);
});

for (const [state, copy] of [
	['preview', 'Entre para consultar os registros salvos na sua conta.'],
	['unavailable', 'Não foi possível carregar seus registros. Tente novamente.'],
	['disabled', 'O uso dos registros em outras leituras está desativado.'],
	['empty', 'Você ainda não tem registros salvos.'],
	['granted', 'Você autorizou o uso dos registros nas leituras indicadas no consentimento.'],
	['revoked', 'Você não autorizou o uso dos registros em outras leituras.']
]) {
	test(`continuity summary ${state} is explicit and read-only`, async ({ page }) => {
		const requests: string[] = [];
		page.on('request', (request) => {
			if (request.url().includes('/api/continuity')) requests.push(request.method());
		});
		const response = await page.goto(`/dashboard/_spec?continuity=${state}`);
		expect(response?.headers()['cache-control']).toContain('no-store');
		const summary = page.getByRole('region', { name: 'Registros salvos' });
		await expect(summary.getByText(copy, { exact: false })).toBeVisible();
		await expect(
			summary.getByText(
				'O uso automático desses registros em novas leituras ainda não está disponível.'
			)
		).toBeVisible();
		await expect(summary.locator('input, textarea, button')).toHaveCount(0);
		if (['granted', 'revoked', 'disabled'].includes(state)) {
			await expect(summary.locator('dd')).toHaveText(['6', '3', '1', '2']);
			await expect(
				summary.getByRole('link', { name: 'Gerenciar meus registros →' })
			).toHaveAttribute('href', '/biblioteca#continuity-heading');
		} else await expect(summary.locator('dd')).toHaveCount(0);
		expect(requests).toEqual([]);
	});
}

test('continuity failure is independent and a new page read recovers it', async ({ page }) => {
	await page.goto('/dashboard/_spec?state=exact&library=saved&continuity=unavailable');
	await expect(page.getByText('Dados de nascimento salvos')).toBeVisible();
	await expect(
		page.getByRole('heading', { name: 'Leitura sintética de teste', level: 3 })
	).toBeVisible();
	await expect(page.getByRole('link', { name: 'Tentar novamente →' })).toHaveAttribute(
		'href',
		'/dashboard'
	);
	await page.goto('/dashboard/_spec?state=unavailable&library=error&continuity=granted');
	await expect(
		page.getByText('Você autorizou o uso dos registros nas leituras indicadas no consentimento.', {
			exact: false
		})
	).toBeVisible();
	await expect(page.getByRole('link', { name: 'Tentar novamente →' })).toHaveCount(0);
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
		await page.goto('/dashboard/_spec?state=approximate&library=saved&continuity=granted');
		const continuityLink = page.getByRole('link', { name: 'Gerenciar meus registros →' });
		await continuityLink.focus();
		await expect(continuityLink).toBeFocused();
		expect((await continuityLink.boundingBox())?.height).toBeGreaterThanOrEqual(44);
		expect(await continuityLink.evaluate((el) => getComputedStyle(el).outlineStyle)).not.toBe(
			'none'
		);
		const link = page.getByRole('link', { name: 'Revisar dados de nascimento →', exact: true });
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
		await expect(page).toHaveURL(/\/(conta\/nascimento|entrar(?:\?next=%2Fconta%2Fnascimento)?)$/);
	});
}
