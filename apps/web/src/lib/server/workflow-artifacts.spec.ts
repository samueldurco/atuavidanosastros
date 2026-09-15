import { describe, expect, it, vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { createHash } from 'node:crypto';
import { exportFixture } from '../../../tests/fixtures/product-export';
import { workflowArtifacts } from './workflow-artifacts';

const run = exportFixture();
const body = '<html>Conteúdo sintético persistido</html>';
const manifest = {
	id: '00000000-0000-4000-8000-000000000088',
	runId: run.id,
	revision: run.revision,
	reviewDigest: run.editorial!.reviewDigest,
	format: 'web',
	section: -1,
	rendererVersion: 'atv-web-export/1.0.0',
	sha256: createHash('sha256').update(body).digest('hex'),
	bytes: Buffer.byteLength(body),
	createdAt: '2026-09-15T20:00:00Z'
};
function setup() {
	const state = {
		run: run as unknown,
		authenticated: true,
		error: false,
		artifacts: [manifest] as unknown,
		artifact: { ...manifest, bodyBase64: Buffer.from(body).toString('base64') } as unknown
	};
	const rpc = vi.fn(async (name: string) => ({
		data:
			name === 'read_product_run'
				? state.run
				: name === 'list_product_artifacts'
					? state.artifacts
					: state.artifact,
		error: state.error ? { message: 'PRIVATE_PROVIDER_PAYLOAD' } : null
	}));
	const event = (query = '', headers: Record<string, string> = {}, method = 'GET') => {
		const url = new URL(`http://localhost/api/workflows/${run.id}/artifacts?${query}`);
		return {
			url,
			request: new Request(url, { headers, method }),
			locals: {
				supabase: {
					rpc,
					auth: {
						getClaims: async () => ({
							data: { claims: state.authenticated ? { sub: manifest.id } : null },
							error: null
						})
					}
				}
			}
		} as unknown as RequestEvent;
	};
	return { state, rpc, event };
}
describe('private persisted artifact API', () => {
	it('lists minimal manifests and recovers exact bytes with current owner authorization', async () => {
		const { state, event, rpc } = setup();
		state.artifacts = [{ ...manifest, bodyBase64: 'SECRET', input: 'PRIVATE' }];
		const listing = await workflowArtifacts(event(), run.id);
		expect(await listing.json()).toEqual({ artifacts: [manifest] });
		const response = await workflowArtifacts(event(), run.id, manifest.id);
		expect(response.status).toBe(200);
		expect(await response.text()).toBe(body);
		expect(response.headers.get('cache-control')).toBe('private, no-store');
		expect(response.headers.get('content-security-policy')).toContain('sandbox');
		expect(response.headers.get('cross-origin-resource-policy')).toBe('same-origin');
		expect(response.headers.get('x-atv-artifact-sha256')).toBe(manifest.sha256);
		expect(response.headers.get('content-disposition')).toContain(`${manifest.id}.html`);
		expect(rpc.mock.calls.map((c) => c[0])).toEqual([
			'read_product_run',
			'list_product_artifacts',
			'read_product_run',
			'read_product_artifact'
		]);
	});
	it('rejects substitution, extra parameters and cross-origin requests before reading', async () => {
		const { event, rpc } = setup();
		for (const [query, headers, method, status] of [
			['url=https://untrusted.example', {}, 'GET', 404],
			['', { origin: 'https://untrusted.example' }, 'GET', 403],
			['', { 'sec-fetch-site': 'cross-site' }, 'GET', 403],
			['', {}, 'POST', 405]
		] as [string, Record<string, string>, string, number][])
			expect((await workflowArtifacts(event(query, headers, method), run.id)).status).toBe(status);
		expect((await workflowArtifacts(event(), 'bad-id')).status).toBe(404);
		expect((await workflowArtifacts(event(), run.id, 'bad-id')).status).toBe(404);
		expect(rpc).not.toHaveBeenCalled();
	});
	it('does not recover stale, revoked, deleted or unauthenticated readings', async () => {
		const { state, event, rpc } = setup();
		state.authenticated = false;
		expect((await workflowArtifacts(event(), run.id, manifest.id)).status).toBe(401);
		expect(rpc).not.toHaveBeenCalled();
		state.authenticated = true;
		state.run = null;
		expect((await workflowArtifacts(event(), run.id, manifest.id)).status).toBe(404);
		state.run = { ...run, released: false, calculation: null, editorial: null };
		expect((await workflowArtifacts(event(), run.id, manifest.id)).status).toBe(404);
		state.run = run;
		state.artifact = null;
		expect((await workflowArtifacts(event(), run.id, manifest.id)).status).toBe(404);
	});
	it('rejects mismatched manifests, noncanonical base64 and corrupt bytes without leaking content', async () => {
		const { state, event } = setup();
		const original = state.artifact as Record<string, unknown>;
		for (const patch of [
			{ id: '00000000-0000-4000-8000-000000000077' },
			{ revision: 5 },
			{ reviewDigest: 'b'.repeat(64) },
			{ rendererVersion: 'future/9' },
			{ bytes: 8388609 },
			{ sha256: 'b'.repeat(64) },
			{ bodyBase64: original.bodyBase64 + '\n' },
			{ bodyBase64: '%%' },
			{ format: 'svg' },
			{ format: 'audio' },
			{ section: 1 }
		]) {
			state.artifact = { ...original, ...patch };
			const response = await workflowArtifacts(event(), run.id, manifest.id);
			expect(response.status).toBe(503);
			expect(await response.text()).toBe('{"error":"artifact_unavailable"}');
		}
	});
	it('fails closed on malformed listings and provider errors', async () => {
		const { state, event } = setup();
		for (const artifacts of [
			null,
			{},
			[manifest, manifest],
			Array(201).fill(manifest),
			[{ ...manifest, reviewDigest: 'b'.repeat(64) }]
		]) {
			state.artifacts = artifacts;
			expect((await workflowArtifacts(event(), run.id)).status).toBe(503);
		}
		state.artifacts = [];
		expect(await (await workflowArtifacts(event(), run.id)).json()).toEqual({ artifacts: [] });
		state.error = true;
		const failure = await workflowArtifacts(event(), run.id, manifest.id);
		expect(failure.status).toBe(503);
		expect(await failure.text()).not.toContain('PRIVATE_PROVIDER_PAYLOAD');
	});
});
