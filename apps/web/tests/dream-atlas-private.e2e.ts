import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
import { PDFDocument } from 'pdf-lib';

// Browser fixtures below exercise UI only. Real deadline/owner/RLS checks live in
// private-dream-atlas-db.test.mjs and private-dream-atlas.spec.ts.
const exampleUrl = '/testar-produtos/_spec?product=dream-atlas&view=atlas-example';
const intakeUrl = '/testar-produtos/_spec?product=dream-atlas&view=intake';

for (const width of [390, 1440]) {
	test(`fictional owner diary example: accessible reader without persistence at ${width}px`, async ({
		page
	}, testInfo) => {
		const errors: string[] = [];
		const writes: string[] = [];
		page.on('pageerror', (error) => errors.push(error.message));
		page.on('request', (request) => {
			if (request.method() === 'POST') writes.push(new URL(request.url()).pathname);
		});
		await page.setViewportSize({ width, height: 900 });
		await page.goto(exampleUrl);
		await page.getByRole('button', { name: 'Recusar opcionais', exact: true }).click();
		await expect(
			page.getByRole('heading', { name: 'Veja como fica a análise dos 30 dias' })
		).toBeVisible();
		await expect(
			page.getByText('Demonstração privada · relatos fictícios', { exact: true })
		).toBeVisible();
		await expect(page.getByText(/Nenhum relato é seu, nenhum diário foi iniciado/)).toBeVisible();
		const firstChapter = await page.locator('#selected-chapter h2').textContent();
		await page.getByRole('button', { name: 'Próximo →', exact: true }).click();
		await expect(page.locator('#selected-chapter h2')).not.toHaveText(firstChapter!);
		await page.getByRole('button', { name: '☆ Marcar capítulo', exact: true }).click();
		await expect(page.getByRole('button', { name: '★ Marcado', exact: true })).toHaveAttribute(
			'aria-pressed',
			'true'
		);
		await expect(
			page.getByText('Posição e marcadores ficam somente enquanto este exemplo está aberto.')
		).toBeVisible();
		expect(writes).toEqual([]);
		expect(
			(await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
				.violations
		).toEqual([]);
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
			true
		);
		await page.screenshot({
			path: testInfo.outputPath(`diary-example-${width}.png`),
			fullPage: true
		});
		if (width === 1440) {
			await page.getByRole('button', { name: 'Preparar PDF de demonstração', exact: true }).click();
			await expect(
				page.getByRole('link', { name: 'Baixar PDF de demonstração', exact: true })
			).toBeVisible();
			const downloading = page.waitForEvent('download');
			await page.getByRole('link', { name: 'Baixar PDF de demonstração', exact: true }).click();
			const download = await downloading;
			expect(download.suggestedFilename()).toBe('diario-sonhos-demonstracao-ficticia.pdf');
			const pdf = await PDFDocument.load(await readFile((await download.path())!));
			expect(pdf.getTitle()).toContain('Demonstração fictícia');
			expect(pdf.getPageCount()).toBeGreaterThan(2);
			expect(writes).toEqual([]);
		}
		expect(errors).toEqual([]);
	});
}

