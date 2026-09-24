import { test, expect, type Page } from '@playwright/test';
import {
	ONBOARDING_VERSION,
	type OnboardingSnapshot,
	type OnboardingCommand
} from '../src/lib/onboarding';
const initial = (): OnboardingSnapshot => ({
	version: ONBOARDING_VERSION,
	revision: 0,
	state: 'NOT_STARTED',
	natal: null
});
async function setup(page: Page) {
	let saved = initial();
	const commands: OnboardingCommand[] = [];
	let failure = '';
	await page.route('**/api/onboarding', async (route) => {
		const req = route.request();
		if (req.method() === 'POST') commands.push(req.postDataJSON());
		if (failure === 'network') return route.abort();
		if (failure === 'malformed') return route.fulfill({ json: { onboarding: {} } });
		if (failure && failure !== 'lost_after_save')
			return route.fulfill({
				status: failure === 'invalid_input' ? 400 : failure === 'auth_required' ? 401 : 409,
				json: { error: failure }
			});
		if (req.method() === 'POST') {
			const cmd = req.postDataJSON() as OnboardingCommand;
			saved = {
				version: ONBOARDING_VERSION,
				revision: saved.revision + 1,
				state: cmd.action === 'save-natal' ? 'COMPLETE' : 'IN_PROGRESS',
				natal:
					cmd.action === 'save-natal'
						? { ...cmd.natal, version: saved.revision + 1 }
						: cmd.action === 'forget-natal'
							? null
							: saved.natal
			};
			if (failure === 'lost_after_save') return route.abort();
		}
		return route.fulfill({ json: { onboarding: saved } });
	});
	await page.goto('/conta/_spec/nascimento');
	await expect(page.getByRole('button', { name: 'Completar depois' })).toBeEnabled();
	await page.getByRole('button', { name: 'Recusar analytics' }).click();
	return {
		commands,
		fail: (value: string) => {
			failure = value;
		}
	};
}
async function fill(page: Page) {
	await page.getByLabel('Data de nascimento', { exact: true }).fill('2000-01-01');
	await page.getByLabel('O que você sabe sobre a hora?').selectOption('APPROXIMATE');
	await page.getByLabel('Hora local de nascimento', { exact: true }).fill('12:30');
	for (const [label, value] of [
		['Cidade e região de nascimento', 'Local sintético'],
		['Código do país', 'BR'],
		['Fuso IANA', 'America/Sao_Paulo'],
		['Latitude', '-23.5'],
		['Longitude', '-46.6'],
		['Deslocamento UTC na data de nascimento', '-02:00'],
		['Fonte das coordenadas e do fuso', 'Fixture local']
	])
		await page.getByLabel(label, { exact: true }).fill(value);
}
test('explicit consent, save, reload, correction and scoped deletion', async ({ page }) => {
	const api = await setup(page);
	await expect(page.getByLabel('Data de nascimento', { exact: true })).toHaveValue('');
	await expect(page.getByLabel('O que você sabe sobre a hora?')).toHaveValue('UNKNOWN');
	await fill(page);
	const submit = page.getByRole('button', { name: 'Salvar perfil natal' });
	await expect(submit).toBeDisabled();
	await page.getByRole('checkbox').check();
	expect(
		await page.locator('form input').evaluateAll((nodes) =>
			nodes
				.map((node) => node as HTMLInputElement)
				.filter((node) => !node.validity.valid)
				.map((node) => ({ id: node.id, value: node.value, validation: node.validationMessage }))
		)
	).toEqual([]);
	await submit.click();
	await expect(page.getByRole('status')).toContainText('Perfil natal salvo');
	expect(api.commands).toHaveLength(1);
	expect(api.commands[0]).toMatchObject({
		expectedRevision: 0,
		natal: { timePrecision: 'APPROXIMATE', utcInstant: '2000-01-01T14:30:00.000Z' }
	});
	await expect(page.getByRole('checkbox')).not.toBeChecked();
	await page.reload();
	await expect(page.getByLabel('Cidade e região de nascimento')).toHaveValue('Local sintético');
	await page.getByLabel('Cidade e região de nascimento').fill('Correção sintética');
	await page.getByRole('checkbox').check();
	await submit.click();
	await expect(page.getByRole('status')).toContainText('Perfil natal salvo');
	expect(api.commands[1].expectedRevision).toBe(1);
	const forget = page.getByRole('button', { name: 'Apagar perfil natal', exact: true });
	await forget.click();
	await expect(page.getByRole('dialog')).toBeVisible();
	await page.keyboard.press('Escape');
	await expect(page.getByRole('dialog')).not.toBeVisible();
	await expect(forget).toBeFocused();
	expect(api.commands).toHaveLength(2);
	await forget.click();
	await page.getByRole('button', { name: 'Confirmar exclusão natal' }).click();
	await expect(page.getByRole('status')).toContainText('Todas as versões');
	await expect(page.getByLabel('Data de nascimento', { exact: true })).toHaveValue('');
	expect(api.commands[2]).toMatchObject({ action: 'forget-natal', expectedRevision: 2 });
	const storage = await page.evaluate(() => ({
		local: { ...localStorage },
		session: { ...sessionStorage }
	}));
	expect(storage.local).toEqual({ 'atv-analytics-consent': 'denied' });
	// SvelteKit persists navigation/scroll state on reload, not the natal form.
	expect(
		Object.keys(storage.session).every((key) =>
			['sveltekit:scroll', 'sveltekit:snapshot'].includes(key)
		)
	).toBe(true);
	expect(JSON.stringify(storage)).not.toMatch(
		/Local sintético|Correção sintética|2000-01-01|America\/Sao_Paulo|Fixture local/
	);
});
test('lost response after saving recovers the committed version without duplicating it', async ({
	page
}) => {
	const api = await setup(page);
	await fill(page);
	await page.getByRole('checkbox').check();
	api.fail('lost_after_save');
	await page.getByRole('button', { name: 'Salvar perfil natal' }).click();
	await expect(page.getByRole('alert')).toContainText('pode ter sido salvo');
	await expect(page.getByRole('button', { name: 'Salvar perfil natal' })).toBeDisabled();
	api.fail('');
	await page.getByRole('button', { name: 'Recarregar perfil salvo' }).click();
	await expect(page.getByText('Versão 1 · Hora aproximada')).toBeVisible();
	await expect(page.getByLabel('Cidade e região de nascimento')).toHaveValue('Local sintético');
	await expect(page.getByRole('checkbox')).not.toBeChecked();
	expect(api.commands).toHaveLength(1);
});
test('unknown hour allows only begin and preserves the draft without persisting birth data', async ({
	page
}) => {
	const api = await setup(page);
	await page.getByLabel('Data de nascimento', { exact: true }).fill('2000-01-01');
	await page.getByRole('button', { name: 'Completar depois' }).click();
	await expect(page.getByRole('status')).toContainText('Seu início foi salvo');
	expect(api.commands).toEqual([
		{ version: ONBOARDING_VERSION, expectedRevision: 0, action: 'begin' }
	]);
	await expect(page.getByLabel('Data de nascimento', { exact: true })).toHaveValue('2000-01-01');
	await expect(page.getByRole('button', { name: 'Salvar perfil natal' })).toBeDisabled();
});
for (const failure of ['revision_conflict', 'auth_required', 'network', 'malformed'])
	test(`${failure} preserves draft, blocks repeat and requires successful recovery`, async ({
		page
	}) => {
		const api = await setup(page);
		await fill(page);
		await page.getByRole('checkbox').check();
		api.fail(failure);
		await page.getByRole('button', { name: 'Salvar perfil natal' }).click();
		await expect(page.getByRole('alert')).toBeVisible();
		await expect(page.getByRole('button', { name: 'Salvar perfil natal' })).toBeDisabled();
		await expect(page.getByLabel('Cidade e região de nascimento')).toHaveValue('Local sintético');
		const recover = page.getByRole('button', { name: 'Recarregar perfil salvo' });
		await recover.click();
		await expect(recover).toBeEnabled();
		await expect(page.getByRole('button', { name: 'Completar depois' })).toBeDisabled();
		expect(api.commands).toHaveLength(1);
		api.fail('');
		await recover.click();
		await expect(page.getByRole('button', { name: 'Completar depois' })).toBeEnabled();
		await expect(page.getByRole('checkbox')).not.toBeChecked();
		await expect(page.getByLabel('Cidade e região de nascimento')).toHaveValue('');
	});
