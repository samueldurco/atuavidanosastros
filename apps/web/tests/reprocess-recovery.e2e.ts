import { expect, test } from '@playwright/test';

const parent = '10000000-0000-4000-8000-000000000001';
const key = '10000000-0000-4000-8000-000000000004';
const name = `atv-reprocess:${parent}`;
const path = '/biblioteca/_spec/recuperacao';

test('confirmed recovery opens only the owner library reference', async ({ page }) => {
	const child = '10000000-0000-4000-8000-000000000002';
	const library = '10000000-0000-4000-8000-000000000003';
	const at = '2026-09-25T12:00:00Z';
	await page.addInitScript(({ name, key }) => sessionStorage.setItem(name, key), { name, key });
	await page.route('**/api/workflows/recover', (route) =>
		route.fulfill({
			json: {
				request: { runId: child, productId: 'daily-card', libraryItemId: library }
			}
		})
	);
	await page.route(`**/api/workflows/${child}`, (route) =>
		route.fulfill({
			json: {
				run: {
					id: child,
					productId: 'daily-card',
					libraryItemId: library,
					parentId: parent,
					state: 'QUEUED',
					revision: 1,
					released: false,
					canReprocess: false,
					createdAt: at,
					updatedAt: at,
					history: [{ revision: 1, state: 'QUEUED', at }],
					calculation: null,
					editorial: null
				}
			}
		})
	);
	await page.goto(path);
	const navigation = page.waitForRequest(
		(r) => new URL(r.url()).pathname === `/biblioteca/${library}/__data.json`
	);
	await page.getByRole('button', { name: 'Consultar pedido original' }).click();
	await navigation;
	// This fixture has no owner session. The real destination must retain its auth gate.
	await expect(page).toHaveURL(/\/entrar$/);
});

test('lost acknowledgement, reload, null lookup and keyboard never replay', async ({ page }) => {
	let writes = 0,
		reads = 0;
	await page.route(`**/api/workflows/${parent}/reprocess`, async (route) => {
		writes++;
		await route.abort();
	});
	await page.route('**/api/workflows/recover', async (route) => {
		reads++;
		expect(Object.keys(route.request().postDataJSON())).toEqual(['requestKey']);
		await route.fulfill({ json: { request: null } });
	});
	await page.goto(path);
	await page.getByRole('button', { name: 'Reprocessar em nova versão' }).click();
	await expect(page.getByRole('status')).toBeFocused();
	const stored = await page.evaluate((n) => sessionStorage.getItem(n), name);
	expect(stored).toMatch(/^[a-f0-9-]{36}$/);
	await page.reload();
	const recover = page.getByRole('button', { name: 'Consultar pedido original' });
	await recover.focus();
	await page.keyboard.press('Enter');
	await expect(page.getByRole('status')).toContainText('em andamento');
	await expect(page.getByRole('status')).toBeFocused();
	await recover.click();
	await expect.poll(() => reads).toBe(2);
	expect(writes).toBe(1);
	expect(await page.evaluate((n) => sessionStorage.getItem(n), name)).toBe(stored);
});

test('pending lookup locks sibling actions and revocation still permits recovery', async ({
	page
}) => {
	await page.addInitScript(({ name, key }) => sessionStorage.setItem(name, key), { name, key });
	let finish!: () => void;
	const pending = new Promise<void>((resolve) => {
		finish = resolve;
	});
	await page.route('**/api/workflows/recover', async (route) => {
		await pending;
		await route.fulfill({ status: 503, json: { error: 'unavailable' } });
	});
	await page.goto(`${path}?released=false`);
	await page.getByRole('button', { name: 'Consultar pedido original' }).click();
	await expect(page.getByRole('button', { name: 'Outra ação local' })).toBeDisabled();
	await expect(page.getByRole('button', { name: 'Consultar pedido original' })).toBeDisabled();
	finish();
	await expect(page.getByRole('status')).toBeFocused();
	await expect(page.getByRole('button', { name: 'Consultar pedido original' })).toBeEnabled();
});

test('storage denied fails closed without sending requests', async ({ page }) => {
	let requests = 0;
	await page.addInitScript(() =>
		Object.defineProperty(window, 'sessionStorage', {
			get() {
				throw new DOMException('denied');
			}
		})
	);
	await page.route('**/api/workflows/**', async (route) => {
		requests++;
		await route.abort();
	});
	await page.goto(path);
	await expect(page.getByRole('status')).toContainText('armazenamento');
	await expect(page.getByRole('button', { name: 'Reprocessar em nova versão' })).toBeDisabled();
	expect(requests).toBe(0);
});

for (const width of [1440, 820, 390, 320]) {
	test(`recovery layout and reduced motion ${width}`, async ({ page }, testInfo) => {
		await page.setViewportSize({ width, height: width === 820 ? 1180 : width <= 390 ? 844 : 1000 });
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await page.addInitScript(({ name, key }) => sessionStorage.setItem(name, key), { name, key });
		await page.route('**/api/workflows/recover', (route) =>
			route.fulfill({ json: { request: null } })
		);
		await page.goto(path);
		await page.getByRole('button', { name: 'Recusar analytics' }).click();
		const action = page.getByRole('button', { name: 'Consultar pedido original' });
		await action.click();
		await expect(page.getByRole('status')).toBeFocused();
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
			true
		);
		const box = await action.boundingBox();
		expect(box?.height).toBeGreaterThanOrEqual(44);
		// Normalize scroll after focus before a full-page capture of fixed elements.
		await page.evaluate(() => window.scrollTo(0, 0));
		await page.screenshot({ path: testInfo.outputPath(`recovery-${width}.png`), fullPage: true });
	});
}
