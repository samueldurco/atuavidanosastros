import { expect, test } from '@playwright/test';

const savedLongitudes = {
	sun: 280.3689167222144,
	moon: 223.32372020768756,
	mercury: 271.8892818502901,
	venus: 241.5657928289756,
	mars: 327.96330948817564,
	jupiter: 25.253138616506664,
	saturn: 40.39565905006797,
	uranus: 314.8092480579414,
	neptune: 303.1931811498641,
	pluto: 251.4547956274414
};

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
		const chart = page.getByRole('img', { name: 'Cartografia natal tropical experimental' });
		await expect(chart).toBeVisible();
		await expect(chart.locator('[data-body]')).toHaveCount(10);
		await expect(chart.locator('[data-house]')).toHaveCount(12);
		await expect(chart.locator('[data-angle]')).toHaveCount(2);
		const enlarge = page.getByRole('button', { name: 'Ampliar cartografia' });
		await enlarge.click();
		await expect(page.getByRole('button', { name: 'Ajustar à tela' })).toHaveAttribute(
			'aria-pressed',
			'true'
		);
		expect((await chart.boundingBox())?.width).toBeGreaterThanOrEqual(680);
		const chartArea = page.getByRole('region', { name: 'Área da cartografia natal' });
		await expect(chartArea).toHaveAttribute('tabindex', '0');
		if (await chartArea.evaluate((element) => element.scrollWidth > element.clientWidth)) {
			await chartArea.focus();
			await page.keyboard.press('ArrowRight');
			await expect
				.poll(() => chartArea.evaluate((element) => element.scrollLeft))
				.toBeGreaterThan(0);
		}
		await chartArea.screenshot({ path: testInfo.outputPath(`birth-chart-enlarged-${width}.png`) });
		await page.getByRole('button', { name: 'Ajustar à tela' }).click();
		await expect(chartArea).not.toHaveAttribute('tabindex', '0');
		await page
			.locator('#cartografia')
			.screenshot({ path: testInfo.outputPath(`birth-chart-cartography-${width}.png`) });
		for (const [body, longitude] of Object.entries(savedLongitudes)) {
			const marker = chart.locator(`[data-body="${body}"]`);
			// Reference ephemeris values may differ by a floating-point ULP between runtimes.
			const saved = Number(await marker.getAttribute('data-longitude'));
			expect(saved).toBeCloseTo(longitude, 10);
			const index = Object.keys(savedLongitudes).indexOf(body),
				radius = 250 - index * 19;
			const radians = (saved * Math.PI) / 180;
			expect(Number(await marker.locator('circle').getAttribute('cx'))).toBeCloseTo(
				340 - radius * Math.cos(radians),
				8
			);
			expect(Number(await marker.locator('circle').getAttribute('cy'))).toBeCloseTo(
				340 + radius * Math.sin(radians),
				8
			);
		}
		await expect(
			page.getByRole('list', { name: 'Legenda das posições natais' }).getByRole('link')
		).toHaveCount(10);
		const index = page.getByRole('navigation', { name: 'Índice do resultado' });
		await expect(index.locator('a[href^="#capitulo-"]')).toHaveCount(13);
		const chapterLink = index.locator('a[href="#capitulo-13"]');
		await chapterLink.scrollIntoViewIfNeeded();
		await chapterLink.focus();
		await page.keyboard.press('Enter');
		await expect(page.locator('#capitulo-13')).toBeInViewport();
		const sunLink = page.locator('#cartografia a[href="#fact-position-sun"]');
		await sunLink.scrollIntoViewIfNeeded();
		await sunLink.focus();
		await page.keyboard.press('Enter');
		await expect(page.locator('#fact-position-sun')).toBeInViewport();
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
			'atv-product-delivery/1.7.0',
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
		await expect(page.locator('#cartografia')).toHaveCount(0);
		await expect(page.getByRole('button', { name: 'Baixar PDF', exact: true })).toHaveCount(0);
	}
});

test('birth chart with missing geometry retains its preserved text without drawing a substitute', async ({
	page
}) => {
	await page.goto('/biblioteca/_spec/fluxo?state=ready&product=birth-chart&geometry=missing');
	await expect(page.locator('#cartografia')).toHaveCount(0);
	await expect(page.getByRole('link', { name: 'Cartografia natal', exact: true })).toHaveCount(0);
	await expect(page.locator('#leitura article')).toHaveCount(13);
	await expect(page.locator('#origem')).toContainText('Sol (position-sun)');
});
