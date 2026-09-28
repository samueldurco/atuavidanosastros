import { expect, test } from '@playwright/test';

const initial = { version: 'atv-onboarding/1', revision: 0, state: 'NOT_STARTED', natal: null };
for (const mode of ['read', 'write', 'intake']) {
	test(`${mode}: a stalled onboarding response cannot lock recovery or overwrite a recovered profile`, async ({
		page
	}) => {
		let release!: () => void;
		const held = new Promise<void>((resolve) => {
			release = resolve;
		});
		let calls = 0;
		let writes = 0;
		await page.addInitScript(() => {
			localStorage.setItem('atv-analytics-consent', 'denied');
			const original = window.fetch.bind(window);
			window.fetch = (input, init) =>
				original(input, input === '/api/onboarding' ? { ...init, signal: undefined } : init);
		});
		await page.clock.install();
		await page.route('**/api/onboarding', async (route) => {
			calls++;
			if (route.request().method() === 'POST') writes++;
			if (calls === (mode === 'write' ? 2 : 1)) {
				await held;
				return route.fulfill({ json: { onboarding: initial } });
			}
			return route.fulfill({
				json: {
					onboarding: {
						...initial,
						revision: calls > 1 ? 1 : 0,
						state: calls > 1 ? 'IN_PROGRESS' : 'NOT_STARTED'
					}
				}
			});
		});
		await page.goto(
			mode === 'intake'
				? '/biblioteca/_spec/entrada?product=birth-chart'
				: '/conta/_spec/nascimento'
		);
		const begin = page.getByRole('button', { name: 'Completar depois' });
		const consult = page.getByRole('button', {
			name: mode === 'intake' ? 'Consultar perfil salvo' : 'Recarregar perfil salvo',
			exact: true
		});
		if (mode === 'write') {
			await expect(begin).toBeEnabled();
			await begin.click();
		}
		if (mode === 'intake') await consult.click();
		await expect.poll(() => calls).toBe(mode === 'write' ? 2 : 1);
		await page.clock.fastForward(mode === 'intake' ? 10001 : 15001);
		await expect(
			page.getByText(
				mode === 'write'
					? 'A resposta não chegou. O pedido pode ter sido salvo. Recarregue o perfil antes de fazer outro envio.'
					: mode === 'read'
						? 'Não foi possível recuperar seu perfil. Seus dados não foram preenchidos automaticamente.'
						: 'Não foi possível consultar seu perfil. Nenhum dado foi alterado. Tente novamente ou entre na sua conta.'
			)
		).toBeVisible();
		await expect(consult).toBeEnabled();
		if (mode !== 'intake') await expect(begin).toBeDisabled();
		if (mode === 'write') await expect(page.locator('.feedback')).toBeFocused();
		expect(writes).toBe(mode === 'write' ? 1 : 0);
		await consult.click();
		await expect(
			page.getByText(
				mode === 'intake'
					? 'Complete e consinta o armazenamento do perfil natal antes de criar este pedido.'
					: 'Cadastro em andamento',
				{ exact: true }
			)
		).toBeVisible();
		if (mode !== 'intake') await expect(begin).toBeEnabled();
		const lateResponse = page.waitForResponse((response) =>
			response.url().endsWith('/api/onboarding')
		);
		release();
		await lateResponse;
		await page.clock.runFor(100);
		await expect(
			page.getByText(
				mode === 'intake'
					? 'Complete e consinta o armazenamento do perfil natal antes de criar este pedido.'
					: 'Cadastro em andamento',
				{ exact: true }
			)
		).toBeVisible();
		expect(writes).toBe(mode === 'write' ? 1 : 0);
		expect(calls).toBe(mode === 'write' ? 3 : 2);
	});
}

test('an ambiguous error envelope cannot unlock a write without explicit valid recovery', async ({
	page
}) => {
	let reads = 0;
	let writes = 0;
	await page.addInitScript(() => localStorage.setItem('atv-analytics-consent', 'denied'));
	await page.route('**/api/onboarding', (route) => {
		if (route.request().method() === 'POST') {
			writes++;
			return route.fulfill({ status: 400, json: { error: 'invalid_input', onboarding: initial } });
		}
		reads++;
		return route.fulfill({
			json: reads === 2 ? { onboarding: initial, extra: true } : { onboarding: initial }
		});
	});
	await page.goto('/conta/_spec/nascimento');
	const begin = page.getByRole('button', { name: 'Completar depois' });
	await begin.click();
	await expect(begin).toBeDisabled();
	const recover = page.getByRole('button', { name: 'Recarregar perfil salvo' });
	await recover.click();
	await expect(
		page.getByText(
			'Não foi possível recuperar seu perfil. Seus dados não foram preenchidos automaticamente.'
		)
	).toBeVisible();
	await expect(begin).toBeDisabled();
	await recover.click();
	await expect(begin).toBeEnabled();
	expect(writes).toBe(1);
});
