import { expect, test, type Locator } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { isLaunchProductId } from '@atv/domain';
import { customerOffers } from '../src/lib/data/product-copy';
import { readingSample } from '../src/lib/data/reading-samples';

const approvedProductDesign: Record<string, { theme: string; art: string }> = JSON.parse(
	readFileSync(new URL('../src/lib/data/mvp-product-design.json', import.meta.url), 'utf8')
);

async function expectPreservedHero(hero: Locator, productId: string) {
	const design = approvedProductDesign[productId];
	expect(design, `${productId}: the existing product design is retained`).toBeDefined();
	const wallpaper = `/brand/mvp/assets/universos/fundo-${design.theme}.webp`;
	expect(
		await hero.evaluate((element) => getComputedStyle(element).backgroundImage),
		`${productId}: the original universe wallpaper remains visible`
	).toContain(wallpaper);
	expect(
		await hero.evaluate(async (_element, source) => {
			const image = new Image();
			image.src = source;
			try {
				await image.decode();
				return image.naturalWidth > 0 && image.naturalHeight > 0;
			} catch {
				return false;
			}
		}, wallpaper),
		`${productId}: the original wallpaper asset loads`
	).toBe(true);
	const engraving = hero.locator('.product-offer-art .mvp-product-art');
	await expect(engraving).toHaveCount(1);
	expect(
		await engraving.evaluate((element, art) => {
			const reference = document.createElement('template');
			reference.innerHTML = art;
			return (
				element.querySelector('.product-art')?.outerHTML ===
				reference.content.firstElementChild?.outerHTML
			);
		}, design.art),
		`${productId}: the existing themed engraving is preserved`
	).toBe(true);
}

async function expectReadableMockups(mockups: Locator, productId: string) {
	const count = await mockups.count();
	expect(count, `${productId}: a delivery mockup must be present`).toBeGreaterThan(0);
	for (const mockup of await mockups.all()) {
		await mockup.scrollIntoViewIfNeeded();
		await expect(mockup).toBeVisible();
		const dimensions = await mockup.evaluate((element) => {
			const box = element.getBoundingClientRect();
			return {
				left: box.left,
				right: box.right,
				width: box.width,
				height: box.height,
				viewport: innerWidth,
				contentWidth: element.scrollWidth,
				availableWidth: element.clientWidth
			};
		});
		expect(dimensions.width, `${productId}: mockup has visible width`).toBeGreaterThan(50);
		expect(dimensions.height, `${productId}: mockup has visible height`).toBeGreaterThan(30);
		expect(dimensions.left, `${productId}: mockup fits the left edge`).toBeGreaterThanOrEqual(-1);
		expect(dimensions.right, `${productId}: mockup fits the right edge`).toBeLessThanOrEqual(
			dimensions.viewport + 1
		);
		expect(
			dimensions.contentWidth,
			`${productId}: mockup content is not clipped`
		).toBeLessThanOrEqual(dimensions.availableWidth + 1);
	}
}

for (const width of [320, 1440]) {
	test(`product delivery mockups retain every sample and actual format at ${width}px`, async ({
		page
	}, testInfo) => {
		test.setTimeout(240_000);
		await page.setViewportSize({ width, height: 1000 });
		const capturedUniverses = new Set<string>();
		const excerpts = new Set<string>();
		for (const product of customerOffers) {
			const response = await page.goto(`${product.href}#amostra`);
			expect(response?.status(), `${product.id}: product page loads`).toBe(200);
			const consent = page.getByRole('button', { name: 'Recusar opcionais', exact: true });
			if (await consent.isVisible()) await consent.click();
			await page.evaluate(() => document.fonts.ready);
			await expect(page.getByRole('heading', { level: 1 })).toHaveText(product.name);
			await expectPreservedHero(page.locator('.product-offer-hero'), product.id);

			const sample = readingSample(product.id);
			expect(sample, `${product.id}: a distinct approved sample exists`).toBeDefined();
			if (!sample) throw new Error(`Missing sample for ${product.id}`);
			const preview = page.locator(`#amostra [data-reading-sample="${product.id}"]`);
			await expect(preview).toHaveCount(1);
			await expect(preview.locator('.sample-title')).toHaveText(sample.title);
			await expect(preview.locator('.context')).toHaveText(sample.context);
			await expect(preview.locator('.excerpt')).toHaveText(
				sample.sections.map((section) => section.text)
			);
			await expect(preview.locator('.sample-note')).toHaveText(sample.note);
			await expect(preview.locator('.sample-note')).toContainText(/fictíci/);
			if (product.id === 'birth-chart') {
				const toggle = preview.getByRole('button', {
					name: /Ler os trechos completos|Recolher os trechos/
				});
				await expect(toggle).toHaveAttribute('aria-expanded', 'false');
				const controlledId = await toggle.getAttribute('aria-controls');
				expect(controlledId, 'The sample toggle identifies the chapters it controls').toBeTruthy();
				const chapters = preview.locator(`[id="${controlledId}"]`);
				await expect(chapters).toHaveCount(1);
				await toggle.click();
				await expect(toggle).toHaveAttribute('aria-expanded', 'true');
				await expect(toggle).toHaveAccessibleName('Recolher os trechos');
				expect(
					await chapters
						.locator('.excerpt')
						.evaluateAll((elements) =>
							elements.every((element) => element.scrollHeight <= element.clientHeight + 1)
						),
					'The expanded sample exposes every chapter without clipping its text'
				).toBe(true);
				await toggle.click();
				await expect(toggle).toHaveAttribute('aria-expanded', 'false');
				await expect(toggle).toHaveAccessibleName('Ler os trechos completos');
				await expect(chapters.locator('.excerpt')).toHaveText(
					sample.sections.map((section) => section.text)
				);
			}
			excerpts.add(await preview.locator('.excerpt').first().innerText());
			const illustrations = preview.locator(
				'.sample-illustration svg, .chart-preview img, .tarot-board img'
			);
			expect(
				await illustrations.count(),
				`${product.id}: the sample is illustrated`
			).toBeGreaterThan(0);
			await expectReadableMockups(preview.locator('.delivery-reader'), product.id);

			const formats = page.locator('[data-delivery-formats]');
			await expect(formats).toHaveCount(1);
			expect(
				await formats
					.locator('[data-delivery-format]')
					.evaluateAll((elements) =>
						elements.map((element) => element.getAttribute('data-delivery-format'))
					),
				`${product.id}: only the formats in the real product contract are shown`
			).toEqual([...product.delivery]);
			await expectReadableMockups(formats.locator('.format-mockup'), product.id);
			await expect(page.locator('#disponibilidade')).toBeAttached();
			await expect(page.locator('#disponibilidade h2')).toHaveText(
				isLaunchProductId(product.id) ? 'Teste gratuito disponível' : 'Produto em preparação'
			);
			expect(
				await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
				`${product.id}: the page fits ${width}px`
			).toBe(true);
			if (!capturedUniverses.has(product.universe)) {
				capturedUniverses.add(product.universe);
				await page.screenshot({
					path: testInfo.outputPath(`delivery-${product.universe}-${width}.png`),
					fullPage: true
				});
				for (const section of ['amostra', 'formatos']) {
					await page.locator(`#${section}`).screenshot({
						path: testInfo.outputPath(`delivery-${product.universe}-${width}-${section}.png`)
					});
				}
			}
		}
		expect(excerpts.size, 'Every offer keeps its own sample content').toBe(customerOffers.length);
		expect(capturedUniverses.size, 'The visual review covers all six universes').toBe(6);
	});
}
