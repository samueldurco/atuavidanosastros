import { expect, type Page } from '@playwright/test';
export async function selectCity(page: Page, selector: string, query: string, label: string) {
	await page.locator(selector).fill(query);
	await page.getByRole('option', { name: label, exact: true }).getByRole('button').click();
	await expect(page.locator(selector)).toHaveValue(label);
}
