import { expect, test } from '@playwright/test';
import { scanAccessibility } from './fixtures/accessibility';

const policies = [
	{ path: '/loja/devolucoes', title: 'Trocas, devoluções e reembolsos' },
	{ path: '/loja/frete', title: 'Frete e entrega' },
	{ path: '/loja/termos', title: 'Termos de compra dos produtos físicos' }
];

test('Políticas e atendimento estão disponíveis sem JavaScript e sem abrir compras', async ({
	browser,
	request,
	baseURL
}) => {
	const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
	const page = await context.newPage();
	try {
		for (const policy of policies) {
			const response = await page.goto(policy.path);
			expect(response?.status()).toBe(200);
			const html = await response!.text();
			const protectedBody = html.match(/<!--email_off-->([\s\S]*?)<!--\/email_off-->/)?.[1];
			expect(protectedBody).toContain('href="mailto:atuavidanosastros2026@gmail.com"');
			expect(protectedBody).not.toContain('data-cfemail');
			await expect(page.getByRole('heading', { level: 1 })).toHaveText(policy.title);
			await expect(page.locator('article .policy-body')).not.toBeEmpty();
			await expect(
				page.locator('article a[href="mailto:atuavidanosastros2026@gmail.com"]')
			).toHaveCount(1);
			await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
				'href',
				`https://atuavidanosastros.com.br${policy.path}`
			);
			const robots = await page.locator('meta[name="robots"]').getAttribute('content');
			expect(robots).toContain('noindex');
			const navigation = page.getByRole('navigation', {
				name: 'Informações da Loja dos Signos',
				exact: true
			});
			await expect(navigation.locator('a[aria-current="page"]')).toHaveCount(1);
			for (const destination of policies) {
				await expect(navigation.locator(`a[href="${destination.path}"]`)).toHaveCount(1);
				await expect(page.locator(`footer a[href="${destination.path}"]`)).toHaveCount(1);
			}
			await expect(
				page.getByRole('link', { name: 'Fale com a loja', exact: true })
			).toHaveAttribute('href', '/fale-conosco?assunto=loja');
		}
		await page.getByRole('link', { name: 'Fale com a loja', exact: true }).click();
		await expect(page.getByLabel('Sobre o que você quer falar?')).toHaveValue('loja');
		await page.goto('/loja');
		await page.locator('.shop-card .product-image').first().click();
		await expect(page.locator('.availability')).toContainText('ainda não está à venda');
		await expect(
			page.getByRole('navigation', { name: 'Informações da Loja dos Signos' })
		).toBeVisible();
		for (const path of ['/api/shop/catalog', '/api/shop/cart']) {
			const response =
				path === '/api/shop/cart'
					? await request.post(path, { data: {} })
					: await request.get(path);
			expect(response.status()).toBe(503);
			expect(await response.json()).toMatchObject({ code: 'physical_commerce_disabled' });
		}
	} finally {
		await context.close();
	}
});

for (const width of [1440, 320]) {
	test(`Políticas legíveis e acessíveis em ${width}px`, async ({ page }, testInfo) => {
		await page.setViewportSize({ width, height: 900 });
		await page.addInitScript(() => localStorage.setItem('atv-analytics-consent', 'denied'));
		for (const policy of policies) {
			await page.goto(policy.path);
			await expect(page.locator('article')).toBeVisible();
			expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
				width
			);
			await scanAccessibility(page, testInfo);
			await page.screenshot({
				path: testInfo.outputPath(`${policy.path.split('/').at(-1)}-${width}.png`),
				fullPage: true
			});
		}
	});
}
