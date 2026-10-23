import { expect, type Locator, type Page } from '@playwright/test';

/** The shared chart is an SVG image. Inspect its source without requiring inline SVG DOM. */
export function chartImage(root: Page | Locator) {
	return root.locator('.astrological-chart > img.wheel');
}

export async function chartElementCount(image: Locator, selector: string) {
	return image.evaluate((element, query) => {
		const source = decodeURIComponent(
			(element as HTMLImageElement).src.split(',').slice(1).join(',')
		);
		return new DOMParser().parseFromString(source, 'image/svg+xml').querySelectorAll(query).length;
	}, selector);
}

export async function chartTitle(image: Locator) {
	return image.evaluate((element) => {
		const source = decodeURIComponent(
			(element as HTMLImageElement).src.split(',').slice(1).join(',')
		);
		return new DOMParser().parseFromString(source, 'image/svg+xml').querySelector('title')
			?.textContent;
	});
}

export async function chartGeometry(image: Locator) {
	return image.evaluate((element) => {
		const source = decodeURIComponent(
			(element as HTMLImageElement).src.split(',').slice(1).join(',')
		);
		return [
			...new DOMParser()
				.parseFromString(source, 'image/svg+xml')
				.querySelectorAll('[data-layer="positions"]')
		]
			.map((node) => node.outerHTML)
			.join('');
	});
}

export async function expectChartImage(image: Locator, positions: number) {
	await expect(image).toBeVisible();
	await expect(image).toHaveAttribute('alt', /mapa|roda/i);
	await expect
		.poll(() =>
			image.evaluate(async (element) => {
				const image = element as HTMLImageElement;
				try {
					await image.decode();
				} catch {
					return false;
				}
				return image.complete && image.naturalWidth > 0 && image.naturalHeight > 0;
			})
		)
		.toBe(true);
	await expect
		.poll(() => chartElementCount(image, 'svg[data-engine="AstroChartEngineV2/2.1.0"]'))
		.toBe(1);
	await expect.poll(() => chartElementCount(image, 'parsererror')).toBe(0);
	await expect.poll(() => chartElementCount(image, '[data-layer="positions"]')).toBe(positions);
	const bounds = await image.evaluate((element) => {
		const { left, right, width, height } = element.getBoundingClientRect();
		return { left, right, width, height, viewport: innerWidth };
	});
	expect(bounds.width).toBeGreaterThan(100);
	expect(bounds.height).toBeGreaterThan(100);
	expect(bounds.left).toBeGreaterThanOrEqual(-1);
	expect(bounds.right).toBeLessThanOrEqual(bounds.viewport + 1);
}

export async function openChartFactors(page: Page) {
	const summary = page.locator('.chart-panel .map-factors > summary');
	await summary.focus();
	await summary.press('Enter');
	await expect(page.locator('.chart-panel .map-factors')).toHaveAttribute('open', '');
}
