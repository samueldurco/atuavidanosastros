import { expect, test } from '@playwright/test';
const headings = [
	'Pessoa A — Fatos registrados',
	'Pessoa B — Fatos registrados',
	'Contexto informado — Fatos registrados',
	'Pessoa A: possibilidades individuais — Hipótese [pair-person-a]',
	'Pessoa B: possibilidades individuais — Hipótese [pair-person-b]',
	'Possibilidades de conversa e negociação — Hipótese [pair-negotiation]',
	'Síntese do Preview do Par (1) e três perguntas práticas'
];
for (const width of [1440, 820, 390, 320]) {
	test(`pair reader separates A/B facts and conversation hypotheses at ${width}`, async ({
		page
	}, testInfo) => {
		await page.setViewportSize({ width, height: 1000 });
		await page.goto('/biblioteca/_spec/fluxo?state=ready&product=pair-preview');
		const consent = page.getByRole('button', { name: 'Recusar analytics' });
		if (await consent.isVisible()) await consent.click();
		await page.evaluate(() => document.fonts.ready);
		await expect(page.getByRole('main')).toHaveCount(1);
		for (const name of headings)
			await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
		const reading = page.locator('#leitura'),
			source = page.locator('#origem');
		await expect(reading.getByRole('heading', { level: 3 })).toHaveCount(7);
		await expect(source.locator('dt')).toHaveCount(7);
		const saved = await source.locator('dd').allTextContents();
		const a = reading.locator('article').nth(0),
			b = reading.locator('article').nth(1);
		for (const body of ['Lua', 'Vênus', 'Marte']) {
			await expect(a).toContainText(`Pessoa A · ${body}:`);
			await expect(a).not.toContainText(`Pessoa B · ${body}:`);
			await expect(b).toContainText(`Pessoa B · ${body}:`);
			await expect(b).not.toContainText(`Pessoa A · ${body}:`);
		}
		await expect(reading.locator('article').nth(2)).toContainText(
			'Contexto sintético consentido. Uma conversa que gostaria de propor.'
		);
		for (const label of [
			'Pessoa A · Lua (person-a-moon)',
			'Pessoa B · Vênus (person-b-venus)',
			'Pessoa A · Marte (person-a-mars)',
			'Pessoa B · Marte (person-b-mars)',
			'Contexto informado (personal-context)',
			'input.context',
			'atv-product-delivery/1.13.0',
			'Base parcial: Lua, Vênus e Marte de A e B em posições separadas;',
			'sem aspectos entre mapas, score de compatibilidade, sentimentos ou destino da relação calculados.',
			'não autoriza compartilhar a leitura; identidade e autorização bilateral não foram verificadas.'
		])
			await expect(source).toContainText(label);
		for (const question of [
			'Que possibilidade de A gostaria de explorar?',
			'Que possibilidade de B gostaria de explorar?',
			'Que conversa consentida gostaria de propor?'
		])
			await expect(reading).toContainText(question);
		await expect(reading).toContainText('Perguntas exploratórias (não são afirmações factuais');
		for (const name of ['Baixar relatório web', 'Baixar card SVG', 'Solicitar e-mail'])
			await expect(page.getByRole('button', { name, exact: true })).toBeDisabled();
		for (const name of ['Baixar cartografia SVG', 'Baixar PDF'])
			await expect(page.getByRole('button', { name, exact: true })).toHaveCount(0);
		expect(
			await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
		).toBeLessThanOrEqual(1);
		await page.screenshot({
			path: testInfo.outputPath(`pair-preview-reader-${width}.png`),
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
test('pair reader preserves absent context without inventing it', async ({ page }) => {
	await page.goto('/biblioteca/_spec/fluxo?state=ready&product=pair-preview&context=absent');
	await expect(page.locator('#leitura').getByRole('heading', { level: 3 })).toHaveCount(6);
	await expect(page.getByRole('heading', { name: headings[2], exact: true })).toHaveCount(0);
	await expect(page.locator('#origem')).toContainText(
		'Nenhum contexto adicional foi informado para este par.'
	);
	await expect(page.locator('#origem').locator('dt')).toHaveCount(6);
});
test('pair reader pending, revocation and failure withhold reading and formats', async ({
	page
}) => {
	for (const [state, name] of [
		['pending', 'Aguardando revisão editorial'],
		['revoked', 'Leitura temporariamente indisponível'],
		['failed', 'Processamento interrompido']
	]) {
		await page.goto(`/biblioteca/_spec/fluxo?state=${state}&product=pair-preview`);
		await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
		await expect(page.locator('#leitura')).toHaveCount(0);
		await expect(page.locator('#origem')).toHaveCount(0);
		await expect(page.getByRole('button', { name: /Baixar/ })).toHaveCount(0);
	}
});
