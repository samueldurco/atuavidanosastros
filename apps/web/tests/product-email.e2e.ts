import { expect, test, type Page } from '@playwright/test';

const owner = '20000000-0000-4000-8000-000000000001';
const run = '20000000-0000-4000-8000-000000000002';
const key = '20000000-0000-4000-8000-000000000003';
const name = `atv-email:${owner}:${run}:4`;
const receipt = {
	id: '20000000-0000-4000-8000-000000000004',
	runId: run,
	revision: 4,
	reviewDigest: 'a'.repeat(64),
	state: 'REQUESTED',
	createdAt: '2026-09-28T10:00:00Z',
	cancelledAt: null
};
const cancelled = { ...receipt, state: 'CANCELLED', cancelledAt: '2026-09-28T10:01:00Z' };
async function open(page: Page, mode = 'available') {
	await page.goto(`/biblioteca/_spec/email?mode=${mode}`);
	const analytics = page.getByRole('button', { name: 'Recusar analytics' });
	if (await analytics.isVisible()) await analytics.click();
}
async function retained(page: Page, value = key) {
	await page.addInitScript(
		({ name, value }) => {
			sessionStorage.setItem(name, value);
		},
		{ name, value }
	);
}
for (const width of [1440, 820, 390, 320]) {
	test(`consent, request, recovery and cancellation at ${width}px`, async ({ page }, testInfo) => {
		await page.setViewportSize({ width, height: 1000 });
		const actions: string[] = [];
		await page.route('**/api/product-email/*', async (route) => {
			const action = new URL(route.request().url()).pathname.split('/').at(-1)!;
			actions.push(action);
			if (action === 'request') {
				expect(route.request().postDataJSON().command.consent.transactional).toBe(true);
				expect(await page.evaluate((name) => sessionStorage.getItem(name), name)).toMatch(
					/^[a-f0-9-]{36}$/
				);
			}
			await route.fulfill({
				status: action === 'request' ? 202 : 200,
				json: { receipt: action === 'cancel' ? cancelled : receipt }
			});
		});
		await open(page);
		const consent = page.getByRole('checkbox');
		await expect(consent).toBeEnabled();
		await expect(consent).not.toBeChecked();
		await expect(page.getByRole('button', { name: 'Solicitar e-mail' })).toBeDisabled();
		expect(actions).toEqual([]);
		await consent.focus();
		await page.keyboard.press('Space');
		await page.keyboard.press('Tab');
		await expect(page.getByRole('button', { name: 'Solicitar e-mail' })).toBeFocused();
		await page.keyboard.press('Enter');
		await expect(page.locator('#email [role=status]')).toContainText(
			'não confirma envio nem entrega'
		);
		await expect(page.locator('#email [role=status]')).toBeFocused();
		await page.getByRole('button', { name: 'Consultar pedido original' }).click();
		await page.getByRole('button', { name: 'Cancelar pedido', exact: true }).click();
		await expect(page.locator('#email [role=status]')).toContainText('Pedido cancelado');
		await expect(page.getByRole('button', { name: 'Cancelar pedido', exact: true })).toHaveCount(0);
		expect(actions).toEqual(['request', 'recover', 'cancel']);
		expect(
			await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
		).toBeLessThanOrEqual(1);
		await page
			.locator('#email')
			.screenshot({ path: testInfo.outputPath(`email-cancelled-${width}.png`) });
	});
}
test('revoked reader without digest can recover and cancel, but never request again', async ({
	page
}) => {
	await retained(page);
	const actions: string[] = [];
	await page.route('**/api/product-email/*', (route) => {
		const action = new URL(route.request().url()).pathname.split('/').at(-1)!;
		actions.push(action);
		return route.fulfill({ json: { receipt: action === 'cancel' ? cancelled : receipt } });
	});
	await open(page, 'revoked');
	await expect(
		page.getByText('Novos pedidos de e-mail estão indisponíveis.', { exact: false })
	).toBeVisible();
	expect(actions).toEqual([]);
	await page.getByRole('button', { name: 'Consultar pedido original' }).click();
	await page.getByRole('button', { name: 'Cancelar pedido', exact: true }).click();
	await expect(page.locator('#email [role=status]')).toContainText('Pedido cancelado');
	expect(actions).toEqual(['recover', 'cancel']);
	await expect(page.getByRole('checkbox')).toHaveCount(0);
});
test('lost acknowledgement survives reload with one request and no consent replay', async ({
	page
}) => {
	let requests = 0;
	let original: string;
	await page.route('**/api/product-email/request', (route) => {
		requests++;
		original = route.request().postDataJSON().requestKey;
		return route.abort('failed');
	});
	await page.route('**/api/product-email/recover', (route) => {
		expect(route.request().postDataJSON()).toEqual({ requestKey: original });
		return route.fulfill({ json: { receipt } });
	});
	await open(page);
	await page.getByRole('checkbox').check();
	await page.getByRole('button', { name: 'Solicitar e-mail' }).click();
	await expect(page.getByRole('button', { name: 'Consultar pedido original' })).toBeVisible();
	await page.reload();
	await page.getByRole('button', { name: 'Consultar pedido original' }).click();
	await expect(page.locator('#email [role=status]')).toContainText('Solicitação registrada');
	expect(requests).toBe(1);
	await expect(page.getByRole('checkbox')).toHaveCount(0);
});
test('disabled and corrupt storage states cannot issue network mutations', async ({
	page
}, testInfo) => {
	let calls = 0;
	await page.route('**/api/product-email/*', (route) => {
		calls++;
		return route.abort();
	});
	await open(page, 'disabled');
	await expect(page.getByRole('button', { name: 'Solicitar e-mail' })).toBeDisabled();
	await page.locator('#email').screenshot({ path: testInfo.outputPath('email-disabled.png') });
	await retained(page, 'corrupt');
	await page.reload();
	await expect(page.locator('#email [role=status]')).toContainText('Nenhuma alteração foi enviada');
	await expect(page.locator('#email button')).toHaveCount(1);
	await expect(page.getByRole('button', { name: 'Consultar pedidos desta leitura' })).toBeEnabled();
	expect(calls).toBe(0);
});
test('pending request locks controls and cancellation failure requires recovery', async ({
	page
}) => {
	let release!: () => void;
	const held = new Promise<void>((resolve) => {
		release = resolve;
	});
	await page.route('**/api/product-email/request', async (route) => {
		await held;
		await route.fulfill({ status: 202, json: { receipt } });
	});
	await page.route('**/api/product-email/cancel', (route) => route.abort());
	await page.route('**/api/product-email/recover', (route) =>
		route.fulfill({ json: { receipt: cancelled } })
	);
	await open(page);
	await page.getByRole('checkbox').check();
	await page.getByRole('button', { name: 'Solicitar e-mail' }).click();
	await expect(page.locator('#email')).toHaveAttribute('aria-busy', 'true');
	await expect(page.getByRole('checkbox')).toBeDisabled();
	await expect(page.getByRole('button', { name: 'Solicitar e-mail' })).toBeDisabled();
	release();
	await page.getByRole('button', { name: 'Cancelar pedido', exact: true }).click();
	await expect(page.getByRole('button', { name: 'Cancelar pedido', exact: true })).toHaveCount(0);
	await page.getByRole('button', { name: 'Consultar pedido original' }).click();
	await expect(page.locator('#email [role=status]')).toContainText('Pedido cancelado');
});
test('unintercepted local fixture cannot bypass authentication', async ({ page }) => {
	await open(page);
	await page.getByRole('checkbox').check();
	const responsePromise = page.waitForResponse('**/api/product-email/request');
	await page.getByRole('button', { name: 'Solicitar e-mail' }).click();
	const response = await responsePromise;
	expect([401, 503]).toContain(response.status());
	expect(await response.json()).toEqual({
		error: response.status() === 401 ? 'auth_required' : 'auth_unavailable'
	});
	expect(response.headers()['cache-control']).toContain('no-store');
	if (response.status() === 503) {
		await expect(page.getByRole('button', { name: 'Consultar pedido original' })).toBeVisible();
		expect(await page.evaluate((name) => sessionStorage.getItem(name), name)).toMatch(
			/^[a-f0-9-]{36}$/
		);
		return;
	}
	await expect(page.locator('#email [role=status]')).toContainText('Entre novamente');
	expect(await page.evaluate((name) => sessionStorage.getItem(name), name)).toBeNull();
	await expect(page.getByRole('checkbox')).not.toBeChecked();
});

test('confirmed authentication refusal clears only the fresh key and consent', async ({ page }) => {
	await page.route('**/api/product-email/request', (route) =>
		route.fulfill({ status: 401, json: { error: 'auth_required' } })
	);
	await open(page);
	await page.getByRole('checkbox').check();
	await page.getByRole('button', { name: 'Solicitar e-mail' }).click();
	await expect(page.locator('#email [role=status]')).toContainText('Entre novamente');
	expect(await page.evaluate((name) => sessionStorage.getItem(name), name)).toBeNull();
	await expect(page.getByRole('checkbox')).not.toBeChecked();
});
