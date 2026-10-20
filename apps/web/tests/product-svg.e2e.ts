import { test, expect } from '@playwright/test';
import { svgFixture } from './fixtures/product-export';

for (const variant of ['birth-chart', 'cluster', 'polar', 'ascendant']) {
	test(`offline cartography ${variant}: exact geometry, embedded fonts and legible bounds`, async ({
		page
	}, testInfo) => {
		await page.setViewportSize({ width: 1000, height: 1500 });
		const requests: string[] = [];
		page.on('request', (r) => requests.push(r.url()));
		const response = await page.goto(`/biblioteca/_spec/cartografia?variant=${variant}`);
		expect(response?.status()).toBe(200);
		await page.evaluate(() => document.fonts.ready);
		expect(await page.evaluate(() => [...document.fonts].every((f) => f.status === 'loaded'))).toBe(
			true
		);
		await expect(page.locator('script, image, use, foreignObject, a, parsererror')).toHaveCount(0);
		const inheritedFills = await page
			.locator('path:not([fill])')
			.evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).fill));
		expect(inheritedFills.length).toBeGreaterThan(0);
		expect([...new Set(inheritedFills)]).toEqual(['none']);
		// The inherited default must not suppress explicitly painted labels or backgrounds.
		await expect(page.locator('text[data-layer="angles"]').first()).toHaveCSS(
			'fill',
			'rgb(255, 248, 233)'
		);
		const fixture = svgFixture(variant),
			geo = fixture.cartography!;
		const metadata = JSON.parse((await page.locator('metadata').textContent())!);
		expect(metadata.geometry).toEqual(geo);
		expect(metadata.reviewDigest).toBe(fixture.editorial!.reviewDigest);
		await expect(page.locator('[data-layer="positions"]')).toHaveCount(geo.positions.length);
		await expect(page.locator('[data-layer="aspects"]')).toHaveCount(0);
		for (const p of geo.positions) {
			const circle = page.locator(`circle[data-body="${p.body}"]`);
			await expect(circle).toHaveAttribute('data-longitude', String(p.longitude));
			const radians = (p.longitude * Math.PI) / 180;
			// True-position anchors keep the zodiac orientation even when labels move.
			// Drawing coordinates are rounded to 0.001 px; fact metadata stays exact.
			expect(Number(await circle.getAttribute('cx'))).toBeCloseTo(450 - 280 * Math.cos(radians), 3);
			expect(Number(await circle.getAttribute('cy'))).toBeCloseTo(450 + 280 * Math.sin(radians), 3);
		}
		await expect(page.locator('[data-house]')).toHaveCount(geo.houses.cusps.length);
		for (const [i, cusp] of geo.houses.cusps.entries()) {
			await expect(page.locator(`[data-house="${i + 1}"]`)).toHaveAttribute(
				'data-longitude',
				String(cusp)
			);
		}
		const out = await page.locator('text').evaluateAll((nodes) => {
			const bounds = document.querySelector('svg')!.viewBox.baseVal;
			return nodes
				.filter((node) => {
					const box = (node as SVGGraphicsElement).getBBox();
					return (
						box.x < bounds.x ||
						box.y < bounds.y ||
						box.x + box.width > bounds.x + bounds.width ||
						box.y + box.height > bounds.y + bounds.height
					);
				})
				.map((n) => n.textContent);
		});
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
		const consent = page.getByRole('button', { name: 'Recusar opcionais' });
		if (await consent.isVisible()) await consent.click();
		await page.evaluate(() => document.fonts.ready);
		await expect(page.getByRole('button', { name: 'Baixar mapa em SVG' })).toBeDisabled();
		expect(
			await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
		).toBeLessThanOrEqual(1);
		await page.screenshot({
			path: testInfo.outputPath(`workflow-svg-${width}.png`),
			fullPage: true
		});
		await page.goto('/biblioteca/_spec/fluxo?state=revoked&format=svg');
		await expect(page.getByRole('button', { name: 'Baixar mapa em SVG' })).toHaveCount(0);
	});
}
