import { expect, it } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import {
	setupProductDatabase,
	owner,
	other,
	file
} from '../../../../../scripts/helpers/product-database.mjs';
import { asRole, readyArtifactFixture } from '../../../../../scripts/helpers/artifact-fixture.mjs';
import type { ArtifactRpc } from '../../../../worker/src/product-artifacts';
import { renderProductWebExport } from './product-export';
import { createArtifactProducer } from './product-artifact-producer';
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
			runId: reading.id,
			revision: reading.revision,
			reviewDigest: reading.reviewDigest,
			format: 'web' as const,
			section: -1
		};
		const writer: ArtifactRpc = async (name, args, signal) => {
			signal.throwIfAborted();
			return query('service_role', null, name, args);
		};
		const producer = createArtifactProducer(
			{
				read: (user, id) => query('authenticated', user, 'read_product_run', { p_id: id }),
				persist: writer
			},
			{ enabled: true }
		);
		const produced = await producer.produce(input);
		if (produced.status !== 'stored') throw new Error('fixture_production_failed');
		const saved = produced.artifact;
		expect(await producer.produce(input)).toEqual(produced);
		await expect(producer.produce({ ...input, owner: other })).rejects.toThrow(
			'artifact_unavailable'
		);
		const revokedBetweenSteps = createArtifactProducer(
			{
				read: async () => {
					await db.exec('update editorial_promotions set revoked_at=now()');
					return run;
				},
				persist: writer
			},
			{ enabled: true }
		);
		await expect(revokedBetweenSteps.produce(input)).rejects.toThrow('artifact_unavailable');
		await db.exec('update editorial_promotions set revoked_at=null');
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
