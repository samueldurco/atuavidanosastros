import { expect, test, type Page } from '@playwright/test';
import { scanAccessibility } from './fixtures/accessibility';
import reviewedOffers from '../src/lib/data/shop-reviewed-offers.json' with { type: 'json' };

const product = {
	id: 'gid://shopify/Product/1',
	handle: 'caneca-aries',
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
	await page.goto('/loja/peca/caneca-aries');
	await expect(page.getByRole('heading', { name: 'Quem vende e atende' })).toBeVisible();
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
	await expect(purchase).toContainText('Total com frete: R$ 343,46');
	await expect(purchase).toContainText('Frete fixo de R$ 29,90 por pedido');
	await expect(purchase).toContainText('até 40 dias úteis após a aprovação do pagamento');
	await purchase.getByRole('spinbutton').fill('11');
	await expect(purchase.getByRole('button', { name: 'Comprar agora' })).toBeDisabled();
	await purchase.getByRole('spinbutton').fill('2');
	await purchase.getByRole('button', { name: 'Comprar agora' }).click();
	await expect(page).toHaveURL('https://checkout.example.test/pagamento-local');
	expect(sent).toEqual({
		lines: [{ merchandiseId: 'gid://shopify/ProductVariant/3', quantity: 2 }]
	});
});

test('Ecobag usa a cotação nacional com endereço mesmo em CEP com frete fixo de canecas', async ({
	page
}) => {
	const slug = 'ecobag-aries';
	const { variantId, priceBrl } = reviewedOffers.find((offer) => offer.slug === slug)!;
	const variant = {
		...product.variants[0],
		id: variantId,
		price: { amount: priceBrl.toFixed(2), currencyCode: 'BRL' }
	};
	await page.route('**/api/shop/product/*', (route) =>
		route.fulfill({
			json: { ok: true, product: { ...product, handle: slug, variants: [variant] } }
		})
	);
	let quotes = 0;
	let cartCalls = 0;
	await page.route('**/api/shop/cart', (route) => {
		cartCalls++;
		return route.abort();
	});
	await page.route('**/api/shop/delivery/quote', (route) => {
		quotes++;
		expect(route.request().postDataJSON()).toEqual({
			variantId,
			quantity: 1,
			postalCode: '35160001'
		});
		if (quotes === 1) return route.fulfill({ status: 503, json: { ok: false } });
		const checkoutReady = quotes === 3;
		return route.fulfill({
			json: {
				ok: true,
				quote: {
					checkoutReady,
					token: checkoutReady ? 'local-proof' : undefined,
					factoryAddress: true,
					variantId,
					postalCode: '35160-001',
					unitPriceBrl: priceBrl,
					shippingBrl: 14,
					totalBrl: priceBrl + 14,
					deliveryBusinessDays: 9,
					service: 'Entrega de teste',
					city: 'Ipatinga',
					provinceCode: 'MG'
				}
			}
		});
	});
	let sent: unknown;
	await page.route('**/api/shop/delivery/checkout', (route) => {
		sent = route.request().postDataJSON();
		return route.fulfill({
			json: { ok: true, checkoutUrl: 'https://checkout.example.test/industrial-local' }
		});
	});
	await page.route('https://checkout.example.test/**', (route) =>
		route.fulfill({ body: 'Pagamento de teste' })
	);
	await page.goto('/loja/peca/' + slug);
	const purchase = page.getByRole('region', { name: 'Disponibilidade e compra' });
	await purchase.getByLabel('CEP de entrega').fill('35160-001');
	const calculate = purchase.getByRole('button', { name: 'Calcular frete' });
	await calculate.click();
	await expect(purchase.getByRole('status')).toContainText('Não foi possível calcular');
	await expect(purchase.getByRole('button', { name: /Comprar/ })).toHaveCount(0);
	await calculate.click();
	await expect(purchase).toContainText(
		'O pagamento com o frete desta cotação ainda não está disponível.'
	);
	await expect(purchase.getByRole('button', { name: /Comprar/ })).toHaveCount(0);
	await calculate.click();
	const address = purchase.getByRole('form', { name: 'Endereço para pagamento' });
	await address.getByLabel('Nome', { exact: true }).fill('Pessoa');
	await address.getByLabel('Sobrenome').fill('Exemplo');
	await address.getByLabel('Rua ou avenida').fill('Rua de Teste');
	await address.getByLabel('Número (ou S/N)').fill('123');
	await address.getByLabel('Bairro ou localidade').fill('Centro');
	await address.getByRole('button', { name: 'Comprar agora' }).click();
	await expect(page).toHaveURL('https://checkout.example.test/industrial-local');
	expect(sent).toEqual({
		token: 'local-proof',
		address: {
			firstName: 'Pessoa',
			lastName: 'Exemplo',
			address1: 'Rua de Teste, 123, Centro',
			address2: '',
			postalCode: '35160001',
			city: 'Ipatinga',
			provinceCode: 'MG'
		}
	});
	expect(cartCalls).toBe(0);
});

test('A abertura do MVP mantém as outras peças em vitrine e apresenta as condições nacionais', async ({
	page
}) => {
	let productRequests = 0;
	await page.route('**/api/shop/product/*', (route) => {
		productRequests += 1;
		return route.fulfill({ json: { ok: true, product } });
	});
	await page.goto('/loja/peca/cropped-aries');
	await expect(page.getByRole('region', { name: 'Disponibilidade e compra' })).toContainText(
		'Esta peça ainda não está à venda'
	);
	await expect(page.getByRole('button', { name: 'Comprar agora' })).toHaveCount(0);
	expect(productRequests).toBe(0);
	await page.goto('/loja');
	await expect(page.locator('.shop-card').first()).toContainText('Ecobag Taurus');
	await expect(page.locator('.shop-card .preview-label', { hasText: 'Compra online' })).toHaveCount(
		24
	);
	await page.goto('/loja/frete');
	await expect(
		page.getByRole('heading', { name: 'Condições das peças com compra online' })
	).toBeVisible();
	await expect(page.locator('article')).toContainText('O frete é cobrado uma única vez');
	await expect(page.locator('article')).toContainText(
		'até 40 dias úteis após a aprovação do pagamento'
	);
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
	await page.goto('/loja/peca/caneca-aries');
	await expect(page.getByRole('heading', { name: 'Quem vende e atende' })).toBeVisible();
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
