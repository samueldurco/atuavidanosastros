import { expect, test } from '@playwright/test';

const headings = [
	'Carta registrada — Fato [tarot-focus-fact]',
	'Pergunta relatada — Fato [focus-question-fact]',
	'Possibilidade, tensão e alternativa — Hipótese [focus-symbol]',
	'Conexão com sua pergunta — Hipótese [focus-question]',
	'Um pequeno experimento — Hipótese [focus-practice]',
	'Síntese do Foco Agora (1) e uma pergunta prática'
];
for (const width of [1440, 820, 390, 320]) {
	test(`tarot focus preserves its saved draw and reported question at ${width}`, async ({
		page
	}, testInfo) => {
		await page.setViewportSize({ width, height: 1000 });
		await page.goto('/biblioteca/_spec/fluxo?state=ready&product=tarot-focus');
		const consent = page.getByRole('button', { name: 'Recusar analytics' });
		if (await consent.isVisible()) await consent.click();
		await page.evaluate(() => document.fonts.ready);
		await expect(page.getByRole('main')).toHaveCount(1);
		for (const name of headings)
			await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
		const reading = page.locator('#leitura');
		await expect(reading.getByRole('heading', { level: 3 })).toHaveCount(6);
		await expect(reading).toContainText('Base: Carta registrada (card-1)');
		await expect(reading).toContainText('Base: Pergunta relatada (question-1)');
		await expect(reading).toContainText('Que alternativa posso observar no meu foco agora?');
		await expect(reading).toContainText(
			'Que observação posso fazer ao testar um pequeno experimento hoje?'
		);
		const source = page.locator('#origem');
		for (const label of [
			'Carta registrada (card-1)',
			'Pergunta relatada (question-1)',
			'Contexto relatado (tarot-context)',
			'atv-product-delivery/1.12.0',
			'Fixture de apresentação',
			'parcial',
			'input.questions[0]',
			'input.context'
		])
			await expect(source).toContainText(label);
		await expect(source.locator('dt')).toHaveCount(3);
		const cardValue = source
			.locator('dt')
			.filter({ hasText: 'Carta registrada (card-1)' })
			.locator('..')
			.locator('dd');
		await expect(cardValue).toContainText('Cavaleiro de Copas');
		await expect(reading).toContainText('Contexto relatado (tarot-context)');
		await expect(source).toContainText(
			'Relato sintético consentido: estou considerando uma pequena pausa.'
		);
		const savedCard = await cardValue.textContent();
		await expect(
			page.getByText('O reprocessamento preserva as cartas já registradas. Não é um novo sorteio.')
		).toBeVisible();
		await expect(page.getByRole('button', { name: 'Baixar relatório web' })).toBeDisabled();
		await expect(page.getByRole('button', { name: 'Baixar card SVG', exact: true })).toBeDisabled();
		for (const name of ['Baixar cartografia SVG', 'Baixar PDF'])
			await expect(page.getByRole('button', { name, exact: true })).toHaveCount(0);
		await expect(page.getByRole('button', { name: 'Solicitar e-mail' })).toBeDisabled();
		expect(
			await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
		).toBeLessThanOrEqual(1);
		await page.screenshot({
			path: testInfo.outputPath(`tarot-focus-reader-${width}.png`),
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
		await expect(page.getByRole('heading', { name: headings[5], exact: true })).toBeVisible();
		await expect(cardValue).toHaveText(savedCard!);
	});
}
test('tarot focus pending, revocation and failure withhold reading and formats', async ({
	page
}) => {
	for (const [state, name] of [
		['pending', 'Aguardando revisão editorial'],
		['revoked', 'Leitura temporariamente indisponível'],
		['failed', 'Processamento interrompido']
	]) {
		await page.goto(`/biblioteca/_spec/fluxo?state=${state}&product=tarot-focus`);
		await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
		await expect(page.locator('#leitura')).toHaveCount(0);
		await expect(page.locator('#origem')).toHaveCount(0);
		await expect(page.getByRole('button', { name: /Baixar/ })).toHaveCount(0);
	}
});
