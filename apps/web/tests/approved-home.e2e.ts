import { expect, test } from '@playwright/test';
import { freeTools } from '../src/lib/data/free-tools';

test.beforeEach(async ({ page }) => {
	await page.addInitScript(() => localStorage.setItem('atv-analytics-consent', 'denied'));
	await page.emulateMedia({ reducedMotion: 'reduce' });
});

for (const width of [390, 768, 1440]) {
	test(`nove ferramentas: painel abaixo da linha, foco e estado em ${width}px`, async ({
		page
	}, testInfo) => {
		test.setTimeout(120_000);
		await page.setViewportSize({ width, height: 1000 });
		await page.goto('/');
		await expect(page.locator('.nav-trigger').first()).toBeEnabled();
		const grid = page.locator('#ferramentas .tool-grid.wrap');
		const cards = grid.locator('.tool-card[data-tool]');
		await expect(cards).toHaveCount(9);
		for (const tool of freeTools) {
			const button = page.locator(`#open-${tool.id}`);
			await button.click();
			const panel = page.locator('[data-tool-panel]:not([hidden])');
			await expect(panel).toHaveCount(1);
			await expect(panel).toHaveAttribute('data-tool-panel', tool.id);
			await expect(panel).toBeFocused();
			const geometry = await grid.evaluate((root, id) => {
				const selected = root.querySelector<HTMLElement>(`.tool-card[data-tool="${id}"]`)!;
				const selection = selected.getBoundingClientRect();
				const row = [...root.querySelectorAll<HTMLElement>('.tool-card')]
					.map((element) => element.getBoundingClientRect())
					.filter((box) => Math.abs(box.top - selection.top) < 2);
				const open = root
					.querySelector<HTMLElement>('[data-tool-panel]:not([hidden])')!
					.getBoundingClientRect();
				const container = root.getBoundingClientRect();
				return {
					left: open.left - container.left,
					width: open.width - container.width,
					below: open.top - Math.max(...row.map((box) => box.bottom)),
					overflow: document.documentElement.scrollWidth - innerWidth
				};
			}, tool.id);
			expect(Math.abs(geometry.left)).toBeLessThanOrEqual(1);
			expect(Math.abs(geometry.width)).toBeLessThanOrEqual(2);
			expect(geometry.below).toBeGreaterThanOrEqual(0);
			expect(geometry.overflow).toBeLessThanOrEqual(1);
			await panel.locator('.tool-close').click();
			await expect(button).toBeFocused();
			await expect(page.locator('[data-tool-panel]:not([hidden])')).toHaveCount(0);
		}
		await page.locator('#open-ascendente').click();
		await page
			.locator('[data-tool-panel="ascendente"]')
			.getByLabel('Data de nascimento')
			.fill('2000-01-01');
		await page.locator('#open-carta-do-dia').click();
		await page.locator('#open-ascendente').click();
		await expect(
			page.locator('[data-tool-panel="ascendente"]').getByLabel('Data de nascimento')
		).toHaveValue('2000-01-01');
		// Same-home client navigation must react to the URL without losing the mounted draft.
		for (const tool of ['carta-do-amor', 'ascendente']) {
			if (width <= 960) await page.locator('.mobile-menu').click();
			await page.locator('[aria-controls="nav-ferramentas"]').click();
			await page.locator(`#nav-ferramentas a[href="/?ferramenta=${tool}#ferramentas"]`).click();
			await expect(page).toHaveURL(new RegExp(`ferramenta=${tool}#ferramentas$`));
			await expect(page.locator('[data-tool-panel]:not([hidden])')).toHaveAttribute(
				'data-tool-panel',
				tool
			);
			await expect(page.locator(`[data-tool-panel="${tool}"]`)).toBeFocused();
		}
		await expect(
			page.locator('[data-tool-panel="ascendente"]').getByLabel('Data de nascimento')
		).toHaveValue('2000-01-01');
		await page.locator('[data-tool-panel="ascendente"] .tool-close').click();
		await page.evaluate(() => scrollTo(0, 0));
		await page.screenshot({
			path: testInfo.outputPath(`integrated-home-${width}.png`),
			fullPage: true
		});
	});

	test(`vitrine: controles estáveis e slides acessíveis em ${width}px`, async ({
		page
	}, testInfo) => {
		await page.setViewportSize({ width, height: 1000 });
		await page.goto('/');
		await expect(page.locator('.nav-trigger').first()).toBeEnabled();
		await page.evaluate(() => document.fonts.ready);
		const banners = page.locator('[data-carousel]');
		await expect(banners).toHaveCount(3);
		for (const banner of await banners.all()) {
			await banner.scrollIntoViewIfNeeded();
			await expect(banner).toHaveAttribute('data-playback', 'paused');
			await expect(banner.getByRole('button', { name: /^Reproduzir/ })).toBeDisabled();
			const boxes: { height: number; controls: number }[] = [];
			for (let i = 0; i < 3; i++) {
				await expect(banner.locator('.showcase-slide[data-active="true"]')).toHaveCount(1);
				await expect(banner.locator('.showcase-slide[inert][aria-hidden="true"]')).toHaveCount(2);
				await expect(banner.locator('.banner-position')).toHaveText(`0${i + 1} / 03`);
				boxes.push(
					await banner.evaluate((element) => ({
						height: element.getBoundingClientRect().height,
						controls:
							element.querySelector('.banner-controls')!.getBoundingClientRect().top -
							element.getBoundingClientRect().top
					}))
				);
				await banner.getByRole('button', { name: /^Próximo destaque/ }).click();
			}
			expect(
				Math.max(...boxes.map((box) => box.height)) - Math.min(...boxes.map((box) => box.height))
			).toBeLessThanOrEqual(1);
			expect(
				Math.max(...boxes.map((box) => box.controls)) -
					Math.min(...boxes.map((box) => box.controls))
			).toBeLessThanOrEqual(1);
			await expect(banner.locator('.banner-position')).toHaveText('01 / 03');
		}
		expect(
			await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
		).toBeLessThanOrEqual(1);
		await page
			.locator('#produtos')
			.screenshot({ path: testInfo.outputPath(`integrated-showcase-${width}.png`) });
	});
}

