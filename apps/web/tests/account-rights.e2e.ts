import { expect, test } from '@playwright/test';

for (const width of [1440, 390, 320]) {
	test(`direitos sintéticos preservam situação e próxima ação em ${width}px`, async ({
		page
	}, info) => {
		await page.setViewportSize({ width, height: 900 });
		await page.goto('/biblioteca/_spec?rights=sample');
		await page.getByRole('button', { name: 'Recusar opcionais' }).click();
		const rights = page.getByRole('region', { name: 'Seus acessos' });
		await expect(rights.locator('.right-card')).toHaveCount(3);
		await expect(rights.locator('.right-card').first()).toContainText('Compra confirmada');
		await expect(rights.locator('.right-card').first()).toContainText('Acesso ativo');
		await expect(rights.locator('.right-card').first()).toContainText(
			'Esta leitura ainda não está disponível para começar.'
		);
		await expect(rights.locator('.right-card').nth(1)).toContainText('Aguardando liberação');
		await expect(rights.locator('.right-card').nth(2)).toContainText('Acesso expirado');
		await expect(rights.getByRole('link', { name: 'Preparar leitura' })).toHaveCount(0);
		await expect(rights.getByRole('link', { name: 'Ver produto' })).toHaveCount(3);
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
			true
		);
		await rights.screenshot({ path: info.outputPath(`rights-${width}.png`) });
	});
}
