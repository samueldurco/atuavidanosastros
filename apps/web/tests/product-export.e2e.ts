import { expect, test } from '@playwright/test';
import { exportFixture } from './fixtures/product-export';
import { renderProductWebExport } from '../src/lib/server/product-export';

for (const width of [1440, 820, 390, 320]) {
	test(`offline web export preserves content and layout ${width}`, async ({ page }, testInfo) => {
		const fixture = exportFixture();
		fixture.editorial!.sections.push({
			title: 'Texto extenso e caracteres preservados',
			text: 'Árvore, propósito, relações, céu e sonho 🌙. '.repeat(70) + '\n' + 'x'.repeat(400),
			evidence: ['card-0']
		});
		const requests: string[] = [];
		page.on('request', (request) => requests.push(request.url()));
		await page.setViewportSize({ width, height: 1000 });
		await page.setContent(renderProductWebExport(fixture)!.html);
		await expect(page.getByRole('main')).toHaveCount(1);
		await expect(page.getByRole('heading', { level: 1 })).toHaveText(fixture.editorial!.title);
		const content = await page.locator('p.text').allTextContents();
		expect(content).toContain(fixture.editorial!.sections[0].text);
		expect(content).toContain(fixture.editorial!.sections[1].text);
		expect(
			await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
		).toBeLessThanOrEqual(1);
		await page.screenshot({ path: testInfo.outputPath(`export-${width}.png`), fullPage: true });
		await page.getByRole('link', { name: 'Histórico desta versão' }).click();
		await expect(page.getByRole('heading', { name: 'Histórico desta versão' })).toBeInViewport();
		await page.emulateMedia({ media: 'print' });
		await expect(page.getByRole('navigation')).toBeHidden();
		await expect(page.getByRole('heading', { name: 'Base e limites' })).toBeVisible();
		expect(requests).toEqual([]);
	});
}
test('hostile strings remain inert in downloaded HTML and denied API returns no artifact', async ({
	page,
	request
}) => {
	const fixture = exportFixture();
	fixture.editorial!.sections[0].text =
		'</p><script>document.title="EXECUTED"</script><img src="https://untrusted.example/secret">';
	const requests: string[] = [];
	page.on('request', (outgoing) => requests.push(outgoing.url()));
	await page.setContent(renderProductWebExport(fixture)!.html);
	await expect(page.locator('script, img, iframe, form, object, embed')).toHaveCount(0);
	await expect(page.locator('p.text').first()).toHaveText(fixture.editorial!.sections[0].text);
	expect(requests).toEqual([]);
	const response = await request.get(`/api/workflows/${fixture.id}/download?format=web`);
	expect([401, 503]).toContain(response.status());
	expect(response.headers()['content-disposition']).toBeUndefined();
	expect(response.headers()['cache-control']).toContain('no-store');
});
