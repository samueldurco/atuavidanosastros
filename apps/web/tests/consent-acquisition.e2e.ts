import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const search = 'http://search.example.test/';
const gtm = 'https://www.googletagmanager.com/gtm.js?id=GTM-T576R9MR';
const choiceKey = 'atv-analytics-consent';

async function searchLanding(page: Page, baseURL: string, pathname = '/') {
	let requests = 0;
	const home = new URL(baseURL).origin;
	await page.context().route('**/*', (route) => {
		const url = new URL(route.request().url());
		if (url.origin === home) return route.continue();
		if (url.href === search) {
			return route.fulfill({
				contentType: 'text/html',
				headers: { 'referrer-policy': 'strict-origin-when-cross-origin' },
				body: `<a href="${home}${pathname}">Entrada</a>`
			});
		}
		if (url.href === gtm) requests++;
		return route.abort();
	});
	await page.goto(search);
	await page.getByText('Entrada').click();
	await expect(page.getByRole('button', { name: 'Aceitar opcionais' })).toBeVisible({
		timeout: 30000
	});
	expect(await page.evaluate(() => document.referrer)).toBe(search);
	expect(requests).toBe(0);
	return () => requests;
}

test('opt-in preserves the search landing, starts once and reloads normally with consent', async ({
	page,
	baseURL
}) => {
	const requests = await searchLanding(page, baseURL!);
	const landing = await page.evaluate(() => performance.timeOrigin);
	await page.getByRole('button', { name: 'Aceitar opcionais' }).click();
	await expect.poll(requests).toBe(1);
	expect(await page.evaluate(() => performance.timeOrigin)).toBe(landing);
	expect(await page.evaluate(() => document.referrer)).toBe(search);
	await page.getByRole('button', { name: 'Preferências de cookies' }).click();
	await page.getByRole('button', { name: 'Aceitar opcionais' }).click();
	expect(await page.locator(`script[src="${gtm}"]`).count()).toBe(1);
	expect(requests()).toBe(1);
	await page.reload();
	await expect.poll(requests).toBe(2);
});

test('changing a private landing fragment to a public anchor does not make it eligible', async ({
	page,
	baseURL
}) => {
	const requests = await searchLanding(page, baseURL!, '/#fragmento-livre');
	const landing = await page.evaluate(() => performance.timeOrigin);
	await page.locator('a[href="#ferramentas"]').first().click();
	await expect(page).toHaveURL(/#ferramentas$/);
	await expect(page.locator('html')).toHaveAttribute('data-atv-internal-navigation', '');
	await page.getByRole('button', { name: 'Aceitar opcionais' }).click();
	expect(await page.evaluate(() => performance.timeOrigin)).toBe(landing);
	expect(await page.locator(`script[src="${gtm}"]`).count()).toBe(0);
	expect(requests()).toBe(0);
	await page.getByRole('button', { name: 'Preferências de cookies' }).click();
	await page.getByRole('button', { name: 'Recusar opcionais' }).click();
	await page.waitForLoadState('networkidle');
	expect(await page.evaluate(() => performance.timeOrigin)).toBe(landing);
	expect(await page.evaluate((key) => localStorage.getItem(key), choiceKey)).toBe('denied');
});

test('a delayed container reaches the SPA marker after leaving the landing', async ({
	page,
	baseURL
}) => {
	await searchLanding(page, baseURL!);
	let release!: () => void;
	const delayed = new Promise<void>((resolve) => (release = resolve));
	await page.route(gtm, async (route) => {
		await delayed;
		return route.fulfill({
			contentType: 'application/javascript',
			body: "document.documentElement.dataset.gtmTest = String(document.documentElement.hasAttribute('data-atv-internal-navigation'));"
		});
	});
	await Promise.all([
		page.waitForRequest(gtm),
		page.getByRole('button', { name: 'Aceitar opcionais' }).click()
	]);
	await page.locator('footer a[href="/metodo"]').click();
	await expect(page).toHaveURL(/\/metodo$/);
	release();
	await expect(page.locator('html')).toHaveAttribute('data-gtm-test', 'true');
});

test('SPA after a refused landing does not start GTM on an internal page', async ({
	page,
	baseURL
}) => {
	const requests = await searchLanding(page, baseURL!, '/?q=synthetic');
	const landing = await page.evaluate(() => performance.timeOrigin);
	await page.getByRole('button', { name: 'Recusar opcionais' }).click();
	await page.locator('footer a[href="/metodo"]').click();
	await expect(page).toHaveURL(/\/metodo$/);
	await page.getByRole('button', { name: 'Preferências de cookies' }).click();
	await page.getByRole('button', { name: 'Aceitar opcionais' }).click();
	expect(await page.evaluate((key) => localStorage.getItem(key), choiceKey)).toBe('granted');
	expect(await page.evaluate(() => performance.timeOrigin)).toBe(landing);
	expect(await page.locator(`script[src="${gtm}"]`).count()).toBe(0);
	expect(requests()).toBe(0);
	await page.reload();
	await expect.poll(requests).toBe(1);
	await page.locator('footer a[href="/privacidade"]').click();
	await expect(page).toHaveURL(/\/privacidade$/);
	await Promise.all([
		page.waitForEvent('load'),
		page.getByRole('button', { name: 'Recusar medição opcional' }).click()
	]);
	expect(requests()).toBe(1);
	expect(await page.evaluate((key) => localStorage.getItem(key), choiceKey)).toBe('denied');
	await page.getByRole('button', { name: 'Aceitar medição opcional' }).click();
	await expect.poll(requests).toBe(2);
});

test('revocation unloads the active container in another tab and on a restored document', async ({
	page,
	context,
	baseURL
}) => {
	const requests = await searchLanding(page, baseURL!);
	await page.getByRole('button', { name: 'Aceitar opcionais' }).click();
	await expect.poll(requests).toBe(1);
	const other = await context.newPage();
	await other.goto(baseURL!);
	await expect.poll(requests).toBe(2);
	await page.getByRole('button', { name: 'Preferências de cookies' }).click();
	await Promise.all([
		page.waitForEvent('load'),
		other.waitForEvent('load'),
		page.getByRole('button', { name: 'Recusar opcionais' }).click()
	]);
	expect(requests()).toBe(2);
	await expect(other.locator(`script[src="${gtm}"]`)).toHaveCount(0);
	const idleDocument = await page.evaluate(() => performance.timeOrigin);
	await other.getByRole('button', { name: 'Preferências de cookies' }).click();
	await other.getByRole('button', { name: 'Aceitar opcionais' }).click();
	await expect.poll(requests).toBe(3);
	await Promise.all([
		other.waitForEvent('load'),
		other.evaluate((key) => {
			localStorage.setItem(key, 'denied');
			window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
		}, choiceKey)
	]);
	expect(requests()).toBe(3);
	await expect(other.locator(`script[src="${gtm}"]`)).toHaveCount(0);
	expect(await page.evaluate(() => performance.timeOrigin)).toBe(idleDocument);
});
