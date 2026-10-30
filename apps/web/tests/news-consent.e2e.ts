import { expect, test, type Page } from '@playwright/test';
import { productDefinitionFor } from '@atv/domain';

// Browser fixtures isolate opt-in behavior; news-consent.integration.spec.ts
// exercises the real API, HMAC and migration under PostgreSQL roles.
const binding = `1793332800000.${'a'.repeat(64)}`;
async function reading(page: Page, identified = true) {
	await page.addInitScript(() => localStorage.setItem('atv-analytics-consent', 'denied'));
	await page.route('**/api/free-tools/identity', (route) =>
		route.fulfill({ json: { identified, emailCodeAvailable: false } })
	);
	await page.route('**/api/free-tools/carta-do-dia', (route) =>
		route.fulfill({
			json: {
				result: {
					version: 'atv-free-tool-result/1.0.0',
					id: '11111111-1111-4111-8111-111111111111',
					tool: 'carta-do-dia',
					createdAt: '2026-10-30T12:00:00Z',
					title: 'Leitura sintética',
					summary: 'Texto integral de teste.',
					facts: [],
					sections: [],
					limits: []
				},
				receipt: null,
				input: null,
				profile: null,
				quota: {
					mode: 'daily-draw',
					remainingCorrections: null,
					resetsAt: '2026-10-31T03:00:00Z',
					profileRevision: 0,
					stale: false
				}
			}
		})
	);
	await page.route('**/api/free-tools/carta-do-dia/pdf', (route) =>
		route.fulfill({ contentType: 'application/pdf', body: '%PDF-1.7\nsynthetic UI fixture only' })
	);
}
const href = `/produtos/${productDefinitionFor('tarot-situation-challenge-advice')!.slug}?ferramenta=carta-do-dia`;
for (const width of [390, 1440]) {
	test(`novidades opcionais e independentes do PDF em ${width}px`, async ({ page }, testInfo) => {
		await page.setViewportSize({ width, height: 900 });
		await reading(page);
		const choices: unknown[] = [];
		await page.route('**/api/free-tools/news-consent', (route) => {
			if (route.request().method() === 'GET') return route.fulfill({ json: { owner: binding } });
			const body = route.request().postDataJSON();
			choices.push(body);
			return route.fulfill({ json: { saved: true, granted: body.granted } });
		});
		await page.goto(href);
		const option = page.getByRole('checkbox', { name: /Quero receber novidades da ATVNA/ });
		await expect(option).toBeEnabled();
		await expect(option).not.toBeChecked();
		await expect(page.getByText('Esta escolha é separada do PDF.', { exact: false })).toBeVisible();
		const download = page.waitForEvent('download');
		await page.getByRole('button', { name: 'Baixar meu PDF gratuito' }).click();
		await download;
		expect(choices).toEqual([]);
		await option.check();
		await page.getByRole('button', { name: 'Salvar minha escolha' }).click();
		await expect(
			page.getByText('Escolha salva: você autorizou novidades por e-mail.')
		).toBeVisible();
		await option.uncheck();
		await page.getByRole('button', { name: 'Salvar minha escolha' }).click();
		await expect(
			page.getByText('Escolha salva: você não autorizou novidades por e-mail.')
		).toBeVisible();
		expect(choices).toEqual([
			{ granted: true, owner: binding },
			{ granted: false, owner: binding }
		]);
		await expect(page.getByRole('button', { name: 'Baixar meu PDF gratuito' })).toBeEnabled();
		expect(
			await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
		).toBeLessThanOrEqual(1);
		await page
			.locator('.free-download')
			.screenshot({ path: testInfo.outputPath(`news-consent-${width}.png`) });
	});
}

test('conta alterada não recebe autorização e falha de consentimento não bloqueia PDF', async ({
	page
}) => {
	await reading(page);
	await page.route('**/api/free-tools/news-consent', (route) =>
		route.request().method() === 'GET'
			? route.fulfill({ json: { owner: binding } })
			: route.fulfill({ status: 409, json: { code: 'account_changed' } })
	);
	await page.goto(href);
	const option = page.getByRole('checkbox', { name: /Quero receber novidades da ATVNA/ });
	await expect(option).toBeEnabled();
	await option.check();
	await page.getByRole('button', { name: 'Salvar minha escolha' }).click();
	await expect(
		page.getByText('Sua conta mudou ou expirou. Atualize a página para escolher novamente.')
	).toBeVisible();
	await expect(option).not.toBeChecked();
	await expect(option).toBeDisabled();
	await expect(page.getByRole('button', { name: 'Baixar meu PDF gratuito' })).toBeEnabled();
});

test('resposta antiga de identidade opcional não reaparece após perder o foco', async ({
	page
}) => {
	await reading(page);
	let entered = false;
	let release!: () => void;
	let delivered!: () => void;
	const gate = new Promise<void>((resolve) => {
		release = resolve;
	});
	const response = new Promise<void>((resolve) => {
		delivered = resolve;
	});
	await page.route('**/api/free-tools/news-consent', async (route) => {
		entered = true;
		await gate;
		await route.fulfill({ json: { owner: binding } });
		delivered();
	});
	await page.goto(href);
	await expect.poll(() => entered).toBe(true);
	await page.evaluate(() => window.dispatchEvent(new Event('blur')));
	release();
	await response;
	await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
	const option = page.getByRole('checkbox', { name: /Quero receber novidades da ATVNA/ });
	await expect(option).not.toBeChecked();
	await expect(option).toBeDisabled();
	await page.evaluate(() => window.dispatchEvent(new Event('focus')));
	await expect(option).toBeEnabled();
	await expect(option).not.toBeChecked();
});
