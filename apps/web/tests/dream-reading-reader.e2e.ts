import { expect, test } from '@playwright/test';

const headings = [
	'Data registrada — Fatos registrados',
	'Relato registrado — Fatos registrados',
	'Emoções informadas — Fatos registrados',
	'Associações pessoais — Fatos registrados',
	'Contexto informado — Fatos registrados',
	'Elementos do relato: possibilidade simbólica — Hipótese [dream-elements]',
	'Emoções e associações: sentido pessoal — Hipótese [dream-personal-meaning]',
	'Síntese da Leitura Essencial de Sonhos (1) e duas perguntas exploratórias'
];
for (const width of [1440, 820, 390, 320]) {
	test(`dream reading preserves reported fields separately at ${width}`, async ({
		page
	}, testInfo) => {
		await page.setViewportSize({ width, height: 1000 });
		await page.goto('/biblioteca/_spec/fluxo?state=ready&product=dream-reading');
		const consent = page.getByRole('button', { name: 'Recusar opcionais' });
		if (await consent.isVisible()) await consent.click();
		await page.evaluate(() => document.fonts.ready);
		await expect(page.getByRole('main')).toHaveCount(1);
		for (const name of headings)
			await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
		const reading = page.locator('#leitura');
		await expect(reading.getByRole('heading', { level: 3 })).toHaveCount(8);
		const source = page.locator('#origem');
		await expect(source.locator('dt')).toHaveCount(8);
		const saved = await source.locator('dd').allTextContents();
		const groups = [
			['2026-09-29'],
			[
				'Relato (trecho 1): Sonhei com uma porta azul.',
				'Relato (trecho 2):',
				'O relato termina aqui.'
			],
			['curiosidade', 'tranquilidade'],
			['Casa antiga', 'Uma mudança recente'],
			['Relato sintético consentido.']
		];
		for (const [index, values] of groups.entries()) {
			const section = reading.locator('article').filter({
				has: page.getByRole('heading', { name: headings[index], exact: true })
			});
			for (const value of values) await expect(section).toContainText(value);
		}
		for (const label of [
			'Data registrada (dream-date)',
			'Relato registrado, trecho 2 (dream-narrative-2)',
			'Emoção informada 2 (dream-emotion-2)',
			'Associação pessoal 2 (dream-association-2)',
			'Contexto informado (dream-context)',
			'input.dream.date',
			'input.dream.narrative',
			'input.dream.emotions[1]',
			'input.dream.associations[1]',
			'input.context',
			'Nenhum histórico foi consultado',
			'recorrência',
			'atv-product-delivery/1.18.0',
			'Fixture de apresentação',
			'parcial'
		])
			await expect(source).toContainText(label);
		await expect(reading).toContainText(
			'Que associação pessoal você gostaria de explorar com um elemento do relato?'
		);
		await expect(reading).toContainText(
			'O que você gostaria de observar na sua experiência atual?'
		);
		for (const name of ['Baixar leitura', 'Baixar imagem (SVG)', 'Solicitar e-mail'])
			await expect(page.getByRole('button', { name, exact: true })).toBeDisabled();
		for (const name of ['Baixar mapa em SVG', 'Baixar PDF'])
			await expect(page.getByRole('button', { name, exact: true })).toHaveCount(0);
		expect(
			await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
		).toBeLessThanOrEqual(1);
		await page.screenshot({
			path: testInfo.outputPath(`dream-reading-reader-${width}.png`),
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
		expect(await source.locator('dd').allTextContents()).toEqual(saved);
	});
}
test('dream reading pending, revocation and failure withhold reading and formats', async ({
	page
}) => {
	for (const [state, name] of [
		['pending', 'Aguardando revisão editorial'],
		['revoked', 'Leitura temporariamente indisponível'],
		['failed', 'Processamento interrompido']
	]) {
		await page.goto(`/biblioteca/_spec/fluxo?state=${state}&product=dream-reading`);
		await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
		await expect(page.locator('#leitura')).toHaveCount(0);
		await expect(page.locator('#origem')).toHaveCount(0);
		await expect(page.getByRole('button', { name: /Baixar/ })).toHaveCount(0);
	}
});
