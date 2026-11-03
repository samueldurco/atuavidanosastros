import { expect, test } from '@playwright/test';
import { scanAccessibility } from './fixtures/accessibility';
import { currentForecasts, datedForecasts } from './fixtures/editorial-inventory';
import { horoscopeRange } from '../src/lib/public-horoscope';
const HOROSCOPE_FOLLOW_KEY = 'atv.public-horoscope.follow.v1';
const ariesDaily = currentForecasts.find((document) =>
	document.path.startsWith('/horoscopo/aries/daily/')
);
const ariesDailyHistory = datedForecasts.some((document) =>
	document.path.startsWith('/horoscopo/aries/daily/')
);
const dailySigns = new Set(
	currentForecasts
		.filter((document) => document.path.includes('/daily/'))
		.map((document) => document.path.split('/')[2])
);
const ariesWeekly = currentForecasts.find((document) =>
	document.path.startsWith('/horoscopo/aries/weekly/')
);
const today = new Date().toISOString().slice(0, 10);
const priorDaily = (sign: string) =>
	datedForecasts
		.filter(
			(document) =>
				document.path.startsWith(`/horoscopo/${sign}/daily/`) &&
				document.calculation!.coverageEnd.slice(0, 10) <= today
		)
		.sort((a, b) => b.path.localeCompare(a.path))[0];

test('free tool shows complete admitted readings and keeps supporting guides in the public hub', async ({
	page,
	request
}, testInfo) => {
	const response = await request.get('/api/free-tools/horoscopo?sign=aries&period=daily');
	expect(response.status()).toBe(200);
	const result = await response.json();
	if (ariesDaily) {
		expect(result.current).toMatchObject({ path: ariesDaily.path, title: ariesDaily.title });
		expect(result.current.sections.length).toBeGreaterThan(0);
	} else expect(result.current).toBeNull();
	expect(result.hasHistory).toBe(ariesDailyHistory);
	expect(result.supportingGuides.map((guide: { path: string }) => guide.path)).toEqual([
		'/noticias/2026/10/fases-da-lua',
		'/mercurio-retrogrado'
	]);
	await page.setViewportSize({ width: 390, height: 900 });
	await page.goto('/ferramentas/horoscopo');
	await page.getByRole('button', { name: 'Recusar opcionais' }).click();
	await page.getByRole('button', { name: 'Consultar meu signo', exact: true }).click();
	const tool = page.locator('.horoscope-tool');
	const offer = tool.locator('[data-free-offer="week-reading"]');
	const resultLinks = tool.locator('[aria-live="polite"]').getByRole('link');
	await expect(
		tool.getByRole('link', { name: 'consultar as edições já publicadas' })
	).toHaveAttribute('href', '/horoscopo');
	if (ariesDaily) {
		await expect(
			page.getByRole('heading', { level: 3, name: ariesDaily.title, exact: true })
		).toBeVisible();
		const reading = tool.locator('article');
		for (const section of result.current.sections) {
			await expect(
				reading.getByRole('heading', { level: 4, name: section.heading, exact: true })
			).toBeVisible();
			for (const paragraph of section.paragraphs) {
				await expect(reading.getByText(paragraph, { exact: true }).first()).toBeVisible();
			}
		}
		await expect(resultLinks).toHaveCount(1);
		await expect(offer.getByRole('link')).toHaveAttribute(
			'href',
			`/produtos/horoscopo-semanal-pessoal?ferramenta=horoscopo&origem=ferramenta&leitura=${encodeURIComponent(result.current.path)}&revisao=${result.current.revision}`
		);
	} else {
		await expect(
			page.getByText('A leitura de dia para Áries ainda não está disponível.')
		).toBeVisible();
		await expect(offer).toHaveCount(0);
		const last = priorDaily('aries');
		expect(result.lastDaily?.path ?? null).toBe(last?.path ?? null);
		expect(result.currentWeek?.path ?? null).toBe(ariesWeekly?.path ?? null);
		await expect(resultLinks).toHaveCount(1 + Number(!!last) + Number(!!ariesWeekly));
		await expect(resultLinks.filter({ hasText: /histórico|disponibilidade/i })).toHaveAttribute(
			'href',
			result.archive
		);
		if (last) {
			await expect(
				tool.getByRole('link', {
					name: `Última edição diária disponível · ${horoscopeRange(result.lastDaily)}`,
					exact: true
				})
			).toHaveAttribute('href', last.path);
		}
		if (ariesWeekly) {
			await expect(
				tool.getByRole('link', {
					name: `Ler o semanal vigente · ${horoscopeRange(result.currentWeek)}`,
					exact: true
				})
			).toHaveAttribute('href', ariesWeekly.path);
		}
	}
	// Home reformulation §3.3: the complete result keeps only its related commercial offer.
	// Educational guides remain available in the editorial hub, outside this result.
	await expect(tool.getByRole('region', { name: 'Para entender os ciclos' })).toHaveCount(0);
	await scanAccessibility(page, testInfo);
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
		true
	);
	await page.screenshot({
		path: testInfo.outputPath('horoscope-free-tool-390.png'),
		fullPage: true
	});
	await page.goto('/horoscopo');
	for (const card of await page.locator('.sign-card').all()) {
		const sign = (await card.getAttribute('href'))!.split('/')[2]!.split('?')[0]!;
		const latest = priorDaily(sign);
		if (!dailySigns.has(sign) && latest) {
			const range = horoscopeRange({
				startDate: latest.path.split('/').at(-1)!,
				endDateExclusive: latest.calculation!.coverageEnd.slice(0, 10)
			});
			await expect(card).toContainText(`Última edição diária disponível · ${range}`);
		}
	}
	const guides = page.getByRole('region', { name: 'Para entender os ciclos' });
	await expect(guides.getByRole('link')).toHaveCount(2);
	await expect(guides).toContainText('Não são previsões para o período escolhido.');
	for (const guide of result.supportingGuides) {
		await expect(guides.getByRole('link', { name: guide.title, exact: true })).toHaveAttribute(
			'href',
			guide.path
		);
	}
	await page.goto('/horoscopo/aries');
	const availability = page.locator('.current.card');
	for (const [edition, label] of [
		[result.lastDaily, 'Última edição diária disponível'],
		[result.currentWeek, 'Ler o semanal vigente']
	] as const) {
		const link = availability.getByRole('link', { name: new RegExp(label) });
		if (edition) {
			await expect(link).toHaveAttribute('href', edition.path);
			await expect(link).toContainText(horoscopeRange(edition));
		} else await expect(link).toHaveCount(0);
	}
});

