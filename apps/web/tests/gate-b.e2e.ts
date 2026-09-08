import { expect, test } from '@playwright/test';

const surfaces = [
	'/',
	'/entrar',
	'/dashboard',
	'/biblioteca',
	'/bussola-de-carreira',
	'/design-system',
	'/biblioteca/_spec'
];
const viewports = [
	{ name: 'desktop', width: 1440, height: 1000 },
	{ name: 'tablet', width: 820, height: 1180 },
	{ name: 'mobile', width: 390, height: 844 },
	{ name: 'reflow', width: 320, height: 800 }
];

for (const viewport of viewports) {
	test(`Gate B: composição e reflow ${viewport.name}`, async ({ page }, testInfo) => {
		await page.setViewportSize(viewport);
		for (const path of surfaces) {
			await page.goto(path);
			await page.evaluate(() => document.fonts.ready);
			const reject = page.getByRole('button', { name: 'Recusar analytics' });
			if (await reject.isVisible()) {
				await page.screenshot({ path: testInfo.outputPath(`consent-${viewport.name}.png`) });
				await reject.click();
			}
			await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
			await expect(page.getByRole('main')).toHaveCount(1);
			const overflow = await page.evaluate(
				() => document.documentElement.scrollWidth - window.innerWidth
			);
			expect(overflow, `${path} excede a largura ${viewport.width}`).toBeLessThanOrEqual(1);
			await page.screenshot({
				path: testInfo.outputPath(`${path.replaceAll('/', '_') || 'home'}-${viewport.name}.png`),
				fullPage: true
			});
			await page.screenshot({
				path: testInfo.outputPath(`${path.replaceAll('/', '_')}-viewport-${viewport.name}.png`)
			});
		}
	});
}

test('menu público funciona por teclado e Escape restaura foco', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/');
	await page.keyboard.press('Tab');
	await expect(page.getByRole('link', { name: 'Ir para o conteúdo' })).toBeFocused();
	await page.keyboard.press('Enter');
	await expect(page.getByRole('main')).toBeFocused();
	const menu = page.getByRole('button', { name: 'Menu', exact: true });
	await menu.focus();
	await page.keyboard.press('Enter');
	await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toBeVisible();
	await page.keyboard.press('Escape');
	await expect(menu).toBeFocused();
	await expect(menu).toHaveAttribute('aria-expanded', 'false');
});

test('abas e overlays mantêm contrato de teclado e foco', async ({ page }) => {
	await page.goto('/design-system');
	const facts = page.getByRole('tab', { name: 'Fatos', exact: true });
	await facts.focus();
	await page.keyboard.press('ArrowRight');
	await expect(page.getByRole('tab', { name: 'Leitura', exact: true })).toBeFocused();
	await expect(page.getByRole('tabpanel')).toContainText('Interpretação separada dos fatos.');
	await page.keyboard.press('Home');
	await expect(facts).toBeFocused();
	for (const variant of ['dialog', 'drawer', 'bottom-sheet']) {
		const trigger = page.getByRole('button', { name: `Abrir ${variant}`, exact: true });
		await trigger.click();
		const dialog = page.getByRole('dialog', { name: 'Preferências de exemplo' });
		await expect(dialog).toBeVisible();
		await expect(
			dialog.getByRole('button', { name: 'Fechar Preferências de exemplo' })
		).toBeFocused();
		await page.keyboard.press('Shift+Tab');
		await expect(dialog.getByRole('button', { name: 'Concluir' })).toBeFocused();
		await page.keyboard.press('Escape');
		await expect(dialog).not.toBeVisible();
		await expect(trigger).toBeFocused();
	}
});

test('Bússola mostra erro recuperável com os campos preservados', async ({ page }) => {
	await page.goto('/bussola-de-carreira');
	await page.getByLabel('Data de nascimento').fill('2000-01-01');
	await page.getByLabel('Hora de nascimento').fill('09:00');
	await page.getByLabel('Cidade de nascimento').fill('São Paulo, Brasil');
	await page.getByLabel('Latitude', { exact: true }).fill('-23.5505');
	await page.getByLabel('Longitude', { exact: true }).fill('-46.6333');
	await page.route('**/api/astrology/midheaven', (route) =>
		route.fulfill({ status: 503, json: { code: 'unavailable' } })
	);
	await page.getByRole('button', { name: 'Calcular minha bússola' }).click();
	await expect(page.getByRole('alert')).toContainText('Vamos conferir os dados?');
	await expect(page.getByLabel('Data de nascimento')).toHaveValue('2000-01-01');
	await expect(page.getByRole('button', { name: 'Calcular minha bússola' })).toBeEnabled();
});

test('Biblioteca filtra o acervo sintético sem confundir vazio e erro', async ({ page }) => {
	await page.goto('/biblioteca/_spec');
	await expect(page.getByRole('article')).toHaveCount(3);
	await page.getByRole('button', { name: 'Propósito', exact: true }).click();
	await expect(page.getByRole('article')).toHaveCount(2);
	await page.getByLabel('Buscar na Biblioteca').fill('sem correspondência');
	await expect(
		page.getByRole('heading', { name: 'Nenhuma leitura com esses filtros.' })
	).toBeVisible();
	await page.getByRole('button', { name: 'Limpar filtros' }).click();
	await page.getByLabel('Ordenar por').selectOption('title');
	await expect(page.getByRole('article').first()).toContainText('referência sintética A');
	await page.goto('/biblioteca/_spec?state=error');
	await expect(page.getByRole('alert')).toContainText('Não foi possível carregar sua Biblioteca.');
	await expect(page.getByText('Sua Biblioteca ainda está vazia.')).toHaveCount(0);
});

test('reduced motion e contraste dos papéis de texto', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.goto('/design-system');
	const values = await page.evaluate(() => {
		const styles = getComputedStyle(document.documentElement);
		return {
			motion: styles.getPropertyValue('--atv-motion-base').trim(),
			text: styles.getPropertyValue('--atv-text-secondary').trim(),
			focus: styles.getPropertyValue('--atv-focus').trim()
		};
	});
	expect(parseFloat(values.motion)).toBe(0);
	expect(values.text.toLowerCase()).toBe('#526079');
	expect(values.focus.toLowerCase()).toBe('#3176c2');
	function luminance(hex: string) {
		return hex
			.match(/[a-f\d]{2}/gi)!
			.map((channel) => parseInt(channel, 16) / 255)
			.map((channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4))
			.reduce((total, channel, i) => total + channel * [0.2126, 0.7152, 0.0722][i], 0);
	}
	for (const ink of ['#0b1635', '#526079', '#073f87', '#8c6330']) {
		for (const paper of ['#fcfbf8', '#ffffff', '#f7f9fc']) {
			expect(
				(luminance(paper) + 0.05) / (luminance(ink) + 0.05),
				`${ink} sobre ${paper}`
			).toBeGreaterThanOrEqual(4.5);
		}
	}
});
