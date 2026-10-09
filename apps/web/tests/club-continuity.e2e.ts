import { expect, test } from '@playwright/test';
import { scanAccessibility } from './fixtures/accessibility';
const fixture = '/testar-produtos/_spec?view=club&product=direction-journey';
for (const width of [320, 390, 1440]) {
	test(`ATV+ explicit selection, authorized save and revoke at ${width}px`, async ({
		page
	}, testInfo) => {
		await page.setViewportSize({ width, height: 900 });
		await page.goto(fixture);
		await page.getByRole('button', { name: 'Recusar opcionais', exact: true }).click();
		const panel = page.locator('section.continuity');
		await expect(panel.getByLabel('Leitura ou jornada')).toHaveValue('');
		await expect(panel.getByRole('checkbox')).not.toBeChecked();
		await expect(panel.getByRole('button', { name: 'Salvar seleção autorizada' })).toBeDisabled();
		await panel.getByLabel('Leitura ou jornada').selectOption({ index: 1 });
		await panel
			.getByRole('combobox', { name: 'O que guardar', exact: true })
			.selectOption('hypothesis');
		await panel.getByLabel('Capítulo escolhido').selectOption('0');
		await panel.getByRole('button', { name: 'Adicionar à seleção' }).click();
		await panel.getByLabel('Leitura ou jornada').selectOption({ index: 1 });
		await panel
			.getByRole('combobox', { name: 'O que guardar', exact: true })
			.selectOption('reported');
		await panel.getByLabel('Tipo de relato').selectOption('recurrence');
		const literal = '<script>window.contextExecuted=true</script> Quero retomar esta escolha.';
		await panel.getByLabel('Seu relato', { exact: true }).fill(literal);
		await panel.getByRole('button', { name: 'Adicionar à seleção' }).click();
		await expect(panel.locator('ol > li')).toHaveCount(2);
		const posted: Record<string, unknown>[] = [];
		await page.route('**/api/private-trials/continuity', async (route) => {
			const command = route.request().postDataJSON();
			posted.push(command);
			const contextItems = command.items.map(
				(item: { selection: { kind: string; text?: string } }, index: number) => ({
					alias: `i${index + 1}`,
					source: 's1',
					category: item.selection.kind,
					origin: item.selection.kind === 'reported' ? 'user-reported' : 'prior-interpretation',
					text: item.selection.text ?? 'Capítulo sintético escolhido.'
				})
			);
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					state: {
						...command,
						revision: command.revision + 1,
						available: true,
						items: command.items.map((item: object) => ({ ...item, source: null }))
					},
					preparation: command.granted
						? {
								status: 'prepared',
								execution: 'disabled',
								publication: 'blocked',
								context: { items: contextItems }
							}
						: { status: 'blocked', code: 'consent_required' }
				})
			});
		});
		await panel.getByRole('checkbox').check();
		await panel.getByRole('button', { name: 'Salvar seleção autorizada' }).click();
		await expect(panel.getByRole('status')).toContainText('foram salvas');
		expect(posted[0]).toMatchObject({
			revision: 0,
			granted: true,
			items: [
				{ selection: { kind: 'hypothesis', sectionIndex: 0 } },
				{ selection: { kind: 'reported', category: 'recurrence', text: literal } }
			]
		});
		expect(Object.keys(posted[0])).toEqual(['revision', 'granted', 'items']);
		await expect(panel.getByRole('checkbox')).not.toBeChecked();
		await panel.getByText('Conferir o contexto salvo', { exact: true }).click();
		await expect(panel.locator('details')).toContainText(literal);
		expect(
			await page.evaluate(
				() => (window as unknown as { contextExecuted?: boolean }).contextExecuted
			)
		).toBeUndefined();
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
			true
		);
		await scanAccessibility(page, testInfo);
		await panel.screenshot({
			path: testInfo.outputPath(`atv-plus-continuity-${width}.png`),
			style: 'header { visibility: hidden !important; }'
		});
		await panel.getByRole('button', { name: 'Remover autorização e apagar contexto' }).click();
		await expect(panel.getByRole('status')).toContainText(
			'Todos os itens deste contexto foram apagados'
		);
		expect(posted[1]).toEqual({ revision: 1, granted: false, items: [] });
		await expect(panel.locator('ol > li')).toHaveCount(0);
		await expect(panel.locator('details')).toHaveCount(0);
	});
}
test('ATV+ conflict keeps explicit draft and does not retry or silently overwrite', async ({
	page
}) => {
	await page.goto(fixture);
	await page.getByRole('button', { name: 'Recusar opcionais', exact: true }).click();
	const panel = page.locator('section.continuity');
	await panel.getByLabel('Leitura ou jornada').selectOption({ index: 1 });
	await panel.getByRole('button', { name: 'Adicionar à seleção' }).click();
	let requests = 0;
	await page.route('**/api/private-trials/continuity', async (route) => {
		requests++;
		await route.fulfill({
			status: 409,
			contentType: 'application/json',
			body: JSON.stringify({
				message: 'Seu contexto mudou em outra aba. Reabra a página antes de salvar.'
			})
		});
	});
	await panel.getByRole('checkbox').check();
	await panel.getByRole('button', { name: 'Salvar seleção autorizada' }).click();
	await expect(panel.getByRole('status')).toContainText('outra aba');
	await expect(panel.locator('ol > li')).toHaveCount(1);
	expect(requests).toBe(1);
});
test('ATV+ reopens a labelled synthetic saved selection with consent unchecked', async ({
	page
}, testInfo) => {
	await page.goto(`${fixture}&continuity=saved`);
	await page.getByRole('button', { name: 'Recusar opcionais', exact: true }).click();
	const panel = page.locator('section.continuity');
	await expect(panel.locator('ol > li')).toHaveCount(1);
	await expect(panel.getByRole('checkbox')).not.toBeChecked();
	await panel.getByText('Conferir o contexto salvo', { exact: true }).click();
	await expect(panel.locator('details')).toContainText(
		'Relato sintético: quero retomar uma escolha de carreira.'
	);
	await scanAccessibility(page, testInfo);
});
test('ATV+ access unavailable still exposes revocation and no reading selection', async ({
	page
}, testInfo) => {
	await page.setViewportSize({ width: 320, height: 900 });
	await page.goto(`${fixture}&continuity=unavailable`);
	await page.getByRole('button', { name: 'Recusar opcionais', exact: true }).click();
	const panel = page.locator('section.continuity');
	await expect(panel.getByLabel('Leitura ou jornada')).toHaveCount(0);
	await expect(panel.getByRole('checkbox')).toHaveCount(0);
	await expect(page.getByRole('button', { name: 'Aprovar ATV+', exact: true })).toHaveCount(0);
	await expect(
		panel.getByRole('button', { name: 'Remover autorização e apagar contexto' })
	).toBeEnabled();
	await page.route('**/api/private-trials/continuity', async (route) => {
		expect(route.request().postDataJSON()).toEqual({ revision: 1, granted: false, items: [] });
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({
				state: { revision: 2, granted: false, available: false, items: [] },
				preparation: { status: 'blocked', code: 'unavailable' }
			})
		});
	});
	await panel.getByRole('button', { name: 'Remover autorização e apagar contexto' }).click();
	await expect(panel.getByRole('status')).toContainText('Autorização removida');
	await scanAccessibility(page, testInfo);
	await panel.screenshot({
		path: testInfo.outputPath('atv-plus-revocation-unavailable-320.png'),
		style: 'header { visibility: hidden !important; }'
	});
});
