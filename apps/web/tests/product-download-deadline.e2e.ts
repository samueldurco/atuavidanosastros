import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { svgFixture } from './fixtures/product-export';

const run = svgFixture();
const endpoint = `/api/workflows/${run.id}/download`;
const message = 'O download foi interrompido. Tente novamente; seu registro permanece salvo.';

for (const [format, label, mime, extension] of [
	['web', 'Baixar relatório web', 'text/html', 'html'],
	['pdf', 'Baixar PDF', 'application/pdf', 'pdf'],
	['svg', 'Baixar cartografia SVG', 'image/svg+xml', 'svg'],
	['card', 'Baixar card SVG', 'image/svg+xml', 'svg']
]) {
	test(`${format} timeout restores keyboard retry and late headers never download`, async ({
		page
	}) => {
		let release!: () => void;
		const held = new Promise<void>((resolve) => {
			release = resolve;
		});
		let calls = 0;
		let downloads = 0;
		page.on('download', () => downloads++);
		await page.addInitScript((path) => {
			const original = window.fetch.bind(window);
			window.fetch = (input, init) =>
				original(
					input,
					typeof input === 'string' && input.startsWith(path)
						? { ...init, signal: undefined }
						: init
				);
		}, endpoint);
		await page.route(`**${endpoint}?**`, async (route) => {
			if (++calls === 1) await held;
			await route.fulfill({ contentType: mime, body: 'synthetic download' });
		});
		await page.goto('/biblioteca/_spec/downloads');
		const consent = page.getByRole('button', { name: 'Recusar analytics' });
		if (await consent.isVisible()) await consent.click();
		await page.clock.install();
		const button = page.getByRole('button', { name: label, exact: true });
		await button.focus();
		await page.keyboard.press('Enter');
		await expect.poll(() => calls).toBe(1);
		await page.clock.fastForward(30001);
		await expect(page.getByText(message, { exact: true })).toBeVisible();
		await expect(button).toBeEnabled();
		await expect(button).toBeFocused();
		expect(calls).toBe(1);
		expect(downloads).toBe(0);
		const late = page.waitForResponse((r) => r.url().includes(endpoint));
		release();
		await late;
		await page.clock.runFor(100);
		expect(downloads).toBe(0);
		const download = page.waitForEvent('download');
		await page.keyboard.press('Enter');
		const file = await download;
		expect(file.suggestedFilename()).toBe(
			`atv-${run.id}-r${run.revision}${format === 'card' ? '-card-1' : ''}.${extension}`
		);
		expect(await readFile((await file.path())!, 'utf8')).toBe('synthetic download');
		expect(calls).toBe(2);
		expect(downloads).toBe(1);
		await expect(page.getByText(message, { exact: true })).toHaveCount(0);
	});
}

test('stalled blob times out; leaving the reader prevents a late download', async ({ page }) => {
	let downloads = 0;
	page.on('download', () => downloads++);
	await page.addInitScript((path) => {
		const original = window.fetch.bind(window);
		window.fetch = async (input, init) => {
			if (typeof input !== 'string' || !input.startsWith(path)) return original(input, init);
			const value = new Response('fixture', { headers: { 'content-type': 'text/html' } });
			value.blob = () =>
				new Promise<Blob>((resolve) => {
					(window as unknown as { finishDownload: () => void }).finishDownload = () =>
						resolve(new Blob(['late']));
				});
			return value;
		};
	}, endpoint);
	await page.goto('/biblioteca/_spec/downloads');
	await page.clock.install();
	const button = page.getByRole('button', { name: 'Baixar relatório web', exact: true });
	await button.click();
	await expect
		.poll(() =>
			page.evaluate(() => typeof (window as unknown as { finishDownload: unknown }).finishDownload)
		)
		.toBe('function');
	await page.clock.fastForward(30001);
	await expect(page.getByText(message, { exact: true })).toBeVisible();
	await expect(button).toBeEnabled();
	await button.click();
	await page.getByRole('link', { name: 'Sair do teste local', exact: true }).click();
	await expect(page).not.toHaveURL(/_spec\/downloads/);
	// A same-document Svelte navigation must destroy the reader without resetting this callback.
	expect(
		await page.evaluate(
			() => typeof (window as unknown as { finishDownload?: () => void }).finishDownload
		)
	).toBe('function');
	await page.evaluate(() => (window as unknown as { finishDownload: () => void }).finishDownload());
	await page.clock.runFor(100);
	expect(downloads).toBe(0);
});

test('localhost fixture does not bypass API authorization', async ({ request }) => {
	const response = await request.get(`${endpoint}?format=web`);
	expect([401, 503]).toContain(response.status());
	expect(response.headers()['content-disposition']).toBeUndefined();
	expect(response.headers()['cache-control']).toContain('no-store');
});
