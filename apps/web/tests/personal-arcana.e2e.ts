import { test, expect } from '@playwright/test';

const path = '/ferramentas/arcano-pessoal';

for (const width of [390, 1440]) {
	test(`arcano pessoal opera localmente e exibe o baralho canônico em ${width}px`, async ({
		page
	}, testInfo) => {
		await page.setViewportSize({ width, height: 920 });
		await page.addInitScript(() => localStorage.setItem('atv-analytics-consent', 'granted'));
		await page.goto(path);
		await expect(page.getByRole('heading', { level: 1 })).toContainText('Arcano Pessoal');
		const button = page.getByRole('button', { name: 'Calcular meu arcano pessoal' });
		const field = page.getByLabel('Data de nascimento');
		const outbound: string[] = [];
		page.on('request', (req) => outbound.push(req.url() + ' ' + (req.postData() ?? '')));
		await button.click();
		await expect(page.getByRole('alert')).toContainText('Confira o dia');
		for (const [birth, name, image, sum] of [
			['2000-01-01', 'O Imperador', 'major-4', '0 + 1 + 0 + 1 + 2 + 0 + 0 + 0 = 4'],
			['2000-09-29', 'O Louco', 'major-0', '2 + 9 + 0 + 9 + 2 + 0 + 0 + 0 = 22'],
			['2001-09-29', 'O Hierofante', 'major-5', '2 + 3 = 5']
		]) {
			await field.fill(birth!);
			await expect(page.getByRole('region', { name: 'Resultado do cálculo' })).toHaveCount(0);
			await button.click();
			const result = page.getByRole('region', { name: 'Resultado do cálculo' });
			await expect(result.getByRole('heading', { name, exact: true })).toBeFocused();
			await expect(result).toContainText(sum!);
			await expect(result.getByRole('img')).toHaveAttribute('src', `/tarot/rws/${image}.jpg`);
			await expect
				.poll(() => result.getByRole('img').evaluate((el) => (el as HTMLImageElement).naturalWidth))
				.toBeGreaterThan(0);
		}
		await expect(page).toHaveURL(path);
		expect(outbound.join('\n')).not.toMatch(/2000-01-01|2000-09-29|2001-09-29|\/api\/free-tools\//);
		const browserState = await page.evaluate(() =>
			JSON.stringify([
				window.localStorage,
				window.sessionStorage,
				(window as Window & { dataLayer?: unknown[] }).dataLayer
			])
		);
		expect(browserState).not.toMatch(/2000-01-01|2000-09-29|2001-09-29|O Hierofante/);
		expect(browserState).toContain('atv_tool_result');
		expect(
			await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
		).toBeLessThanOrEqual(1);
		await page.screenshot({
			path: testInfo.outputPath(`arcano-pessoal-${width}.png`),
			fullPage: true
		});
	});
}

test('descoberta no universo Tarot, sitemap, home e diretório', async ({ page, request }) => {
	const ssr = await request.get(path);
	expect(await ssr.text()).toContain('Como calcular o arcano pessoal?');
	expect(await (await request.get('/sitemap-pages.xml')).text()).toContain(path + '</loc>');
	await page.goto('/temas/tarot');
	await page.getByRole('link', { name: 'Calcular meu arcano pessoal' }).click();
	await expect(page).toHaveURL(path, { timeout: 30000 });
	for (const url of ['/', '/ferramentas']) {
		await page.goto(url);
		await page.locator('#open-arcano-pessoal').click();
		const panel = page.locator('[data-tool-panel="arcano-pessoal"]');
		await panel.getByLabel('Data de nascimento').fill('2000-09-29');
		await panel.getByRole('button', { name: 'Calcular meu arcano pessoal' }).click();
		await expect(panel.getByRole('heading', { name: 'O Louco', exact: true })).toBeFocused();
		await expect(
			panel.getByRole('link', { name: 'Abrir a página da calculadora de arcano pessoal' })
		).toHaveAttribute('href', path);
		await panel.getByRole('button', { name: 'Fechar Calculadora de Arcano Pessoal' }).click();
		await expect(panel).toBeHidden();
	}
});
