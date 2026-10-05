import { expect, test } from '@playwright/test';
for (const width of [1440, 820, 390, 320])
	test(`Week seven-sample reader at ${width}`, async ({ page }, testInfo) => {
		test.setTimeout(60_000);
		await page.setViewportSize({ width, height: 1000 });
		await page.goto('/biblioteca/_spec/fluxo?state=ready&product=week-reading');
		const consent = page.getByRole('button', { name: 'Recusar opcionais' });
		if (await consent.isVisible()) await consent.click();
		await page.evaluate(() => document.fonts.ready);
		const timeline = page.locator('#semana'),
			reading = page.locator('#leitura'),
			source = page.locator('#origem');
		await expect(page.getByRole('main')).toHaveCount(1);
		await expect(timeline.getByRole('listitem')).toHaveCount(7);
		await expect(reading.getByRole('heading', { level: 3 })).toHaveCount(22);
		await expect(source.locator('dt')).toHaveCount(89);
		await expect(timeline).toContainText('não representam dias locais inteiros');
		const areas = page.locator('#areas');
		await expect(areas.getByRole('listitem')).toHaveCount(3);
		for (const label of [
			'Conversas e vínculos',
			'Organização e prioridades',
			'Ritmo e cuidado cotidiano'
		]) {
			const link = areas.getByRole('link', { name: `Ler resumo de ${label}`, exact: true });
			await link.focus();
			await expect(link).toBeFocused();
			await page.keyboard.press('Enter');
			const href = await link.getAttribute('href');
			await expect(page.locator(href!)).toContainText(
				`Resumo por área: ${label} — Possibilidade simbólica`
			);
			await expect(page.locator(href!)).toContainText('Amostra 7 · Plutão');
		}
		const dates = [
			'2026-09-29',
			'2026-09-30',
			'2026-10-01',
			'2026-10-02',
			'2026-10-03',
			'2026-10-04',
			'2026-10-05'
		];
		for (const [index, date] of dates.entries()) {
			await expect(timeline.locator('time').nth(index)).toHaveAttribute(
				'datetime',
				`${date}T12:00:00.000Z`
			);
			const link = timeline.getByRole('link', {
				name: `Ler hipótese da amostra ${index + 1}`,
				exact: true
			});
			await link.focus();
			await expect(link).toBeFocused();
			await page.keyboard.press('Enter');
			const href = await link.getAttribute('href');
			await expect(page.locator(href!)).toContainText(`[week-day-${index + 1}]`);
			await expect(page.locator(href!)).toContainText(date);
		}
		await expect(source).toContainText('Amostra 7 · Plutão (day-7-sample-pluto)');
		await expect(source).toContainText('Contexto informado (personal-context)');
		await expect(source).toContainText('não foram calculados');
		await expect(reading).toContainText('Síntese da Semana (4) e três perguntas práticas');
		for (const name of ['Baixar leitura', 'Baixar imagem (SVG)', 'Solicitar e-mail'])
			await expect(page.getByRole('button', { name, exact: true })).toBeDisabled();
		await expect(page.getByRole('button', { name: 'Baixar PDF', exact: true })).toBeDisabled();
		expect(
			await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
		).toBeLessThanOrEqual(1);
		for (const [name, target] of [
			['timeline', timeline],
			['areas', areas],
			['resumo', reading.locator('article').nth(18)],
			['hipotese', reading.locator('article').nth(11)],
			['origem', source],
			['historico', page.locator('#historico')]
		] as const) {
			await target.scrollIntoViewIfNeeded();
			await page.screenshot({ path: testInfo.outputPath(`week-reader-${width}-${name}.png`) });
		}
		const saved = await source.locator('dd').allTextContents(),
			texts = await reading.locator('article').allTextContents();
		await page.reload();
		await expect(source.locator('dd')).toHaveText(saved);
		await expect(reading.locator('article')).toHaveText(texts);
		await expect(timeline.getByRole('listitem')).toHaveCount(7);
	});
test('Week missing context remains absent', async ({ page }) => {
	await page.goto('/biblioteca/_spec/fluxo?state=ready&product=week-reading&context=absent');
	await expect(page.locator('#semana').getByRole('listitem')).toHaveCount(7);
	await expect(page.locator('#areas').getByRole('listitem')).toHaveCount(3);
	await expect(page.locator('#leitura').getByRole('heading', { level: 3 })).toHaveCount(21);
	await expect(page.locator('#origem').locator('dt')).toHaveCount(88);
	await expect(page.locator('#origem')).toContainText(
		'Nenhum contexto adicional foi informado para esta semana.'
	);
});
for (const width of [390, 320])
	test(`Week temporal detail is bounded and keyboard-readable at ${width}`, async ({
		page
	}, testInfo) => {
		await page.setViewportSize({ width, height: 900 });
		await page.goto(
			'/biblioteca/_spec/fluxo?state=ready&product=week-reading&calculation=temporal'
		);
		const consent = page.getByRole('button', { name: 'Recusar opcionais' });
		if (await consent.isVisible()) await consent.click();
		const detail = page.locator('.week-temporal-detail');
		await expect(detail).toContainText('Mostrando 1 de 1 contatos/cruzamentos');
		await expect(detail).toContainText('1 de 1 janelas candidatas');
		await expect(detail).toContainText('Horários em UTC');
		const summaries = detail.locator('summary');
		await summaries.first().focus();
		await page.keyboard.press('Enter');
		await expect(detail.locator('details').first()).toHaveAttribute('open', '');
		await expect(detail.locator('details').first().locator('time')).toHaveCount(2);
		await expect(detail.locator('details').first()).toContainText('Sol em trânsito');
		await summaries.last().focus();
		await page.keyboard.press('Enter');
		await expect(detail.locator('details').last()).toHaveAttribute('open', '');
		await expect(detail.locator('details').last().locator('time')).toHaveCount(2);
		await detail.scrollIntoViewIfNeeded();
		await page.screenshot({ path: testInfo.outputPath(`week-temporal-detail-${width}.png`) });
		expect(
			await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
		).toBeLessThanOrEqual(1);
		await page.reload();
		await expect(detail).toContainText('Mostrando 1 de 1 contatos/cruzamentos');
	});
test('Week unavailable states withhold private reading, timeline and downloads', async ({
	page
}) => {
	for (const [state, name] of [
		['pending', 'Aguardando revisão editorial'],
		['revoked', 'Leitura temporariamente indisponível'],
		['failed', 'Processamento interrompido']
	]) {
		await page.goto(`/biblioteca/_spec/fluxo?state=${state}&product=week-reading`);
		await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
		for (const id of ['semana', 'areas', 'leitura', 'origem'])
			await expect(page.locator(`#${id}`)).toHaveCount(0);
		await expect(page.getByRole('button', { name: 'Baixar leitura', exact: true })).toHaveCount(0);
		await expect(page.getByRole('button', { name: 'Baixar PDF', exact: true })).toHaveCount(0);
	}
	await page.goto('/biblioteca/00000000-0000-4000-8000-000000000183');
	await expect(page).toHaveURL(/\/entrar/);
});
