import { chromium } from '@playwright/test';

const baseUrl = process.env.ATV_VISUAL_BASE_URL ?? 'http://127.0.0.1:5174';
const browser = await chromium.launch();
const results = [];

try {
	for (const width of [390, 1440]) {
		const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
		await page.goto(`${baseUrl}/bussola-de-carreira`, { waitUntil: 'networkidle' });
		const rejectOptionalCookies = page.getByRole('button', { name: 'Recusar opcionais' });
		if (await rejectOptionalCookies.isVisible()) await rejectOptionalCookies.click();
		const result = await page.evaluate(() => {
			const hero = document.querySelector('.hero-engraving');
			const title = document.querySelector('.hero-copy h1');
			const form = document.querySelector('.natal-form');
			const submit = document.querySelector('.natal-form button[type="submit"]');
			if (!hero || !title || !form || !submit)
				throw new Error('A estrutura da Bússola não apareceu.');
			const heroStyle = getComputedStyle(hero);
			const canvas = document.createElement('canvas');
			canvas.width = hero.naturalWidth;
			canvas.height = hero.naturalHeight;
			const context = canvas.getContext('2d');
			context.drawImage(hero, 0, 0);
			const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
			let firstX = canvas.width;
			let lastX = -1;
			for (let y = 0; y < canvas.height; y++) {
				for (let x = 0; x < canvas.width; x++) {
					if (pixels[(y * canvas.width + x) * 4 + 3] > 20) {
						firstX = Math.min(firstX, x);
						lastX = Math.max(lastX, x);
					}
				}
			}
			const titleStyle = getComputedStyle(title);
			const formStyle = getComputedStyle(form);
			const focusColor = getComputedStyle(document.querySelector('.compass-tool'))
				.getPropertyValue('--atv-focus')
				.trim();
			const submitRect = submit.getBoundingClientRect();
			return {
				viewport: window.innerWidth,
				documentWidth: document.documentElement.scrollWidth,
				heroWidth: Math.round(hero.getBoundingClientRect().width),
				paintedHeroWidth: Math.round(
					(hero.getBoundingClientRect().width * (lastX - firstX + 1)) / canvas.width
				),
				heroDisplay: heroStyle.display,
				heroAlt: hero.getAttribute('alt'),
				titleFont: titleStyle.fontFamily,
				titleSize: titleStyle.fontSize,
				formFont: formStyle.fontFamily,
				focusColor,
				submitHeight: Math.round(submitRect.height)
			};
		});
		await submitFocus(page);
		result.focus = await page.locator('.natal-form button[type="submit"]').evaluate((button) => {
			const style = getComputedStyle(button);
			return { width: style.outlineWidth, offset: style.outlineOffset, color: style.outlineColor };
		});
		await page.screenshot({
			path: `../../docs/30-execucao/evidencias/bussola-f06-${width}-2026-10-14.png`,
			fullPage: true
		});
		results.push(result);
		await page.close();
	}
} finally {
	await browser.close();
}

console.log(JSON.stringify(results, null, 2));
for (const result of results) {
	if (result.documentWidth > result.viewport + 1) throw new Error('Há rolagem horizontal.');
	if (result.paintedHeroWidth < 180 || result.paintedHeroWidth > 280)
		throw new Error('A área desenhada da gravura principal está fora da escala do pacote visual.');
	if (result.heroAlt !== '') throw new Error('A gravura decorativa precisa de alt vazio.');
	if (!result.titleFont.includes('Newsreader') || !result.formFont.includes('Onest'))
		throw new Error('A tipografia não segue o pacote visual.');
	if (Number.parseFloat(result.titleSize) < 42 || Number.parseFloat(result.titleSize) > 78)
		throw new Error('O título está fora da escala do pacote visual.');
	if (result.focusColor !== '#183746')
		throw new Error('A cor de foco não é a tinta do pacote visual.');
	if (result.submitHeight < 44) throw new Error('A ação principal tem alvo menor que 44 px.');
	if (result.focus.width !== '3px' || result.focus.offset !== '4px')
		throw new Error('O foco da ação principal não segue o pacote visual.');
	if (result.focus.color !== 'rgb(24, 55, 70)')
		throw new Error('O foco da ação principal não usa a tinta do pacote visual.');
}

async function submitFocus(page) {
	await page.keyboard.press('Tab');
	await page.locator('.natal-form button[type="submit"]').focus();
}
