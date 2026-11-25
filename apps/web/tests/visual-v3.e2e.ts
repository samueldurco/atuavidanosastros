import { expect, test, type Locator, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import {
	isLaunchProductId,
	productCatalog,
	productOffers,
	productSlugAliases,
	productTrialHref
} from '@atv/domain';
import { scanAccessibility } from './fixtures/accessibility';
import { readingSample } from '../src/lib/data/reading-samples';
import { customerProduct } from '../src/lib/data/product-copy';

const approvedProductArt: Record<string, { art: string; caption: string }> = JSON.parse(
	readFileSync(new URL('../src/lib/data/mvp-product-design.json', import.meta.url), 'utf8')
);

const surfaces = [
	'/',
	'/leituras',
	'/meu-ceu',
	'/ciclos',
	'/amor',
	'/proposito',
	'/tarot',
	'/sonhos',
	'/produtos/mapa-astral-dinheiro-carreira',
	'/bussola-de-carreira',
	'/entrar',
	'/privacidade',
	'/biblioteca/_spec/fluxo?state=ready&product=career-compass'
];

async function expectNoOverflow(page: Page, context: string) {
	expect(
		await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
		context
	).toBe(true);
}

async function expectDeliveredBrandImages(page: Page, context: string) {
	const images = page.locator('img[src*="/brand/mvp/"]');
	expect(
		await images.count(),
		`${context}: the MVP brand must actually be present`
	).toBeGreaterThan(0);
	await expect
		.poll(
			() =>
				images.evaluateAll((nodes) => {
					const required = (nodes as HTMLImageElement[]).filter((image) => {
						const box = image.getBoundingClientRect();
						const rendered = box.width > 0 && box.height > 0;
						const inViewport =
							box.bottom > 0 && box.top < innerHeight && box.right > 0 && box.left < innerWidth;
						// Responsive ornaments may be hidden; offscreen carousel cards stay lazy.
						return rendered && (image.loading !== 'lazy' || inViewport);
					});
					return (
						required.length > 0 &&
						required.every((image) => image.complete && image.naturalWidth > 0)
					);
				}),
			{ message: `${context}: visible MVP images must decode` }
		)
		.toBe(true);
}

async function expectProductArtwork(
	artwork: Locator,
	productId: string,
	presentation: 'cover' | 'thumbnail' = 'cover'
) {
	const product = customerProduct(productId);
	const design = approvedProductArt[productId];
	expect(product, `${productId}: public product copy`).toBeDefined();
	expect(design, `${productId}: approved artwork`).toBeDefined();
	await expect(artwork).toHaveCount(1);
	await expect(artwork).toHaveAttribute('data-product-artwork', productId);
	await artwork.scrollIntoViewIfNeeded();
	await expect(artwork).toBeVisible();
	await expect(artwork.locator('.folio-title')).toHaveText(product!.name);
	await expect(artwork.locator('.folio-caption')).toHaveText(design.caption);
	await expect(artwork.locator('svg.pa-canvas')).toHaveCount(1);
	expect(
		await artwork.locator('.mvp-product-art').evaluate((element, approved) => {
			const template = document.createElement('template');
			template.innerHTML = approved;
			return (
				element.querySelector('.product-art')?.outerHTML ===
				template.content.firstElementChild?.outerHTML
			);
		}, design.art),
		`${productId}: delivered engraving matches its approved product artwork`
	).toBe(true);
	const [outer, folio] = await Promise.all([
		artwork.boundingBox(),
		artwork.locator('.folio').boundingBox()
	]);
	expect(outer).not.toBeNull();
	expect(folio).not.toBeNull();
	if (!outer || !folio) return;
	// Compact catalog cards repeat the product title in the readable body beside the thumbnail.
	expect(folio.width, `${productId}: ${presentation} width`).toBeGreaterThan(
		presentation === 'thumbnail' ? 60 : 100
	);
	expect(folio.x, `${productId}: cover left edge`).toBeGreaterThanOrEqual(outer.x - 1);
	expect(folio.y, `${productId}: cover top edge`).toBeGreaterThanOrEqual(outer.y - 1);
	expect(folio.x + folio.width, `${productId}: cover right edge`).toBeLessThanOrEqual(
		outer.x + outer.width + 1
	);
	expect(folio.y + folio.height, `${productId}: cover bottom edge`).toBeLessThanOrEqual(
		outer.y + outer.height + 1
	);
}

async function expectReadingSample(preview: Locator, productId: string) {
	const sample = readingSample(productId);
	expect(sample, `${productId}: a product-specific sample must exist`).not.toBeNull();
	if (!sample) throw new Error(`Missing reading sample: ${productId}`);
	await expect(preview, `${productId}: delivered reading sample`).toHaveCount(1);
	await expect(preview).toHaveAttribute('data-reading-sample', productId);
	await preview.scrollIntoViewIfNeeded();
	await expect(preview).toBeVisible();
	await expect(preview.locator('.sample-title')).toHaveText(sample.title);
	await expect(preview.locator('.context')).toHaveText(sample.context);
	await expect(preview.locator('.excerpt').first()).toHaveText(sample.sections[0].text);
	await expect(preview.locator('.excerpt')).toHaveCount(sample.sections.length);
	await expect(preview.locator('.sample-note')).toHaveText(sample.note);
	await expect(preview.locator('img')).toHaveCount(
		sample.layout === 'chart' ? 1 : (sample.cards?.length ?? 0)
	);
	const images = preview.locator('img');
	await expect
		.poll(
			() =>
				images.evaluateAll((nodes) =>
					(nodes as HTMLImageElement[]).every(
						(image) => image.complete && image.naturalWidth > 0 && image.naturalHeight > 0
					)
				),
			{ message: `${productId}: every sample image must load` }
		)
		.toBe(true);
	const box = await preview.boundingBox();
	expect(box?.width, `${productId}: sample width`).toBeGreaterThan(100);
	expect(box?.height, `${productId}: sample height`).toBeGreaterThan(100);
}

async function expectSeparatePanels(first: Locator, second: Locator, context: string) {
	const [a, b] = await Promise.all([first.boundingBox(), second.boundingBox()]);
	expect(a, `${context}: first panel exists`).not.toBeNull();
	expect(b, `${context}: second panel exists`).not.toBeNull();
	if (!a || !b) return;
	const horizontal = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
	const vertical = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
	expect(
		horizontal <= 1 || vertical <= 1,
		`${context}: sample must not cover product text or actions`
	).toBe(true);
}

for (const width of [320, 360, 390, 430, 768, 820, 1024, 1280, 1440]) {
	test(`MVP: reflow and delivered artwork at ${width}px`, async ({ page }, testInfo) => {
		await page.setViewportSize({ width, height: width === 820 ? 1180 : 1000 });
		for (const path of surfaces) {
			const response = await page.goto(path);
			expect(response?.status(), path).toBe(200);
			await page.evaluate(() => document.fonts.ready);
			await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
			await expectDeliveredBrandImages(page, path);
			await expectNoOverflow(page, path);
			if (path === '/' || path === '/produtos/mapa-astral-dinheiro-carreira') {
				await page.screenshot({
					path: testInfo.outputPath(`${path === '/' ? 'home' : 'career'}-${width}.png`),
					fullPage: true
				});
			}
		}
	});
}

for (const width of [320, 1440]) {
	test(`MVP: every real catalog product has its own delivered sample without overlap at ${width}px`, async ({
		page
	}, testInfo) => {
		test.setTimeout(180_000);
		await page.setViewportSize({ width, height: 1000 });
		const excerpts = new Set<string>();
		for (const product of productOffers) {
			const response = await page.goto(`/produtos/${product.slug}`);
			expect(response?.status(), product.id).toBe(200);
			await page.evaluate(() => document.fonts.ready);
			await expect(page.getByRole('heading', { level: 1 })).toHaveText(product.name);
			const shell = page.locator('.mvp-experience');
			await expect(shell).toHaveAttribute(
				'data-universe',
				/^(meu-ceu|ciclos|amor|proposito|tarot|sonhos)$/
			);
			await expectProductArtwork(
				page.locator('.product-offer-art [data-product-artwork]'),
				product.id
			);
			await expectSeparatePanels(
				page.locator('.product-offer-art'),
				page.locator('.product-offer-copy'),
				product.id
			);
			const launch = isLaunchProductId(product.id);
			const primary = page.getByRole('link', {
				name: launch ? 'Testar gratuitamente' : 'Ver disponibilidade',
				exact: false
			});
			await expect(primary).toBeVisible();
			await expect(primary).toHaveAttribute(
				'href',
				launch ? productTrialHref(product.id) : '#disponibilidade'
			);
			const preview = page.locator('#amostra [data-reading-sample]');
			await expectReadingSample(preview, product.id);
			// Changing only the cover or title must not make a reused sample count as unique.
			excerpts.add(await preview.locator('.excerpt').first().innerText());
			await expectNoOverflow(page, product.id);
			await page.screenshot({
				path: testInfo.outputPath(`${product.id}-${width}.png`),
				fullPage: true
			});
		}
		expect(excerpts.size, 'Products must not silently share a generic sample').toBe(
			productOffers.length
		);
	});

	test(`MVP: catalog cards keep illustrated covers separate from readable product information at ${width}px`, async ({
		page
	}, testInfo) => {
		test.setTimeout(120_000);
		await page.setViewportSize({ width, height: 1000 });
		await page.goto('/leituras');
		await page.evaluate(() => document.fonts.ready);
		const products = productOffers;
		const cards = page.locator('article.public-product-card');
		await expect(cards).toHaveCount(products.length);
		for (const product of products) {
			const card = cards.filter({
				has: page.getByRole('heading', { name: product.name, exact: true })
			});
			await expect(card).toHaveCount(1);
			await expect(card.getByRole('heading').getByRole('link')).toHaveAttribute(
				'href',
				`/produtos/${product.slug}`
			);
			await expectProductArtwork(
				card.locator('[data-product-artwork]'),
				product.id,
				width === 320 ? 'thumbnail' : 'cover'
			);
			if (width === 320) {
				await expect(card.getByRole('heading')).toBeVisible();
				expect(
					await card
						.getByRole('heading')
						.evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize)),
					`${product.id}: readable product title beside its thumbnail`
				).toBeGreaterThanOrEqual(18);
			}
			await expect(card.getByRole('link', { name: 'Ver uma amostra' })).toHaveAttribute(
				'href',
				`/produtos/${product.slug}#amostra`
			);
			if (isLaunchProductId(product.id)) {
				await expect(card.locator('.badge')).toHaveText('Teste gratuito disponível');
				await expect(
					card.getByRole('link', { name: `Testar ${product.name} grátis` })
				).toHaveAttribute('href', productTrialHref(product.id));
			} else {
				await expect(card.locator('.badge')).toHaveText('Em preparação');
			}
			await expectSeparatePanels(
				card.locator('.cover-link'),
				card.locator('.catalog-card-body'),
				product.id
			);
		}
		await expectNoOverflow(page, 'catalog');
		await page.screenshot({ path: testInfo.outputPath(`catalog-${width}.png`), fullPage: true });
	});
}

