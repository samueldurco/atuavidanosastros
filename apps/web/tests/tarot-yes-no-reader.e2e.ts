import { expect, test } from '@playwright/test';

const headings = [
	'Carta registrada — Fato [tarot-yes-no-fact]',
	'Pergunta relatada — Fato [yes-no-question-fact]',
	'Possibilidades, limites e alternativas — Hipótese [yes-no-conditions]',
	'Sua pergunta e o que verificar — Hipótese [yes-no-question]',
	'Sua escolha e um passo reversível — Hipótese [yes-no-autonomy]',
	'Síntese do Sim/Não responsável (1) e uma pergunta prática'
];
for (const width of [1440, 820, 390, 320]) {
	test(`tarot yes-no preserves its saved draw and reported question at ${width}`, async ({
		page
	}, testInfo) => {
		await page.setViewportSize({ width, height: 1000 });
		await page.goto('/biblioteca/_spec/fluxo?state=ready&product=tarot-yes-no');
		const consent = page.getByRole('button', { name: 'Recusar opcionais' });
		if (await consent.isVisible()) await consent.click();
		await page.evaluate(() => document.fonts.ready);
		await expect(page.getByRole('main')).toHaveCount(1);
		for (const name of headings)
			await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
		const reading = page.locator('#leitura');
		await expect(reading.getByRole('heading', { level: 3 })).toHaveCount(6);
		await expect(reading).toContainText('Base: Carta registrada (card-1)');
		await expect(reading).toContainText('Base: Pergunta relatada (question-1)');
		await expect(reading).toContainText('Que condição devo observar antes de escolher?');
		await expect(reading).toContainText(
			'Que observação posso fazer ao testar um pequeno experimento hoje?'
		);
		const source = page.locator('#origem');
		for (const label of [
			'Carta registrada (card-1)',
			'Pergunta relatada (question-1)',
			'Contexto relatado (tarot-context)',
			'atv-product-delivery/1.18.0',
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
		await expect(cardValue).toContainText('Rainha de Copas');
		await expect(reading).toContainText('Contexto relatado (tarot-context)');
		await expect(source).toContainText('Relato sintético consentido.');
		const savedCard = await cardValue.textContent();
		await expect(page.getByText('A nova versão usa as mesmas cartas desta tiragem.')).toBeVisible();
		await expect(page.getByRole('button', { name: 'Baixar leitura' })).toBeDisabled();
		await expect(
			page.getByRole('button', { name: 'Baixar imagem (SVG)', exact: true })
		).toBeDisabled();
		for (const name of ['Baixar mapa em SVG', 'Baixar PDF'])
			await expect(page.getByRole('button', { name, exact: true })).toHaveCount(0);
		await expect(page.getByRole('button', { name: 'Solicitar e-mail' })).toBeDisabled();
		expect(
			await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
		).toBeLessThanOrEqual(1);
		await page.screenshot({
			path: testInfo.outputPath(`tarot-yes-no-reader-${width}.png`),
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
test('tarot yes-no pending, revocation and failure withhold reading and formats', async ({
	page
}) => {
	for (const [state, name] of [
		['pending', 'Aguardando revisão editorial'],
		['revoked', 'Leitura temporariamente indisponível'],
		['failed', 'Processamento interrompido']
	]) {
		await page.goto(`/biblioteca/_spec/fluxo?state=${state}&product=tarot-yes-no`);
		await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
		await expect(page.locator('#leitura')).toHaveCount(0);
		await expect(page.locator('#origem')).toHaveCount(0);
		await expect(page.getByRole('button', { name: /Baixar/ })).toHaveCount(0);
	}
});
