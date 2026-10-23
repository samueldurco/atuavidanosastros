import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { artifactFormats } from '@atv/domain';
import { svgFixture } from './fixtures/product-export';

for (const viewport of [
	{ width: 1440, height: 1000 },
	{ width: 820, height: 1180 },
	{ width: 390, height: 844 },
	{ width: 320, height: 800 }
]) {
	test(`leitor recuperável: composição ${viewport.width}`, async ({ page }, testInfo) => {
		await page.setViewportSize(viewport);
		await page.goto('/biblioteca/_spec/leitor');
		const consent = page.getByRole('button', { name: 'Recusar opcionais' });
		if (await consent.isVisible()) await consent.click();
		await page.evaluate(() => document.fonts.ready);
		await expect(page.getByRole('heading', { level: 1 })).toContainText('referência sintética');
		await expect(page.getByRole('main')).toHaveCount(1);
		await expect(page.getByText('Capricórnio', { exact: true })).toBeVisible();
		expect(
			await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
		).toBeLessThanOrEqual(1);
		await page.getByRole('link', { name: 'Origem e método', exact: true }).click();
		await expect(page.getByRole('heading', { name: 'Origem e método' })).toBeInViewport();
		await page.goto('/biblioteca/_spec/leitor');
		await page.screenshot({
			path: testInfo.outputPath(`reader-${viewport.width}.png`),
			fullPage: true
		});
	});
}
test('leitor diferencia erro, formato indisponível e limitação de método', async ({ page }) => {
	await page.goto('/biblioteca/_spec/leitor?state=unavailable');
	await expect(page.getByRole('alert')).toContainText('Não foi possível recuperar');
	await expect(page.getByText('Capricórnio', { exact: true })).toHaveCount(0);
	await page.goto('/biblioteca/_spec/leitor?state=unsupported');
	await expect(
		page.getByRole('heading', { name: 'Este formato ainda não tem um leitor disponível.' })
	).toBeVisible();
	await page.goto('/biblioteca/_spec/leitor?state=partial');
	await expect(page.getByRole('heading', { name: 'Há uma limitação de método.' })).toBeVisible();
});
test('coleção aponta para item e acesso sem sessão volta à entrada', async ({ page, request }) => {
	await page.goto('/biblioteca/_spec');
	const first = page.getByRole('link', { name: /Abrir Bússola/ }).first();
	await expect(first).toHaveAttribute('href', /\/biblioteca\/[0-9a-f-]{36}/);
	const readingHref = await first.getAttribute('href');
	await first.click();
	await expect(page).toHaveURL(
		(url) => url.pathname === '/entrar' && url.searchParams.get('next') === readingHref
	);
	const privateResponse = await request.get('/biblioteca/00000000-0000-0000-0000-000000000001', {
		maxRedirects: 0
	});
	expect(privateResponse.status()).toBe(303);
	expect(privateResponse.headers()['cache-control']).toContain('no-store');
	expect(privateResponse.headers()['referrer-policy']).toBe('no-referrer');
	const response = await request.post('/api/astrology/midheaven', {
		headers: { 'content-type': 'application/json' },
		data: '{broken'
	});
	expect(response.status()).toBe(400);
});

test('downloads wait for hydration and each deliberate click starts one download', async ({
	page
}) => {
	const run = svgFixture();
	const endpoint = `/api/workflows/${run.id}/download`;
	let releaseScripts!: () => void;
	const scriptsReleased = new Promise<void>((resolve) => {
		releaseScripts = resolve;
	});
	const isAppScript = (url: URL) =>
		url.pathname.startsWith('/_app/immutable/') && url.pathname.endsWith('.js');
	await page.route(isAppScript, async (route) => {
		await scriptsReleased;
		await route.continue();
	});
	const formats = [
		['web', 'Baixar leitura', 'text/html', 'html'],
		['pdf', 'Baixar PDF', 'application/pdf', 'pdf'],
		['svg', 'Baixar mapa em SVG', 'image/svg+xml', 'svg'],
		['card', 'Baixar imagem (SVG)', 'image/svg+xml', 'svg']
	] as const;
	const calls: string[] = [];
	let downloadCount = 0;
	page.on('download', () => downloadCount++);
	await page.route('**' + endpoint + '?**', async (route) => {
		const format = new URL(route.request().url()).searchParams.get('format');
		const entry = formats.find(([candidate]) => candidate === format);
		if (!entry) throw new Error('Unexpected download format');
		calls.push(entry[0]);
		await route.fulfill({ contentType: entry[2], body: 'synthetic ' + entry[0] });
	});
	const firstScript = page.waitForRequest((request) => isAppScript(new URL(request.url())));
	try {
		await page.goto('/biblioteca/_spec/downloads', { waitUntil: 'commit' });
		await firstScript;
		for (const [, label] of formats) {
			const button = page.getByRole('button', { name: label, exact: true });
			await expect(button).toBeVisible();
			await expect(button).toBeDisabled();
		}
		await expect(page.getByLabel('Trecho da leitura', { exact: true })).toBeDisabled();
		await expect(
			page.getByRole('link', { name: 'Voltar à Biblioteca', exact: true })
		).toHaveAttribute('href', '/biblioteca');
		expect(calls).toEqual([]);
		expect(downloadCount).toBe(0);
		releaseScripts();
		await expect(page.getByLabel('Trecho da leitura', { exact: true })).toBeEnabled();
		const consent = page.getByRole('button', { name: 'Recusar opcionais' });
		if (await consent.isVisible()) await consent.click();
		for (const [index, [format, label, , extension]] of formats.entries()) {
			const button = page.getByRole('button', { name: label, exact: true });
			await expect(button).toBeEnabled();
			const pendingDownload = page.waitForEvent('download');
			await button.click();
			const file = await pendingDownload;
			expect(file.suggestedFilename()).toBe(
				'atv-' +
					run.id +
					'-r' +
					run.revision +
					(format === 'card' ? '-card-1' : '') +
					'.' +
					extension
			);
			expect(await readFile((await file.path())!, 'utf8')).toBe('synthetic ' + format);
			expect(calls).toEqual(formats.slice(0, index + 1).map(([candidate]) => candidate));
			expect(downloadCount).toBe(index + 1);
		}
	} finally {
		releaseScripts();
	}
});