test('known invalid input allows correction without recovery or silent retry', async ({ page }) => {
	const api = await setup(page);
	await fill(page);
	await page.getByRole('checkbox').check();
	api.fail('invalid_input');
	await page.getByRole('button', { name: 'Salvar perfil natal' }).click();
	await expect(page.getByRole('alert')).toContainText('validação');
	await expect(page.getByRole('button', { name: 'Salvar perfil natal' })).toBeEnabled();
	expect(api.commands).toHaveLength(1);
});
test('private route requires authentication; local fixture is no-store', async ({ page }) => {
	const response = await page.goto('/conta/nascimento');
	expect(response?.url()).toContain('/entrar');
	const spec = await page.goto('/conta/_spec/nascimento');
	expect(spec?.headers()['cache-control']).toContain('no-store');
	expect(spec?.headers()['x-robots-tag']).toBe('noindex, nofollow');
});
test('initial unavailability never pretends to have recovered a profile', async ({ page }) => {
	await page.route('**/api/onboarding', (route) =>
		route.fulfill({ status: 503, json: { error: 'unavailable' } })
	);
	await page.goto('/conta/_spec/nascimento');
	await expect(page.getByRole('alert')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Completar depois' })).toBeDisabled();
	await expect(page.getByLabel('Data de nascimento', { exact: true })).toHaveValue('');
	await expect(page.getByRole('button', { name: 'Recarregar perfil salvo' })).toBeEnabled();
});
test('pending submission disables mutations and sends exactly one command', async ({ page }) => {
	const api = await setup(page);
	await fill(page);
	await page.getByRole('checkbox').check();
	let release = () => {};
	const pending = new Promise<void>((resolve) => {
		release = resolve;
	});
	await page.route('**/api/onboarding', async (route) => {
		await pending;
		await route.fallback();
	});
	await page.getByRole('button', { name: 'Salvar perfil natal' }).click();
	await expect(page.getByRole('status')).toContainText('Aguarde a confirmação');
	await expect(page.getByRole('button', { name: 'Salvar perfil natal' })).toBeDisabled();
	await expect(page.getByRole('button', { name: 'Completar depois' })).toBeDisabled();
	await expect(page.getByLabel('Cidade e região de nascimento')).toBeDisabled();
	release();
	await expect(page.getByRole('status')).toContainText('Perfil natal salvo');
	expect(api.commands).toHaveLength(1);
});
for (const [width, height] of [
	[1440, 1000],
	[820, 1180],
	[390, 844],
	[320, 800]
])
	test(`visual and keyboard ${width}`, async ({ page }, info) => {
		await page.setViewportSize({ width, height });
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await setup(page);
		await fill(page);
		await expect(page.getByRole('heading', { name: 'Seu nascimento, com cuidado.' })).toBeVisible();
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
			true
		);
		const precision = page.getByLabel('O que você sabe sobre a hora?');
		await precision.focus();
		await page.keyboard.press('Shift+Tab');
		await expect(page.getByLabel('Data de nascimento', { exact: true })).toBeFocused();
		await page.evaluate(() => {
			(document.activeElement as HTMLElement)?.blur();
			window.scrollTo(0, 0);
		});
		await page.screenshot({ path: info.outputPath(`natal-${width}.png`), fullPage: true });
	});
