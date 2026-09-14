import { describe, expect, it, vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { createHash } from 'node:crypto';
import { productCatalog } from '@atv/domain';
import { exportFixture } from '../../../tests/fixtures/product-export';
import { renderProductWebExport } from './product-export';
import { workflowDownload } from './workflow-download';

function setup(initial: unknown = exportFixture()) {
	const state = { run: initial, authenticated: true, error: false };
	const rpc = vi.fn(async () => ({
		data: state.run,
		error: state.error ? { message: 'PRIVATE_PROVIDER_PAYLOAD' } : null
	}));
	const getClaims = vi.fn(async () => ({
		data: { claims: state.authenticated ? { sub: '00000000-0000-4000-8000-000000000099' } : null },
		error: null
	}));
	const event = (query = 'format=web', headers: Record<string, string> = {}, method = 'GET') => {
		const url = new URL(`http://localhost/api/workflows/${exportFixture().id}/download?${query}`);
		return {
			url,
			request: new Request(url, { method, headers }),
			locals: { supabase: { auth: { getClaims }, rpc } }
		} as unknown as RequestEvent;
	};
	return { state, rpc, getClaims, event };
}
describe('owner-scoped web deliverable', () => {
	it('exports the exact approved projection deterministically with safe headers and byte digest', async () => {
		const { event, rpc } = setup();
		const first = await workflowDownload(event(), exportFixture().id);
		const text = await first.text();
		expect(first.status).toBe(200);
		expect(text).toContain(exportFixture().editorial!.sections[0].text);
		expect(text).toContain('O Louco — referência sintética 🌙');
		expect(first.headers.get('content-disposition')).toMatch(
			/^attachment; filename="atv-daily-card-[a-f0-9-]+-r4\.html"$/
		);
		expect(first.headers.get('x-atv-artifact-sha256')).toBe(
			createHash('sha256').update(text).digest('hex')
		);
		expect(first.headers.get('cache-control')).toContain('no-store');
		expect(first.headers.get('content-security-policy')).toContain(
			"sandbox; frame-ancestors 'none'"
		);
		expect(first.headers.get('x-content-type-options')).toBe('nosniff');
		expect(first.headers.get('cross-origin-resource-policy')).toBe('same-origin');
		expect(await (await workflowDownload(event(), exportFixture().id)).text()).toBe(text);
		expect(rpc).toHaveBeenCalledTimes(2);
		expect(rpc).toHaveBeenCalledWith('read_product_run', { p_id: exportFixture().id });
	});
	it('rechecks revocation, deletion and session expiry on every download without cached bytes', async () => {
		const { state, event } = setup();
		expect((await workflowDownload(event(), exportFixture().id)).status).toBe(200);
		state.run = { ...exportFixture(), released: false };
		const revoked = await workflowDownload(event(), exportFixture().id);
		expect(revoked.status).toBe(409);
		expect(await revoked.text()).not.toContain('O Louco');
		state.run = null;
		expect((await workflowDownload(event(), exportFixture().id)).status).toBe(404);
		state.authenticated = false;
		expect((await workflowDownload(event(), exportFixture().id)).status).toBe(401);
	});
	it('refuses unauthenticated, cross-origin and invalid-ID requests before reading data', async () => {
		const { state, event, rpc } = setup();
		expect(
			(
				await workflowDownload(
					event('', { origin: 'https://untrusted.example' }),
					exportFixture().id
				)
			).status
		).toBe(403);
		expect(
			(await workflowDownload(event('', { 'sec-fetch-site': 'cross-site' }), exportFixture().id))
				.status
		).toBe(403);
		expect((await workflowDownload(event(), '../escape')).status).toBe(404);
		expect(
			(await workflowDownload(event('format=web', {}, 'POST'), exportFixture().id)).status
		).toBe(405);
		state.authenticated = false;
		expect((await workflowDownload(event(), exportFixture().id)).status).toBe(401);
		expect(rpc).not.toHaveBeenCalled();
	});
	it('does not accept format fallbacks or arbitrary render/storage parameters', async () => {
		const { event } = setup();
		for (const query of [
			'',
			'format=pdf',
			'format=svg',
			'format=audio',
			'format=WEB',
			'format=web&format=pdf',
			'format=web&url=https://untrusted.example'
		]) {
			expect((await workflowDownload(event(query), exportFixture().id)).status).toBe(400);
		}
	});
	it('rejects malformed, foreign and unpublished projections, and sanitizes failures', async () => {
		const { state, event } = setup();
		for (const run of [
			{ ...exportFixture(), id: '00000000-0000-4000-8000-000000000088' },
			{ ...exportFixture(), editorial: null },
			{ ...exportFixture(), calculation: { version: 'invalid' } }
		]) {
			state.run = run;
			expect((await workflowDownload(event(), exportFixture().id)).status).toBe(503);
		}
		state.error = true;
		const error = await workflowDownload(event(), exportFixture().id);
		expect(error.status).toBe(503);
		expect(await error.text()).not.toContain('PRIVATE_PROVIDER_PAYLOAD');
		expect(renderProductWebExport({ ...exportFixture(), released: false })).toBeNull();
	});
	it('escapes all content, strips raw fields and never embeds external resources or active markup', () => {
		const fixture = exportFixture();
		const hostile = `</style><script>alert('x')</script><img src="https://untrusted.example"> &`;
		fixture.editorial!.title = hostile;
		fixture.editorial!.sections[0].text = hostile;
		fixture.calculation!.facts[0].source = hostile;
		const artifact = renderProductWebExport({
			...fixture,
			input: { secret: 'RAW_INPUT_SECRET' },
			calculation: { ...fixture.calculation, data: 'RAW_CALCULATION_SECRET' }
		})!;
		expect(artifact.html).toContain('&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt;');
		expect(artifact.html).not.toContain('<script>');
		expect(artifact.html).not.toContain('<img');
		expect(artifact.html).not.toContain('RAW_INPUT_SECRET');
		expect(artifact.html).not.toContain('RAW_CALCULATION_SECRET');
		expect(artifact.filename).not.toContain('alert');
	});
	it('covers every workflow product with web eligibility, not the unrelated club', () => {
		for (const product of productCatalog.filter((entry) => entry.id !== 'atv-plus')) {
			const artifact = renderProductWebExport({ ...exportFixture(), productId: product.id });
			expect(artifact?.filename).toContain(`atv-${product.id}-`);
		}
		expect(renderProductWebExport({ ...exportFixture(), productId: 'atv-plus' })).toBeNull();
	});
});
