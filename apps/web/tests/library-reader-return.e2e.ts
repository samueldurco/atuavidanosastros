import { expect, test } from '@playwright/test';

const cursor = '00000000-0000-4000-8000-000000000004';
const history = '/biblioteca/_spec/historico';
const target = `/biblioteca?before=${cursor}`;

test('older and first-page cards produce bounded reader links', async ({ page }) => {
	await page.goto(`${history}?before=${cursor}`);
	const link = page.getByRole('link', { name: 'Abrir Leitura sintética 3', exact: true });
	await expect(link).toHaveAttribute(
		'href',
		`/biblioteca/00000000-0000-4000-8000-000000000003?fromBefore=${cursor}`
	);
	await page.getByRole('link', { name: 'Voltar aos mais recentes' }).click();
	await expect(
		page.getByRole('link', { name: 'Abrir Leitura sintética 6', exact: true })
	).toHaveAttribute('href', '/biblioteca/00000000-0000-4000-8000-000000000006');
});

for (const reader of ['fluxo', 'leitor']) {
	test(`${reader}: preserves the cursor through reload and keyboard return`, async ({ page }) => {
		await page.goto(`/biblioteca/_spec/${reader}?fromBefore=${cursor}`);
		const back = page.getByRole('link', { name: 'Voltar à Biblioteca', exact: true });
		await expect(back).toHaveAttribute('href', target);
		await expect(
			page
				.getByRole('navigation', { name: 'Caminho do resultado' })
				.getByRole('link', { name: 'Biblioteca', exact: true })
		).toHaveAttribute('href', target);
		await page.reload();
		await expect(back).toHaveAttribute('href', target);
		// Only the destination is intercepted: no authenticated session/database is fabricated.
		let destination: string | undefined;
		await page.route(/\/biblioteca(?:\/__data\.json)?\?before=/, async (route) => {
			destination = new URL(route.request().url()).searchParams.get('before') ?? undefined;
			await route.abort();
		});
		const consent = page.getByRole('button', { name: 'Recusar opcionais' });
		if (await consent.isVisible()) await consent.click();
		await back.focus();
		await expect(back).toBeFocused();
		await page.keyboard.press('Enter');
		await expect.poll(() => destination).toBe(cursor);
	});

	test(`${reader}: malformed and repeated origins fall back to first page`, async ({ page }) => {
		for (const query of [
			'',
			'fromBefore=https%3A%2F%2Fexternal.test',
			`fromBefore=${cursor}&fromBefore=${cursor}`
		]) {
			await page.goto(`/biblioteca/_spec/${reader}?${query}`);
			await expect(
				page.getByRole('link', { name: 'Voltar à Biblioteca', exact: true })
			).toHaveAttribute('href', '/biblioteca');
		}
	});

	test(`${reader}: return is server-rendered without JavaScript`, async ({ browser, baseURL }) => {
		const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
		const page = await context.newPage();
		await page.goto(`/biblioteca/_spec/${reader}?fromBefore=${cursor}`);
		await expect(
			page.getByRole('link', { name: 'Voltar à Biblioteca', exact: true })
		).toHaveAttribute('href', target);
		await context.close();
	});
}
