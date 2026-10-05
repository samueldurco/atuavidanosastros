import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, type TestInfo } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

export async function scanAccessibility(page: Page, testInfo: TestInfo) {
	await page.evaluate(() => document.fonts.ready);
	const result = await new AxeBuilder({ page })
		.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
		.analyze();
	const path = testInfo.outputPath('axe-results.json');
	await writeFile(path, JSON.stringify(result, null, 2));
	await testInfo.attach('axe-results', { path, contentType: 'application/json' });
	expect(result.violations).toEqual([]);
}
