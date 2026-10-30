import { expect, test, type Page } from '@playwright/test';
import { emptyNatalForm } from '../src/lib/natal-form';
import type { FreeToolState } from '../src/lib/free-tool-state';
import type { FreeToolResult } from '../src/lib/free-tools';

// Deliberate browser fixtures for privacy/race states; calculation and SQL are
// exercised without interception in free-tools.e2e.ts and the ledger DB suite.
const ownerA = 'a'.repeat(64);
const ownerB = 'b'.repeat(64);
const idA = '11111111-1111-4111-8111-111111111111';
const idB = '22222222-2222-4222-8222-222222222222';
function reading(tool: FreeToolResult['tool'], id = idA): FreeToolResult {
	return {
		version: 'atv-free-tool-result/1.0.0',
		id,
		tool,
		createdAt: '2026-10-27T12:00:00.000Z',
		title: `Leitura sintética ${id === idA ? 'A' : 'B'}`,
		summary: 'Texto privado sintético de teste.',
		facts: [],
		sections: [],
		limits: []
	};
}
function state(owner = ownerA, result: FreeToolResult | null = null): FreeToolState {
	return {
		owner,
		result,
		receipt: null,
		input: null,
		profile: null,
		quota: {
			mode: result?.tool === 'registro-de-sonho' ? 'daily-entry' : 'daily-draw',
			remainingCorrections: null,
			resetsAt: '2026-10-29T03:00:00.000Z',
			profileRevision: 0,
			stale: false
		}
	};
}
async function seed(page: Page, tool: string, result: FreeToolResult | null = null) {
	await page.addInitScript(
		({ tool, result, owner, natal }) => {
			localStorage.setItem('atv-analytics-consent', 'denied');
			sessionStorage.setItem(
				`atv-free-tool:${tool}`,
				JSON.stringify({
					owner,
					result,
					receipt: null,
					expiresAt: Date.now() + 25 * 60 * 1000,
					editing: false,
					draft: {
						birth: natal,
						partner: natal,
						pairConsent: false,
						focus: 'Rascunho privado A',
						dreamDate: '',
						narrative: '',
						emotions: '',
						associations: ''
					}
				})
			);
		},
		{ tool, result, owner: ownerA, natal: emptyNatalForm() }
	);
}
async function logoutSignal(page: Page) {
	await page.evaluate(() => {
		const form = document.createElement('form');
		form.action = '/sair';
		// Exercise the privacy listener without performing the real logout navigation.
		form.addEventListener('submit', (event) => event.preventDefault());
		document.body.append(form);
		form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
		form.remove();
	});
}
test('cache privado só aparece após confirmar o mesmo dono; conta B descarta o rascunho A', async ({
	page
}) => {
	await seed(page, 'carta-do-dia', reading('carta-do-dia'));
	let release!: () => void;
	const gate = new Promise<void>((resolve) => (release = resolve));
	await page.route('**/api/free-tools/carta-do-dia', async (route) => {
		await gate;
		await route.fulfill({ json: state(ownerB) });
	});
	await page.goto('/ferramentas/carta-do-dia');
	await expect(page.getByText('Conferindo suas leituras…')).toBeVisible();
	await expect(page.locator('.result-card')).toHaveCount(0);
	await expect(page.locator('#carta-do-dia-tarot-focus')).toHaveValue('');
	await expect(page.locator('#carta-do-dia-tarot-focus')).toBeDisabled();
	release();
	await expect(page.locator('#carta-do-dia-tarot-focus')).toBeEnabled();
	await expect(page.locator('#carta-do-dia-tarot-focus')).toHaveValue('');
	expect(
		await page.evaluate(() => sessionStorage.getItem('atv-free-tool:carta-do-dia'))
	).toBeNull();
});
test('mesmo dono recupera apenas o rascunho após GET; erro 409 remove leitura e dados privados', async ({
	page
}) => {
	await seed(page, 'carta-do-dia');
	let response = state();
	let failure = false;
	await page.route('**/api/free-tools/carta-do-dia', (route) =>
		route.fulfill(failure ? { status: 409, json: { code: 'subject_claimed' } } : { json: response })
	);
	await page.goto('/ferramentas/carta-do-dia');
	await expect(page.locator('#carta-do-dia-tarot-focus')).toHaveValue('Rascunho privado A');
	response = state(ownerA, reading('carta-do-dia'));
	await page.evaluate(() => window.dispatchEvent(new Event('focus')));
	await expect(page.locator('.result-card')).toContainText('Leitura sintética A');
	failure = true;
	await page.evaluate(() => window.dispatchEvent(new Event('focus')));
	await expect(page.locator('.result-card')).toHaveCount(0);
	await expect(page.locator('#carta-do-dia-tarot-focus')).toHaveValue('');
	await expect(page.locator('#carta-do-dia-tarot-focus')).toBeDisabled();
	await expect(page.getByRole('link', { name: 'Entrar para recuperar a leitura' })).toBeVisible();
	expect(
		await page.evaluate(() => sessionStorage.getItem('atv-free-tool:carta-do-dia'))
	).toBeNull();
});
test('saída limpa imediatamente e GET atrasado não repõe a leitura', async ({ page }) => {
	let release!: () => void;
	let pending = false;
	const gate = new Promise<void>((resolve) => (release = resolve));
	await page.route('**/api/free-tools/carta-do-dia', async (route) => {
		if (pending) await gate;
		await route.fulfill({ json: state(ownerA, reading('carta-do-dia')) }).catch(() => {});
	});
	await page.goto('/ferramentas/carta-do-dia');
	await expect(page.locator('.result-card')).toContainText('Leitura sintética A');
	pending = true;
	await page.evaluate(() => window.dispatchEvent(new Event('focus')));
	await expect(page.getByText('Conferindo suas leituras…')).toBeVisible();
	await logoutSignal(page);
	release();
	await expect(page.locator('.result-card')).toHaveCount(0);
	await expect(page.locator('#carta-do-dia-tarot-focus')).toBeDisabled();
	await page.waitForTimeout(300);
	await expect(page.locator('.result-card')).toHaveCount(0);
	expect(
		await page.evaluate(() => sessionStorage.getItem('atv-free-tool:carta-do-dia'))
	).toBeNull();
});
test('saída durante POST cancela apresentação tardia e envia vínculo opaco do formulário', async ({
	page
}) => {
	let release!: () => void;
	let submittedOwner: string | undefined;
	const gate = new Promise<void>((resolve) => (release = resolve));
	await page.route('**/api/free-tools/carta-do-dia', async (route) => {
		if (route.request().method() === 'POST') {
			submittedOwner = route.request().headers()['x-atv-owner'];
			await gate;
			await route.fulfill({ json: state(ownerA, reading('carta-do-dia')) }).catch(() => {});
		} else await route.fulfill({ json: state() });
	});
	await page.goto('/ferramentas/carta-do-dia');
	await expect(page.locator('#carta-do-dia-tarot-focus')).toBeEnabled();
	await page.locator('#carta-do-dia-tarot-focus').fill('Contexto sintético privado');
	await page.locator('form.tool-form button[type="submit"]').click();
	await expect.poll(() => submittedOwner).toBe(ownerA);
	await logoutSignal(page);
	release();
	await expect(page.locator('#carta-do-dia-tarot-focus')).toHaveValue('');
	await expect(page.locator('#carta-do-dia-tarot-focus')).toBeDisabled();
	await page.waitForTimeout(300);
	await expect(page.locator('.result-card')).toHaveCount(0);
});
for (const [scenario, unsafeError] of [
	['outro dono', { code: 'invalid_input', owner: ownerB }],
	['sem dono', { code: 'invalid_input' }],
	['erro desconhecido', { code: 'calculation_failed', owner: ownerA }]
] as const) {
	test(`400 conhecido preserva rascunho confirmado; ${scenario} limpa e bloqueia`, async ({
		page
	}) => {
		await seed(page, 'carta-do-dia');
		let failClosed = false;
		await page.route('**/api/free-tools/carta-do-dia', (route) =>
			route.fulfill(
				route.request().method() === 'POST'
					? {
							status: 400,
							json: failClosed ? unsafeError : { code: 'invalid_input', owner: ownerA }
						}
					: { json: state() }
			)
		);
		await page.goto('/ferramentas/carta-do-dia');
		const field = page.locator('#carta-do-dia-tarot-focus');
		const submit = page.locator('form.tool-form button[type="submit"]');
		await expect(field).toHaveValue('Rascunho privado A');
		await submit.click();
		await expect(page.getByRole('alert')).toContainText(
			'Confira os dados informados e tente novamente.'
		);
		await expect(field).toHaveValue('Rascunho privado A');
		await expect(field).toBeEnabled();
		await expect(submit).toBeEnabled();
		failClosed = true;
		await submit.click();
		await expect(field).toHaveValue('');
		await expect(field).toBeDisabled();
		await expect(page.locator('.result-card')).toHaveCount(0);
		expect(
			await page.evaluate(() => sessionStorage.getItem('atv-free-tool:carta-do-dia'))
		).toBeNull();
	});
}

test('retorno de sonho antigo mantém o ID da leitura e a oferta correta após conferência do dono', async ({
	page
}) => {
	const old = state(ownerA, reading('registro-de-sonho', idA));
	const today = state(ownerA, reading('registro-de-sonho', idB));
	await page.route('**/api/free-tools/registro-de-sonho**', (route) => {
		const url = new URL(route.request().url());
		return route.fulfill({
			json: url.searchParams.has('historico')
				? {
						owner: ownerA,
						history: url.searchParams.has('resultado') ? [old] : [today],
						nextCursor: null
					}
				: today
		});
	});
	await page.goto(`/?ferramenta=registro-de-sonho&resultado=${idA}#ferramentas`);
	const panel = page.locator('[data-tool-panel="registro-de-sonho"]');
	await expect(panel.locator('.result-card h2')).toHaveText('Leitura sintética A');
	await expect(panel.locator('.result-card h2')).toBeFocused();
	await expect(panel.locator('[data-free-offer] a')).toHaveAttribute(
		'href',
		`/produtos/interpretacao-do-sonho?ferramenta=registro-de-sonho&origem=ferramenta&resultado=${idA}`
	);
});
