import { expect, test } from '@playwright/test';
for (const width of [1440, 820, 390, 320])
	test(`synastry complete structural reader at ${width}`, async ({ page }, testInfo) => {
		await page.setViewportSize({ width, height: 1000 });
		await page.goto('/biblioteca/_spec/fluxo?state=ready&product=synastry');
		const consent = page.getByRole('button', { name: 'Recusar analytics' });
		if (await consent.isVisible()) await consent.click();
		await page.evaluate(() => document.fonts.ready);
		const reading = page.locator('#leitura'),
			source = page.locator('#origem');
		await expect(page.getByRole('main')).toHaveCount(1);
		await expect(reading.getByRole('heading', { level: 3 })).toHaveCount(33);
		await expect(source.locator('dt')).toHaveCount(121);
		await expect(reading.locator('article').nth(0)).toContainText('Pessoa A');
		await expect(reading.locator('article').nth(0)).not.toContainText('Pessoa B');
		await expect(reading.locator('article').nth(1)).toContainText('Pessoa B');
		await expect(reading.locator('article').nth(1)).not.toContainText('Pessoa A');
		for (const name of [
			'Comunicação',
			'Vínculo',
			'Desejo',
			'Segurança',
			'Autonomia',
			'Conflito',
			'Reparação',
			'Negociação',
			'Crescimento'
		])
			await expect(
				reading.getByRole('heading', { name: new RegExp(`^${name} — Hipótese`) })
			).toBeVisible();
		const rows = reading
			.locator('article')
			.filter({ has: page.getByRole('heading', { name: /— Pares registrados$/ }) });
		await expect(rows).toHaveCount(10);
		for (const label of [
			'Sol de A × Sol de B (cross-sun-sun)',
			'Plutão de A × Plutão de B (cross-pluto-pluto)',
			'Pessoa B · Plutão (person-b-pluto)',
			'Contexto informado (personal-context)'
		])
			await expect(source).toContainText(label);
		await expect(
			reading.getByRole('heading', {
				name: 'Síntese da Sinastria (1) e três perguntas práticas',
				exact: true
			})
		).toBeVisible();
		await expect(reading).toContainText('Que escolha reversível preserva autonomia na reparação?');
		await expect(source).toContainText('compartilh');
		await expect(source).toContainText('desconhecida');
		for (const name of [
			'Baixar PDF',
			'Baixar relatório web',
			'Baixar card SVG',
			'Solicitar e-mail'
		])
			await expect(page.getByRole('button', { name, exact: true })).toBeDisabled();
		expect(
			await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
		).toBeLessThanOrEqual(1);
		await page.screenshot({
			path: testInfo.outputPath(`synastry-reader-${width}.png`),
			fullPage: true
		});
		for (const [name, target] of [
			['base', rows.first()],
			['temas', reading.getByRole('heading', { name: /^Autonomia — Hipótese/ })],
			['origem', source],
			['historico', page.getByRole('heading', { name: 'Histórico desta versão', exact: true })]
		] as const) {
			await target.scrollIntoViewIfNeeded();
			await page.screenshot({ path: testInfo.outputPath(`synastry-reader-${width}-${name}.png`) });
		}
		const history = page.getByRole('link', { name: 'Histórico desta versão', exact: true });
		await history.focus();
		await expect(history).toBeFocused();
		await page.keyboard.press('Enter');
		await expect(page).toHaveURL(/#historico$/);
		const saved = await source.locator('dd').allTextContents();
		await page.reload();
		expect(await source.locator('dd').allTextContents()).toEqual(saved);
	});
test('synastry missing context is preserved explicitly', async ({ page }) => {
	await page.goto('/biblioteca/_spec/fluxo?state=ready&product=synastry&context=absent');
	await expect(page.locator('#leitura').getByRole('heading', { level: 3 })).toHaveCount(32);
	await expect(page.locator('#origem').locator('dt')).toHaveCount(120);
	await expect(page.locator('#origem')).toContainText(
		'Nenhum contexto adicional foi informado para este par.'
	);
});
test('synastry gates withhold reading and formats for all unavailable states', async ({ page }) => {
	for (const [state, name] of [
		['pending', 'Aguardando revisão editorial'],
		['revoked', 'Leitura temporariamente indisponível'],
		['failed', 'Processamento interrompido']
	]) {
		await page.goto(`/biblioteca/_spec/fluxo?state=${state}&product=synastry`);
		await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
		await expect(page.locator('#leitura')).toHaveCount(0);
		await expect(page.locator('#origem')).toHaveCount(0);
		await expect(page.getByRole('button', { name: 'Baixar PDF', exact: true })).toHaveCount(0);
	}
});
