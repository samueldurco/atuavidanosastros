import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { artifactFormats } from '@atv/domain';
import { exportFixture } from './fixtures/product-export';

const run = exportFixture();
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
const endpoint = `/api/workflows/${run.id}/artifacts`;
for (const width of [1440, 820, 390, 320]) {
	test(`stored artifact consultation and exact recovery ${width}`, async ({ page }, testInfo) => {
		let lists = 0;
		await page.setViewportSize({ width, height: 1000 });
		await page.route(`**${endpoint}`, async (route) => {
			lists++;
			await route.fulfill({ json: { artifacts: [manifest] } });
		});
		await page.route(`**${endpoint}/${manifest.id}`, (route) =>
			route.fulfill({
				body,
				headers: {
					'content-type': artifactFormats.web.mime,
					'x-atv-artifact-id': manifest.id,
					'x-atv-export-version': manifest.rendererVersion,
					'x-atv-artifact-sha256': manifest.sha256
				}
			})
		);
		await page.goto('/biblioteca/_spec/arquivos');
		const consent = page.getByRole('button', { name: 'Recusar analytics' });
		if (await consent.isVisible()) await consent.click();
		expect(lists).toBe(0);
		await page.getByRole('button', { name: 'Consultar arquivos guardados' }).click();
		await expect(page.getByRole('list', { name: 'Arquivos disponíveis' })).toBeVisible();
		const download = page.waitForEvent('download');
		await page.getByRole('button', { name: 'Recuperar Relatório web' }).click();
		const result = await download;
		expect(await readFile((await result.path())!, 'utf8')).toBe(body);
		await expect(
			page.getByText('Arquivo verificado e enviado ao navegador para download.')
		).toBeVisible();
		await expect(page.getByRole('button', { name: 'Recuperar Relatório web' })).toBeFocused();
		expect(
			await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
		).toBeLessThanOrEqual(1);
		await page.evaluate(() => scrollTo(0, 0));
		await page.screenshot({
			path: testInfo.outputPath(`artifact-recovery-${width}.png`),
			fullPage: true
		});
	});
}
test('empty, unavailable, expired, revoked and corrupt downloads allow safe retry', async ({
	page
}) => {
	let mode = 'empty';
	let downloadStatus = 404;
	let downloads = 0;
	page.on('download', () => downloads++);
	await page.route(`**${endpoint}`, (route) =>
		mode === 'error'
			? route.fulfill({ status: 503 })
			: mode === 'expired'
				? route.fulfill({ status: 401 })
				: route.fulfill({ json: { artifacts: mode === 'empty' ? [] : [manifest] } })
	);
	await page.route(`**${endpoint}/${manifest.id}`, (route) =>
		route.fulfill({
			status: downloadStatus,
			body: 'corrupt',
			headers: {
				'content-type': artifactFormats.web.mime,
				'x-atv-artifact-id': manifest.id,
				'x-atv-export-version': manifest.rendererVersion,
				'x-atv-artifact-sha256': manifest.sha256
			}
		})
	);
	await page.goto('/biblioteca/_spec/arquivos');
	const consult = page.getByRole('button', { name: 'Consultar arquivos guardados' });
	await consult.click();
	await expect(page.getByText(/Nenhum arquivo guardado disponível/)).toBeVisible();
	mode = 'error';
	await consult.click();
	await expect(
		page.getByText('Não foi possível recuperar os arquivos. Tente novamente.')
	).toBeVisible();
	mode = 'expired';
	await consult.click();
	await expect(page.getByText('Entre novamente para consultar seus arquivos.')).toBeVisible();
	mode = 'ready';
	await consult.click();
	await page.getByRole('button', { name: 'Recuperar Relatório web' }).click();
	await expect(page.getByText(/O arquivo ou seu acesso não está disponível/)).toBeVisible();
	await expect(consult).toBeFocused();
	await expect(page.getByRole('list', { name: 'Arquivos disponíveis' })).toHaveCount(0);
	downloadStatus = 200;
	await consult.click();
	await page.getByRole('button', { name: 'Recuperar Relatório web' }).click();
	await expect(
		page.getByText('Não foi possível recuperar os arquivos. Tente novamente.')
	).toBeVisible();
	expect(downloads).toBe(0);
});
test('reader integrates index and synthetic guard; revoked readings hide consultation', async ({
	page,
	request
}) => {
	await page.goto('/biblioteca/_spec/fluxo?state=ready');
	await page.getByRole('link', { name: 'Arquivos guardados', exact: true }).click();
	await expect(page.getByRole('heading', { name: 'Arquivos guardados' })).toBeInViewport();
	await expect(page.getByRole('button', { name: 'Consultar arquivos guardados' })).toBeDisabled();
	await page.goto('/biblioteca/_spec/fluxo?state=revoked');
	await expect(page.getByRole('button', { name: 'Consultar arquivos guardados' })).toHaveCount(0);
	const response = await request.get(endpoint);
	expect([401, 503]).toContain(response.status());
	expect(response.headers()['cache-control']).toContain('no-store');
});
