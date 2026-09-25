import { expect, test, type Page } from '@playwright/test';
const owner = '00000000-0000-4000-8000-000000000056';
const key = '00000000-0000-4000-8000-000000000067';
const runId = '00000000-0000-4000-8000-000000000068';
const library = '00000000-0000-4000-8000-000000000069';
const productId = 'date-reading';
const path = '/biblioteca/_spec/entrada?product=date-reading';
const slot = `atv-create:${owner}:${productId}`;
const privacy = 'Autorizo guardar uma cópia dos dados natais conferidos, da data escolhida';
const snapshot = () => ({
	version: 'atv-onboarding/1',
	revision: 2,
	state: 'COMPLETE',
	natal: {
		version: 1,
		localDateTime: '2000-01-01T12:00:00.000',
		utcInstant: '2000-01-01T12:00:00.000Z',
		timezone: 'UTC',
		latitude: 0,
		longitude: 0,
		locationSource: 'synthetic-fixture',
		locationLabel: 'Local sintético',
		countryCode: 'BR',
		timePrecision: 'EXACT'
	}
});
test.beforeEach(async ({ page }) => {
	await page.addInitScript(() => localStorage.setItem('atv-analytics-consent', 'denied'));
});
async function ready(page: Page, value: unknown = snapshot()) {
	await page.route('**/api/onboarding', (route) => {
		expect(route.request().method()).toBe('GET');
		return route.fulfill({ json: { onboarding: value } });
	});
	await page.goto(path);
	await page.getByRole('button', { name: 'Consultar perfil salvo', exact: true }).click();
}
async function recovery(page: Page) {
	await page.route('**/api/workflows/recover', (route) =>
		route.fulfill({ json: { request: { runId, productId, libraryItemId: library } } })
	);
	const at = '2026-09-25T12:00:00Z';
	await page.route(`**/api/workflows/${runId}`, (route) =>
		route.fulfill({
			json: {
				run: {
					id: runId,
					productId,
					libraryItemId: library,
					parentId: null,
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
}
test('explicit date and separate consent → minimal command → Library, UUID-only browser storage', async ({
	page
}) => {
	let writes = 0;
	await recovery(page);
	await page.route('**/api/workflows/date', async (route) => {
		writes++;
		const body = route.request().postDataJSON();
		expect(body.input).toEqual({
			version: 'atv-date-request/1',
			productId,
			expectedRevision: 2,
			targetDate: '2028-02-29',
			consent: {
				storage: true,
				policyVersion: 'atv-input-consent/1',
				partner: false,
				continuity: false
			}
		});
		expect(await page.evaluate((name) => sessionStorage.getItem(name), slot)).toBe(body.requestKey);
		return route.fulfill({ status: 202, json: { runId } });
	});
	await ready(page);
	const date = page.getByLabel('Data da leitura', { exact: true });
	const consent = page.getByLabel(privacy, { exact: false });
	const submit = page.getByRole('button', { name: 'Criar pedido', exact: true });
	await expect(date).toHaveValue('');
	await expect(submit).toBeDisabled();
	await consent.check();
	await expect(submit).toBeDisabled();
	await date.fill('2028-02-29');
	await expect(consent).not.toBeChecked();
	await expect(
		page.getByText('O cálculo atual usa uma única amostra', { exact: false })
	).toBeVisible();
	await consent.check();
	await submit.click();
	await expect(page.getByRole('link', { name: 'Abrir pedido na Biblioteca' })).toHaveAttribute(
		'href',
		`/biblioteca/${library}`
	);
	expect(writes).toBe(1);
	const stored = await page.evaluate(() => ({ ...sessionStorage }));
	expect(Object.keys(stored)).toEqual([slot]);
	expect(stored[slot]).toMatch(/^[a-f0-9-]{36}$/);
	await expect(date).toHaveValue('');
	await page.getByRole('button', { name: 'Preparar outro pedido' }).click();
	await expect(submit).toBeDisabled();
	await expect(consent).not.toBeChecked();
});
test('out-of-range date and profile revision conflict cannot silently reuse consent', async ({
	page
}) => {
	let writes = 0;
	await page.route('**/api/workflows/date', (route) => {
		writes++;
		return route.fulfill({ status: 409, json: { error: 'revision_conflict' } });
	});
	await ready(page);
	const date = page.getByLabel('Data da leitura', { exact: true });
	const consent = page.getByLabel(privacy, { exact: false });
	const submit = page.getByRole('button', { name: 'Criar pedido', exact: true });
	await date.fill('2100-01-01');
	await expect(date).toHaveAttribute('aria-invalid', 'true');
	await consent.check();
	await expect(submit).toBeDisabled();
	expect(writes).toBe(0);
	await date.fill('2028-02-29');
	await consent.check();
	await submit.click();
	await expect(page.getByText('Seu perfil mudou.', { exact: false })).toBeFocused();
	await expect(consent).not.toBeChecked();
	await expect(submit).toBeDisabled();
	expect(await page.evaluate((name) => sessionStorage.getItem(name), slot)).toBeNull();
	expect(writes).toBe(1);
});
test('lost acknowledgement reload uses UUID recovery without profile/date or replay', async ({
	page
}) => {
	let writes = 0;
	await page.route('**/api/workflows/date', (route) => {
		writes++;
		return route.abort();
	});
	await ready(page);
	await page.getByLabel('Data da leitura', { exact: true }).fill('2028-02-29');
	await page.getByLabel(privacy, { exact: false }).check();
	await page.getByRole('button', { name: 'Criar pedido', exact: true }).click();
	await expect(page.getByRole('button', { name: 'Consultar pedido original' })).toBeVisible();
	await page.unroute('**/api/onboarding');
	let reads = 0;
	await page.route('**/api/onboarding', (route) => {
		reads++;
		return route.abort();
	});
	await recovery(page);
	await page.reload();
	await page.getByRole('button', { name: 'Consultar pedido original' }).click();
	await expect(page.getByRole('link', { name: 'Abrir pedido na Biblioteca' })).toBeVisible();
	expect(writes).toBe(1);
	expect(reads).toBe(0);
});
for (const state of ['UNRELEASED', 'ACCESS_REQUIRED', 'UNAVAILABLE']) {
	test(`${state}: closed creation still recovers without profile`, async ({ page }) => {
		let requests = 0;
		await page.route('**/api/onboarding', (route) => {
			requests++;
			return route.abort();
		});
		await page.route('**/api/workflows/date', (route) => {
			requests++;
			return route.abort();
		});
		await page.addInitScript(({ slot, key }) => sessionStorage.setItem(slot, key), { slot, key });
		await recovery(page);
		await page.goto(path + '&access=' + state);
		await expect(page.getByRole('button', { name: 'Criar pedido', exact: true })).toBeDisabled();
		await page.getByRole('button', { name: 'Consultar pedido original' }).click();
		await expect(page.getByRole('link', { name: 'Abrir pedido na Biblioteca' })).toBeVisible();
		expect(requests).toBe(0);
	});
}
for (const variant of ['approximate', 'missing', 'malformed']) {
	test(`${variant}: no date submission from unsuitable profile`, async ({ page }) => {
		const value = snapshot();
		if (variant === 'approximate') value.natal.timePrecision = 'APPROXIMATE';
		await ready(
			page,
			variant === 'malformed'
				? { state: 'COMPLETE' }
				: variant === 'missing'
					? { ...value, state: 'EMPTY', natal: null }
					: value
		);
		await expect(page.getByRole('button', { name: 'Criar pedido', exact: true })).toBeDisabled();
		await expect(page.getByLabel('Data da leitura', { exact: true })).toBeDisabled();
	});
}
for (const width of [1440, 820, 390, 320]) {
	test(`date input visual/keyboard/reflow ${width}`, async ({ page }, testInfo) => {
		await page.setViewportSize({
			width,
			height: width === 820 ? 1180 : width === 1440 ? 1000 : 844
		});
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await ready(page);
		await page.getByLabel('Data da leitura', { exact: true }).fill('2028-02-29');
		const consent = page.getByLabel(privacy, { exact: false });
		await consent.focus();
		await page.keyboard.press('Space');
		await expect(consent).toBeChecked();
		await page.keyboard.press('Tab');
		await expect(page.getByRole('button', { name: 'Criar pedido', exact: true })).toBeFocused();
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
			true
		);
		await page.screenshot({
			path: testInfo.outputPath(`date-intake-${width}.png`),
			fullPage: true
		});
	});
}
test('real date intake requires authentication', async ({ page }) => {
	await page.goto('/biblioteca/nova/date-reading');
	await expect(page).toHaveURL(/\/entrar/);
});
