import { expect, test } from '@playwright/test';
const headings = [
	'Base natal — Fatos registrados',
	'Amostra da data (12h UTC) — Fatos registrados',
	'Contexto informado — Fatos registrados',
	'Base natal: possibilidade simbólica — Hipótese [date-natal-basis]',
	'Amostra da data: possibilidade simbólica — Hipótese [date-sample]',
	'Contraste entre base natal e amostra — Hipótese [date-contrast]',
	'Síntese da Previsões para uma Data (1) e três perguntas práticas'
];
for (const width of [1440, 820, 390, 320]) {
	test(`date reader separates recorded base and sample from hypotheses at ${width}`, async ({
		page
	}, testInfo) => {
		await page.setViewportSize({ width, height: 1000 });
		await page.goto('/biblioteca/_spec/fluxo?state=ready&product=date-reading');
		const consent = page.getByRole('button', { name: 'Recusar opcionais' });
		if (await consent.isVisible()) await consent.click();
		await page.evaluate(() => document.fonts.ready);
		await expect(page.getByRole('main')).toHaveCount(1);
		for (const name of headings)
			await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
		const reading = page.locator('#leitura'),
			source = page.locator('#origem');
		await expect(reading.getByRole('heading', { level: 3 })).toHaveCount(7);
		await expect(source.locator('dt')).toHaveCount(22);
		const saved = await source.locator('dd').allTextContents();
		const natal = reading.locator('article').nth(0),
			sample = reading.locator('article').nth(1);
		await expect(natal).toContainText('Base natal · Sol:');
		await expect(natal).toContainText('Base natal · Plutão:');
		await expect(natal).not.toContainText('Amostra da data (12:00 UTC) · Sol:');
		await expect(sample).toContainText('Amostra da data (12:00 UTC) · Sol:');
		await expect(sample).toContainText('Amostra da data (12:00 UTC) · Plutão:');
		await expect(sample).toContainText(
			'Amostra única em 2026-09-29T12:00:00.000Z; não representa o dia local inteiro.'
		);
		await expect(reading.locator('article').nth(2)).toContainText(
			'Contexto sintético consentido. Uma escolha que gostaria de observar.'
		);
		for (const label of [
			'Base natal · Sol (natal-sun)',
			'Amostra da data · Sol (sample-sun)',
			'Instante da amostra (12h UTC) (sample-instant)',
			'Contexto informado (personal-context)',
			'input.context',
			'atv-product-delivery/1.18.0',
			'Base parcial: amostra única das 12h UTC;',
			'sem aspectos, eventos, duração, intensidade ou janelas temporais calculados',
			'não representa o dia local inteiro.'
		])
			await expect(source).toContainText(label);
		for (const question of [
			'O que gostaria de observar na data escolhida?',
			'Que possibilidade da base natal você gostaria de explorar?',
			'Que escolha reversível gostaria de experimentar no seu contexto?'
		])
			await expect(reading).toContainText(question);
		for (const name of ['Baixar relatório web', 'Baixar card SVG', 'Solicitar e-mail'])
			await expect(page.getByRole('button', { name, exact: true })).toBeDisabled();
		for (const name of ['Baixar mapa em SVG', 'Baixar PDF'])
			await expect(page.getByRole('button', { name, exact: true })).toHaveCount(0);
		expect(
			await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
		).toBeLessThanOrEqual(1);
		await page.screenshot({
			path: testInfo.outputPath(`date-reading-reader-${width}.png`),
			fullPage: true
		});
		const history = page.getByRole('link', { name: 'Histórico desta versão', exact: true });
		await history.scrollIntoViewIfNeeded();
		await history.focus();
		await expect(history).toBeFocused();
		await page.keyboard.press('Enter');
		await expect(page).toHaveURL(/#historico$/);
		await expect(page.getByRole('heading', { name: 'Histórico desta versão' })).toBeInViewport();
		await page.reload();
		await expect(page.getByRole('heading', { name: headings[6], exact: true })).toBeVisible();
		expect(await source.locator('dd').allTextContents()).toEqual(saved);
	});
}
test('date reader preserves absent context without inventing it', async ({ page }) => {
	await page.goto('/biblioteca/_spec/fluxo?state=ready&product=date-reading&context=absent');
	await expect(page.locator('#leitura').getByRole('heading', { level: 3 })).toHaveCount(6);
	await expect(page.getByRole('heading', { name: headings[2], exact: true })).toHaveCount(0);
	await expect(page.locator('#origem')).toContainText(
		'Nenhum contexto adicional foi informado para esta data.'
	);
	await expect(page.locator('#origem').locator('dt')).toHaveCount(21);
});
test('date reader pending, revocation and failure withhold reading and formats', async ({
	page
}) => {
	for (const [state, name] of [
		['pending', 'Aguardando revisão editorial'],
		['revoked', 'Leitura temporariamente indisponível'],
		['failed', 'Processamento interrompido']
	]) {
		await page.goto(`/biblioteca/_spec/fluxo?state=${state}&product=date-reading`);
		await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
		await expect(page.locator('#leitura')).toHaveCount(0);
		await expect(page.locator('#origem')).toHaveCount(0);
		await expect(page.getByRole('button', { name: /Baixar/ })).toHaveCount(0);
	}
});
