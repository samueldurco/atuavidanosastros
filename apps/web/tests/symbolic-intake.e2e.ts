import { expect, test, type Page } from '@playwright/test';
const owner = '00000000-0000-4000-8000-000000000056';
const key = '00000000-0000-4000-8000-000000000057';
const runId = '00000000-0000-4000-8000-000000000058';
const library = '00000000-0000-4000-8000-000000000059';
const path = '/biblioteca/_spec/entrada';
const slot = (product: string) => `atv-create:${owner}:${product}`;
const privacy = 'Autorizo guardar os dados deste pedido e seus resultados na minha conta.';
test.beforeEach(async ({ page }) => {
	await page.addInitScript(() => localStorage.setItem('atv-analytics-consent', 'denied'));
});
async function fill(page: Page, product: string) {
	if (product.startsWith('dream')) {
		await page.getByLabel('Data do sonho').fill('2026-09-24');
		await page.getByLabel('O que você lembra?').fill('Relato sintético privado.');
		await page.getByLabel('Suas associações').fill('jardim\nporta');
		await page.getByLabel('Emoções ao acordar').fill('curiosidade');
	} else if (product === 'three-questions') {
		for (let i = 1; i <= 3; i++)
			await page.getByLabel(`Pergunta ${i}`).fill(`Questão sintética ${i}?`);
	} else await page.getByLabel('Sua pergunta').fill('Questão sintética privada?');
	await page.getByLabel(privacy, { exact: false }).check();
}
async function mockRecovery(page: Page, product = 'daily-card') {
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
for (const product of ['daily-card', 'three-questions', 'dream-reading', 'dream-journal']) {
	test(`${product}: explicit validated input, UUID-only storage and verified Library link`, async ({
		page
	}) => {
		let writes = 0;
		await mockRecovery(page, product);
		await page.route('**/api/workflows', async (route) => {
			writes++;
			const body = route.request().postDataJSON();
			expect(body.input.productId).toBe(product);
			expect(body.input.consent).toEqual({
				storage: true,
				policyVersion: 'atv-input-consent/1',
				partner: false,
				continuity: false
			});
			if (product.startsWith('dream'))
				expect(body.input.dream.associations).toEqual(['jardim', 'porta']);
			expect(await page.evaluate((name) => sessionStorage.getItem(name), slot(product))).toBe(
				body.requestKey
			);
			await route.fulfill({ status: 202, json: { runId } });
		});
		await page.goto(`${path}?product=${product}`);
		expect(writes).toBe(0);
		await fill(page, product);
		await page.getByRole('button', { name: 'Criar pedido', exact: true }).click();
		// A successful acknowledgement automatically uses the verified recovery projection.
		await expect(page.getByRole('status')).toContainText(
			'não significa que a leitura já esteja pronta'
		);
		await expect(page.getByRole('link', { name: 'Abrir pedido na Biblioteca' })).toHaveAttribute(
			'href',
			`/biblioteca/${library}`
		);
		expect(writes).toBe(1);
		const stored = await page.evaluate(() => ({ ...sessionStorage }));
		expect(Object.keys(stored)).toEqual([slot(product)]);
		expect(stored[slot(product)]).toMatch(/^[a-f0-9-]{36}$/);
		await page.getByRole('button', { name: 'Preparar outro pedido' }).click();
		await expect(page.getByRole('button', { name: 'Criar pedido', exact: true })).toBeEnabled();
		await expect(page.getByLabel(privacy, { exact: false })).not.toBeChecked();
		await expect(
			page.getByLabel(
				product.startsWith('dream')
					? 'O que você lembra?'
					: product === 'daily-card'
						? 'Sua pergunta'
						: 'Pergunta 1'
			)
		).toHaveValue('');
		expect(await page.evaluate((name) => sessionStorage.getItem(name), slot(product))).toBeNull();
		expect(writes).toBe(1);
	});
}
test('validation has associated messages and preserves entered values without sending', async ({
	page
}) => {
	let writes = 0;
	await page.route('**/api/workflows', (route) => {
		writes++;
		return route.abort();
	});
	await page.goto(path);
	await page.getByRole('button', { name: 'Criar pedido', exact: true }).click();
	await expect(page.getByRole('status')).toBeFocused();
	await expect(page.getByLabel('Sua pergunta')).toHaveAttribute('aria-invalid', 'true');
	await expect(page.getByLabel('Sua pergunta')).toHaveAttribute(
		'aria-describedby',
		/question1-error/
	);
	await page.getByLabel('Sua pergunta').fill('Pergunta preservada');
	await page.getByRole('button', { name: 'Criar pedido', exact: true }).click();
	await expect(page.getByLabel('Sua pergunta')).toHaveValue('Pergunta preservada');
	expect(writes).toBe(0);
});
test('lost acknowledgement, reload, revoked eligibility and null lookup never replay input', async ({
	page
}) => {
	let writes = 0,
		reads = 0;
	await page.route('**/api/workflows', (route) => {
		writes++;
		return route.abort();
	});
	await page.route('**/api/workflows/recover', (route) => {
		reads++;
		expect(Object.keys(route.request().postDataJSON())).toEqual(['requestKey']);
		return route.fulfill({ json: { request: null } });
	});
	await page.goto(path);
	await fill(page, 'daily-card');
	await page.getByRole('button', { name: 'Criar pedido', exact: true }).click();
	await expect(page.getByRole('status')).toBeFocused();
	const original = await page.evaluate((name) => sessionStorage.getItem(name), slot('daily-card'));
	await page.goto(`${path}?access=UNRELEASED`);
	await page.reload();
	await expect(page.getByLabel('Sua pergunta')).toHaveValue('');
	await expect(page.getByRole('button', { name: 'Criar pedido', exact: true })).toBeDisabled();
	const recover = page.getByRole('button', { name: 'Consultar pedido original' });
	await recover.focus();
	await page.keyboard.press('Enter');
	await expect(page.getByRole('status')).toContainText('em andamento');
	await expect(page.getByRole('status')).toBeFocused();
	await expect(page.getByRole('button', { name: 'Preparar outro pedido' })).toHaveCount(0);
	expect(writes).toBe(1);
	expect(reads).toBe(1);
	expect(await page.evaluate((name) => sessionStorage.getItem(name), slot('daily-card'))).toBe(
		original
	);
});
for (const access of ['UNRELEASED', 'ACCESS_REQUIRED', 'UNAVAILABLE']) {
	test(`${access}: fresh request disabled, previous request remains recoverable`, async ({
		page
	}) => {
		await page.goto(`${path}?access=${access}`);
		await expect(page.getByRole('button', { name: 'Criar pedido', exact: true })).toBeDisabled();
		await page.evaluate(({ name, key }) => sessionStorage.setItem(name, key), {
			name: slot('daily-card'),
			key
		});
		await mockRecovery(page);
		await page.reload();
		await page.getByRole('button', { name: 'Consultar pedido original' }).click();
		await expect(page.getByRole('link', { name: 'Abrir pedido na Biblioteca' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Preparar outro pedido' })).toBeDisabled();
	});
}
test('pending request locks fields and repeated activation; exact prewrite refusal permits editing', async ({
	page
}) => {
	let finish!: () => void;
	const pending = new Promise<void>((resolve) => {
		finish = resolve;
	});
	let writes = 0;
	await page.route('**/api/workflows', async (route) => {
		writes++;
		await pending;
		await route.fulfill({ status: 409, json: { error: 'workflow_unreleased' } });
	});
	await page.goto(path);
	await fill(page, 'daily-card');
	await page.getByRole('button', { name: 'Criar pedido', exact: true }).click();
	await expect(page.getByLabel('Sua pergunta')).toBeDisabled();
	await expect(page.getByRole('button', { name: 'Criar pedido', exact: true })).toBeDisabled();
	finish();
	await expect(page.getByRole('status')).toContainText('ainda não está liberado');
	await expect(page.getByLabel('Sua pergunta')).toBeEnabled();
	expect(writes).toBe(1);
});
test('production intake route retains server authentication', async ({ page }) => {
	await page.goto('/biblioteca/nova/daily-card');
	await expect(page).toHaveURL(/\/entrar$/);
});
for (const width of [1440, 820, 390, 320]) {
	test(`composition, keyboard labels and no overflow at ${width}px`, async ({ page }) => {
		await page.setViewportSize({ width, height: 1000 });
		for (const product of ['three-questions', 'dream-reading']) {
			await page.goto(`${path}?product=${product}`);
			await expect(page.getByRole('button', { name: 'Criar pedido', exact: true })).toBeEnabled();
			expect(
				await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
			).toBe(true);
			await page.getByLabel(product === 'three-questions' ? 'Pergunta 1' : 'Data do sonho').focus();
			await expect(
				page.getByLabel(product === 'three-questions' ? 'Pergunta 1' : 'Data do sonho')
			).toBeFocused();
			await page.screenshot({
				path: `../../test-results/wu056-${product}-${width}.png`,
				fullPage: true
			});
		}
	});
}
