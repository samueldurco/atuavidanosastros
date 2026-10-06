import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { interestNavigation } from '../src/lib/data/public-navigation';

for (const width of [320, 390, 820, 1440]) {
	test(`menu por interesse: destinos, teclado e reflow em ${width}px`, async ({
		page,
		request
	}, testInfo) => {
		await page.setViewportSize({ width, height: 844 });
		await page.goto('/');
		const consent = page.getByRole('button', { name: 'Recusar opcionais' });
		if (await consent.isVisible()) await consent.click();
		const button = page.getByRole('button', { name: 'Menu', exact: true });
		await button.focus();
		await page.keyboard.press('Enter');
		const nav = page.getByRole('navigation', { name: 'Navegação principal' });
		await expect(nav.getByRole('link', { name: 'Início', exact: true })).toHaveAttribute(
			'href',
			'/'
		);
		await expect(nav.locator('details')).toHaveCount(6);
		for (const item of interestNavigation) {
			const topic = nav
				.locator('details')
				.filter({ has: page.locator('summary', { hasText: item.label }) });
			await topic.locator('summary').focus();
			await page.keyboard.press('Enter');
			await expect(topic).toHaveAttribute('open', '');
			await expect(nav.locator('details[open]')).toHaveCount(1);
			await expect(topic.getByRole('link')).toHaveCount(2);
			await expect(topic.getByRole('link', { name: new RegExp(item.action) })).toHaveAttribute(
				'href',
				item.href
			);
			await expect(topic).toContainText(item.available ? 'Grátis' : 'Em preparação');
			const articles = `/caderno?tema=${item.id}`;
			await expect(topic.getByRole('link', { name: new RegExp(item.editorial) })).toHaveAttribute(
				'href',
				articles
			);
			for (const href of [item.href, articles])
				expect((await request.get(href)).status(), href).toBe(200);
		}
		await expect(nav.getByRole('link', { name: 'Loja dos Signos' })).toHaveAttribute(
			'href',
			'/loja'
		);
		await expect(nav.getByRole('link', { name: 'Minha conta' })).toHaveAttribute('href', '/entrar');
		await expect(
			nav.locator('a[href*="dossie"], a[href*="jornada"], a[href*="atv-plus"], a[href*="atlas"]')
		).toHaveCount(0);
		const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
		expect(overflow).toBeLessThanOrEqual(1);
		await page.screenshot({ path: testInfo.outputPath(`menu-${width}.png`) });
		const accessibility = await new AxeBuilder({ page })
			.include('header.site-header')
			.withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
			.analyze();
		expect(accessibility.violations).toEqual([]);
		await page.keyboard.press('Escape');
		await expect(button).toBeFocused();
		await expect(button).toHaveAttribute('aria-expanded', 'false');
		await button.click();
		await expect(nav.locator('details[open]')).toHaveCount(0);
		await nav.getByRole('link', { name: 'Todos os artigos' }).click();
		await expect(page).toHaveURL(/\/caderno$/);
		await expect(nav).not.toBeVisible();
	});
}

test('artigos filtram o assunto e mantêm o catálogo comercial fora da navegação editorial', async ({
	page
}) => {
	for (const item of interestNavigation) {
		await page.goto(`/caderno?tema=${item.id}`);
		await expect(page.getByRole('heading', { level: 1 })).toHaveText(
			`Artigos e guias: ${item.label}`
		);
		await expect(page.locator('main section.topic')).toHaveCount(1);
		await expect(page.locator('main a[href^="/produtos/"]')).toHaveCount(0);
	}
	await page.goto('/caderno?tema=desconhecido');
	await expect(page.locator('main section.topic')).toHaveCount(6);
	await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
		'href',
		'https://atuavidanosastros.com.br/caderno'
	);
});
