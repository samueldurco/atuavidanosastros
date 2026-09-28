import { test, expect, type Page } from '@playwright/test';
import type { ContinuityManagement } from '../src/lib/continuity-management';
const runId = '00000000-0000-4000-8000-000000000001';
const path = '/biblioteca/_spec/continuidade';
const permission = 'Autorizo usar somente as leituras selecionadas';
const initial = (): ContinuityManagement => ({
	enabled: true,
	consent: {
		version: 'atv-continuity-consent/1',
		purpose: 'reading-context',
		state: 'revoked',
		runIds: [],
		revision: 0
	},
	items: []
});
async function fixture(page: Page, value = initial(), fixturePath = path) {
	const state = {
		value,
		failMutation: false,
		malformed: false,
		rejectMutation: 0,
		failRefresh: false,
		reads: 0,
		writes: [] as { action: string; body: Record<string, unknown> }[]
	};
	await page.route('**/api/continuity/*', async (route) => {
		const action = new URL(route.request().url()).pathname.split('/').at(-1)!;
		const body = route.request().postDataJSON();
		if (action === 'read') {
			state.reads++;
			return route.fulfill({ json: state.malformed ? { enabled: true } : state.value });
		}
		state.writes.push({ action, body });
		if (state.rejectMutation)
			return route.fulfill({ status: state.rejectMutation, json: { error: 'rejected' } });
		if (action === 'consent')
			state.value.consent = {
				...state.value.consent,
				state: body.granted ? 'granted' : 'revoked',
				runIds: body.runIds,
				revision: body.expectedRevision + 1
			};
		if (action === 'save') {
			state.value.items = state.value.items.filter((item) => item.id !== body.id);
			state.value.items.push({
				id: body.id,
				runId: body.runId,
				productId: 'daily-card',
				selection: body.selection,
				relevance: body.relevance,
				revision: body.expectedRevision + 1,
				updatedAt: '2026-09-28T12:00:00Z'
			});
		}
		if (action === 'delete')
			state.value.items = state.value.items.filter((item) => item.id !== body.id);
		// Commit happened; delivery was lost. The UI must not resend.
		if (state.failMutation) {
			state.failMutation = false;
			return route.abort();
		}
		if (state.failRefresh) state.malformed = true;
		return route.fulfill({
			json: action === 'delete' ? { deleted: true } : { revision: body.expectedRevision + 1 }
		});
	});
	await page.goto(fixturePath);
	return state;
}
async function load(page: Page) {
	await page.getByRole('button', { name: 'Consultar continuidade', exact: true }).click();
	await expect(page.getByText('Estado consultado.', { exact: false })).toBeVisible();
}
async function authorize(page: Page) {
	await page
		.getByRole('checkbox', { name: 'Leitura sintética para continuidade', exact: true })
		.check();
	await page.getByRole('checkbox', { name: permission }).check();
	await page.getByRole('button', { name: 'Salvar autorização e escopo' }).click();
	await expect(page.getByRole('checkbox', { name: permission })).not.toBeChecked();
}
async function note(page: Page, text = 'Tema sintético escrito por mim.') {
	await page.getByLabel('Leitura de origem', { exact: true }).selectOption(runId);
	await page.getByLabel('Sua nota', { exact: true }).fill(text);
	await page.getByLabel('Relevância para você').selectOption('relevant');
	await page.getByRole('button', { name: 'Salvar registro revisado' }).click();
	await expect(page.getByText(text, { exact: true })).toBeVisible();
}
async function readerFixture(page: Page) {
	const state = await fixture(page, initial(), '/biblioteca/_spec/referencias');
	expect(state.reads).toBe(0);
	await page.getByText('Guardar referências para continuidade', { exact: true }).click();
	expect(state.reads).toBe(0);
	await load(page);
	await authorize(page);
	return state;
}
async function chooseReference(page: Page, key: string) {
	await page.getByLabel('Leitura de origem', { exact: true }).selectOption(runId);
	await page.getByLabel('Tipo de registro', { exact: true }).selectOption('reference');
	await expect(page.getByRole('button', { name: 'Salvar registro revisado' })).toBeDisabled();
	await page.getByLabel('Referência da leitura', { exact: true }).selectOption(key);
}
test('leitor: hipótese e ciclo explícitos, seletores mínimos e revisão preserva fonte', async ({
	page
}) => {
	const errors: string[] = [];
	page.on('pageerror', (error) => errors.push(error.message));
	const state = await readerFixture(page);
	await chooseReference(page, 'hypothesis-0');
	await page.getByRole('button', { name: 'Salvar registro revisado' }).click();
	await expect(page.getByText('Hipótese editorial · seção 1', { exact: true })).toBeVisible();
	expect(state.writes[1].body.selection).toEqual({ kind: 'hypothesis', sectionIndex: 0 });
	await page.getByRole('button', { name: 'Revisar registro' }).click();
	await expect(page.getByLabel('Leitura de origem', { exact: true })).toBeDisabled();
	await page.getByLabel('Relevância para você').selectOption('relevant');
	await page.getByRole('button', { name: 'Salvar registro revisado' }).click();
	await expect(page.getByText('Hipótese editorial · seção 1', { exact: true })).toBeVisible();
	expect(state.writes[2].body).toMatchObject({
		expectedRevision: 1,
		relevance: 'relevant',
		selection: { kind: 'hypothesis', sectionIndex: 0 }
	});
	await chooseReference(page, 'cycle-cycle-1');
	await page.getByRole('button', { name: 'Salvar registro revisado' }).click();
	await expect(page.getByText('Referência de cálculo · cycle-1', { exact: true })).toBeVisible();
	expect(state.writes[3].body.selection).toEqual({ kind: 'cycle', factId: 'cycle-1' });
	expect(JSON.stringify(state.writes)).not.toContain('Ciclo de referência sintética');
	expect(page.url()).not.toContain(runId);
	expect(errors).toEqual([]);
});
test('leitor: trocar tipo ou origem exige escolher a referência novamente', async ({ page }) => {
	await readerFixture(page);
	await chooseReference(page, 'hypothesis-0');
	await page.getByLabel('Tipo de registro', { exact: true }).selectOption('result');
	await page.getByLabel('Tipo de registro', { exact: true }).selectOption('reference');
	await expect(page.getByLabel('Referência da leitura', { exact: true })).toHaveValue('');
	await page.getByLabel('Referência da leitura', { exact: true }).selectOption('hypothesis-0');
	await page.getByLabel('Leitura de origem', { exact: true }).selectOption('');
	await page.getByLabel('Leitura de origem', { exact: true }).selectOption(runId);
	await expect(page.getByRole('button', { name: 'Salvar registro revisado' })).toBeDisabled();
});
test('leitor: navegação limpa consulta, aceite e rascunho; sintético/revogado não expõe gestão', async ({
	page
}) => {
	const state = await readerFixture(page);
	await chooseReference(page, 'hypothesis-0');
	const reads = state.reads;
	await page.getByRole('button', { name: 'Trocar leitura de teste' }).click();
	await page.getByText('Guardar referências para continuidade', { exact: true }).click();
	await expect(
		page.getByRole('button', { name: 'Consultar continuidade', exact: true })
	).toBeVisible();
	await expect(page.getByLabel('Referência da leitura', { exact: true })).toHaveCount(0);
	expect(state.reads).toBe(reads);
	await page.getByRole('button', { name: 'Alternar modo sintético' }).click();
	await expect(page.locator('.reader-continuity')).toHaveCount(0);
	await page.getByRole('button', { name: 'Alternar modo sintético' }).click();
	await page.getByRole('button', { name: 'Revogar fonte de teste' }).click();
	await expect(page.locator('.reader-continuity')).toHaveCount(0);
	expect(state.writes).toHaveLength(1);
});
test('leitor: perda de resposta recupera referência sem repetir save', async ({ page }) => {
	const state = await readerFixture(page);
	await chooseReference(page, 'cycle-cycle-1');
	state.failMutation = true;
	await page.getByRole('button', { name: 'Salvar registro revisado' }).click();
	await expect(page.getByRole('alert')).toContainText('pode ter sido salva');
	await load(page);
	await expect(page.getByText('Referência de cálculo · cycle-1', { exact: true })).toBeVisible();
	expect(state.writes.filter((w) => w.action === 'save')).toHaveLength(1);
});
test('leitor: fonte recusada exige consulta e nova decisão', async ({ page }) => {
	const state = await readerFixture(page);
	await chooseReference(page, 'hypothesis-0');
	state.rejectMutation = 409;
	await page.getByRole('button', { name: 'Salvar registro revisado' }).click();
	await expect(page.getByRole('alert')).toContainText('pode ter sido salva');
	await expect(page.getByLabel('Referência da leitura', { exact: true })).toHaveCount(0);
	await load(page);
	expect(state.value.items).toHaveLength(0);
	expect(state.writes.filter((w) => w.action === 'save')).toHaveLength(1);
});
for (const width of [1440, 390, 320])
	test(`leitor: referências refluem em ${width}`, async ({ page }, info) => {
		await page.setViewportSize({ width, height: 1000 });
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await readerFixture(page);
		await chooseReference(page, 'cycle-cycle-1');
		await expect(
			page.getByText('Referência escolhida: Ciclo · cycle-1 ·', { exact: false })
		).toBeVisible();
		await expect(page.getByRole('button', { name: 'Salvar registro revisado' })).toBeEnabled();
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
			true
		);
		await page.screenshot({
			path: info.outputPath(`reader-continuity-${width}.png`),
			fullPage: true
		});
	});