test('MVP: artwork failure preserves titles, long text and controls at 200% zoom', async ({
	page
}, testInfo) => {
	let blockedAssets = 0;
	await page.route('**/brand/mvp/**', (route) => {
		blockedAssets++;
		return route.abort();
	});
	await page.setViewportSize({ width: 1440, height: 1000 });
	await page.goto('/produtos/mapa-astral-dinheiro-carreira');
	expect(blockedAssets, 'The failure exercise must block real MVP assets').toBeGreaterThan(0);
	await expectProductArtwork(
		page.locator('.product-offer-art [data-product-artwork]'),
		'purpose-career'
	);
	await expectReadingSample(page.locator('#amostra [data-reading-sample]'), 'purpose-career');
	await page.evaluate(() => scrollTo(0, 0));
	await expect(page.locator('header.site-header').getByRole('link')).toHaveCount(2);
	await expect(page.locator('.account-link')).toBeInViewport();
	await expect(page.locator('.nav-trigger[aria-controls="nav-produtos"]')).toBeInViewport();
	await page.evaluate(() => {
		document.documentElement.style.zoom = '2';
	});
	const heading = page.getByRole('heading', { level: 1 });
	await expect(heading).toHaveText('Mapa Astral de Dinheiro e Carreira');
	await expect(heading).toHaveCSS('opacity', '1');
	await heading.evaluate((element) => {
		element.textContent =
			'Mapa Astral de Dinheiro e Carreira: possibilidades profissionais, escolhas e próximos passos com tempo para refletir';
	});
	await expect(heading).toBeVisible();
	await expect(page.getByRole('link', { name: 'Ver disponibilidade', exact: false })).toBeVisible();
	await expectNoOverflow(page, 'artwork failure at 200% zoom');
	const menu = page.getByRole('button', { name: 'Menu', exact: true });
	await expect(menu).toBeInViewport();
	await menu.click();
	await expect(
		page.getByRole('navigation', { name: 'Navegação principal', exact: true })
	).toBeVisible();
	await expect(page.locator('.account-link')).toBeVisible();
	await expectNoOverflow(page, 'open navigation at 200% zoom');
	await page.keyboard.press('Escape');
	await expect(menu).toBeFocused();
	await scanAccessibility(page, testInfo);
});

