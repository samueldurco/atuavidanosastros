import { test, expect } from '@playwright/test';
import { cardFixture } from './fixtures/product-export';

for (const variant of ['standard', 'long', 'delta']) {
	test(`private section card ${variant}: complete, inert, bounded and self-contained`, async ({
		page
	}, testInfo) => {
		await page.setViewportSize({ width: 1080, height: 1350 });
		const requests: string[] = [];
		page.on('request', (r) => requests.push(r.url()));
		const response = await page.goto(`/biblioteca/_spec/card?variant=${variant}`);
		expect(response?.status()).toBe(200);
		await page.evaluate(() => document.fonts.ready);
		expect(
			await page.evaluate(
				() =>
					[...document.fonts].length === 3 &&
					[...document.fonts].every((f) => f.status === 'loaded')
			)
		).toBe(true);
		await expect(page.locator('script, image, use, foreignObject, a, parsererror')).toHaveCount(0);
		const height = Number(await page.locator('svg').getAttribute('height'));
		expect(height).toBeLessThanOrEqual(8192);
		const boxes = await page.locator('text').evaluateAll((nodes) =>
			nodes.map((n) => {
				const b = (n as SVGGraphicsElement).getBBox();
				return { x: b.x, y: b.y, w: b.width, h: b.height, text: n.textContent };
			})
		);
		expect(
			boxes.filter((b) => b.x < 75 || b.y < 0 || b.x + b.w > 1005 || b.y + b.h > height)
		).toEqual([]);
		for (let i = 1; i < boxes.length; i++)
			expect(boxes[i].y).toBeGreaterThanOrEqual(boxes[i - 1].y + boxes[i - 1].h - 1);
		const text = boxes
			.map((b) => b.text)
			.join('')
			.replace(/\s/g, '');
		const run = cardFixture(variant);
		for (const original of [
			run.editorial!.sections[0].text,
			run.calculation!.facts[0].display,
			...run.editorial!.limits,
			...run.calculation!.limits
		])
			expect(text).toContain(original.replace(/\s/g, ''));
		expect(text).not.toContain('Outraperspectiva');
		expect(requests.filter((r) => !r.startsWith('data:'))).toEqual([response!.url()]);
		await page.setViewportSize({ width: 1080, height });
		await page.screenshot({ path: testInfo.outputPath(`card-${variant}.png`), fullPage: false });
	});
}
for (const width of [1440, 820, 390, 320]) {
	test(`card section control, synthetic safety and revoked state ${width}`, async ({
		page
	}, testInfo) => {
		await page.setViewportSize({ width, height: 1000 });
		await page.goto('/biblioteca/_spec/fluxo?state=ready&format=card');
		const consent = page.getByRole('button', { name: 'Recusar analytics' });
		if (await consent.isVisible()) await consent.click();
		await page.evaluate(() => document.fonts.ready);
		await expect(page.getByRole('button', { name: 'Baixar card SVG' })).toBeDisabled();
		const choice = page.getByLabel('Seção do card');
		await expect(choice).toHaveValue('0');
		await choice.selectOption('1');
		await expect(choice).toHaveValue('1');
		expect(
			await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
		).toBeLessThanOrEqual(1);
		await page.screenshot({
			path: testInfo.outputPath(`workflow-card-${width}.png`),
			fullPage: true
		});
		await page.goto('/biblioteca/_spec/fluxo?state=revoked&format=card');
		await expect(page.getByRole('button', { name: 'Baixar card SVG' })).toHaveCount(0);
		await expect(page.getByLabel('Seção do card')).toHaveCount(0);
	});
}