test('mocked diary UI stores a record without interpretation, then exposes synthesis only after the server deadline', async ({
	page
}, testInfo) => {
	await page.setViewportSize({ width: 390, height: 844 });
	const errors: string[] = [];
	page.on('pageerror', (problem) => errors.push(problem.message));
	const id = '11111111-1111-4111-8111-111111111111';
	const start = new Date().toISOString().slice(0, 10);
	const startedAt = `${start}T12:00:00.000Z`;
	const readyAt = new Date(Date.parse(startedAt) + 30 * 86_400_000).toISOString();
	let serverNow = startedAt;
	let entries: Record<string, unknown>[] = [];
	let analyses = 0;
	const diary = () => ({
		id,
		startDate: start,
		readyAt,
		serverNow,
		analysisId: null,
		entries,
		facts: {
			includedEntryIds: entries.filter((entry) => entry.includeInSynthesis).map((entry) => entry.id)
		}
	});
	await page.route('**/api/private-dream-atlas/*', async (route) => {
		const action = new URL(route.request().url()).pathname.split('/').at(-1);
		const body = route.request().postDataJSON();
		if (action === 'save') {
			entries = [
				{
					...body.entry,
					id: body.entryId,
					runId: id,
					revision: 1,
					createdAt: startedAt,
					updatedAt: startedAt
				}
			];
			await route.fulfill({ status: 200, json: { revision: 1 } });
		} else if (action === 'delete') {
			entries = [];
			await route.fulfill({ status: 200, json: { deleted: true } });
		} else {
			await route.fulfill({ status: 200, json: diary() });
		}
	});
	await page.route('**/api/private-trials', async (route) => {
		analyses += 1;
		expect(route.request().postDataJSON().dreamAtlasCycleId).toBe(id);
		await route.fulfill({
			status: 409,
			json: { message: 'A análise não foi concluída. Confira seus registros e tente novamente.' }
		});
	});
	await page.goto(intakeUrl);
	await page.getByRole('button', { name: 'Recusar opcionais', exact: true }).click();
	await expect(
		page.getByRole('button', { name: 'Iniciar meus 30 dias', exact: true })
	).toBeDisabled();
	await page.getByRole('checkbox', { name: /Autorizo guardar meus relatos/ }).check();
	await page.getByRole('button', { name: 'Iniciar meus 30 dias', exact: true }).click();
	await expect(
		page.getByText('Nenhum sonho registrado neste período.', { exact: true })
	).toBeVisible();
	await expect(
		page.getByRole('button', { name: 'Gerar análise integrada', exact: true })
	).toHaveCount(0);
	await page.getByLabel('Data do sonho', { exact: true }).fill(start);
	await page
		.getByLabel('Seu relato', { exact: true })
		.fill(
			'Relato fictício de teste: caminhei por uma praça e encontrei um caderno. Ao acordar, lembrei de um projeto que gostaria de retomar.'
		);
	await page.getByLabel(/Emoções relatadas/).fill('curiosidade');
	await page.getByLabel(/Suas associações pessoais/).fill('um projeto de escrita');
	await page.getByRole('checkbox', { name: /Incluir este relato na análise integrada/ }).check();
	await page.getByRole('button', { name: 'Guardar registro', exact: true }).click();
	await expect(
		page.getByText('Registro guardado no seu diário privado.', { exact: true })
	).toBeVisible();
	await expect(page.getByText('1 registros no diário;', { exact: false })).toBeVisible();
	await expect(
		page.getByRole('button', { name: 'Gerar análise integrada', exact: true })
	).toHaveCount(0);
	expect(analyses).toBe(0);
	await page.screenshot({ path: testInfo.outputPath('diary-record-mobile.png'), fullPage: true });
	serverNow = readyAt;
	await page.getByRole('button', { name: 'Atualizar período', exact: true }).click();
	await page.getByRole('button', { name: 'Atualizar lista', exact: true }).click();
	await expect(
		page.getByRole('heading', { name: 'É hora de olhar o conjunto', exact: true })
	).toBeVisible();
	await expect(page.getByRole('button', { name: 'Guardar registro', exact: true })).toHaveCount(0);
	await page.getByRole('button', { name: 'Gerar análise integrada', exact: true }).click();
	await expect(
		page.getByText('A análise não foi concluída. Confira seus registros e tente novamente.', {
			exact: true
		})
	).toBeVisible();
	expect(analyses).toBe(1);
	await expect(
		page.getByRole('button', { name: 'Gerar análise integrada', exact: true })
	).toBeEnabled();
	expect(
		(await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
			.violations
	).toEqual([]);
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
	expect(errors).toEqual([]);
});

test('anonymous requests cannot open the real owner example or start a real diary', async ({
	request,
	baseURL
}) => {
	const example = await request.get('/testar-produtos/dream-atlas/exemplo');
	expect([401, 403, 503]).toContain(example.status());
	expect(await example.text()).not.toContain('<h1>Veja como fica a análise dos 30 dias</h1>');
	const start = await request.post('/api/private-dream-atlas/start', {
		headers: { origin: new URL(baseURL!).origin },
		data: { requestKey: '22222222-2222-4222-8222-222222222222', consent: true }
	});
	expect([401, 403, 503]).toContain(start.status());
});
