import { test, expect, type Page } from '@playwright/test';
import type { ContinuityAccess } from '../src/lib/product-continuity-access';

const id = '00000000-0000-4000-8000-000000000001';
const initial = (count = 1): ContinuityAccess => ({
	version: 'atv-continuity-access/1',
	events: Array.from({ length: count }, (_, index) => ({
		id: `00000000-0000-4000-8000-${String(index + 10).padStart(12, '0')}`,
		purpose: 'reading-context',
		outcome: 'selected',
		createdAt: '2026-09-28T12:00:00Z',
		expiresAt: '2026-10-05T12:00:00Z',
		consentRevision: 2,
		items: [{ itemId: id, itemRevision: 3, runId: id, runRevision: 4 }]
	}))
});
async function fixture(page: Page, count = 1) {
	const state = {
		value: initial(count),
		reads: 0,
		writes: 0,
		failRead: false,
		lostClear: false,
		malformedRead: false,
		malformedClear: false,
		failRefresh: false,
		clearStatus: 200,
		afterClear: 0
	};
	await page.route('**/api/continuity/*', async (route) => {
		expect(route.request().method()).toBe('POST');
		expect(route.request().postDataJSON()).toEqual({});
		const action = new URL(route.request().url()).pathname.split('/').at(-1);
		if (action === 'access') {
			state.reads++;
			if (state.failRead) return route.fulfill({ status: 503, json: { error: 'private' } });
			return route.fulfill({
				json: state.malformedRead ? { ...state.value, content: 'private' } : state.value
			});
		}
		expect(action).toBe('clear-access');
		state.writes++;
		if (state.clearStatus !== 200)
			return route.fulfill({ status: state.clearStatus, json: { error: 'private' } });
		const deleted = state.value.events.length;
		state.value = initial(state.afterClear);
		if (state.failRefresh) state.failRead = true;
		if (state.lostClear) return route.abort();
		return route.fulfill({ json: state.malformedClear ? { deleted: true } : { deleted } });
	});
	await page.goto('/biblioteca/_spec/acessos');
	await page.getByRole('button', { name: 'Recusar analytics', exact: true }).click();
	return state;
}
const read = async (page: Page) => {
	await page.getByRole('button', { name: 'Consultar acessos', exact: true }).click();
	await expect(page.getByRole('status').filter({ hasText: 'Registros consultados' })).toBeVisible();
};
const clear = async (page: Page) => {
	await page.getByRole('button', { name: 'Limpar registros de acesso', exact: true }).click();
	await page.getByRole('button', { name: 'Confirmar limpeza dos acessos' }).click();
};

test('consulta explícita, metadados sem conteúdo, ocultação e recarga sem persistência local', async ({
	page
}) => {
	const state = await fixture(page);
	expect(state.reads).toBe(0);
	await expect(
		page.getByRole('button', { name: 'Limpar registros de acesso', exact: true })
	).toHaveCount(0);
	await read(page);
	await expect(page.getByText('Seleção registrada', { exact: false })).toBeVisible();
	await page.getByText('Ver identificadores e revisões', { exact: true }).click();
	await expect(page.getByText('revisão 3', { exact: false })).toBeVisible();
	await expect(page.getByText('revisão 4', { exact: false })).toBeVisible();
	expect(
		await page.evaluate(() =>
			JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } })
		)
	).not.toContain(id);
	expect(page.url()).not.toContain(id);
	await page.getByRole('button', { name: 'Ocultar registros' }).click();
	await expect(page.getByText('Seleção registrada', { exact: false })).toHaveCount(0);
	expect(state.reads).toBe(1);
	await page.reload();
	expect(state.reads).toBe(1);
	expect(state.writes).toBe(0);
});

test('confirmação explícita, Escape, foco contido/restaurado, limpeza e leitura posterior', async ({
	page
}) => {
	const state = await fixture(page);
	await read(page);
	const trigger = page.getByRole('button', { name: 'Limpar registros de acesso', exact: true });
	await trigger.click();
	const dialog = page.getByRole('dialog');
	await expect(dialog).toContainText('Suas notas, leituras e consentimentos permanecem');
	const last = dialog.getByRole('button', { name: 'Confirmar limpeza dos acessos' });
	await last.focus();
	await page.keyboard.press('Tab');
	await expect(
		dialog.getByRole('button', { name: 'Fechar Limpar registros de acesso?' })
	).toBeFocused();
	await page.keyboard.press('Shift+Tab');
	await expect(last).toBeFocused();
	await page.keyboard.press('Escape');
	await expect(dialog).not.toBeVisible();
	await expect(trigger).toBeFocused();
	expect(state.writes).toBe(0);
	await clear(page);
	await expect(page.getByRole('status').filter({ hasText: 'Limpeza confirmada: 1' })).toBeVisible();
	await expect(
		page.getByText('Nenhum registro de acesso disponível', { exact: false })
	).toBeVisible();
	await expect(page.getByRole('button', { name: 'Consultar acessos', exact: true })).toBeFocused();
	expect(state.writes).toBe(1);
	expect(state.reads).toBe(2);
});

