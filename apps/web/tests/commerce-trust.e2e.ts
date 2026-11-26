import { expect, test } from '@playwright/test';
import { scanAccessibility } from './fixtures/accessibility';

test.beforeEach(async ({ page }) => {
	await page.addInitScript(() => localStorage.setItem('atv-analytics-consent', 'denied'));
});

for (const width of [1440, 390, 320]) {
	test(`Selos legíveis, imagens disponíveis e integrações pendentes em ${width}px`, async ({
		page
	}, testInfo) => {
		await page.setViewportSize({ width, height: 900 });
		await page.goto('/leituras');
		const footer = page.getByRole('contentinfo');
		await footer.getByRole('heading', { name: 'Formas de pagamento' }).scrollIntoViewIfNeeded();
		await expect(footer.getByRole('link', { name: /Shopify/ })).toHaveAttribute(
			'href',
			'https://www.shopify.com/'
		);
		await expect(footer.getByRole('link', { name: /Google/ })).toHaveAttribute(
			'href',
			/transparencyreport\.google\.com\/safe-browsing\/search\?url=atuavidanosastros\.com\.br/
		);
		await expect(footer.getByRole('link', { name: /Cloudflare/ })).toHaveAttribute(
			'href',
			'https://www.cloudflare.com/pt-br/'
		);
		const pending = footer.locator('[data-pending-seal]');
		await expect(pending).toHaveCount(3);
		for (const seal of await pending.all()) {
			await expect(seal).toContainText('Em preparação');
			await expect(seal.getByRole('link')).toHaveCount(0);
		}
		for (const image of await footer.locator('.commerce-trust img').all()) {
			await image.scrollIntoViewIfNeeded();
			await expect
				.poll(() =>
					image.evaluate(
						(element) =>
							(element as HTMLImageElement).complete &&
							(element as HTMLImageElement).naturalWidth > 0
					)
				)
				.toBe(true);
		}
		expect(
			await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
		).toBe(true);
		await page.evaluate(() => document.fonts.ready);
		await footer.screenshot({ path: testInfo.outputPath(`footer-${width}.png`) });
		if (width === 390) await scanAccessibility(page, testInfo);
	});
}

test('Oferta digital e assinatura informam preparação sem iniciar pagamento', async ({ page }) => {
	for (const route of ['/produtos/mapa-astral-completo', '/atv-mais']) {
		await page.goto(route);
		const assurance = page.locator('[data-checkout-assurance="hotmart"]');
		await expect(assurance).toContainText('Pagamento em preparação');
		await expect(assurance).toContainText('Os testes gratuitos continuam sem cobrança.');
		await assurance.getByRole('link', { name: /Segurança e selos/ }).click();
		await expect(page.getByRole('heading', { name: 'Segurança e confiança' })).toBeInViewport();
	}
});
