import { expect, test } from '@playwright/test';
import { freeTools } from '../src/lib/data/free-tools';
import { publicChannels } from '../src/lib/data/public-channels';
import { universes } from '../src/lib/data/site';
import { shopPreviews } from '../src/lib/data/shop-products';
import editorialRelease from '../src/lib/server/editorial-release/registry.json' with { type: 'json' };

test.beforeEach(async ({ page }, testInfo) => {
	await page.addInitScript(() => localStorage.setItem('atv-analytics-consent', 'denied'));
	await page.emulateMedia({ reducedMotion: 'reduce' });
	// Layout and draft persistence only: production calculation/ledger verification is separate.
	// Keep a stable opaque owner so opening another mounted tool can restore the same draft.
	const owner = 'a'.repeat(64);
	await testInfo.attach('layout-readiness-fixture', {
		body: 'GET readiness/history uses an empty local fixture. No calculations, ledger writes or backend availability are validated by this suite.',
		contentType: 'text/plain'
	});
	await page.route(/\/api\/free-tools\/[a-z-]+(?:\?.*)?$/, async (route) => {
		const request = route.request();
		const url = new URL(request.url());
		const tool = freeTools.find((item) => url.pathname === `/api/free-tools/${item.id}`);
		if (request.method() !== 'GET' || !tool) return route.continue();
		if (url.searchParams.has('historico'))
			return route.fulfill({ json: { owner, history: [], nextCursor: null } });
		await route.fulfill({
			json: {
				owner,
				result: null,
				receipt: null,
				input: null,
				profile: null,
				quota: {
					mode:
						tool.topicId === 'tarot'
							? 'daily-draw'
							: tool.id === 'registro-de-sonho'
								? 'daily-entry'
								: 'corrections',
					remainingCorrections:
						tool.topicId === 'tarot' || tool.id === 'registro-de-sonho' ? null : 2,
					resetsAt: '2099-12-31T00:00:00.000Z',
					profileRevision: 0,
					stale: false
				}
			}
		});
	});
});

