import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { interestNavigation, primaryNavigation } from '../src/lib/data/public-navigation';
import { editorialTopicPaths } from '../src/lib/data/editorial-topics';

test.beforeEach(async ({ page }) => {
	await page.addInitScript(() => localStorage.setItem('atv-analytics-consent', 'denied'));
});

for (const width of [320, 390, 820, 1440]) {
	test(`menu por intenção: destinos, teclado e reflow em ${width}px`, async ({
		page,
		request
	}, testInfo) => {
		await page.setViewportSize({ width, height: 844 });
		await page.goto('/');
		const button = page.getByRole('button', { name: 'Menu', exact: true });
		await expect(button).toBeEnabled();
		await button.focus();
		await page.keyboard.press('Enter');
		const nav = page.getByRole('navigation', { name: 'Navegação principal' });
		await expect(nav.getByRole('link', { name: 'Início', exact: true })).toHaveAttribute(
			'href',
			'/'
		);
		for (const item of primaryNavigation)
			await expect(nav.locator(`a[href="${item.href}"]`)).toContainText(item.label);
		await expect(nav.locator('.topic-link')).toHaveCount(6);
		for (const item of interestNavigation) {
			await expect(nav.locator(`.topic-link[href="${item.href}"]`)).toContainText(item.label);
			for (const href of [item.href, `/revista?tema=${item.id}`])
				expect((await request.get(href)).status(), href).toBe(200);
		}
		await expect(nav.getByRole('link', { name: 'Loja dos Signos' })).toHaveAttribute(
			'href',
			'/loja'
		);
		await expect(page.locator('.header-account')).toHaveText('Entrar');
		await expect(page.locator('.header-account')).toHaveAttribute('href', '/entrar');
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
		await nav.locator('a[href="/revista"]').click();
		await expect(page).toHaveURL(/\/revista$/);
		await expect(nav).not.toBeVisible();
	});
}

test('artigos filtram o assunto e mantêm o catálogo comercial fora da navegação editorial', async ({
	page
}) => {
	for (const item of interestNavigation) {
		await page.goto(`/revista?tema=${item.id}`);
		await expect(page.getByRole('heading', { level: 1 })).toHaveText('Revista ATVNA');
		await expect(
			page.getByRole('heading', { level: 2, name: item.label, exact: true })
		).toBeVisible();
		await expect(page.locator('main article.featured, main article.article-card')).toHaveCount(
			editorialTopicPaths[item.id].length
		);
		const next = page.getByRole('complementary', { name: 'Explore esse assunto no seu ritmo.' });
		await expect(next.getByRole('link', { name: item.action })).toHaveAttribute(
			'href',
			item.toolHref
		);
		await expect(
			next.getByRole('link', { name: 'Conhecer as leituras deste universo' })
		).toHaveAttribute('href', item.href);
		await expect(page.locator('main a[href^="/produtos/"]')).toHaveCount(0);
	}
	await page.goto('/revista?tema=desconhecido');
	await expect(
		page.getByRole('heading', { level: 2, name: 'Para ler agora', exact: true })
	).toBeVisible();
	await expect(page.locator('main article.featured, main article.article-card')).toHaveCount(12);
	await expect(
		page
			.getByRole('navigation', { name: 'Assuntos da Revista' })
			.getByRole('link', { name: 'Todos os assuntos', exact: true })
	).toHaveAttribute('aria-current', 'page');
	await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
		'href',
		'https://atuavidanosastros.com.br/revista'
	);
});

test('URLs antigas redirecionam permanentemente sem perder filtros', async ({ request }) => {
	const response = await request.get('/caderno?tema=amor&utm_source=legacy', { maxRedirects: 0 });
	expect(response.status()).toBe(301);
	expect(response.headers().location).toBe('/revista?tema=amor&utm_source=legacy');
	for (const [oldPath, newPath] of [
		['/meu-ceu', '/temas/mapa-astral'],
		['/ciclos', '/temas/previsoes'],
		['/amor', '/temas/amor'],
		['/proposito', '/temas/carreira'],
		['/tarot', '/temas/tarot'],
		['/sonhos', '/temas/sonhos']
	]) {
		const redirect = await request.get(oldPath, { maxRedirects: 0 });
		expect(redirect.status(), oldPath).toBe(301);
		expect(redirect.headers().location, oldPath).toBe(newPath);
	}
});
