import { expect, test } from '@playwright/test';
import { ONBOARDING_VERSION } from '../src/lib/onboarding';
import { scanAccessibility } from './fixtures/accessibility';

const surfaces = [
	{
		name: 'dashboard',
		path: '/dashboard/_spec?state=approximate&library=saved&continuity=granted'
	},
	{ name: 'onboarding', path: '/conta/_spec/nascimento' },
	{ name: 'onboarding indisponível', path: '/conta/_spec/nascimento', onboardingError: true },
	{ name: 'Biblioteca', path: '/biblioteca/_spec' },
	{
		name: 'Biblioteca indisponível',
		path: '/biblioteca/_spec?state=error',
		alert: 'Não foi possível carregar sua Biblioteca.'
	},
	{
		name: 'leitura disponível',
		path: '/biblioteca/_spec/fluxo?state=ready&product=career-compass'
	},
	{
		name: 'leitura em revisão',
		path: '/biblioteca/_spec/fluxo?state=pending&product=career-compass',
		withheld: 'Aguardando revisão editorial'
	},
	{
		name: 'leitura interrompida',
		path: '/biblioteca/_spec/fluxo?state=failed&product=career-compass',
		withheld: 'Processamento interrompido'
	}
];

for (const viewport of [
	{ name: 'desktop', width: 1440, height: 1000 },
	{ name: 'mobile', width: 390, height: 844 }
]) {
	for (const surface of surfaces) {
		test(`componente privado ${viewport.name}: ${surface.name}`, async ({ page }, testInfo) => {
			await page.setViewportSize(viewport);
			// The local page mounts the real component; no authenticated session or stored data.
			if (surface.path === '/conta/_spec/nascimento') {
				await page.route('**/api/onboarding', (route) =>
					route.fulfill(
						surface.onboardingError
							? { status: 503, json: { error: 'unavailable' } }
							: {
									json: {
										onboarding: {
											version: ONBOARDING_VERSION,
											revision: 0,
											state: 'NOT_STARTED',
											natal: null
										}
									}
								}
					)
				);
			}
			const response = await page.goto(surface.path);
			expect(response?.status()).toBe(200);
			await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
			await page.getByRole('button', { name: 'Recusar analytics' }).click();
			if (surface.path === '/conta/_spec/nascimento') {
				if (surface.onboardingError) {
					await expect(page.getByRole('alert')).toBeVisible();
					await expect(page.getByRole('button', { name: 'Salvar perfil natal' })).toBeDisabled();
				} else await expect(page.getByRole('button', { name: 'Completar depois' })).toBeEnabled();
			}
			if (surface.alert) await expect(page.getByRole('alert')).toContainText(surface.alert);
			if (surface.name === 'Biblioteca') {
				await expect(
					page.getByRole('region', { name: 'Itens salvos' }).getByRole('article')
				).toHaveCount(3);
			}
			if (surface.withheld) {
				await expect(
					page.getByRole('heading', { name: surface.withheld, exact: true })
				).toBeVisible();
				await expect(page.locator('#leitura')).toHaveCount(0);
			} else if (surface.name === 'leitura disponível')
				await expect(page.locator('#leitura')).toBeVisible();
			await scanAccessibility(page, testInfo);
		});
	}
}
