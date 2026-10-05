import { expect, test } from '@playwright/test';
import { selectCity } from './fixtures/city-search';
test.beforeEach(async ({ page }) => {
	await page.addInitScript(() => localStorage.setItem('atv-analytics-consent', 'denied'));
	await page.goto('/bussola-de-carreira');
});
test('city resolves coordinates and historical daylight saving without technical inputs', async ({
	page
}) => {
	let submitted: Record<string, unknown> | undefined;
	await page.route('**/api/astrology/midheaven', async (route) => {
		submitted = route.request().postDataJSON();
		await route.fulfill({ status: 400, json: { error: 'fixture' } });
	});
	await expect(page.getByLabel('Latitude', { exact: true })).toHaveCount(0);
	await expect(page.getByLabel('Longitude', { exact: true })).toHaveCount(0);
	await expect(page.getByLabel('Deslocamento UTC', { exact: true })).toHaveCount(0);
	await page.getByLabel('Data de nascimento').fill('2000-01-01');
	await page.getByLabel('Hora de nascimento').fill('09:00');
	await selectCity(page, '#birth-city', 'Sao Paulo', 'São Paulo, São Paulo, Brasil');
	await page.getByRole('button', { name: 'Calcular meu Meio do Céu' }).click();
	await expect
		.poll(() => submitted)
		.toMatchObject({
			timezone: 'America/Sao_Paulo',
			utcInstant: '2000-01-01T11:00:00.000Z',
			latitude: -23.5475,
			longitude: -46.63611,
			locationSource: 'geonames:3448439/cities500-v1'
		});
	await page.locator('#birth-city').fill('São Pa');
	await page.getByRole('button', { name: 'Calcular meu Meio do Céu' }).click();
	await expect(
		page.getByText('Selecione sua cidade nos resultados da busca.', { exact: true })
	).toBeVisible();
});
test('keyboard selection and mobile layout preserve city labels', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.locator('#birth-city').fill('Lisboa');
	await expect(page.getByRole('option').first()).toContainText('Portugal');
	await page.locator('#birth-city').press('ArrowUp');
	const lastOptionId = await page.getByRole('option').last().getAttribute('id');
	await expect(page.locator('#birth-city')).toHaveAttribute('aria-activedescendant', lastOptionId!);
	await page.locator('#birth-city').press('ArrowDown');
	await page.locator('#birth-city').press('Enter');
	await expect(page.locator('#birth-city')).toHaveValue(/Lisbon.*Portugal/);
	await expect(page.getByRole('listbox')).toBeHidden();
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
		true
	);
	await page.screenshot({ path: '../../test-results/city-mobile.png', fullPage: true });
});
test('missing city and unavailable search have recovery messages', async ({ page }) => {
	await page.locator('#birth-city').fill('zzzzzzzzzz');
	await expect(page.getByText('Cidade não encontrada.', { exact: false })).toBeVisible();
	await page.route('**/locations/*.json', (route) => route.fulfill({ status: 503 }));
	await page.locator('#birth-city').fill('London');
	await expect(
		page.getByText('Não foi possível buscar as cidades. Tente novamente.')
	).toBeVisible();
});
test('ambiguous birth hour requires choosing the recorded occurrence', async ({ page }) => {
	await page.getByLabel('Data de nascimento').fill('2020-11-01');
	await page.getByLabel('Hora de nascimento').fill('01:30');
	await selectCity(page, '#birth-city', 'New York City', 'New York City, New York, Estados Unidos');
	await expect(page.locator('#birth-city-occurrence')).toBeVisible();
	await page.locator('#birth-city-occurrence').selectOption('2020-11-01T06:30:00.000Z');
	let utc = '';
	await page.route('**/api/astrology/midheaven', (route) => {
		utc = route.request().postDataJSON().utcInstant;
		return route.fulfill({ status: 400, json: {} });
	});
	await page.getByRole('button', { name: 'Calcular meu Meio do Céu' }).click();
	await expect.poll(() => utc).toBe('2020-11-01T06:30:00.000Z');
});

test('solar return resolves birthday city and renews consent when the city changes', async ({
	page
}) => {
	await page.route('**/api/onboarding', (route) =>
		route.fulfill({
			json: {
				onboarding: {
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
				}
			}
		})
	);
	await page.goto('/biblioteca/_spec/entrada?product=solar-return');
	await page.getByRole('button', { name: 'Consultar perfil salvo', exact: true }).click();
	await page.getByLabel('Ano da revolução solar', { exact: true }).fill('2028');
	await expect(page.getByLabel(/Latitude|Longitude|Fuso horário/)).toHaveCount(0);
	await selectCity(page, '#solar-city', 'Tokyo', 'Tokyo, Tokyo, Japão');
	const consent = page.getByLabel(
		'Autorizo guardar uma cópia dos dados natais conferidos, do ano',
		{ exact: false }
	);
	const submit = page.getByRole('button', { name: 'Solicitar leitura', exact: true });
	await consent.check();
	await expect(submit).toBeEnabled();
	await page.locator('#solar-city').fill('London');
	await expect(consent).not.toBeChecked();
	await expect(submit).toBeDisabled();
	await selectCity(page, '#solar-city', 'London', 'London, England, Reino Unido');
	await consent.check();
	let submitted: Record<string, unknown> | undefined;
	expect(
		await page
			.locator('form')
			.evaluateAll((forms) =>
				forms.flatMap((form) =>
					[...form.querySelectorAll<HTMLInputElement>('input:invalid, select:invalid')].map(
						(input) => ({ id: input.id, message: input.validationMessage })
					)
				)
			)
	).toEqual([]);
	await page.route('**/api/workflows/solar-return', (route) => {
		submitted = route.request().postDataJSON().input;
		return route.fulfill({ status: 400, json: { error: 'invalid_input' } });
	});
	await submit.click();
	await expect
		.poll(() => submitted)
		.toMatchObject({
			version: 'atv-solar-return-request/1',
			returnYear: 2028,
			targetDate: '2028-01-01',
			returnLocation: {
				city: 'London, England, Reino Unido',
				timezone: 'Europe/London',
				latitude: 51.50853,
				longitude: -0.12574
			}
		});
	await expect(page.locator('#solar-city')).toHaveValue('');
});
