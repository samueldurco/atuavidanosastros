import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const base = process.env.ATV_QA_BASE_URL ?? 'http://127.0.0.1:4181';
const out = '../../test-results/architecture';
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
		const response = await page.goto(base, { waitUntil: 'networkidle' });
		const cookies = page.getByRole('button', { name: 'Recusar opcionais' });
		if (await cookies.isVisible()) await cookies.click();
		await page
			.locator('.tool-block')
			.first()
			.getByRole('button', { name: 'Descobrir meu ascendente' })
			.click();
		await page.locator('#ascendente-first-birth-date').fill('2000-01-01');
		await page.locator('#ascendente-first-birth-time').fill('09:00');
		const first = page.locator('.tool-block').first();
		await first.getByRole('button', { name: 'Recolher ferramenta' }).click();
		await first.getByRole('button', { name: 'Descobrir meu ascendente', exact: true }).click();
		if ((await page.locator('#ascendente-first-birth-date').inputValue()) !== '2000-01-01')
			throw new Error('Form state lost on collapse');
		const formOverflow = await first.evaluate((el) => el.scrollWidth > el.clientWidth + 1);
		const axe = await new AxeBuilder({ page })
			.withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
			.analyze();
		await first.getByRole('button', { name: 'Recolher ferramenta' }).click();
		await page.screenshot({ path: `${out}/home-${width}.png`, fullPage: true });
		await page.locator('.tool-collection').screenshot({ path: `${out}/tools-${width}.png` });
		const love = page
			.locator('.tool-block')
			.filter({ has: page.getByRole('heading', { name: 'Carta do Amor', exact: true }) });
		await love.locator('.tool-open').scrollIntoViewIfNeeded();
		await love.locator('.tool-open').click();
		const drawResponse = page.waitForResponse(
			(response) =>
				response.url().includes('/api/free-tools/carta-do-amor') &&
				response.request().method() === 'POST'
		);
		await love
			.locator('form')
			.getByRole('button', { name: 'Tirar minha carta do amor', exact: true })
			.click();
		const drawStatus = (await drawResponse).status();
		await love.locator('.result-card').waitFor();
		const drawTitle = await love.locator('.result-card h2').innerText();
		await love.locator('.tool-open').click();
		await love.locator('.tool-open').click();
		if ((await love.locator('.result-card h2').innerText()) !== drawTitle)
			throw new Error('Result changed after collapse');
		await love.screenshot({ path: `${out}/love-result-${width}.png` });
		const resultAxe = await new AxeBuilder({ page })
			.withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
			.analyze();
		const resultOverflow = await love.evaluate((el) => el.scrollWidth > el.clientWidth + 1);
		await page.reload({ waitUntil: 'networkidle' });
		await love.locator('.tool-open').scrollIntoViewIfNeeded();
		await love.locator('.tool-open').click();
		if ((await love.locator('.result-card h2').innerText()) !== drawTitle)
			throw new Error('Result not restored after reload');
		await love.getByRole('button', { name: 'Limpar dados e resultado desta página' }).click();
		if (await love.locator('.result-card').count()) throw new Error('Result not cleared');
		if (await page.evaluate(() => sessionStorage.getItem('atv-free-tool:carta-do-amor')))
			throw new Error('Temporary result not cleared');
		await love.locator('.tool-open').click();
		const next = page.getByRole('button', { name: 'Próxima ferramenta', exact: true });
		for (let i = 0; i < 10 && (await next.isEnabled()); i++) {
			await next.click();
			await page.waitForTimeout(80);
		}
		const lastVisible = await page
			.locator('.tool-block')
			.last()
			.evaluate((el) => {
				const r = el.getBoundingClientRect();
				return r.right <= innerWidth + 2 && r.left >= 0;
			});
		const geometry = await page.evaluate(() => ({
			viewport: innerWidth,
			document: document.documentElement.scrollWidth,
			brokenImages: [...document.images]
				.filter((i) => i.complete && !i.naturalWidth)
				.map((i) => i.getAttribute('src'))
		}));
		report.push({
			width,
			status: response.status(),
			errors,
			formOverflow,
			drawStatus,
			resultOverflow,
			resultAxe: resultAxe.violations.map((v) => ({
				id: v.id,
				impact: v.impact,
				nodes: v.nodes.map((n) => n.target)
			})),
			lastVisible,
			...geometry,
			axe: axe.violations.map((v) => ({
				id: v.id,
				impact: v.impact,
				nodes: v.nodes.map((n) => n.target)
			}))
		});
		await context.close();
	}
} finally {
	await browser.close();
}
await writeFile(`${out}/public-architecture.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
if (
	report.some(
		(r) =>
			r.status !== 200 ||
			r.errors.length ||
			r.formOverflow ||
			r.drawStatus !== 200 ||
			r.resultOverflow ||
			r.resultAxe.length ||
			!r.lastVisible ||
			r.document > r.viewport + 1 ||
			r.brokenImages.length ||
			r.axe.length
	)
)
	process.exitCode = 1;
