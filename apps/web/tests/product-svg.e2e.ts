import { test, expect } from '@playwright/test';
import { svgFixture } from './fixtures/product-export';

for (const variant of ['birth-chart', 'cluster', 'polar', 'ascendant']) {
	test(`offline cartography ${variant}: exact geometry, embedded fonts and legible bounds`, async ({
		page
	}, testInfo) => {
		await page.setViewportSize({ width: 1000, height: 1360 });
		const requests: string[] = [];
		page.on('request', (r) => requests.push(r.url()));
		const response = await page.goto(`/biblioteca/_spec/cartografia?variant=${variant}`);
		expect(response?.status()).toBe(200);
		await page.evaluate(() => document.fonts.ready);
		expect(await page.evaluate(() => [...document.fonts].every((f) => f.status === 'loaded'))).toBe(
			true
		);
		await expect(page.locator('script, image, use, foreignObject, a, parsererror')).toHaveCount(0);
		const geo = svgFixture(variant).cartography!;
		for (const [i, p] of geo.positions.entries()) {
			const circle = page.locator(`[data-body="${p.body}"] circle`);
			const radians = (p.longitude * Math.PI) / 180,
				radius = 270 - i * 19;
			expect(Number(await circle.getAttribute('cx'))).toBeCloseTo(
				500 - radius * Math.cos(radians),
				10
			);
			expect(Number(await circle.getAttribute('cy'))).toBeCloseTo(
				430 + radius * Math.sin(radians),
				10
			);
		}
		await expect(page.locator('[data-house]')).toHaveCount(geo.houses.cusps.length);
		const out = await page.locator('text').evaluateAll((nodes) =>
			nodes
				.filter((node) => {
					const box = (node as SVGGraphicsElement).getBBox();
					return box.x < 0 || box.y < 0 || box.x + box.width > 1000 || box.y + box.height > 1360;
				})
				.map((n) => n.textContent)
		);
		expect(out).toEqual([]);
		expect(requests.filter((r) => !r.startsWith('data:'))).toEqual([response!.url()]);
		await page.screenshot({
			path: testInfo.outputPath(`cartography-${variant}.png`),
			fullPage: false
		});
	});
}
for (const width of [1440, 820, 390, 320]) {
	test(`SVG action is eligible, synthetic and responsive ${width}`, async ({ page }, testInfo) => {
		await page.setViewportSize({ width, height: 1000 });
		await page.goto('/biblioteca/_spec/fluxo?state=ready&format=svg');
		const consent = page.getByRole('button', { name: 'Recusar analytics' });
		if (await consent.isVisible()) await consent.click();
		await page.evaluate(() => document.fonts.ready);
		await expect(page.getByRole('button', { name: 'Baixar cartografia SVG' })).toBeDisabled();
		expect(
			await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
		).toBeLessThanOrEqual(1);
		await page.screenshot({
			path: testInfo.outputPath(`workflow-svg-${width}.png`),
			fullPage: true
		});
		await page.goto('/biblioteca/_spec/fluxo?state=revoked&format=svg');
		await expect(page.getByRole('button', { name: 'Baixar cartografia SVG' })).toHaveCount(0);
	});
}