test('vazio permite limpeza explícita dos expirados, sem afirmar ausência histórica', async ({
	page
}) => {
	const state = await fixture(page, 0);
	await read(page);
	await expect(page.getByText('Isso não comprova ausência', { exact: false })).toBeVisible();
	await clear(page);
	await expect(page.getByRole('status').filter({ hasText: 'Limpeza confirmada: 0' })).toBeVisible();
	expect(state.writes).toBe(1);
});

for (const mode of ['lostClear', 'malformedClear', '401', '403', '503'] as const) {
	test(`falha ${mode} exige consulta, sem repetir limpeza`, async ({ page }) => {
		const state = await fixture(page);
		await read(page);
		if (mode === 'lostClear' || mode === 'malformedClear') state[mode] = true;
		else state.clearStatus = Number(mode);
		await clear(page);
		await expect(page.getByRole('alert')).toContainText('Ela pode ter ocorrido');
		await expect(
			page.getByRole('button', { name: 'Consultar acessos', exact: true })
		).toBeFocused();
		await expect(
			page.getByRole('button', { name: 'Limpar registros de acesso', exact: true })
		).toHaveCount(0);
		expect(state.reads).toBe(1);
		await read(page);
		expect(state.writes).toBe(1);
	});
}

test('falha de consulta e snapshot inválido não habilitam limpeza', async ({ page }) => {
	const state = await fixture(page);
	state.failRead = true;
	await page.getByRole('button', { name: 'Consultar acessos', exact: true }).click();
	await expect(page.getByRole('alert')).toContainText('Não foi possível consultar');
	state.failRead = false;
	state.malformedRead = true;
	await page.getByRole('button', { name: 'Consultar acessos', exact: true }).click();
	await expect(page.getByRole('alert')).toContainText('Não foi possível consultar');
	await expect(
		page.getByRole('button', { name: 'Limpar registros de acesso', exact: true })
	).toHaveCount(0);
	state.malformedRead = false;
	await read(page);
	expect(state.writes).toBe(0);
});

test('limpeza confirmada com falha de atualização exige recuperação, não nova limpeza', async ({
	page
}) => {
	const state = await fixture(page);
	await read(page);
	state.failRefresh = true;
	await clear(page);
	await expect(page.getByRole('alert')).toContainText('Não foi possível consultar');
	await expect(page.getByRole('button', { name: 'Consultar acessos', exact: true })).toBeFocused();
	state.failRead = false;
	await read(page);
	await expect(
		page.getByText('Nenhum registro de acesso disponível', { exact: false })
	).toBeVisible();
	expect(state.writes).toBe(1);
});

test('nova seleção após limpeza aparece na consulta, sem alegar histórico permanentemente vazio', async ({
	page
}) => {
	const state = await fixture(page);
	await read(page);
	state.afterClear = 1;
	await clear(page);
	await expect(
		page.getByRole('status').filter({ hasText: 'novos registros podem aparecer' })
	).toBeVisible();
	await expect(page.getByText('Seleção registrada', { exact: false })).toBeVisible();
	expect(state.writes).toBe(1);
});

test('lista limitada com expansão local, atualização reinicia paginação', async ({ page }) => {
	const state = await fixture(page, 26);
	await read(page);
	await expect(page.getByRole('heading', { name: 'Seleção registrada', exact: false })).toHaveCount(
		25
	);
	await page.getByRole('button', { name: 'Mostrar mais registros' }).click();
	await expect(page.getByRole('heading', { name: 'Seleção registrada', exact: false })).toHaveCount(
		26
	);
	expect(state.reads).toBe(1);
	await read(page);
	await expect(page.getByRole('heading', { name: 'Seleção registrada', exact: false })).toHaveCount(
		25
	);
});

for (const width of [1440, 820, 390, 320]) {
	test(`acessos composição ${width}`, async ({ page }, testInfo) => {
		await page.setViewportSize({ width, height: 1000 });
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await fixture(page);
		await read(page);
		await page.getByText('Ver identificadores e revisões', { exact: true }).click();
		await page.evaluate(() => document.fonts.ready);
		expect(
			await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
		).toBeLessThanOrEqual(1);
		await expect(page.getByRole('main')).toHaveCount(1);
		for (const button of await page.locator('.access button').all()) {
			const box = await button.boundingBox();
			expect(box?.height).toBeGreaterThanOrEqual(44);
		}
		await page.screenshot({ path: testInfo.outputPath(`access-${width}.png`), fullPage: true });
		await page.getByRole('button', { name: 'Limpar registros de acesso', exact: true }).click();
		await expect(page.getByRole('dialog')).toBeVisible();
		await page.screenshot({
			path: testInfo.outputPath(`access-dialog-${width}.png`),
			fullPage: true
		});
	});
}