test.beforeEach(async ({ page }) => {
	await page.addInitScript(() => localStorage.setItem('atv-analytics-consent', 'denied'));
});
test('consentimento explícito → nota → revisão CAS → revogação → exclusão', async ({ page }) => {
	const state = await fixture(page);
	expect(state.reads).toBe(0);
	await load(page);
	await expect(page.getByRole('checkbox', { name: permission })).not.toBeChecked();
	await expect(page.getByRole('button', { name: 'Salvar autorização e escopo' })).toBeDisabled();
	await authorize(page);
	await note(page);
	expect(state.writes[0].body).toMatchObject({
		expectedRevision: 0,
		runIds: [runId],
		granted: true
	});
	expect(state.writes[1].body).toMatchObject({ expectedRevision: 0, runId, relevance: 'relevant' });
	await page.getByRole('button', { name: 'Revisar registro' }).click();
	await expect(page.getByLabel('Leitura de origem', { exact: true })).toBeDisabled();
	await page.getByLabel('Relevância para você').selectOption('irrelevant');
	await page.getByRole('button', { name: 'Salvar registro revisado' }).click();
	await expect(page.getByText('Relevância: não relevante.')).toBeVisible();
	expect(state.writes[2].body).toMatchObject({ expectedRevision: 1, id: state.writes[1].body.id });
	await page.getByRole('button', { name: 'Revogar autorização' }).click();
	await expect(page.getByRole('button', { name: 'Revisar registro' })).toBeDisabled();
	expect(state.writes[3].body).toMatchObject({ runIds: [], granted: false, expectedRevision: 1 });
	await page.getByRole('button', { name: 'Excluir registro', exact: true }).click();
	await expect(page.getByRole('dialog')).toContainText('Tema sintético escrito por mim.');
	await page.keyboard.press('Escape');
	await expect(page.getByRole('dialog')).not.toBeVisible();
	await expect(page.getByRole('button', { name: 'Excluir registro', exact: true })).toBeFocused();
	await page.keyboard.press('Enter');
	await page.getByRole('button', { name: 'Confirmar exclusão do registro' }).click();
	await expect(page.getByText('Você ainda não guardou referências')).toBeVisible();
	expect(state.value.items).toHaveLength(0);
	await expect(
		page.getByRole('button', { name: 'Atualizar estado da continuidade' })
	).toBeFocused();
});

