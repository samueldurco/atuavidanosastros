import { expect, test, type Page } from '@playwright/test';

const runId = '20000000-0000-4000-8000-000000000002';
const receipt = {
	id: '20000000-0000-4000-8000-000000000004',
	runId,
	revision: 3,
	reviewDigest: 'a'.repeat(64),
	state: 'REQUESTED',
	createdAt: '2026-09-28T10:00:00Z',
	cancelledAt: null
};
const cancelled = { ...receipt, state: 'CANCELLED', cancelledAt: '2026-09-28T10:01:00Z' };
const older = { ...cancelled, id: '20000000-0000-4000-8000-000000000005', revision: 1 };
const historyButton = (page: Page) =>
	page.getByRole('button', { name: 'Consultar pedidos desta leitura' });
const cancelButton = (page: Page) =>
	page.getByRole('button', { name: 'Cancelar pedido da revisão 3' });
const status = (page: Page) => page.locator('#email [role=status]');
async function open(page: Page) {
	await page.goto('/biblioteca/_spec/email?mode=revoked');
	const analytics = page.getByRole('button', { name: 'Recusar analytics' });
	if (await analytics.isVisible()) await analytics.click();
	await expect(historyButton(page)).toBeEnabled();
}
for (const [width, height] of [
	[1440, 1000],
	[820, 1180],
	[390, 844],
	[320, 844]
]) {
	test(`explicit keyless history and older revision cancellation at ${width}px`, async ({
		page
	}, testInfo) => {
		await page.setViewportSize({ width, height });
		await page.emulateMedia({ reducedMotion: 'reduce' });
		const actions: string[] = [];
		let didCancel = false;
		await page.route('**/api/product-email/*', async (route) => {
			const action = new URL(route.request().url()).pathname.split('/').at(-1)!;
			actions.push(action);
			expect(route.request().method()).toBe('POST');
			if (action === 'history') {
				expect(route.request().postDataJSON()).toEqual({ runId });
				return route.fulfill({ json: { receipts: [didCancel ? cancelled : receipt, older] } });
			}
			expect(action).toBe('cancel');
			expect(route.request().postDataJSON()).toEqual({ receiptId: receipt.id });
			didCancel = true;
			await route.fulfill({ json: { receipt: cancelled } });
		});
		await open(page);
		expect(actions).toEqual([]);
		await historyButton(page).focus();
		await page.keyboard.press('Enter');
		await expect(status(page)).toContainText('não confirma envio nem entrega');
		await expect(status(page)).toBeFocused();
		const rows = page
			.getByRole('list', { name: 'Pedidos de e-mail desta leitura' })
			.getByRole('listitem');
		await expect(rows).toHaveCount(2);
		await expect(rows.first()).toContainText('Revisão 3');
		await expect(rows.last()).toContainText('Pedido cancelado');
		await expect(page.getByRole('button', { name: 'Consultar pedido original' })).toHaveCount(0);
		await expect(page.getByRole('button', { name: 'Solicitar e-mail' })).toHaveCount(0);
		await page.locator('#email').screenshot({ path: testInfo.outputPath(`history-${width}.png`) });
		await cancelButton(page).focus();
		await page.keyboard.press('Enter');
		await expect(status(page)).toContainText('revisão 3 cancelado');
		await expect(status(page)).toBeFocused();
		await expect(cancelButton(page)).toHaveCount(0);
		expect(
			await page.evaluate(() =>
				Object.keys(sessionStorage).filter((key) => key.startsWith('atv-email:'))
			)
		).toEqual([]);
		expect(
			await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
		).toBeLessThanOrEqual(1);
		await page.reload();
		await expect(historyButton(page)).toBeEnabled();
		expect(actions).toEqual(['history', 'cancel']);
		await historyButton(page).click();
		await expect(rows.first()).toContainText('Pedido cancelado');
		expect(actions).toEqual(['history', 'cancel', 'history']);
	});
}
test('history works when reading sessionStorage throws', async ({ page }) => {
	await page.addInitScript(() => {
		Object.defineProperty(window, 'sessionStorage', {
			get() {
				throw new Error('storage unavailable');
			}
		});
	});
	await page.route('**/api/product-email/history', (route) =>
		route.fulfill({ json: { receipts: [receipt] } })
	);
	await page.route('**/api/product-email/cancel', (route) =>
		route.fulfill({ json: { receipt: cancelled } })
	);
	await open(page);
	await expect(status(page)).toContainText('Nenhuma alteração foi enviada');
	await historyButton(page).click();
	await cancelButton(page).click();
	await expect(status(page)).toContainText('revisão 3 cancelado');
});
test('empty, unavailable and expired authentication are distinct and read-only', async ({
	page
}, testInfo) => {
	let calls = 0;
	await page.route('**/api/product-email/*', (route) => {
		expect(route.request().url()).toMatch(/\/history$/);
		calls++;
		if (calls === 1) return route.fulfill({ json: { receipts: [] } });
		if (calls === 2) return route.fulfill({ status: 503, json: { error: 'private diagnostic' } });
		return route.fulfill({ status: 401, json: { error: 'auth_required' } });
	});
	await open(page);
	await historyButton(page).click();
	await expect(status(page)).toContainText('Nenhum pedido');
	await page.locator('#email').screenshot({ path: testInfo.outputPath('history-empty.png') });
	await historyButton(page).click();
	await expect(status(page)).toContainText('Não foi possível confirmar');
	await expect(status(page)).not.toContainText('private diagnostic');
	await page.locator('#email').screenshot({ path: testInfo.outputPath('history-unavailable.png') });
	await historyButton(page).click();
	await expect(status(page)).toContainText('Entre novamente');
	await expect(cancelButton(page)).toHaveCount(0);
	await expect(page.getByRole('button', { name: 'Solicitar e-mail' })).toHaveCount(0);
	expect(calls).toBe(3);
});
test('uncertain cancellation locks all actions until explicit history reconciliation', async ({
	page
}) => {
	let finish!: () => void;
	const pending = new Promise<void>((resolve) => {
		finish = resolve;
	});
	let histories = 0;
	let cancellations = 0;
	await page.route('**/api/product-email/history', (route) => {
		histories++;
		return route.fulfill({ json: { receipts: [histories > 1 ? cancelled : receipt] } });
	});
	await page.route('**/api/product-email/cancel', async (route) => {
		cancellations++;
		await pending;
		await route.abort();
	});
	await open(page);
	await historyButton(page).click();
	await cancelButton(page).click();
	await expect(page.locator('#email')).toHaveAttribute('aria-busy', 'true');
	await expect(historyButton(page)).toBeDisabled();
	await expect(cancelButton(page)).toBeDisabled();
	finish();
	await expect(status(page)).toContainText('cancelamento não foi confirmado');
	await expect(cancelButton(page)).toHaveCount(0);
	await historyButton(page).click();
	await expect(page.getByRole('list', { name: 'Pedidos de e-mail desta leitura' })).toContainText(
		'Pedido cancelado'
	);
	expect(cancellations).toBe(1);
	expect(histories).toBe(2);
});
test('a stale history cannot regress a confirmed cancellation', async ({ page }) => {
	let histories = 0;
	await page.route('**/api/product-email/history', (route) => {
		histories++;
		return route.fulfill({ json: { receipts: [histories === 1 ? cancelled : receipt] } });
	});
	await open(page);
	await historyButton(page).click();
	await expect(page.getByRole('list', { name: 'Pedidos de e-mail desta leitura' })).toContainText(
		'Pedido cancelado'
	);
	await historyButton(page).click();
	await expect(status(page)).toContainText('Não foi possível confirmar');
	await expect(cancelButton(page)).toHaveCount(0);
});
test('real local discovery still requires authentication', async ({ page }) => {
	await open(page);
	const pending = page.waitForResponse('**/api/product-email/history');
	await historyButton(page).click();
	const response = await pending;
	expect([401, 503]).toContain(response.status());
	expect(response.headers()['cache-control']).toContain('no-store');
	// The bounded client may abort a slow auth response before Chromium retains its body.
	// Exact redacted envelopes are covered by the handler tests; assert the visible safe state here.
	await expect(status(page)).toContainText(
		response.status() === 401 ? 'Entre novamente' : 'Não foi possível confirmar'
	);
	await expect(cancelButton(page)).toHaveCount(0);
});
