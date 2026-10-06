import { expect, test } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { scanAccessibility } from './fixtures/accessibility';

// Pre-admission Gate B: real signed bodies rendered by the actual SSR component.
// This local surface is a candidate inspection, never a public route or admission.
for (const width of [1440, 390, 320]) {
	test(`twelve signed candidates: reading and accessibility at ${width}px`, async ({
		page
	}, testInfo) => {
		test.setTimeout(180_000);
		await page.setViewportSize({ width, height: 1000 });
		await page.goto('/metodo');
		const styles = readdirSync(resolve('.svelte-kit/cloudflare/_app/immutable/assets'))
			.filter((name) => name.endsWith('.css'))
			.map((name) => `<link rel="stylesheet" href="/_app/immutable/assets/${name}">`)
			.join('');
		for (let index = 1; index <= 12; index++) {
			const code = `P${String(index).padStart(2, '0')}`;
			const html = readFileSync(
				resolve('../../test-results/editorial-gate-b', `${code}.html`),
				'utf8'
			);
			await page.setContent(
				`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Inspeção local ${code}</title>${styles}</head><body><main id="conteudo" tabindex="-1">${html}</main></body></html>`
			);
			await page.evaluate(() => document.fonts.ready);
			await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
			await expect(page.getByRole('heading', { name: 'Fontes e referências' })).toBeVisible();
			await expect(page.getByRole('link', { name: 'Método e limites' })).toBeVisible();
			expect(
				await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
				code
			).toBeLessThanOrEqual(1);
			await scanAccessibility(page, testInfo);
			await page.screenshot({ path: testInfo.outputPath(`${code}-${width}.png`), fullPage: true });
		}
	});
}
