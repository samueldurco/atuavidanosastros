import { expect, test } from '@playwright/test';
import { scanAccessibility } from './fixtures/accessibility';

// Deliberate browser fixtures cover a stable published-revision journey.
// Admission/auth/no-quota are independently checked by the server integration suite.
const reference = '/horoscopo/aries/daily/2026-10-28';
const query = `leitura=${encodeURIComponent(reference)}&revisao=1`;
const landing = `/produtos/horoscopo-semanal-pessoal?ferramenta=horoscopo&origem=ferramenta&${query}`;
for (const width of [1440, 390]) {
	test(`Horóscopo leva a revisão consultada ao PDF após oferta (${width})`, async ({
		page
	}, testInfo) => {
		await page.setViewportSize({ width, height: 900 });
		await page.route('**/api/free-tools/horoscopo?*', (route) =>
			route.fulfill({
				json: {
					sign: 'aries',
					period: 'daily',
					hasHistory: true,
					supportingGuides: [],
					archive: '/horoscopo/aries',
					current: {
						id: 'synthetic-browser-fixture',
						revision: 1,
						path: reference,
						title: 'Publicação sintética de teste',
						startDate: '2026-10-28',
						endDateExclusive: '2026-10-29',
						sections: [
							{
								heading: 'Leitura publicada',
								paragraphs: ['Texto sintético consultado na ferramenta.']
							}
						]
					}
				}
			})
		);
		await page.route('**/api/free-tools/horoscopo/reading?*', async (route) => {
			const requested = new URL(route.request().url());
			expect(requested.searchParams.get('leitura')).toBe(reference);
			expect(requested.searchParams.get('revisao')).toBe('1');
			await route.fulfill({ json: { available: true } });
		});
		await page.route('**/api/free-tools/identity', (route) =>
			route.fulfill({ json: { identified: true, emailCodeAvailable: false } })
		);
		await page.route('**/api/free-tools/news-consent', (route) =>
			route.fulfill({ json: { owner: 'a'.repeat(64), enabled: true } })
		);
		let downloadedReference = '';
		await page.route('**/api/free-tools/horoscopo/pdf?*', async (route) => {
			downloadedReference = new URL(route.request().url()).search;
			await route.fulfill({
				contentType: 'application/pdf',
				body: Buffer.from('%PDF-1.7\nsynthetic browser download fixture')
			});
		});
		await page.goto('/ferramentas/horoscopo');
		await page.getByRole('button', { name: 'Recusar opcionais' }).click();
		await page.getByRole('button', { name: 'Consultar meu signo' }).click();
		const offer = page.locator('[data-free-offer="week-reading"]');
		await expect(offer.getByRole('link')).toHaveAttribute('href', landing);
		await expect(page.locator('.horoscope-tool').getByRole('link')).toHaveCount(1);
		await offer.getByRole('link').click();
		const block = page.locator('.free-download');
		await expect(block.getByRole('button', { name: 'Baixar meu PDF gratuito' })).toBeVisible();
		await expect(block.getByRole('checkbox')).not.toBeChecked();
		await expect(
			block.getByRole('link', { name: 'Voltar à minha leitura gratuita' })
		).toHaveAttribute('href', reference);
		await expect(page.getByRole('heading', { level: 1 })).toContainText(
			'Horóscopo Semanal Pessoal'
		);
		expect(
			await block.evaluate((element) => {
				const offer = element.parentElement?.firstElementChild;
				return Boolean(
					offer && offer.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING
				);
			})
		).toBe(true);
		const download = page.waitForEvent('download');
		await block.getByRole('button', { name: 'Baixar meu PDF gratuito' }).click();
		expect((await download).suggestedFilename()).toBe('atvna-horoscopo.pdf');
		expect(downloadedReference).toBe(`?${query}`);
		await scanAccessibility(page, testInfo);
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
			true
		);
		await page.evaluate(() => document.fonts.ready);
		await block.screenshot({ path: testInfo.outputPath(`horoscope-pdf-consent-${width}.png`) });
	});
}

test('versão revogada não habilita PDF e não é trocada silenciosamente', async ({ page }) => {
	await page.route('**/api/free-tools/horoscopo/reading?*', (route) =>
		route.fulfill({ status: 404, json: { available: false } })
	);
	await page.route('**/api/free-tools/identity', (route) =>
		route.fulfill({ json: { identified: true, emailCodeAvailable: false } })
	);
	await page.goto(landing);
	const block = page.locator('.free-download');
	await expect(block).toContainText('Esta versão da publicação não está disponível para baixar.');
	await expect(block.getByRole('button', { name: 'Baixar meu PDF gratuito' })).toHaveCount(0);
	await expect(block.getByRole('link', { name: 'Voltar à minha leitura gratuita' })).toBeVisible();
	await expect(
		block.getByRole('link', { name: 'Voltar à minha leitura gratuita' })
	).toHaveAttribute('href', '/?ferramenta=horoscopo#ferramentas');
});
