import { expect, test, type Page } from '@playwright/test';
const owner = '00000000-0000-4000-8000-000000000056';
const key = '00000000-0000-4000-8000-000000000057';
const runId = '00000000-0000-4000-8000-000000000058';
const library = '00000000-0000-4000-8000-000000000059';
const path = '/biblioteca/_spec/entrada?product=';
const slot = (product: string) => `atv-create:${owner}:${product}`;
const privacy = 'Autorizo guardar uma cópia dos dados natais conferidos';
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
async function profile(page: Page, value: unknown = snapshot(), status = 200) {
	await page.route('**/api/onboarding', (route) => {
		expect(route.request().method()).toBe('GET');
		return route.fulfill({ status, json: { onboarding: value } });
	});
}
async function ready(page: Page, product = 'birth-chart') {
	await profile(page);
	await page.goto(path + product);
	await page.getByRole('button', { name: 'Consultar perfil salvo', exact: true }).click();
	await expect(
		page.getByText('Perfil consultado. Confira os dados', { exact: false })
	).toBeVisible();
}
async function recovery(page: Page, product = 'birth-chart') {
	await page.route('**/api/workflows/recover', (route) =>
		route.fulfill({ json: { request: { runId, productId: product, libraryItemId: library } } })
	);
	const at = '2026-09-25T12:00:00Z';
	await page.route(`**/api/workflows/${runId}`, (route) =>
		route.fulfill({
			json: {
				run: {
					id: runId,
					productId: product,
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
for (const product of ['birth-chart', 'three-pillars', 'ascendant', 'midheaven']) {
	test(`${product}: reviewed profile → exact command → verified Library, no birth browser storage`, async ({
		page
	}) => {
		let writes = 0;
		await recovery(page, product);
		await page.route('**/api/workflows/natal', async (route) => {
			writes++;
			const body = route.request().postDataJSON();
			expect(body.input).toEqual({
				version: 'atv-natal-request/1',
				productId: product,
				expectedRevision: 2,
				consent: {
					storage: true,
					policyVersion: 'atv-input-consent/1',
					partner: false,
					continuity: false
				}
			});
			expect(await page.evaluate((name) => sessionStorage.getItem(name), slot(product))).toBe(
				body.requestKey
			);
			await route.fulfill({ status: 202, json: { runId } });
		});
		await ready(page, product);
		expect(writes).toBe(0);
		await expect(page.getByLabel(privacy, { exact: false })).not.toBeChecked();
		await expect(page.getByRole('button', { name: 'Criar pedido', exact: true })).toBeDisabled();
		await page.getByLabel(privacy, { exact: false }).check();
		await page.getByRole('button', { name: 'Criar pedido', exact: true }).click();
		await expect(page.getByRole('link', { name: 'Abrir pedido na Biblioteca' })).toHaveAttribute(
			'href',
			`/biblioteca/${library}`
		);
		expect(writes).toBe(1);
		const stored = await page.evaluate(() => ({ ...sessionStorage }));
		expect(Object.keys(stored)).toEqual([slot(product)]);
		expect(stored[slot(product)]).toMatch(/^[a-f0-9-]{36}$/);
		await page.getByRole('button', { name: 'Preparar outro pedido' }).click();
		await expect(page.getByRole('button', { name: 'Criar pedido', exact: true })).toBeDisabled();
		await expect(page.getByLabel(privacy, { exact: false })).not.toBeChecked();
	});
}
for (const state of ['UNRELEASED', 'ACCESS_REQUIRED', 'UNAVAILABLE']) {
	test(`${state}: closed creation keeps recovery without any profile read`, async ({ page }) => {
		let mutations = 0;
		let reads = 0;
		await page.route('**/api/workflows/natal', (route) => {
			mutations++;
			return route.abort();
		});
		await page.route('**/api/onboarding', (route) => {
			reads++;
			return route.abort();
		});
		await page.addInitScript(({ name, key }) => sessionStorage.setItem(name, key), {
			name: slot('birth-chart'),
			key
		});
		await recovery(page);
		await page.goto(path + 'birth-chart&access=' + state);
		await expect(page.getByRole('button', { name: 'Criar pedido', exact: true })).toBeDisabled();
		await page.getByRole('button', { name: 'Consultar pedido original' }).click();
		await expect(page.getByRole('link', { name: 'Abrir pedido na Biblioteca' })).toBeVisible();
		expect(mutations).toBe(0);
		expect(reads).toBe(0);
	});
}
for (const variant of ['approximate', 'missing', 'malformed', 'unavailable']) {
	test(`${variant}: cannot create, no assumed exact profile`, async ({ page }) => {
		const data = snapshot();
		if (variant === 'approximate') data.natal.timePrecision = 'APPROXIMATE';
		await profile(
			page,
			variant === 'missing'
				? { ...data, state: 'IN_PROGRESS', natal: null }
				: variant === 'malformed'
					? { ...data, private: 'unexpected' }
					: data,
			variant === 'unavailable' ? 503 : 200
		);
		await page.goto(path + 'birth-chart');
		await page.getByRole('button', { name: 'Consultar perfil salvo', exact: true }).click();
		await expect(
			page.getByText(
				variant === 'approximate'
					? 'não transforme uma estimativa'
					: variant === 'missing'
						? 'Complete e consinta'
						: 'Não foi possível consultar seu perfil',
				{ exact: false }
			)
		).toBeVisible();
		await expect(page.getByRole('button', { name: 'Criar pedido', exact: true })).toBeDisabled();
	});
}
test('revision conflict requires explicit fresh read and consent; never automatic replay', async ({
	page
}) => {
	let writes = 0;
	await page.route('**/api/workflows/natal', (route) => {
		writes++;
		return route.fulfill({ status: 409, json: { error: 'revision_conflict' } });
	});
	await ready(page);
	await page.getByLabel(privacy, { exact: false }).check();
	await page.getByRole('button', { name: 'Criar pedido', exact: true }).click();
	await expect(page.getByText('Seu perfil mudou.', { exact: false })).toBeFocused();
	await expect(page.getByRole('button', { name: 'Criar pedido', exact: true })).toBeDisabled();
	await page.getByRole('button', { name: 'Consultar perfil salvo', exact: true }).click();
	await expect(page.getByLabel(privacy, { exact: false })).toBeEnabled();
	await expect(page.getByLabel(privacy, { exact: false })).not.toBeChecked();
	expect(writes).toBe(1);
});
test('lost acknowledgement survives reload and missing profile without replay', async ({
	page
}) => {
	let writes = 0;
	await page.route('**/api/workflows/natal', (route) => {
		writes++;
		return route.abort();
	});
	await ready(page);
	await page.getByLabel(privacy, { exact: false }).check();
	await page.getByRole('button', { name: 'Criar pedido', exact: true }).click();
	await expect(page.getByRole('button', { name: 'Consultar pedido original' })).toBeVisible();
	await page.reload();
	await recovery(page);
	await page.getByRole('button', { name: 'Consultar pedido original' }).click();
	await expect(page.getByRole('link', { name: 'Abrir pedido na Biblioteca' })).toBeVisible();
	expect(writes).toBe(1);
});
test('denied recovery storage never enables creation', async ({ page }) => {
	await page.addInitScript(() =>
		Object.defineProperty(window, 'sessionStorage', {
			get() {
				throw new Error('denied');
			}
		})
	);
	await ready(page);
	await expect(page.getByRole('button', { name: 'Criar pedido', exact: true })).toBeDisabled();
	await expect(
		page.getByText('Não foi possível preservar a chave', { exact: false })
	).toBeVisible();
});
for (const width of [1440, 820, 390, 320]) {
	test(`visual/keyboard/reflow ${width}`, async ({ page }, testInfo) => {
		await page.setViewportSize({
			width,
			height: width === 820 ? 1180 : width === 1440 ? 1000 : 844
		});
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await ready(page);
		await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
			true
		);
		await page.getByLabel(privacy, { exact: false }).focus();
		await page.keyboard.press('Space');
		await expect(page.getByLabel(privacy, { exact: false })).toBeChecked();
		await page.keyboard.press('Tab');
		await expect(page.getByRole('button', { name: 'Criar pedido', exact: true })).toBeFocused();
		expect(
			await page.locator('.skip-link').evaluate((link) => getComputedStyle(link).clipPath)
		).toBe('inset(50%)');
		await page.screenshot({
			path: testInfo.outputPath(`natal-intake-${width}.png`),
			fullPage: true
		});
	});
}
test('real natal intake requires authentication', async ({ page }) => {
	await page.goto('/biblioteca/nova/birth-chart');
	await expect(page).toHaveURL(/\/entrar/);
});
test('skip link is revealed on keyboard focus and reaches main content', async ({ page }) => {
	await ready(page);
	const skip = page.getByRole('link', { name: 'Ir para o conteúdo' });
	await skip.focus();
	expect(await skip.evaluate((link) => getComputedStyle(link).clipPath)).toBe('none');
	await page.keyboard.press('Enter');
	await expect(page.locator('#conteudo')).toBeFocused();
});
