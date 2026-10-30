import { expect, test, type Page } from '@playwright/test';
import { scanAccessibility } from './fixtures/accessibility';

const product = {
	id: 'gid://shopify/Product/1',
	handle: 'cropped-aries',
	title: 'Peça sintética somente para teste local',
	availableForSale: true,
	variants: [
		{
			id: 'gid://shopify/ProductVariant/1',
			availableForSale: true,
			price: { amount: '123.45', currencyCode: 'BRL' },
			selectedOptions: [
				{ name: 'Cor', value: 'Bone' },
				{ name: 'Tamanho', value: 'P' }
			]
		},
		{
			id: 'gid://shopify/ProductVariant/2',
			availableForSale: false,
			price: { amount: '123.45', currencyCode: 'BRL' },
			selectedOptions: [
				{ name: 'Cor', value: 'Bone' },
				{ name: 'Tamanho', value: 'M' }
			]
		},
		{
			id: 'gid://shopify/ProductVariant/3',
			availableForSale: true,
			price: { amount: '156.78', currencyCode: 'BRL' },
			selectedOptions: [
				{ name: 'Cor', value: 'Branco' },
				{ name: 'Tamanho', value: 'G' }
			]
		}
	],
	variantsPageInfo: { hasNextPage: false, endCursor: null }
};

async function openProduct(page: Page) {
	await page.route('**/api/shop/product/*', (route) =>
		route.fulfill({ json: { ok: true, product } })
	);
	await page.goto('/loja/peca/cropped-aries');
	await expect(page.getByRole('form', { name: 'Comprar esta peça' })).toBeVisible();
}

test.beforeEach(async ({ page }) => {
	await page.addInitScript(() => localStorage.setItem('atv-analytics-consent', 'denied'));
});

test('Escolha explícita, disponibilidade, quantidade e encaminhamento ao checkout', async ({
	page
}) => {
	let sent: unknown;
	await page.route('**/api/shop/cart', async (route) => {
		sent = route.request().postDataJSON();
		await route.fulfill({
			json: {
				ok: true,
				checkoutUrl: 'https://checkout.example.test/pagamento-local',
				totalQuantity: 2
			}
		});
	});
	await page.route('https://checkout.example.test/**', (route) =>
		route.fulfill({ body: 'Destino fictício de homologação local' })
	);
	await openProduct(page);
	const purchase = page.getByRole('region', { name: 'Disponibilidade e compra' });
	await expect(purchase.getByRole('button', { name: 'Comprar agora' })).toBeDisabled();
	await expect(purchase.getByRole('option', { name: /Bone · M/ })).toBeDisabled();
	await purchase.getByRole('combobox').selectOption('gid://shopify/ProductVariant/3');
	await purchase.getByRole('spinbutton').fill('2');
	await expect(purchase).toContainText('R$ 156,78');
	await expect(purchase).toContainText('Subtotal: R$ 313,56');
	await purchase.getByRole('spinbutton').fill('11');
	await expect(purchase.getByRole('button', { name: 'Comprar agora' })).toBeDisabled();
	await purchase.getByRole('spinbutton').fill('2');
	await purchase.getByRole('button', { name: 'Comprar agora' }).click();
	await expect(page).toHaveURL('https://checkout.example.test/pagamento-local');
	expect(sent).toEqual({
		lines: [{ merchandiseId: 'gid://shopify/ProductVariant/3', quantity: 2 }]
	});
});

test('Falha do carrinho permite tentar de novo sem perder seleção', async ({ page }) => {
	await page.route('**/api/shop/cart', (route) =>
		route.fulfill({ status: 503, json: { ok: false, code: 'provider_unavailable' } })
	);
	await openProduct(page);
	await page
		.getByRole('combobox', { name: /Opção da peça/ })
		.selectOption('gid://shopify/ProductVariant/1');
	await page.getByRole('button', { name: 'Comprar agora' }).click();
	await expect(page.getByRole('alert')).toContainText('Nenhum valor foi cobrado');
	await expect(page.getByRole('button', { name: 'Comprar agora' })).toBeEnabled();
	await expect(page.getByRole('combobox', { name: /Opção da peça/ })).toHaveValue(
		'gid://shopify/ProductVariant/1'
	);
});

test('Produto indisponível e falha de consulta não mostram preço ou botão de compra', async ({
	page
}) => {
	await page.route('**/api/shop/product/*', (route) =>
		route.fulfill({ json: { ok: true, product: null } })
	);
	await page.goto('/loja/peca/cropped-aries');
	await expect(page.getByRole('region', { name: 'Disponibilidade e compra' })).toContainText(
		'Indisponível para compra'
	);
	await expect(page.getByRole('button', { name: 'Comprar agora' })).toHaveCount(0);
	await page.unroute('**/api/shop/product/*');
	await page.route('**/api/shop/product/*', (route) =>
		route.fulfill({ status: 503, json: { ok: false } })
	);
	await page.reload();
	await expect(page.getByRole('button', { name: 'Tentar novamente', exact: true })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Comprar agora' })).toHaveCount(0);
	await page.unroute('**/api/shop/product/*');
	await page.route('**/api/shop/product/*', (route) =>
		route.fulfill({ json: { ok: true, product } })
	);
	await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
	await expect(page.getByRole('button', { name: 'Comprar agora' })).toBeVisible();
});

for (const width of [320, 820, 1440]) {
	test(`Compra direta acessível sem overflow em ${width}px`, async ({ page }, testInfo) => {
		await page.setViewportSize({ width, height: 1000 });
		await openProduct(page);
		await page
			.getByRole('combobox', { name: /Opção da peça/ })
			.selectOption('gid://shopify/ProductVariant/3');
		await page.getByRole('spinbutton', { name: 'Quantidade' }).fill('2');
		const purchase = page.getByRole('region', { name: 'Disponibilidade e compra' });
		await purchase.scrollIntoViewIfNeeded();
		expect(
			await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
		).toBe(false);
		await expect(purchase.getByRole('button', { name: 'Comprar agora' })).toBeEnabled();
		await purchase.screenshot({ path: testInfo.outputPath(`compra-ficticia-local-${width}.png`) });
		await scanAccessibility(page, testInfo);
	});
}