test('a gap in the daily schedule offers both dated alternatives supplied for the same sign', async ({
	page
}) => {
	// Reproduce a gap on 21 October using archive dates. Only this browser request is intercepted.
	const lastDaily = {
		path: '/horoscopo/aries/daily/2026-10-20',
		startDate: '2026-10-20',
		endDateExclusive: '2026-10-21'
	};
	const currentWeek = {
		path: '/horoscopo/aries/weekly/2026-10-19',
		startDate: '2026-10-19',
		endDateExclusive: '2026-10-26'
	};
	await page.route('**/api/free-tools/horoscopo?sign=aries&period=daily', (route) =>
		route.fulfill({
			json: {
				sign: 'aries',
				period: 'daily',
				current: null,
				lastDaily,
				currentWeek,
				hasHistory: true,
				supportingGuides: [],
				archive: '/horoscopo/aries?period=daily'
			}
		})
	);
	await page.goto('/ferramentas/horoscopo');
	await page.getByRole('button', { name: 'Recusar opcionais' }).click();
	await page.getByRole('button', { name: 'Consultar meu signo', exact: true }).click();
	const result = page.locator('.horoscope-tool [aria-live="polite"]');
	await expect(
		result.getByRole('link', { name: 'Última edição diária disponível · 20/10/2026' })
	).toHaveAttribute('href', lastDaily.path);
	await expect(
		result.getByRole('link', { name: 'Ler o semanal vigente · 19/10/2026 a 25/10/2026' })
	).toHaveAttribute('href', currentWeek.path);
});

