import { expect, test } from '@playwright/test';
import { isLaunchProductId } from '@atv/domain';
import { customerOffers } from '../src/lib/data/product-copy';

test('every illustrated cover keeps its matching public sample and offer state', async ({
	page
}) => {
	await page.goto('/leituras');
	await page.getByRole('button', { name: 'Recusar opcionais', exact: true }).click();
	await expect(page.locator('#catalogo [data-product-artwork]')).toHaveCount(customerOffers.length);
	for (const product of customerOffers) {
		const card = page
			.locator('.public-product-card')
			.filter({ has: page.locator(`[data-product-artwork="${product.id}"]`) });
		await expect(card.locator('.folio-engraving svg.pa-canvas')).toHaveCount(1);
		await expect(card.getByRole('link', { name: 'Ver uma amostra' })).toHaveAttribute(
			'href',
			`${product.href}#amostra`
		);
		await expect(card.locator('.badge')).toHaveText(
			isLaunchProductId(product.id) ? 'Teste gratuito disponível' : 'Em preparação'
		);
	}
	await page
		.locator('.public-product-card')
		.first()
		.getByRole('link', { name: 'Ver uma amostra' })
		.click();
	await expect(page).toHaveURL(/#amostra$/);
	await expect(page.locator('#amostra')).toBeInViewport();
});

for (const width of [320, 768, 1440]) {
	test(`catalog search, filters and ordering work at ${width}px`, async ({ page }, testInfo) => {
		await page.setViewportSize({ width, height: 1000 });
		await page.goto('/leituras');
		await page.getByRole('button', { name: 'Recusar opcionais', exact: true }).click();
		const cards = page.locator('.public-product-card');
		await expect(cards).toHaveCount(customerOffers.length);
		await page.evaluate(() => document.fonts.ready);
		expect(
			await cards.locator('[data-product-artwork]').evaluateAll((covers) =>
				covers.flatMap((cover) => {
					const outer = cover.getBoundingClientRect();
					const folio = cover.querySelector('.folio')!.getBoundingClientRect();
					return folio.top < outer.top || folio.bottom > outer.bottom
						? [cover.getAttribute('data-product-artwork')]
						: [];
				})
			)
		).toEqual([]);
		await page.getByRole('searchbox', { name: 'Buscar leituras' }).fill('ascendente');
		await expect(cards).toHaveCount(
			customerOffers.filter((product) =>
				`${product.name} ${product.summary}`.toLocaleLowerCase('pt-BR').includes('ascendente')
			).length
		);
		await page.reload();
		await expect(page.getByRole('searchbox')).toHaveValue('ascendente');
		await page.getByRole('searchbox').fill('zzznada');
		await expect(cards).toHaveCount(0);
		await expect(page.getByRole('heading', { name: 'Nenhuma leitura encontrada.' })).toBeVisible();
		await page.getByRole('searchbox').fill('');
		if (width <= 800) await page.getByRole('button', { name: 'Filtros' }).click();
		await page.getByRole('radio', { name: 'Com teste gratuito', exact: true }).check();
		const trials = customerOffers.filter((product) => isLaunchProductId(product.id));
		await expect(cards).toHaveCount(trials.length);
		if (width <= 800) {
			await page
				.getByRole('button', { name: `Ver ${trials.length} leituras`, exact: true })
				.click();
			await expect(page.getByRole('button', { name: 'Filtros' })).toHaveAttribute(
				'aria-expanded',
				'false'
			);
		}
		await page.getByRole('combobox', { name: 'Ordenar leituras' }).selectOption('az');
		await expect(cards.locator('h3')).toHaveText(
			trials.map((product) => product.name).sort((a, b) => a.localeCompare(b, 'pt-BR'))
		);
		await page.reload();
		await expect(cards).toHaveCount(trials.length);
		await expect(page.getByRole('combobox')).toHaveValue('az');
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
			true
		);
		await page.screenshot({ path: testInfo.outputPath(`catalog-${width}.png`), fullPage: true });
	});
}

for (const width of [390, 1440]) {
	test(`all 30 product samples are readable and fit at ${width}px`, async ({ page }, testInfo) => {
		test.setTimeout(180_000);
		await page.setViewportSize({ width, height: 1000 });
		for (const product of customerOffers) {
			const response = await page.goto(`${product.href}#amostra`);
			expect(response?.status(), product.id).toBe(200);
			const consent = page.getByRole('button', { name: 'Recusar opcionais', exact: true });
			if (await consent.isVisible()) await consent.click();
			const sample = page.locator(`#amostra [data-reading-sample="${product.id}"]`);
			await expect(sample).toBeVisible();
			await expect(page.getByRole('heading', { level: 1 })).toHaveText(product.name);
			await expect(sample.locator('.sample-note')).toContainText(/fictíci/);
			await expect(page.locator('#disponibilidade')).toBeAttached();
			await expect(page.locator('#disponibilidade h2')).toHaveText(
				isLaunchProductId(product.id) ? 'Teste gratuito disponível' : 'Produto em preparação'
			);
			expect(
				await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
				product.id
			).toBe(true);
			await sample.scrollIntoViewIfNeeded();
			await sample.locator('img').evaluateAll((images) =>
				Promise.all(
					images.map(async (image) => {
						const img = image as HTMLImageElement;
						if (!img.complete)
							await new Promise<void>((resolve) => {
								img.onload = () => resolve();
								img.onerror = () => resolve();
							});
						if (img.naturalWidth === 0)
							throw new Error(`Broken sample image: ${img.getAttribute('src')}`);
					})
				)
			);
			await sample.screenshot({ path: testInfo.outputPath(`${product.id}-${width}.png`) });
		}
	});
}