test('eventos de descoberta respeitam consentimento e usam somente identificadores públicos', async ({
	page
}) => {
	await page.goto('/');
	await expect(page.locator('.nav-trigger').first()).toBeEnabled();
	await page.locator('.hero-paths a[href="#ferramentas"]').click();
	await expect
		.poll(() => page.evaluate(() => (window as Window & { dataLayer?: unknown[] }).dataLayer ?? []))
		.toEqual([]);
	await page.evaluate(() => localStorage.setItem('atv-analytics-consent', 'granted'));
	await page.locator('.hero-paths a[href="#produtos"]').click();
	await page.locator('#open-ascendente').click();
	const events = await page.evaluate(
		() => (window as Window & { dataLayer?: Record<string, unknown>[] }).dataLayer ?? []
	);
	expect(events).toContainEqual({
		event: 'atv_home_path_select',
		context: 'hero',
		cta: 'products'
	});
	expect(events).toContainEqual(
		expect.objectContaining({ event: 'atv_tool_select', tool_id: 'ascendente' })
	);
	for (const event of events)
		expect(
			Object.keys(event).every((key) =>
				[
					'event',
					'tool_id',
					'product_id',
					'universe_id',
					'context',
					'cta',
					'item_id',
					'position',
					'state',
					'error_code'
				].includes(key)
			)
		).toBe(true);
	await page.evaluate(() => localStorage.setItem('atv-analytics-consent', 'denied'));
	await page.locator('#open-carta-do-dia').click();
	expect(
		await page.evaluate(() => (window as Window & { dataLayer?: unknown[] }).dataLayer?.length)
	).toBe(events.length);
});
