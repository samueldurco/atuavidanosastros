import { expect, it } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import {
	setupProductDatabase,
	owner,
	other,
	file
} from '../../../../../scripts/helpers/product-database.mjs';
import { asRole, readyArtifactFixture } from '../../../../../scripts/helpers/artifact-fixture.mjs';
import {
	persistRenderedProductArtifact,
	type ArtifactRpc
} from '../../../../worker/src/product-artifacts';
import { renderProductWebExport, WEB_EXPORT_VERSION } from './product-export';
import { workflowArtifacts } from './workflow-artifacts';

it('renders a real report, stores its bytes and recovers through the owner API; revocation and deletion remain authoritative', async () => {
	const db = await setupProductDatabase();
	try {
		await db.exec(await file('supabase/migrations/20260915180000_product_artifacts.sql'));
		const reading = await readyArtifactFixture(db);
		await db.exec('update product_artifact_policy set enabled=true');
		const query = async (
			role: string,
			user: string | null,
			name: string,
			args: Record<string, unknown>
		) =>
			(
				await asRole(db, role, user, () =>
					db.query<{ data: unknown }>(
						`select ${name}(${Object.keys(args)
							.map((key, i) => key + ' => $' + (i + 1))
							.join(',')}) as data`,
						Object.values(args)
					)
				)
			).rows[0].data;
		const run = await query('authenticated', owner, 'read_product_run', { p_id: reading.id });
		const report = renderProductWebExport(run);
		expect(report).not.toBeNull();
		const input = {
			owner,
			reading,
			format: 'web' as const,
			section: -1,
			rendererVersion: WEB_EXPORT_VERSION,
			bytes: new TextEncoder().encode(report!.html)
		};
		const writer: ArtifactRpc = async (name, args, signal) => {
			signal.throwIfAborted();
			return query('service_role', null, name, args);
		};
		const saved = await persistRenderedProductArtifact(writer, input);
		expect(await persistRenderedProductArtifact(writer, input)).toEqual(saved);
		const event = (user = owner) => {
			const url = new URL(`http://localhost/api/workflows/${reading.id}/artifacts`);
			return {
				url,
				request: new Request(url),
				locals: {
					supabase: {
						auth: { getClaims: async () => ({ data: { claims: { sub: user } }, error: null }) },
						rpc: async (name: string, args: Record<string, unknown>) => ({
							data: await query('authenticated', user, name, args),
							error: null
						})
					}
				}
			} as unknown as RequestEvent;
		};
		expect(await (await workflowArtifacts(event(), reading.id)).json()).toEqual({
			artifacts: [saved]
		});
		expect(await (await workflowArtifacts(event(), reading.id, saved.id)).text()).toBe(
			report!.html
		);
		expect((await workflowArtifacts(event(other), reading.id, saved.id)).status).toBe(404);
		await db.exec('update editorial_promotions set revoked_at=now()');
		expect((await workflowArtifacts(event(), reading.id, saved.id)).status).toBe(404);
		await db.exec('update editorial_promotions set revoked_at=null');
		expect(await (await workflowArtifacts(event(), reading.id, saved.id)).text()).toBe(
			report!.html
		);
		await db.exec('update product_artifact_policy set enabled=false');
		expect(await (await workflowArtifacts(event(), reading.id)).json()).toEqual({ artifacts: [] });
		expect((await workflowArtifacts(event(), reading.id, saved.id)).status).toBe(404);
		await query('authenticated', owner, 'delete_product_run', { p_id: reading.id });
		expect(
			(await db.query<{ n: number }>('select count(*)::int as n from product_artifacts')).rows[0].n
		).toBe(0);
		expect((await workflowArtifacts(event(), reading.id, saved.id)).status).toBe(404);
	} finally {
		await db.close();
	}
}, 30000);