test('stored files wait for hydration and explicit recovery preserves the saved artifact', async ({
	page
}) => {
	const run = svgFixture();
	const body = '<p>Arquivo sintético guardado</p>';
	const manifest = {
		id: '00000000-0000-4000-8000-000000000002',
		runId: run.id,
		revision: run.revision,
		reviewDigest: run.editorial!.reviewDigest,
		format: 'web',
		section: -1,
		rendererVersion: artifactFormats.web.renderer,
		sha256: createHash('sha256').update(body).digest('hex'),
		bytes: Buffer.byteLength(body),
		createdAt: run.createdAt
	};
	const endpoint = '/api/workflows/' + run.id + '/artifacts';
	let releaseScripts!: () => void;
	const scriptsReleased = new Promise<void>((resolve) => {
		releaseScripts = resolve;
	});
	const isAppScript = (url: URL) =>
		url.pathname.startsWith('/_app/immutable/') && url.pathname.endsWith('.js');
	await page.route(isAppScript, async (route) => {
		await scriptsReleased;
		await route.continue();
	});
	let lists = 0;
	let recoveries = 0;
	let downloads = 0;
	page.on('download', () => downloads++);
	await page.route('**' + endpoint, async (route) => {
		lists++;
		await route.fulfill({ json: { artifacts: [manifest] } });
	});
	await page.route('**' + endpoint + '/' + manifest.id, async (route) => {
		recoveries++;
		await route.fulfill({
			body,
			headers: {
				'content-type': artifactFormats.web.mime,
				'x-atv-artifact-id': manifest.id,
				'x-atv-export-version': manifest.rendererVersion,
				'x-atv-artifact-sha256': manifest.sha256
			}
		});
	});
	const firstScript = page.waitForRequest((request) => isAppScript(new URL(request.url())));
	try {
		await page.goto('/biblioteca/_spec/downloads', { waitUntil: 'commit' });
		await firstScript;
		const consult = page.getByRole('button', { name: 'Ver arquivos salvos', exact: true });
		await expect(consult).toBeVisible();
		await expect(consult).toBeDisabled();
		await expect(page.getByRole('list', { name: 'Arquivos disponíveis', exact: true })).toHaveCount(
			0
		);
		await expect(
			page.getByRole('link', { name: 'Voltar à Biblioteca', exact: true })
		).toHaveAttribute('href', '/biblioteca');
		expect({ lists, recoveries, downloads }).toEqual({ lists: 0, recoveries: 0, downloads: 0 });
		releaseScripts();
		await expect(consult).toBeEnabled();
		const consent = page.getByRole('button', { name: 'Recusar opcionais' });
		if (await consent.isVisible()) await consent.click();
		await consult.click();
		await expect(
			page.getByRole('list', { name: 'Arquivos disponíveis', exact: true })
		).toBeVisible();
		expect({ lists, recoveries, downloads }).toEqual({ lists: 1, recoveries: 0, downloads: 0 });
		const pendingDownload = page.waitForEvent('download');
		await page.getByRole('button', { name: 'Baixar Leitura no site', exact: true }).click();
		const file = await pendingDownload;
		expect(file.suggestedFilename()).toBe(
			'atv-' +
				run.id +
				'-r' +
				run.revision +
				'-' +
				manifest.id +
				'.' +
				artifactFormats.web.extension
		);
		expect(await readFile((await file.path())!, 'utf8')).toBe(body);
		await expect(
			page.getByText('Arquivo verificado e enviado ao navegador para download.', { exact: true })
		).toBeVisible();
		expect({ lists, recoveries, downloads }).toEqual({ lists: 1, recoveries: 1, downloads: 1 });
	} finally {
		releaseScripts();
	}
});
