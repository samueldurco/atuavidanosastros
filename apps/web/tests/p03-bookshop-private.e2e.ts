import AxeBuilder from '@axe-core/playwright';
import {
	expect,
	test,
	type BrowserContext,
	type APIRequestContext,
	type Page
} from '@playwright/test';
import {
	bookshopOwner,
	bookshopOther,
	bookshopSession
} from '../../../scripts/helpers/bookshop-e2e-transport.mjs';

const preview = '/loja/livraria/previa';
const api = '/api/livraria/previa';
type Quote = {
	id: string;
	totalCents: number;
	unitCents: number;
	shippingCents: number;
	shippingDeliveries: number;
	priceSource: string;
};
type Order = {
	id: string;
	status: string;
	kind: string;
	itemTitle: string;
	cycleMonths: number;
	renewalEnabled: boolean;
};
type Shipment = {
	orderId: string;
	competence: string;
	editionId: string;
	status: string;
	replacementCount: number;
};
type Snapshot = {
	catalog: { id: string; slug: string; coverUrl: string }[];
	account: { orders: Order[]; shipments: Shipment[] };
	commercialEnabled: boolean;
	providerStatus: string;
};

async function seed(
	context: BrowserContext,
	baseURL: string,
	id = bookshopOwner,
	anonymous = false
) {
	await context.clearCookies();
	await context.addCookies([
		{
			name: 'sb-127-auth-token',
			value: `base64-${Buffer.from(JSON.stringify(bookshopSession(id, anonymous))).toString('base64url')}`,
			url: baseURL,
			sameSite: 'Lax'
		}
	]);
}
async function action<T>(request: APIRequestContext, baseURL: string, body: object): Promise<T> {
	const response = await request.post(api, { headers: { origin: baseURL }, data: body });
	expect(response.status(), await response.text()).toBe(200);
	return response.json() as Promise<T>;
}
async function snapshot(request: APIRequestContext): Promise<Snapshot> {
	const response = await request.get(api);
	expect(response.status(), await response.text()).toBe(200);
	return response.json() as Promise<Snapshot>;
}
async function noOverflow(page: Page) {
	expect(
		await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
	).toBeLessThanOrEqual(1);
}
async function accessible(page: Page) {
	const result = await new AxeBuilder({ page })
		.include('.book-preview')
		.withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
		.analyze();
	expect(result.violations).toEqual([]);
}

test.beforeEach(async ({ page }) => {
	await page.addInitScript(() => localStorage.setItem('atv-analytics-consent', 'denied'));
});

test('anônimo, sessão anônima e conta fora da lista não acessam HTML, API nem capas', async ({
	context,
	baseURL
}) => {
	for (const route of [
		preview,
		`${preview}/ceu-de-papel`,
		`${preview}/minha-area`,
		`${preview}/livros/seu-mapa-astral-por-inteiro`
	]) {
		const response = await context.request.get(route, { maxRedirects: 0 });
		expect(response.status()).toBe(303);
		expect(response.headers().location).toContain('/entrar?next=');
		expect(response.headers()['cache-control']).toContain('no-store');
		expect(response.headers()['x-robots-tag']).toContain('noindex');
	}
	for (const route of [api, `${api}/capas/book-01.svg`])
		expect((await context.request.get(route)).status()).toBe(401);
	await seed(context, baseURL!, bookshopOwner, true);
	expect((await context.request.get(api)).status()).toBe(401);
	await seed(context, baseURL!, bookshopOther);
	for (const route of [preview, api, `${api}/capas/book-01.svg`]) {
		const response = await context.request.get(route);
		expect(response.status()).toBe(403);
		expect(await response.text()).not.toContain('Seu Mapa Astral por Inteiro');
	}
});

test('conta autorizada recebe catálogo de 21 livros e todas as fichas/capas; política privada cobre dados SSR', async ({
	context,
	page,
	baseURL
}) => {
	await seed(context, baseURL!);
	const response = await page.goto(preview);
	expect(response?.status()).toBe(200);
	expect(response?.headers()['cache-control']).toContain('no-store');
	expect(response?.headers()['x-robots-tag']).toContain('noindex');
	await expect(page.locator('.preview-book')).toHaveCount(21);
	const data = await snapshot(context.request);
	expect(data.catalog).toHaveLength(21);
	expect(new Set(data.catalog.map((book) => book.id)).size).toBe(21);
	expect(data.commercialEnabled).toBe(false);
	expect(data.providerStatus).toBe('SIMULATED_ONLY');
	for (const book of data.catalog) {
		const sheet = await context.request.get(`${preview}/livros/${book.slug}`);
		expect(sheet.status()).toBe(200);
		const cover = await context.request.get(book.coverUrl);
		expect(cover.status()).toBe(200);
		expect(cover.headers()['content-type']).toContain('image/svg+xml');
		expect(cover.headers()['cache-control']).toContain('no-store');
	}
	const ssr = await context.request.get(`${preview}/__data.json`);
	expect(ssr.headers()['cache-control']).toContain('no-store');
	const badOrigin = await context.request.post(api, {
		headers: { origin: 'https://example.invalid' },
		data: { action: 'quote' }
	});
	expect(badOrigin.status()).toBe(403);
});