for (const code of [401, 409]) {
	test(`HTTP ${code} impede reenvio e exige recuperação`, async ({ page }) => {
		const state = await fixture(page);
		await load(page);
		await authorize(page);
		state.rejectMutation = code;
		await page.getByLabel('Leitura de origem', { exact: true }).selectOption(runId);
		await page.getByLabel('Sua nota', { exact: true }).fill('Rascunho que não deve ser reenviado');
		await page.getByRole('button', { name: 'Salvar registro revisado' }).click();
		await expect(page.getByRole('alert')).toContainText('Ela pode ter sido salva');
		await expect(page.getByRole('button', { name: 'Salvar registro revisado' })).toHaveCount(0);
		expect(state.writes).toHaveLength(2);
		expect(state.value.items).toHaveLength(0);
		state.rejectMutation = 0;
		await load(page);
		await expect(page.getByLabel('Sua nota', { exact: true })).toHaveValue('');
		expect(state.writes).toHaveLength(2);
	});
}

test('falha na releitura após gravação confirma recuperação sem novo POST de escrita', async ({
	page
}) => {
	const state = await fixture(page);
	await load(page);
	await authorize(page);
	state.failRefresh = true;
	await page.getByLabel('Leitura de origem', { exact: true }).selectOption(runId);
	await page
		.getByLabel('Sua nota', { exact: true })
		.fill('Nota confirmada com consulta indisponível');
	await page.getByRole('button', { name: 'Salvar registro revisado' }).click();
	await expect(page.getByRole('alert')).toContainText('Nenhuma nova alteração');
	await expect(page.getByRole('button', { name: 'Consultar continuidade' })).toBeFocused();
	state.malformed = false;
	await load(page);
	await expect(
		page.getByText('Nota confirmada com consulta indisponível', { exact: true })
	).toBeVisible();
	expect(state.writes).toHaveLength(2);
});

