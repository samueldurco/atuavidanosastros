import { expect, test } from '@playwright/test';

for (const width of [1440, 820, 390, 320]) {
	test(`birth chart keeps all roles and factors readable at ${width}`, async ({
		page
	}, testInfo) => {
		await page.setViewportSize({ width, height: 1000 });
		await page.goto('/biblioteca/_spec/fluxo?state=ready&product=birth-chart');
		const consent = page.getByRole('button', { name: 'Recusar analytics' });
		if (await consent.isVisible()) await consent.click();
		await page.evaluate(() => document.fonts.ready);
		await expect(page.getByRole('main')).toHaveCount(1);
		const reading = page.locator('#leitura');
		await expect(reading.getByRole('heading', { level: 3 })).toHaveCount(13);
		for (const title of [
			'Sol: identidade e intenção',
			'Lua: necessidades e acolhimento',
			'Mercúrio, Vênus e Marte: recursos pessoais',
			'Júpiter e Saturno: expansão e estrutura',
			'Urano, Netuno e Plutão: símbolos coletivos',
			'Ascendente: abordagem e expressão',
			'Meio do Céu: direção e contribuição',
			'Casas 1 a 3: presença, recursos e trocas',
			'Casas 4 a 6: raízes, criação e cotidiano',
			'Casas 7 a 9: vínculos, partilhas e horizontes',
			'Casas 10 a 12: contribuição, redes e recolhimento',
			'Relações (1)',
			'Síntese do Mapa Astral (1) e três perguntas práticas'
		])
			await expect(reading.getByRole('heading', { name: title, exact: false })).toBeVisible();
		for (const question of [
			'Que intenção e necessidade quero observar?',
			'Quais recursos posso considerar no cotidiano?',
			'Qual experimento reversível cabe nesta semana?'
		])
			await expect(reading).toContainText(question);
		const source = page.locator('#origem');
		for (const [id, label] of [
			['sun', 'Sol'],
			['moon', 'Lua'],
			['mercury', 'Mercúrio'],
			['venus', 'Vênus'],
			['mars', 'Marte'],
			['jupiter', 'Júpiter'],
			['saturn', 'Saturno'],
			['uranus', 'Urano'],
			['neptune', 'Netuno'],
			['pluto', 'Plutão']
		])
			await expect(source).toContainText(`${label} (position-${id})`);
		for (let i = 1; i <= 12; i++)
			await expect(source).toContainText(`Cúspide da Casa ${i} (house-${i})`);
		for (const label of [
			'Ascendente (angle-ascendant)',
			'Meio do Céu (angle-midheaven)',
			'Contexto pessoal relatado (personal-context)',
			'input.context',
			'atv-product-delivery/1.3.0',
			'Fixture de apresentação',
			'parcial',
			'Posições e signos são fatos experimentais'
		])
			await expect(source).toContainText(label);
		for (const name of ['Baixar relatório web', 'Baixar PDF', 'Baixar cartografia SVG'])
			await expect(page.getByRole('button', { name, exact: true })).toBeDisabled();
		expect(
			await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
		).toBeLessThanOrEqual(1);
		await page.screenshot({
			path: testInfo.outputPath(`birth-chart-reader-${width}.png`),
			fullPage: true
		});
		const historyLink = page.getByRole('link', { name: 'Histórico desta versão', exact: true });
		await historyLink.scrollIntoViewIfNeeded();
		await historyLink.focus();
		await expect(historyLink).toBeFocused();
		await page.keyboard.press('Enter');
		await expect(page.getByRole('heading', { name: 'Histórico desta versão' })).toBeInViewport();
		await page.reload();
		await expect(
			reading.getByRole('heading', {
				name: 'Síntese do Mapa Astral (1) e três perguntas práticas',
				exact: true
			})
		).toBeVisible();
	});
}

test('birth chart pending review, revocation and failure withhold content and exports', async ({
	page
}) => {
	for (const [state, name] of [
		['pending', 'Aguardando revisão editorial'],
		['revoked', 'Leitura temporariamente indisponível'],
		['failed', 'Processamento interrompido']
	]) {
		await page.goto(`/biblioteca/_spec/fluxo?state=${state}&product=birth-chart`);
		await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
		await expect(page.locator('#leitura')).toHaveCount(0);
		await expect(page.locator('#origem')).toHaveCount(0);
		await expect(page.getByRole('button', { name: 'Baixar PDF', exact: true })).toHaveCount(0);
	}
});
