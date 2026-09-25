import { expect, test, type Page } from '@playwright/test';
const owner = '00000000-0000-4000-8000-000000000056';
const key = '00000000-0000-4000-8000-000000000077';
const runId = '00000000-0000-4000-8000-000000000078';
const library = '00000000-0000-4000-8000-000000000079';
const productId = 'pair-preview';
const path = '/biblioteca/_spec/entrada?product=pair-preview';
const slot = `atv-create:${owner}:${productId}`;
const permission = 'Declaro ter permissão da outra pessoa';
const privacy = 'Autorizo guardar as cópias';
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
	await page.route('**/api/onboarding', (route) => route.fulfill({ json: { onboarding: value } }));
	await page.goto(path);
	await page.getByRole('button', { name: 'Consultar perfil salvo', exact: true }).click();
}
async function fill(page: Page) {
	await page
		.getByLabel('Precisão do horário da outra pessoa', { exact: true })
		.selectOption('EXACT');
	await page.getByLabel('Data de nascimento da outra pessoa', { exact: true }).fill('2000-02-29');
	await page.getByLabel('Hora local da outra pessoa', { exact: true }).fill('10:00:00.125');
	await page.getByLabel('Fuso da outra pessoa', { exact: true }).fill('UTC');
	await page.getByLabel('Deslocamento UTC naquela data', { exact: true }).fill('+00:00');
	await page.getByLabel('Latitude de nascimento da outra pessoa', { exact: true }).fill('51.5');
	await page.getByLabel('Longitude de nascimento da outra pessoa', { exact: true }).fill('-0.12');
}
async function authorize(page: Page) {
	await page.getByLabel(permission, { exact: false }).check();
	await page.getByLabel(privacy, { exact: false }).check();
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
test('blank partner and two unchecked consents → minimal request → private Library reference', async ({
	page
}) => {
	let writes = 0;
	await recovery(page);
	await page.route('**/api/workflows/pair', async (route) => {
		writes++;
		const body = route.request().postDataJSON();
		expect(body.input).toEqual({
			version: 'atv-pair-request/1',
			productId,
			expectedRevision: 2,
			partner: {
				localDateTime: '2000-02-29T10:00:00.125',
				utcInstant: '2000-02-29T10:00:00.125Z',
				timezone: 'UTC',
				latitude: 51.5,
				longitude: -0.12,
				locationSource: 'manual-partner/1',
				timePrecision: 'EXACT'
			},
			consent: {
				storage: true,
				policyVersion: 'atv-input-consent/1',
				partner: true,
				continuity: false
			},
			partnerConsent: {
				storage: true,
				policyVersion: 'atv-partner-storage/1',
				permissionDeclared: true,
				sharing: false
			}
		});
		expect(await page.evaluate((name) => sessionStorage.getItem(name), slot)).toBe(body.requestKey);
		return route.fulfill({ status: 202, json: { runId } });
	});
	await ready(page);
	for (const input of await page.locator('.partner-fields input, .partner-fields select').all())
		await expect(input).toHaveValue('');
	await expect(page.getByLabel(permission, { exact: false })).not.toBeChecked();
	await expect(page.getByLabel(privacy, { exact: false })).not.toBeChecked();
	await fill(page);
	await page.getByLabel(privacy, { exact: false }).check();
	await expect(page.getByRole('button', { name: 'Criar pedido', exact: true })).toBeDisabled();
	await authorize(page);
	await page.getByRole('button', { name: 'Criar pedido', exact: true }).click();
	await expect(page.getByRole('link', { name: 'Abrir pedido na Biblioteca' })).toHaveAttribute(
		'href',
		`/biblioteca/${library}`
	);
	for (const input of await page.locator('.partner-fields input, .partner-fields select').all())
		await expect(input).toHaveValue('');
	await expect(page.getByLabel(permission, { exact: false })).not.toBeChecked();
	await expect(page.getByLabel(privacy, { exact: false })).not.toBeChecked();
	const stored = await page.evaluate(() => JSON.stringify({ ...sessionStorage }));
	expect(stored).not.toMatch(/2000-02-29|51\.5|manual-partner|permissionDeclared/);
	expect(writes).toBe(1);
});
test('changing any partner field or rereading owner resets both authorizations', async ({
	page
}) => {
	await ready(page);
	await fill(page);
	for (const [selector, value] of [
		['#partner-date', '2000-03-01'],
		['#partner-time', '11:00'],
		['#partner-timezone', 'Etc/UTC'],
		['#partner-offset', '+00:00:00'],
		['#partner-latitude', '50'],
		['#partner-longitude', '0']
	]) {
		await authorize(page);
		await page.locator(selector).fill(value);
		await expect(page.getByLabel(permission, { exact: false })).not.toBeChecked();
		await expect(page.getByLabel(privacy, { exact: false })).not.toBeChecked();
	}
	await authorize(page);
	await page.locator('#partner-precision').selectOption('APPROXIMATE');
	await expect(page.getByLabel(permission, { exact: false })).not.toBeChecked();
	await expect(page.getByLabel(privacy, { exact: false })).not.toBeChecked();
	await authorize(page);
	await expect(page.getByRole('button', { name: 'Criar pedido', exact: true })).toBeDisabled();
	await page.getByRole('button', { name: 'Consultar perfil salvo', exact: true }).click();
	await expect(page.getByLabel(permission, { exact: false })).not.toBeChecked();
	await expect(page.getByLabel(privacy, { exact: false })).not.toBeChecked();
});
test('mismatched UTC blocks locally, server revision conflict clears draft and key', async ({
	page
}) => {
	let writes = 0;
	await page.route('**/api/workflows/pair', (route) => {
		writes++;
		return route.fulfill({ status: 409, json: { error: 'revision_conflict' } });
	});
	await ready(page);
	await fill(page);
	await page.locator('#partner-offset').fill('+01:00');
	await authorize(page);
	await expect(page.getByRole('button', { name: 'Criar pedido', exact: true })).toBeDisabled();
	await expect(page.getByText('O fuso, o deslocamento UTC', { exact: false })).toBeVisible();
	expect(writes).toBe(0);
	await page.locator('#partner-offset').fill('+00:00');
	await authorize(page);
	await page.getByRole('button', { name: 'Criar pedido', exact: true }).click();
	await expect(page.getByText('Seu perfil mudou.', { exact: false })).toBeFocused();
	await expect(page.locator('#partner-date')).toHaveValue('');
	expect(await page.evaluate((name) => sessionStorage.getItem(name), slot)).toBeNull();
	expect(writes).toBe(1);
});
test('lost acknowledgement clears partner draft; reload recovers without profile, consent or replay', async ({
	page
}) => {
	let writes = 0;
	await page.route('**/api/workflows/pair', (route) => {
		writes++;
		return route.abort();
	});
	await ready(page);
	await fill(page);
	await authorize(page);
	await page.getByRole('button', { name: 'Criar pedido', exact: true }).click();
	await expect(page.getByRole('button', { name: 'Consultar pedido original' })).toBeVisible();
	await expect(page.locator('#partner-date')).toHaveValue('');
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
for (const access of ['UNRELEASED', 'ACCESS_REQUIRED', 'UNAVAILABLE']) {
	test(`${access}: read-only recovery remains available`, async ({ page }) => {
		await page.addInitScript(({ slot, key }) => sessionStorage.setItem(slot, key), { slot, key });
		let forbidden = 0;
		await page.route('**/api/onboarding', (route) => {
			forbidden++;
			return route.abort();
		});
		await page.route('**/api/workflows/pair', (route) => {
			forbidden++;
			return route.abort();
		});
		await recovery(page);
		await page.goto(path + '&access=' + access);
		await expect(page.getByRole('button', { name: 'Criar pedido', exact: true })).toBeDisabled();
		await page.getByRole('button', { name: 'Consultar pedido original' }).click();
		await expect(page.getByRole('link', { name: 'Abrir pedido na Biblioteca' })).toBeVisible();
		expect(forbidden).toBe(0);
	});
}
for (const variant of ['approximate', 'missing', 'malformed']) {
	test(`${variant}: unsuitable owner profile blocks partner input`, async ({ page }) => {
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
		await expect(page.locator('#partner-date')).toBeDisabled();
		await expect(page.getByRole('button', { name: 'Criar pedido', exact: true })).toBeDisabled();
	});
}
for (const width of [1440, 820, 390, 320]) {
	test(`pair visual, keyboard and reflow ${width}`, async ({ page }, testInfo) => {
		await page.setViewportSize({
			width,
			height: width === 820 ? 1180 : width === 1440 ? 1000 : 844
		});
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await ready(page);
		await fill(page);
		const declaration = page.getByLabel(permission, { exact: false });
		await declaration.focus();
		await page.keyboard.press('Space');
		await expect(declaration).toBeChecked();
		await page.keyboard.press('Tab');
		await expect(page.getByLabel(privacy, { exact: false })).toBeFocused();
		await page.keyboard.press('Space');
		await page.keyboard.press('Tab');
		await expect(page.getByRole('button', { name: 'Criar pedido', exact: true })).toBeFocused();
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
			true
		);
		for (const field of await page.locator('.partner-fields input, .partner-fields select').all())
			expect((await field.boundingBox())!.height).toBeGreaterThanOrEqual(44);
		await page.screenshot({
			path: testInfo.outputPath(`pair-intake-${width}.png`),
			fullPage: true
		});
	});
}
test('real pair intake requires authentication', async ({ page }) => {
	await page.goto('/biblioteca/nova/pair-preview');
	await expect(page).toHaveURL(/\/entrar/);
});