for (const width of [320, 1440]) {
	test(`estante e clube privados têm contraste e layout legíveis em ${width}px`, async ({
		context,
		page,
		baseURL
	}, testInfo) => {
		await seed(context, baseURL!);
		await page.setViewportSize({ width, height: 900 });
		await page.goto(preview);
		await expect(page.getByRole('heading', { level: 1 })).toHaveText(
			'Uma estante para voltar a si.',
			{ useInnerText: true }
		);
		const shelf = await page.getByRole('region', { name: 'Primeira vitrine' }).boundingBox();
		const club = await page.locator('.preview-club').boundingBox();
		expect(club!.y).toBeGreaterThan(shelf!.y + shelf!.height - 1);
		await accessible(page);
		await noOverflow(page);
		await page.screenshot({
			path: testInfo.outputPath(`livraria-previa-${width}.png`),
			fullPage: true
		});
		await page.goto(`${preview}/ceu-de-papel`);
		await accessible(page);
		await noOverflow(page);
		await page.screenshot({
			path: testInfo.outputPath(`livraria-clube-${width}.png`),
			fullPage: true
		});
	});
}

test('avulso valida CEP, melhor benefício sem acumular e registra Pix pendente recuperável', async ({
	context,
	page,
	baseURL
}) => {
	await seed(context, baseURL!);
	await page.goto(`${preview}/livros/seu-mapa-astral-por-inteiro`);
	await page.getByLabel('CEP para a simulação').fill('99999-999');
	await page.getByRole('button', { name: 'Calcular total de teste' }).click();
	await expect(page.getByRole('status')).toContainText('CEP sem cobertura');
	await page.getByLabel('CEP para a simulação').fill('01001-000');
	await page.getByLabel('Cenário ATV+').selectOption('premium');
	await page.getByLabel('Outra condição de teste').selectOption('promotion15');
	let quoteResponse = page.waitForResponse(
		(response) => response.url().endsWith(api) && response.request().method() === 'POST'
	);
	await page.getByRole('button', { name: 'Calcular total de teste' }).click();
	let result = (await (await quoteResponse).json()) as { quote: Quote };
	expect(result.quote).toMatchObject({
		unitCents: 6320,
		shippingCents: 1990,
		totalCents: 8310,
		priceSource: 'member'
	});
	await expect(page.locator('.preview-summary')).toContainText('benefício ATV+ simulado');
	await page.getByLabel('Cenário ATV+').selectOption('essencial');
	quoteResponse = page.waitForResponse(
		(response) => response.url().endsWith(api) && response.request().method() === 'POST'
	);
	await page.getByRole('button', { name: 'Calcular total de teste' }).click();
	result = (await (await quoteResponse).json()) as { quote: Quote };
	expect(result.quote).toMatchObject({
		unitCents: 6715,
		shippingCents: 1990,
		totalCents: 8705,
		priceSource: 'promotion'
	});
	await page.getByLabel('Meio de pagamento simulado').selectOption('pix');
	await page.getByLabel('Resultado que deseja testar').selectOption('pending');
	const checkout = page.waitForResponse(
		(response) => response.url().endsWith(api) && response.request().method() === 'POST'
	);
	await page.getByRole('button', { name: 'Confirmar somente a simulação' }).click();
	const registered = (await (await checkout).json()) as { order: Order };
	expect(registered.order.status).toBe('pending');
	await expect(page.getByRole('button', { name: 'Confirmar somente a simulação' })).toBeDisabled();
	await expect(page.getByRole('status')).toContainText('Nenhuma cobrança real');
	await page
		.getByRole('link', { name: 'Acompanhar pagamento e remessas em Minha área de teste' })
		.click();
	const order = page
		.locator('article.preview-order')
		.filter({ has: page.getByText(registered.order.id, { exact: true }) });
	await expect(order).toContainText('Pagamento de teste pendente');
	await order.getByRole('button', { name: 'Simular aprovação pendente' }).click();
	await expect(order).toContainText('Pagamento de teste aprovado');
	await expect(order.getByRole('region', { name: /^Remessa / })).toHaveCount(1);
	await accessible(page);
	await noOverflow(page);
});