test('alterar escopo invalida o aceite; conteúdo privado não é persistido no navegador', async ({
	page
}) => {
	await fixture(page);
	await load(page);
	await page.getByRole('checkbox', { name: permission }).check();
	await page
		.getByRole('checkbox', { name: 'Leitura sintética para continuidade', exact: true })
		.check();
	await expect(page.getByRole('checkbox', { name: permission })).not.toBeChecked();
	await page.getByRole('checkbox', { name: permission }).check();
	await page.getByRole('button', { name: 'Salvar autorização e escopo' }).click();
	await note(page, 'Marcador privado sintético único');
	expect(
		await page.evaluate(() =>
			JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } })
		)
	).not.toMatch(/Marcador privado|00000000-0000-4000-8000-000000000001/);
	expect(new URL(page.url()).search).toBe('');
});
test('resposta perdida bloqueia reenvio; recuperação encontra gravação e renova decisões', async ({
	page
}) => {
	const state = await fixture(page);
	await load(page);
	await authorize(page);
	state.failMutation = true;
	await page.getByLabel('Leitura de origem', { exact: true }).selectOption(runId);
	await page.getByLabel('Sua nota', { exact: true }).fill('Nota com resposta perdida');
	await page.getByRole('button', { name: 'Salvar registro revisado' }).click();
	await expect(page.getByRole('alert')).toContainText('Ela pode ter sido salva');
	await expect(page.getByRole('button', { name: 'Consultar continuidade' })).toBeFocused();
	expect(state.writes).toHaveLength(2);
	await load(page);
	await expect(page.getByText('Nota com resposta perdida', { exact: true })).toBeVisible();
	await expect(page.getByLabel('Sua nota', { exact: true })).toHaveValue('');
	expect(state.writes).toHaveLength(2);
	await page.reload();
	await load(page);
	await expect(page.getByText('Nota com resposta perdida', { exact: true })).toBeVisible();
});
test('snapshot inválido não abre controles; texto hostil é texto; disabled preserva exclusão', async ({
	page
}) => {
	const state = await fixture(page);
	state.malformed = true;
	await page.getByRole('button', { name: 'Consultar continuidade' }).click();
	await expect(page.getByRole('alert')).toContainText('Não foi possível consultar');
	await expect(page.getByRole('button', { name: 'Salvar autorização e escopo' })).toHaveCount(0);
	state.malformed = false;
	await load(page);
	await authorize(page);
	await note(page, '<img src=x onerror=alert(1)>');
	await expect(page.locator('.continuity img')).toHaveCount(0);
	state.value.enabled = false;
	await page.getByRole('button', { name: 'Atualizar estado da continuidade' }).click();
	await expect(page.getByText('Continuidade indisponível para novas autorizações')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Revisar registro' })).toBeDisabled();
	await expect(page.getByRole('button', { name: 'Revogar autorização' })).toBeEnabled();
	await expect(page.getByRole('button', { name: 'Excluir registro', exact: true })).toBeEnabled();
});
for (const viewport of [
	{ width: 1440, height: 1000 },
	{ width: 820, height: 1180 },
	{ width: 390, height: 844 },
	{ width: 320, height: 800 }
]) {
	test(`continuidade composição ${viewport.width}`, async ({ page }, testInfo) => {
		await page.setViewportSize(viewport);
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await fixture(page);
		await load(page);
		await authorize(page);
		await note(page);
		await page.evaluate(() => document.fonts.ready);
		expect(
			await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
		).toBeLessThanOrEqual(1);
		await expect(page.getByRole('main')).toHaveCount(1);
		await page.screenshot({
			path: testInfo.outputPath(`continuity-${viewport.width}.png`),
			fullPage: true
		});
	});
}
