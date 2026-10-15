import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const base = process.env.ATV_QA_BASE_URL ?? 'http://127.0.0.1:4181';
const out = '../../test-results/atv-plus';
await mkdir(out, { recursive: true });
const browser = await chromium.launch();
const report = [];
try {
	for (const width of [390, 768, 1440]) {
		const context = await browser.newContext({
			viewport: { width, height: 900 },
			reducedMotion: 'reduce'
		});
		const page = await context.newPage();
		const errors = [];
		page.on('pageerror', (error) => errors.push(error.message));
		const response = await page.goto(`${base}/atv-mais`, { waitUntil: 'networkidle' });
		assert.equal(response.status(), 200);
		const cookies = page.getByRole('button', { name: 'Recusar opcionais' });
		if (await cookies.isVisible()) await cookies.click();
		for (const plan of ['ATV+ Essencial', 'ATV+ Ampliado', 'ATV+ Premium']) {
			assert.equal(await page.getByRole('heading', { name: plan, exact: true }).count(), 1);
		}
		assert.equal(await page.getByRole('button', { name: 'Testar este plano' }).count(), 0);
		assert.equal(await page.getByText('Assinaturas em preparação', { exact: true }).count(), 3);
		assert.equal(await page.locator('form[action="?/start"]').count(), 0);
		await page.getByText('Quais leituras ficam fora dos planos?', { exact: true }).click();
		assert.equal(await page.locator('.separate details').getAttribute('open'), '');
		const geometry = await page.evaluate(() => ({
			viewport: innerWidth,
			document: document.documentElement.scrollWidth
		}));
		assert.ok(geometry.document <= geometry.viewport + 1, 'Horizontal overflow');
		const axe = await new AxeBuilder({ page })
			.withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
			.analyze();
		assert.deepEqual(
			axe.violations.map((v) => ({ id: v.id, impact: v.impact })),
			[]
		);
		assert.deepEqual(errors, []);
		await page.screenshot({ path: `${out}/public-${width}.png`, fullPage: true });
		const redirected = await page.request.get(`${base}/atv-plus?origin=qa`, { maxRedirects: 0 });
		assert.equal(redirected.status(), 308);
		assert.equal(redirected.headers().location, '/atv-mais?origin=qa');
		const denied = await page.request.post(`${base}/atv-mais?/start`, {
			headers: { origin: base, accept: 'application/json' },
			form: { planId: 'premium', requestKey: 'c7330767-e171-4f1d-a03f-ce11515aa02c' }
		});
		assert.ok(
			[401, 503].includes(denied.status()),
			`Anonymous simulation status ${denied.status()}`
		);
		report.push({
			width,
			status: response.status(),
			...geometry,
			errors,
			axeViolations: axe.violations.length,
			alias: redirected.status(),
			anonymousStart: denied.status()
		});
		await context.close();
	}
} finally {
	await browser.close();
}
await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