test('trimestral e anual têm 3/12 remessas, mesma edição mensal, renovação opcional e recuperação sem duplicação', async ({
	context,
	page,
	baseURL
}, testInfo) => {
	await seed(context, baseURL!);
	const quarterlyQuote = (
		await action<{ quote: Quote }>(context.request, baseURL!, {
			action: 'quote',
			input: {
				kind: 'club',
				cycle: 'quarterly',
				cep: '01001000',
				tier: 'premium',
				condition: 'none'
			}
		})
	).quote;
	expect(quarterlyQuote).toMatchObject({
		unitCents: 6000,
		shippingCents: 5970,
		shippingDeliveries: 3,
		totalCents: 23970
	});
	const confirmation = {
		action: 'checkout',
		quoteId: quarterlyQuote.id,
		requestKey: crypto.randomUUID(),
		method: 'card',
		paymentOutcome: 'approved',
		renewalAuthorized: true
	};
	const quarter = (await action<{ order: Order }>(context.request, baseURL!, confirmation)).order;
	const repeated = await action<{ order: Order; duplicate: boolean }>(
		context.request,
		baseURL!,
		confirmation
	);
	expect(repeated.duplicate).toBe(true);
	expect(repeated.order.id).toBe(quarter.id);
	await page.goto(`${preview}/ceu-de-papel`);
	await page.getByLabel(/^Ciclo/).selectOption('annual');
	await page.getByLabel('CEP para a simulação').fill('01001-000');
	await page.getByLabel('Cenário ATV+').selectOption('premium');
	const quoteResponse = page.waitForResponse(
		(response) => response.url().endsWith(api) && response.request().method() === 'POST'
	);
	await page.getByRole('button', { name: 'Calcular total de teste' }).click();
	const annualQuote = ((await (await quoteResponse).json()) as { quote: Quote }).quote;
	expect(annualQuote).toMatchObject({
		unitCents: 5000,
		shippingCents: 23880,
		shippingDeliveries: 12,
		totalCents: 83880
	});
	await expect(page.getByLabel('Meio de pagamento simulado')).toBeDisabled();
	const checkout = page.waitForResponse(
		(response) => response.url().endsWith(api) && response.request().method() === 'POST'
	);
	await page.getByRole('button', { name: 'Confirmar somente a simulação' }).click();
	const annual = ((await (await checkout).json()) as { order: Order }).order;
	expect(annual.renewalEnabled).toBe(false);
	let data = await snapshot(context.request);
	const quarterShipments = data.account.shipments.filter(
		(shipment) => shipment.orderId === quarter.id
	);
	const annualShipments = data.account.shipments.filter(
		(shipment) => shipment.orderId === annual.id
	);
	expect(quarterShipments).toHaveLength(3);
	expect(annualShipments).toHaveLength(12);
	expect(annualShipments.slice(0, 3).map((shipment) => shipment.editionId)).toEqual(
		quarterShipments.map((shipment) => shipment.editionId)
	);
	await page.setViewportSize({ width: 320, height: 900 });
	await page.goto(`${preview}/minha-area`);
	const order = page
		.locator('article.preview-order')
		.filter({ has: page.getByText(quarter.id, { exact: true }) });
	await order.getByRole('button', { name: 'Desligar renovação de teste' }).click();
	await expect(order).toContainText('Renovação desligada');
	const shipment = order.getByRole('region', { name: `Remessa ${quarterShipments[0].competence}` });
	await shipment.getByRole('button', { name: 'Testar endereço inválido' }).click();
	await expect(shipment).toContainText('Endereço sintético inválido');
	await shipment.getByRole('button', { name: 'Testar edição indisponível' }).click();
	await expect(shipment).toContainText('Edição indisponível no teste');
	await shipment.getByRole('button', { name: 'Validar corte e reprocessar' }).click();
	await expect(shipment).toContainText('Pronta para expedição simulada');
	await shipment.getByRole('button', { name: 'Simular expedição' }).click();
	await expect(shipment).toContainText('Rastreio fictício: SIM-');
	await shipment.getByRole('button', { name: 'Simular entrega', exact: true }).click();
	await expect(shipment).toContainText('Entregue em simulação');
	await shipment.getByRole('button', { name: 'Simular uma reposição' }).click();
	await expect(shipment).toContainText('Reposição fictícia: SIM-REP-');
	await accessible(page);
	await noOverflow(page);
	await page.screenshot({
		path: testInfo.outputPath('livraria-minha-area-320.png'),
		fullPage: true
	});
	data = await snapshot(context.request);
	expect(data.account.orders.find((entry) => entry.id === quarter.id)?.renewalEnabled).toBe(false);
	expect(data.account.shipments.filter((entry) => entry.orderId === quarter.id)).toHaveLength(3);
	expect(
		data.account.shipments.find(
			(entry) => entry.orderId === quarter.id && entry.competence === quarterShipments[0].competence
		)
	).toMatchObject({ status: 'delivered', replacementCount: 1 });
});