for (const width of [320, 390, 768, 1440]) {
	test(`ferramentas: painel abaixo da linha, foco e estado em ${width}px`, async ({
		page
	}, testInfo) => {
		test.setTimeout(120_000);
		await page.setViewportSize({ width, height: 1000 });
		await page.goto('/');
		await expect(page.locator('.nav-trigger').first()).toBeEnabled({ timeout: 30_000 });
		const grid = page.locator('#ferramentas > .tool-grid.wrap');
		const cards = grid.locator('.tool-card[data-tool]');
		await expect(cards).toHaveCount(freeTools.length);
		await expect(page.locator('.interest-picker [data-interest="all"]')).toHaveAttribute(
			'aria-pressed',
			'true'
		);
		await expect(page.locator('[data-tool-panel]:not([hidden])')).toHaveCount(0);
		for (const tool of freeTools) {
			const button = page.locator(`#open-${tool.id}`);
			await button.click();
			const panel = page.locator('[data-tool-panel]:not([hidden])');
			await expect(panel).toHaveCount(1);
			await expect(panel).toHaveAttribute('data-tool-panel', tool.id);
			await expect(panel).toBeFocused();
			const geometry = await grid.evaluate((root, id) => {
				const selected = root.querySelector<HTMLElement>(`.tool-card[data-tool="${id}"]`)!;
				const selection = selected.getBoundingClientRect();
				const row = [...root.querySelectorAll<HTMLElement>('.tool-card')]
					.map((element) => element.getBoundingClientRect())
					.filter((box) => Math.abs(box.top - selection.top) < 2);
				const open = root
					.querySelector<HTMLElement>('[data-tool-panel]:not([hidden])')!
					.getBoundingClientRect();
				const container = root.getBoundingClientRect();
				return {
					left: open.left - container.left,
					width: open.width - container.width,
					below: open.top - Math.max(...row.map((box) => box.bottom)),
					overflow: document.documentElement.scrollWidth - innerWidth
				};
			}, tool.id);
			expect(Math.abs(geometry.left)).toBeLessThanOrEqual(1);
			expect(Math.abs(geometry.width)).toBeLessThanOrEqual(2);
			expect(geometry.below).toBeGreaterThanOrEqual(0);
			expect(geometry.overflow).toBeLessThanOrEqual(1);
			await panel.locator('.tool-close').click();
			await expect(button).toBeFocused();
			await expect(page.locator('[data-tool-panel]:not([hidden])')).toHaveCount(0);
		}
		await page.locator('#open-ascendente').click();
		await page
			.locator('[data-tool-panel="ascendente"]')
			.getByLabel('Data de nascimento')
			.fill('2000-01-01');
		await page.locator('#open-carta-do-dia').click();
		await page.locator('#open-ascendente').click();
		await expect(
			page.locator('[data-tool-panel="ascendente"]').getByLabel('Data de nascimento')
		).toHaveValue('2000-01-01');
		// Filtering closes an unrelated panel while preserving the user's mounted draft.
		for (const interest of ['tarot', 'meu-ceu']) {
			await page.locator(`.interest-picker [data-interest="${interest}"]`).click();
			await expect(page.locator(`.interest-picker [data-interest="${interest}"]`)).toHaveAttribute(
				'aria-pressed',
				'true'
			);
			await expect(grid.locator('.tool-card:not([hidden])')).toHaveCount(
				freeTools.filter((tool) => tool.topicId === interest).length
			);
			await expect(page.locator('[data-tool-panel]:not([hidden])')).toHaveCount(0);
			if (interest === 'tarot') await page.locator('#open-carta-do-dia').click();
		}
		await page.locator('#open-ascendente').click();
		await expect(
			page.locator('[data-tool-panel="ascendente"]').getByLabel('Data de nascimento')
		).toHaveValue('2000-01-01');
		// Same-home client navigation must react to the URL without losing the mounted draft.
		for (const tool of ['carta-do-amor', 'ascendente']) {
			if (width <= 960) await page.locator('.mobile-menu').click();
			await page.locator('[aria-controls="nav-ferramentas"]').click();
			await page.locator(`#nav-ferramentas a[href="/?ferramenta=${tool}#ferramentas"]`).click();
			await expect(page).toHaveURL(new RegExp(`ferramenta=${tool}#ferramentas$`));
			await expect(page.locator('[data-tool-panel]:not([hidden])')).toHaveAttribute(
				'data-tool-panel',
				tool
			);
			await expect(page.locator(`[data-tool-panel="${tool}"]`)).toBeFocused();
			await expect(
				page.locator(
					`.interest-picker [data-interest="${freeTools.find((item) => item.id === tool)!.topicId}"]`
				)
			).toHaveAttribute('aria-pressed', 'true');
		}
		await expect(
			page.locator('[data-tool-panel="ascendente"]').getByLabel('Data de nascimento')
		).toHaveValue('2000-01-01');
		await page.locator('[data-tool-panel="ascendente"] .tool-close').click();
		await page.locator('.interest-picker [data-interest="all"]').click();
		await page.evaluate(() => scrollTo(0, 0));
		await page.screenshot({
			path: testInfo.outputPath(`integrated-home-${width}.png`),
			fullPage: true
		});
	});

	test(`home editorial: descobertas, ofertas e redes acessíveis em ${width}px`, async ({
		page
	}, testInfo) => {
		await page.setViewportSize({ width, height: 1000 });
		await page.goto('/');
		await expect(page.locator('.nav-trigger').first()).toBeEnabled({ timeout: 30_000 });
		await page.evaluate(() => document.fonts.ready);
		await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
		await expect(page.locator('.approved-header .brand')).toBeVisible();
		await expect(page.locator('.approved-header .brand img')).toBeVisible();
		const opening = page.locator('.approved-home > section').first();
		await expect(opening).toHaveClass('approved-hero');
		await expect(
			opening.getByRole('img', { name: 'A tua vida nos astros', exact: true })
		).toBeVisible();
		await expect(opening.locator('.hero-brand img')).toHaveCount(0);
		await expect(opening.locator('.hero-positioning')).toHaveText('Astrologia · Tarot · Sonhos');
		await expect(
			opening.getByRole('link', { name: 'Explorar ferramentas grátis' })
		).toHaveAttribute('href', '#ferramentas');
		await opening.screenshot({
			path: testInfo.outputPath(`integrated-brand-opening-${width}.png`)
		});
		await page.screenshot({
			path: testInfo.outputPath(`integrated-header-opening-${width}.png`)
		});
		const readings = page.locator('#produtos .reading-selection article');
		await expect(readings).toHaveCount(3);
		for (const reading of await readings.all()) {
			await expect(reading).toBeVisible();
			await expect(reading.getByRole('heading')).toBeVisible();
			await expect(reading.locator('a[data-atv-event="product_click"]')).toHaveAttribute(
				'href',
				/^\//
			);
			await expect(reading).not.toHaveAttribute('inert', '');
		}
		await expect(page.locator('#amostra')).toBeVisible();
		const plans = page.locator('#atv-mais-home .plus-plan');
		await expect(plans).toHaveCount(3);
		const signature = page.getByRole('img', {
			name: 'ATV+ — assinatura A Tua Vida nos Astros',
			exact: true
		});
		await signature.scrollIntoViewIfNeeded();
		await expect(signature).toBeVisible();
		await expect(signature.locator('.plus-signature-mark')).toHaveText('ATV+');
		await expect(signature.locator('.plus-signature-label')).toHaveText('Assinatura');
		await expect(page.locator('#atv-mais-home img')).toHaveCount(0);
		for (const name of ['Essencial', 'Ampliado', 'Premium'])
			await expect(plans.filter({ hasText: name })).toBeVisible();
		await page.locator('#atv-mais-home').screenshot({
			path: testInfo.outputPath(`integrated-atv-plus-${width}.png`)
		});
		for (const universe of universes)
			await expect(page.locator(`#explorar .explore-theme[href="${universe.href}"]`)).toBeVisible();
		const magazine = page.locator('#revista .home-article');
		await expect(magazine).toHaveCount(3);
		for (const article of await magazine.all()) {
			const heading = article.getByRole('heading').getByRole('link');
			const href = await heading.getAttribute('href');
			const document = editorialRelease.packages
				.map((entry) => entry.document)
				.find((entry) => entry.path === href);
			expect(document, `artigo publicado no registry: ${href}`).toBeDefined();
			expect(document!.state).toBe('PUBLISHED');
			expect(document!.kind).not.toBe('horoscope');
			expect(Date.parse(document!.publishedAt)).toBeLessThanOrEqual(Date.now());
			await expect(heading).toHaveText(document!.title);
			await expect(article.locator('time')).toHaveAttribute('datetime', document!.publishedAt);
			await expect(article).toContainText(document!.description);
			await expect(article.locator('.home-text-link')).toHaveAttribute('href', document!.path);
		}
		const shop = page.getByRole('region', { name: 'A coleção no cotidiano', exact: true });
		await expect(shop).toHaveAttribute('aria-roledescription', 'carrossel');
		const scenes = shop.locator('article[aria-roledescription="slide"]');
		const selectors = shop
			.getByRole('group', { name: 'Escolher cena da coleção', exact: true })
			.getByRole('button');
		await expect(scenes).toHaveCount(4);
		await expect(selectors).toHaveCount(4);
		await expect(shop.getByRole('button', { name: 'Ver cena anterior da loja' })).toBeDisabled();
		const sceneImages = new Set<string>();
		for (let index = 0; index < 4; index++) {
			await selectors.nth(index).click();
			await expect(selectors.nth(index)).toHaveAttribute('aria-current', 'true');
			const scene = scenes.nth(index);
			await scene.getByRole('heading').scrollIntoViewIfNeeded();
			await expect(scene.getByRole('heading')).toBeInViewport();
			const image = scene.locator('img');
			await expect(image).toHaveAttribute('alt', /.+/);
			await expect
				.poll(() => image.evaluate((element: HTMLImageElement) => element.naturalWidth))
				.toBeGreaterThan(0);
			sceneImages.add((await image.getAttribute('src'))!);
		}
		expect(sceneImages.size).toBe(4);
		await expect(shop.getByRole('button', { name: 'Ver próxima cena da loja' })).toBeDisabled();
		const pieces = scenes.locator('a[href^="/loja/peca/"]');
		await expect(pieces).toHaveCount(7);
		const pieceDestinations = new Set<string>();
		for (const piece of await pieces.all()) {
			const href = (await piece.getAttribute('href'))!;
			expect(shopPreviews.some((product) => href === `/loja/peca/${product.slug}`)).toBe(true);
			pieceDestinations.add(href);
		}
		expect(pieceDestinations.size).toBe(7);
		await expect(shop.getByRole('link', { name: 'Explorar a Loja dos Signos' })).toHaveAttribute(
			'href',
			'/loja'
		);
		// Only the footer presents social links, with readable names for assistive technology.
		await expect(page.locator('.social-presence')).toHaveCount(0);
		const footer = page.getByRole('contentinfo');
		await footer.scrollIntoViewIfNeeded();
		const social = footer.getByRole('navigation', { name: 'ATVNA nas redes', exact: true });
		await expect(social.getByRole('link')).toHaveCount(publicChannels.length);
		for (const channel of publicChannels) {
			const link = social.getByRole('link', { name: `ATVNA no ${channel.name}`, exact: true });
			await expect(link).toHaveAttribute('href', channel.href);
			await expect(link).toHaveText('');
			await expect(link.locator('svg')).toHaveCount(1);
			const box = await link.boundingBox();
			expect(box!.width).toBeGreaterThanOrEqual(28);
			expect(box!.height).toBeGreaterThanOrEqual(28);
		}
		for (const href of [
			'/metodo',
			'/fale-conosco',
			'/canais-oficiais',
			'/biblioteca',
			'/termos',
			'/privacidade',
			'/loja/devolucoes',
			'/loja/frete',
			'/loja/termos'
		]) {
			const link = footer.locator(`a[href="${href}"]`);
			await expect(link).toHaveCount(1);
			await expect(link).toBeVisible();
		}
		const footerGeometry = await footer.evaluate((root) => {
			const bounds = root.getBoundingClientRect();
			const targets = [...root.querySelectorAll<HTMLElement>('a, button')]
				.map((element) => element.getBoundingClientRect())
				.filter((box) => box.width > 0 && box.height > 0);
			return {
				height: bounds.height,
				overflow: root.scrollWidth - root.clientWidth,
				outside: targets.some(
					(box) =>
						box.left < -1 ||
						box.right > innerWidth + 1 ||
						box.top < bounds.top - 1 ||
						box.bottom > bounds.bottom + 1
				),
				overlap: targets.some((box, index) =>
					targets
						.slice(index + 1)
						.some(
							(other) =>
								Math.min(box.right, other.right) - Math.max(box.left, other.left) > 1 &&
								Math.min(box.bottom, other.bottom) - Math.max(box.top, other.top) > 1
						)
				)
			};
		});
		expect(footerGeometry.height).toBeLessThan(width < 768 ? 450 : 300);
		expect(footerGeometry.overflow).toBeLessThanOrEqual(1);
		expect(footerGeometry.outside).toBe(false);
		expect(footerGeometry.overlap).toBe(false);
		expect(
			await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
		).toBeLessThanOrEqual(1);
		await page
			.locator('#produtos')
			.screenshot({ path: testInfo.outputPath(`integrated-showcase-${width}.png`) });
		await page
			.locator('footer.site-footer')
			.screenshot({ path: testInfo.outputPath(`integrated-footer-${width}.png`) });
		if (width === 390) {
			await footer.getByRole('button', { name: 'Preferências de cookies', exact: true }).click();
			await expect(
				page.getByRole('complementary', { name: 'Preferências de cookies', exact: true })
			).toBeVisible();
		}
	});
}

