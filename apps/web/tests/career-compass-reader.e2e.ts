import { expect, test } from '@playwright/test';

const profiles = [
	{
		id: 'ana-carga',
		name: 'Ana',
		context: 'Estou sobrecarregada e quero reduzir a carga.',
		midheaven: 'Meio do Céu: aproximadamente 9°09′ de Câncer',
		direction: 'Diante das demandas em excesso que você relatou',
		workMode: 'Compare o tempo e os recursos disponíveis',
		nextStep: 'Escolha uma demanda atual'
	},
	{
		id: 'bruno-transicao',
		name: 'Bruno',
		context: 'Quero mudar de carreira.',
		midheaven: 'Meio do Céu: aproximadamente 12°44′ de Escorpião',
		direction: 'Na mudança de carreira que você considera',
		workMode: 'Escolha uma possibilidade ligada à mudança de carreira',
		nextStep: 'Antes de decidir sobre a mudança de carreira'
	},
	{
		id: 'lia-territorio',
		name: 'Lia',
		context: 'Quero mudar de cidade por oportunidades de trabalho.',
		midheaven: 'Meio do Céu: aproximadamente 9°01′ de Peixes',
		direction: 'Você relatou que considera uma mudança de cidade',
		workMode: 'Compare uma possibilidade de trabalho no destino com sua situação atual',
		nextStep: 'Antes de decidir sobre a mudança de cidade'
	}
] as const;

const sections = [
	'Seu Meio do Céu',
	'Contexto profissional informado',
	'Uma direção para experimentar',
	'Onde testar essa direção',
	'O que observar antes de decidir',
	'Um próximo passo para considerar'
];

for (const profile of profiles) {
	for (const width of [320, 390, 820, 1440]) {
		test(`${profile.name}: engine reading, provenance and responsive layout at ${width}px`, async ({
			page
		}, testInfo) => {
			await page.setViewportSize({ width, height: 1000 });
			await page.goto(
				`/biblioteca/_spec/fluxo?state=ready&product=career-compass&profile=${profile.id}`
			);
			const consent = page.getByRole('button', { name: 'Recusar opcionais' });
			if (await consent.isVisible()) await consent.click();
			await page.evaluate(() => document.fonts.ready);
			await expect(page.getByRole('main')).toHaveCount(1);
			await expect(
				page.getByRole('heading', {
					name: `Bússola de Carreira — ${profile.name}, perfil fictício`
				})
			).toBeVisible();
			await expect(page.locator('.fixture-notice')).toContainText('Referência sintética local');
			await expect(page.locator('.career-hero .product-art-compass')).toBeVisible();
			await expect(
				page.locator('.career-hero image[href="/brand/mvp/assets/revisao/bussola-gravada.webp"]')
			).toHaveCount(1);

			const reading = page.locator('#leitura');
			await expect(reading.locator('article')).toHaveCount(sections.length);
			for (const [index, title] of sections.entries()) {
				await expect(reading.locator(`#capitulo-${index + 1} h3`)).toHaveText(title);
				await expect(reading.locator(`#capitulo-${index + 1} .evidence`)).toContainText(
					'Base desta parte:'
				);
			}
			await expect(reading.locator('#capitulo-1 .editorial')).toHaveText(profile.midheaven);
			await expect(reading.locator('#capitulo-2 .editorial')).toHaveText(profile.context);
			await expect(reading.locator('#capitulo-3 .editorial')).toContainText(profile.direction);
			await expect(reading.locator('#capitulo-4 .editorial')).toContainText(profile.workMode);
			await expect(reading.locator('#capitulo-6 .editorial')).toContainText(profile.nextStep);
			const lastChapter = await reading.locator('#capitulo-6 .editorial').textContent();
			expect(lastChapter).toMatch(/Três perguntas para pensar:[\s\S]*1\. [\s\S]*2\. [\s\S]*3\. /);
			await expect(reading).not.toContainText('Fixture estrutural');

			const source = page.locator('#origem');
			await source.getByText('Consultar dados usados nesta leitura').click();
			await expect(source).toContainText('Meio do Céu');
			await expect(source).toContainText('Os fatos calculados foram preservados');
			await expect(source).toContainText('Esta leitura usa uma base parcial do mapa');
			await expect(source).toContainText('não determina uma profissão nem prevê resultados');
			await expect(page.getByRole('button', { name: 'Baixar leitura' })).toBeDisabled();
			await expect(page.getByRole('button', { name: 'Baixar PDF', exact: true })).toHaveCount(0);
			await expect(page.getByRole('button', { name: 'Solicitar e-mail' })).toBeDisabled();
			expect(
				await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
			).toBeLessThanOrEqual(1);
			await page.screenshot({
				path: testInfo.outputPath(`career-compass-${profile.id}-${width}.png`),
				fullPage: true
			});
			await page.getByRole('link', { name: 'Histórico desta versão', exact: true }).click();
			await expect(page.getByRole('heading', { name: 'Histórico desta versão' })).toBeInViewport();
		});
	}
}

for (const [state, heading, profile, width] of [
	['pending', 'Aguardando revisão editorial', 'ana-carga', 320],
	['revoked', 'Leitura temporariamente indisponível', 'bruno-transicao', 820],
	['failed', 'Processamento interrompido', 'lia-territorio', 1440]
] as const) {
	test(`${profile}: ${state} withholds the reading and downloads`, async ({ page }) => {
		await page.setViewportSize({ width, height: 1000 });
		await page.goto(
			`/biblioteca/_spec/fluxo?state=${state}&product=career-compass&profile=${profile}`
		);
		await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
		await expect(page.locator('.fixture-notice')).toContainText('Referência sintética local');
		await expect(page.locator('#leitura')).toHaveCount(0);
		await expect(page.locator('#origem')).toHaveCount(0);
		await expect(page.getByRole('button', { name: 'Baixar leitura' })).toHaveCount(0);
		await expect(page.getByRole('button', { name: 'Baixar PDF', exact: true })).toHaveCount(0);
		expect(
			await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
		).toBeLessThanOrEqual(1);
	});
}
