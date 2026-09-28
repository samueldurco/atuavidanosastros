import { expect, test } from '@playwright/test';

const base = '/biblioteca/_spec/historico';
const cursor = '00000000-0000-4000-8000-000000000004';

test('navega, limpa filtros de outra página e recupera a primeira sem duplicar registros', async ({
	page
}) => {
	await page.goto(base);
	await expect(page.getByText('3', { exact: true })).toBeVisible();
	await expect(page.getByText('registros nesta página', { exact: true })).toBeVisible();
	await expect(page.getByRole('article')).toHaveCount(3);
	await page.getByRole('button', { name: 'Tarot', exact: true }).click();
	await page.getByLabel('Buscar nesta página').fill('sem correspondência');
	await page.getByLabel('Ordenar por').selectOption('title');
	const older = page.getByRole('link', { name: 'Ver registros anteriores' });
	await older.focus();
	await expect(older).toBeFocused();
	await page.keyboard.press('Enter');
	await expect(page).toHaveURL(new RegExp(`before=${cursor}$`));
	await expect(page.getByRole('article')).toHaveCount(3);
	await expect(page.getByLabel('Buscar nesta página')).toHaveValue('');
	await expect(page.getByLabel('Ordenar por')).toHaveValue('recent');
	await expect(page.getByRole('article').first()).toContainText('Leitura sintética 3');
	await expect(older).toHaveCount(0);
	await page.reload();
	await expect(page.getByRole('article').first()).toContainText('Leitura sintética 3');
	await page.getByRole('link', { name: 'Voltar aos mais recentes' }).click();
	await expect(page).toHaveURL(new RegExp(`${base}$`));
	await expect(page.getByRole('article').first()).toContainText('Leitura sintética 6');
});

for (const [state, title] of [
	['expired', 'Este ponto do histórico não está mais disponível.'],
	['error', 'Não foi possível carregar sua Biblioteca.'],
	['empty', 'Não há registros anteriores neste trecho.']
])
	test(`recupera histórico no estado ${state} sem apresentar acervo vazio`, async ({ page }) => {
		await page.goto(`${base}?before=${cursor}&state=${state}`);
		await expect(page.getByRole('heading', { name: title })).toBeVisible();
		await expect(
			page.getByRole('heading', { name: 'Sua Biblioteca ainda está vazia.' })
		).toHaveCount(0);
		await expect(page.getByRole('article')).toHaveCount(0);
		if (state === 'error')
			await expect(page.getByRole('link', { name: 'Tentar novamente' })).toHaveAttribute(
				'href',
				`${base}?before=${cursor}`
			);
		await page.getByRole('link', { name: 'Voltar aos mais recentes' }).click();
		await expect(page.getByRole('article')).toHaveCount(3);
	});

for (const [width, height] of [
	[1440, 1000],
	[820, 1180],
	[390, 844],
	[320, 800]
]) {
	test(`paginação legível e sem overflow em ${width}px`, async ({ page }) => {
		await page.setViewportSize({ width, height });
		await page.goto(`${base}?before=${cursor}`);
		await expect(
			page.getByText('Busca, filtros e ordenação se aplicam somente aos registros desta página.')
		).toBeVisible();
		const nav = page.getByRole('navigation', { name: 'Páginas do histórico' });
		await nav.scrollIntoViewIfNeeded();
		await expect(nav).toBeVisible();
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
			true
		);
		const box = await nav.getByRole('link').boundingBox();
		expect(box?.height).toBeGreaterThanOrEqual(44);
		await page.screenshot({
			path: `../../test-results/wu110-library-${width}.png`,
			fullPage: true
		});
	});
}

test('navegação por links funciona sem JavaScript', async ({ browser }) => {
	const context = await browser.newContext({ javaScriptEnabled: false });
	try {
		const page = await context.newPage();
		await page.goto(`http://127.0.0.1:4173${base}`);
		await page.getByRole('link', { name: 'Ver registros anteriores' }).click();
		await expect(page.getByRole('article').first()).toContainText('Leitura sintética 3');
		await page.getByRole('link', { name: 'Voltar aos mais recentes' }).click();
		await expect(page.getByRole('article').first()).toContainText('Leitura sintética 6');
	} finally {
		await context.close();
	}
});
