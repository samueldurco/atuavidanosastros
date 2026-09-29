import { expect, test } from '@playwright/test';

const questions = [
	'Que possibilidade posso observar?',
	'Que limite quero reconhecer?',
	'Que alternativa posso experimentar?'
];
const headings = [1, 2, 3]
	.flatMap((index) => [
		`Pergunta ${index} e carta registrada — Fatos registrados`,
		`Leitura da pergunta ${index} — Hipótese [question-${index}-reading]`
	])
	.concat([
		'Convergências e tensões entre as três perguntas (1)',
		'Síntese das Três Perguntas (1) e três perguntas práticas'
	]);
for (const width of [1440, 820, 390, 320]) {
	test(`three questions preserves its three saved pairs at ${width}`, async ({
		page
	}, testInfo) => {
		await page.setViewportSize({ width, height: 1000 });
		await page.goto('/biblioteca/_spec/fluxo?state=ready&product=three-questions');
		const consent = page.getByRole('button', { name: 'Recusar analytics' });
		if (await consent.isVisible()) await consent.click();
		await page.evaluate(() => document.fonts.ready);
		await expect(page.getByRole('main')).toHaveCount(1);
		for (const name of headings)
			await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
		const reading = page.locator('#leitura');
		await expect(reading.getByRole('heading', { level: 3 })).toHaveCount(8);
		const source = page.locator('#origem');
		await expect(source.locator('dt')).toHaveCount(7);
		const savedPairs: string[] = [];
		for (let index = 1; index <= 3; index++) {
			const questionLabel = `Pergunta relatada ${index} (question-${index})`;
			const cardLabel = `Carta registrada ${index} (card-${index})`;
			await expect(reading).toContainText(`Base: ${questionLabel} · ${cardLabel}`);
			await expect(reading).toContainText(questions[index - 1]);
			await expect(source).toContainText(`input.questions[${index - 1}]`);
			const card = source.locator('dt').filter({ hasText: cardLabel }).locator('..').locator('dd');
			const cardText = (await card.textContent())!;
			savedPairs.push(cardText);
			const pair = reading.locator('article').filter({
				has: page.getByRole('heading', { name: headings[(index - 1) * 2], exact: true })
			});
			await expect(pair).toContainText(questions[index - 1]);
			// The source includes provenance after the display; compare its visible fact text separately.
			const display = await card.evaluate((node) =>
				Array.from(node.childNodes)
					.filter((child) => child.nodeType === Node.TEXT_NODE)
					.map((child) => child.textContent)
					.join('')
			);
			expect(display).not.toBe('');
			await expect(pair).toContainText(display);
		}
		for (const label of [
			'Contexto relatado (tarot-context)',
			'atv-product-delivery/1.12.0',
			'Fixture de apresentação',
			'parcial',
			'input.context',
			'Relato sintético consentido.'
		])
			await expect(source).toContainText(label);
		for (const question of [
			'Que possibilidade posso observar no primeiro par?',
			'Que limite posso verificar no segundo par?',
			'Que alternativa posso testar no terceiro par?'
		])
			await expect(reading).toContainText(question);
		await expect(
			page.getByText('O reprocessamento preserva as cartas já registradas. Não é um novo sorteio.')
		).toBeVisible();
		for (const name of ['Baixar relatório web', 'Baixar card SVG', 'Solicitar e-mail'])
			await expect(page.getByRole('button', { name, exact: true })).toBeDisabled();
		for (const name of ['Baixar cartografia SVG', 'Baixar PDF'])
			await expect(page.getByRole('button', { name, exact: true })).toHaveCount(0);
		expect(
			await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
		).toBeLessThanOrEqual(1);
		await page.screenshot({
			path: testInfo.outputPath(`three-questions-reader-${width}.png`),
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
		await expect(page.getByRole('heading', { name: headings[7], exact: true })).toBeVisible();
		for (let index = 1; index <= 3; index++)
			await expect(
				source
					.locator('dt')
					.filter({ hasText: `Carta registrada ${index} (card-${index})` })
					.locator('..')
					.locator('dd')
			).toHaveText(savedPairs[index - 1]);
	});
}
test('three questions pending, revocation and failure withhold reading and formats', async ({
	page
}) => {
	for (const [state, name] of [
		['pending', 'Aguardando revisão editorial'],
		['revoked', 'Leitura temporariamente indisponível'],
		['failed', 'Processamento interrompido']
	]) {
		await page.goto(`/biblioteca/_spec/fluxo?state=${state}&product=three-questions`);
		await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
		await expect(page.locator('#leitura')).toHaveCount(0);
		await expect(page.locator('#origem')).toHaveCount(0);
		await expect(page.getByRole('button', { name: /Baixar/ })).toHaveCount(0);
	}
});