for (const theme of ['meu-ceu', 'ciclos', 'amor', 'proposito', 'tarot', 'sonhos']) {
	test(`MVP: themed contrast and semantics for ${theme}`, async ({ page }, testInfo) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto(`/${theme}`);
		await scanAccessibility(page, testInfo);
		await page.getByRole('button', { name: 'Menu', exact: true }).click();
		await scanAccessibility(page, testInfo);
	});
}

test('MVP: printing retains the complete catalog and private reading text', async ({ page }) => {
	await page.goto('/leituras');
	await page.emulateMedia({ media: 'print' });
	const cards = page.locator('article.public-product-card');
	await expect(cards).toHaveCount(productOffers.length);
	for (const card of await cards.all()) {
		await expect(card).toBeVisible();
		await expect(card.getByRole('heading')).toBeVisible();
		await expect(card.locator('.catalog-card-body')).not.toHaveText('');
	}
	await page.goto('/testar-produtos/_spec?product=career-compass');
	await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('MVP: public offer aliases redirect to the current catalog without exposing historical-only products', async ({
	request
}) => {
	for (const [oldSlug, productId] of Object.entries(productSlugAliases)) {
		const product = productOffers.find((offer) => offer.id === productId);
		expect(product, oldSlug).toBeDefined();
		const response = await request.get(`/produtos/${oldSlug}`, { maxRedirects: 0 });
		expect(response.status(), oldSlug).toBe(308);
		expect(response.headers().location, oldSlug).toBe(`/produtos/${product!.slug}`);
	}
	const compass = await request.get('/bussola-de-carreira', { maxRedirects: 0 });
	expect(compass.status()).toBe(308);
	expect(compass.headers().location).toBe('/ferramentas/meio-do-ceu');
	const offeredIds = new Set(productOffers.map((product) => product.id));
	for (const product of productCatalog) {
		if (offeredIds.has(product.id) || Object.hasOwn(productSlugAliases, product.slug)) continue;
		const path = `/produtos/${product.slug}`;
		expect((await request.get(path, { maxRedirects: 0 })).status(), path).toBe(404);
	}
});
