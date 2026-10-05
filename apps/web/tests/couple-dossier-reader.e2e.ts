import { expect, test } from '@playwright/test';
for (const width of [1440, 820, 390, 320])
	test(`couple-dossier complete structural reader at ${width}`, async ({ page }, testInfo) => {
		test.setTimeout(60_000);
		await page.setViewportSize({ width, height: 1000 });
		await page.goto('/biblioteca/_spec/fluxo?state=ready&product=couple-dossier');
		const consent = page.getByRole('button', { name: 'Recusar opcionais' });
		if (await consent.isVisible()) await consent.click();
		await page.evaluate(() => document.fonts.ready);
		const reading = page.locator('#leitura'),
			source = page.locator('#origem');
		await expect(page.getByRole('main')).toHaveCount(1);
		await expect(reading.getByRole('heading', { level: 3 })).toHaveCount(35);
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
				name: 'Síntese do Dossiê do Casal (2) e três perguntas práticas',
				exact: true
			})
		).toBeVisible();
		await expect(
			reading.getByRole('heading', { name: 'Conexões possíveis do Dossiê (1)', exact: true })
		).toBeVisible();
		await expect(
			reading.getByRole('heading', { name: 'Síntese do Dossiê do Casal (1)', exact: true })
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
			path: testInfo.outputPath(`couple-dossier-reader-${width}.png`),
			fullPage: true
		});
		for (const [name, target] of [
			['base', rows.first()],
			['temas', reading.getByRole('heading', { name: /^Autonomia — Hipótese/ })],
			['origem', source],
			['historico', page.getByRole('heading', { name: 'Histórico desta versão', exact: true })]
		] as const) {
			await target.scrollIntoViewIfNeeded();
			await page.screenshot({
				path: testInfo.outputPath(`couple-dossier-reader-${width}-${name}.png`)
			});
		}
		const history = page.getByRole('link', { name: 'Histórico desta versão', exact: true });
		await history.focus();
		await expect(history).toBeFocused();
		await page.keyboard.press('Enter');
		await expect(page).toHaveURL(/#historico$/);
		const saved = await source.locator('dd').allTextContents();
		await page.reload();
		await expect(source.locator('dd')).toHaveText(saved);
	});
test('couple-dossier missing context is preserved explicitly', async ({ page }) => {
	await page.goto('/biblioteca/_spec/fluxo?state=ready&product=couple-dossier&context=absent');
	await expect(page.locator('#leitura').getByRole('heading', { level: 3 })).toHaveCount(34);
	await expect(page.locator('#origem').locator('dt')).toHaveCount(120);
	await expect(page.locator('#origem')).toContainText(
		'Nenhum contexto adicional foi informado para este par.'
	);
});
test('couple-dossier gates withhold reading and formats for all unavailable states', async ({
	page
}) => {
	for (const [state, name] of [
		['pending', 'Aguardando revisão editorial'],
		['revoked', 'Leitura temporariamente indisponível'],
		['failed', 'Processamento interrompido']
	]) {
		await page.goto(`/biblioteca/_spec/fluxo?state=${state}&product=couple-dossier`);
		await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
		await expect(page.locator('#leitura')).toHaveCount(0);
		await expect(page.locator('#origem')).toHaveCount(0);
		await expect(page.getByRole('button', { name: 'Baixar PDF', exact: true })).toHaveCount(0);
	}
});