for (const width of [320, 390, 1440]) {
	test(`public horoscope navigation, consent and history at ${width}px`, async ({
		page
	}, testInfo) => {
		await page.setViewportSize({ width, height: 900 });
		await page.goto('/horoscopo');
		await expect(
			page.getByRole('heading', { name: 'Horóscopo dos 12 signos', exact: true })
		).toBeVisible();
		await expect(page.locator('.sign-card')).toHaveCount(12);
		await expect(
			page.getByRole('heading', { name: 'A leitura deste período ainda não foi publicada' })
		).toHaveCount(dailySigns.size ? 0 : 1);
		await expect(
			page.locator('.sign-card').filter({ hasText: 'Ler a publicação atual' })
		).toHaveCount(dailySigns.size);
		const guides = page.getByRole('region', { name: 'Para entender os ciclos' });
		await expect(guides.getByRole('link')).toHaveCount(2);
		await expect(guides).toContainText('Não são previsões para o período escolhido.');
		await expect(
			page.getByRole('link', { name: 'Conhecer a leitura personalizada da semana' })
		).toHaveAttribute('href', '/produtos/horoscopo-semanal-pessoal');
		await expect(page.locator('a[href="/testar-produtos/horoscope"]')).toHaveCount(0);
		await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
		expect(
			await page.evaluate((key) => localStorage.getItem(key), HOROSCOPE_FOLLOW_KEY)
		).toBeNull();
		await scanAccessibility(page, testInfo);
		await page.screenshot({
			path: testInfo.outputPath(`horoscope-hub-${width}.png`),
			fullPage: true
		});
		await page.getByRole('button', { name: 'Recusar opcionais' }).click();
		await expect(page.getByRole('complementary', { name: 'Preferências de cookies' })).toHaveCount(
			0
		);
		await page
			.getByRole('navigation', { name: 'Período da leitura' })
			.getByRole('link', { name: 'Semana', exact: true })
			.click();
		await expect(page).toHaveURL(/\/horoscopo\?period=weekly&year=\d{4}$/);
		await expect(
			page.getByRole('navigation', { name: 'Período da leitura' }).getByRole('link', {
				name: 'Semana',
				exact: true
			})
		).toHaveAttribute('aria-current', 'page');
		await page
			.locator('.sign-card')
			.filter({ has: page.getByRole('heading', { name: 'Áries', exact: true }) })
			.click();
		await expect(page).toHaveURL(/\/horoscopo\/aries\?period=weekly&year=\d{4}$/);
		if (ariesWeekly) {
			await expect(
				page.getByRole('heading', { level: 2, name: ariesWeekly.title, exact: true })
			).toBeVisible();
			await expect(
				page.getByRole('link', { name: 'Ler o horóscopo completo', exact: true })
			).toHaveAttribute('href', ariesWeekly.path);
		} else {
			await expect(
				page.getByRole('heading', { name: 'A leitura deste período ainda não foi publicada' })
			).toBeVisible();
		}
		await page.getByLabel('Ano de início da leitura').fill('1900');
		await page.getByRole('button', { name: 'Ver histórico', exact: true }).click();
		await expect(page).toHaveURL(/period=weekly&year=1900/);
		await expect(
			page.getByText('Ainda não há leituras publicadas para este período e ano.')
		).toBeVisible();
		await page.getByText('Ativar avisos neste navegador', { exact: true }).click();
		const save = page.getByRole('button', { name: 'Salvar preferência e ativar avisos' });
		await expect(save).toBeDisabled();
		await page.getByRole('combobox', { name: 'Signo', exact: true }).selectOption('touro');
		await page.getByRole('combobox', { name: 'Período', exact: true }).selectOption('monthly');
		await page.getByRole('checkbox').check();
		await save.click();
		await expect(page.getByText('Avisos ativados neste navegador.', { exact: true })).toBeVisible();
		const preference = await page.evaluate(
			(key) => JSON.parse(localStorage.getItem(key)!),
			HOROSCOPE_FOLLOW_KEY
		);
		expect(Object.keys(preference).sort()).toEqual([
			'consentedAt',
			'period',
			'seenThrough',
			'sign',
			'version'
		]);
		expect(preference).toMatchObject({ version: 1, sign: 'touro', period: 'monthly' });
		await page.reload();
		await expect(page.getByText('Touro · Mês', { exact: true })).toBeVisible();
		await scanAccessibility(page, testInfo);
		expect(
			await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
		).toBe(true);
		await page.screenshot({
			path: testInfo.outputPath(`horoscope-sign-follow-${width}.png`),
			fullPage: true
		});
		await page.getByRole('button', { name: 'Remover preferência e desativar avisos' }).click();
		expect(
			await page.evaluate((key) => localStorage.getItem(key), HOROSCOPE_FOLLOW_KEY)
		).toBeNull();
		await expect(page.getByText('Preferência removida.', { exact: true })).toBeVisible();
	});
}

test('unknown, malformed and unsigned archive URLs fail closed', async ({ page }) => {
	for (const [path, status] of [
		['/horoscopo/unknown', 404],
		['/horoscopo/aries?year=2100', 400],
		['/horoscopo?period=annual', 400],
		['/horoscopo/aries/daily/2026-02-29', 404],
		['/horoscopo/aries/daily/1900-01-01', 404]
	] as const) {
		const response = await page.goto(path);
		expect(response?.status()).toBe(status);
		await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
	}
});

test('malformed preferences are ignored and unavailable storage is reported without false success', async ({
	page
}) => {
	await page.addInitScript((key) => localStorage.setItem(key, '{'), HOROSCOPE_FOLLOW_KEY);
	await page.goto('/horoscopo');
	await expect(page.getByText('Ativar avisos neste navegador', { exact: true })).toBeVisible();
	await page.getByRole('button', { name: 'Recusar opcionais' }).click();
	await expect(page.getByRole('complementary', { name: 'Preferências de cookies' })).toHaveCount(0);
	await page.evaluate(() => {
		Storage.prototype.setItem = () => {
			throw new Error('storage unavailable in test');
		};
	});
	await page.getByText('Ativar avisos neste navegador', { exact: true }).click();
	await page.getByRole('checkbox').check();
	await page.getByRole('button', { name: 'Salvar preferência e ativar avisos' }).click();
	await expect(
		page.getByText('Não foi possível guardar a preferência neste navegador.', { exact: true })
	).toBeVisible();
	await expect(
		page.getByRole('button', { name: 'Remover preferência e desativar avisos' })
	).toHaveCount(0);
});