test('eventos de descoberta respeitam consentimento e usam somente identificadores públicos', async ({
	page
}) => {
	await page.goto('/');
	await expect(page.locator('.nav-trigger').first()).toBeEnabled();
	await page.locator('.hero-paths a[href="#ferramentas"]').click();
	await expect
		.poll(() => page.evaluate(() => (window as Window & { dataLayer?: unknown[] }).dataLayer ?? []))
		.toEqual([]);
	await page.evaluate(() => localStorage.setItem('atv-analytics-consent', 'granted'));
	await page.locator('.hero-paths a[href="#amostra"]').click();
	await page.locator('#open-ascendente').click();
	const events = await page.evaluate(
		() => (window as Window & { dataLayer?: Record<string, unknown>[] }).dataLayer ?? []
	);
	expect(events).toContainEqual({
		event: 'atv_home_path_select',
		context: 'hero',
		cta: 'sample'
	});
	expect(events).toContainEqual(
		expect.objectContaining({ event: 'atv_tool_select', tool_id: 'ascendente' })
	);
	for (const event of events)
		expect(
			Object.keys(event).every((key) =>
				[
					'event',
					'tool_id',
					'product_id',
					'universe_id',
					'context',
					'cta',
					'item_id',
					'position',
					'state',
					'error_code'
				].includes(key)
			)
		).toBe(true);
	await page.evaluate(() => localStorage.setItem('atv-analytics-consent', 'denied'));
	await page.locator('#open-carta-do-dia').click();
	expect(
		await page.evaluate(() => (window as Window & { dataLayer?: unknown[] }).dataLayer?.length)
	).toBe(events.length);
});
