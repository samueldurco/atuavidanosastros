import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { expect, it } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { artifactFormats, type ArtifactFormat, type WorkflowInput } from '@atv/domain';
import {
	setupProductDatabase,
	owner,
	other,
	file
} from '../../../../../scripts/helpers/product-database.mjs';
import { asRole } from '../../../../../scripts/helpers/artifact-fixture.mjs';
import { createNatalCalculators } from '../../../../worker/src/natal-calculators';
import { validateCalculation } from '../../../../worker/src/product-processing';
import { parseProductRun } from '../product-run';
import { createArtifactProducer, type ArtifactJob } from './product-artifact-producer';
import { renderProductPdf } from './product-pdf';
import { renderProductSvg } from './product-svg';
import { renderProductCard } from './product-card';
import { workflowArtifacts } from './workflow-artifacts';

// Local PGlite only: synthetic identity/editorial approval, real natal calculator and renderers.
// This does not certify a model, hosted JWT/PostgREST, transport or a production release.
async function fixture(product = 'birth-chart', latitude = 0) {
	const db = await setupProductDatabase();
	try {
		await db.exec(await file('supabase/migrations/20260915180000_product_artifacts.sql'));
		const query = async (
			role: string,
			user: string | null,
			name: string,
			args: Record<string, unknown>
		) => {
			const result = await asRole(db, role, user, () =>
				db.query<{ data: unknown }>(
					`select ${name}(${Object.keys(args)
						.map((key, i) => `${key} => $${i + 1}`)
						.join(',')}) as data`,
					Object.values(args)
				)
			);
			return result.rows[0].data;
		};
		const input: WorkflowInput = {
			version: 'atv-workflow/1.0.0',
			productId: product,
			birth: {
				localDateTime: '2000-01-01T12:00:00',
				utcInstant: '2000-01-01T12:00:00Z',
				timezone: 'UTC',
				latitude,
				longitude: 0,
				locationSource: 'synthetic'
			},
			consent: {
				storage: true,
				policyVersion: 'atv-input-consent/1',
				partner: false,
				continuity: false
			}
		};
		await db.query(
			"update workflow_releases set enabled=true,engine_approved=true,access_policy='free' where product_id=$1",
			[product]
		);
		const id = (await query('authenticated', owner, 'request_product_run', {
			p_product_id: product,
			p_request_key: randomUUID(),
			p_input: input
		})) as string;
		const calculation = validateCalculation(
			await createNatalCalculators()[product](input, {
				runId: id,
				signal: new AbortController().signal
			}),
			product
		);
		if (!calculation) throw new Error('fixture_calculation_failed');
		const promotion = `fixture-${randomUUID()}`;
		await db.query('insert into editorial_promotions values ($1,$2,$3,$4,null)', [
			promotion,
			product,
			input.version,
			'b'.repeat(64)
		]);
		const editorial = {
			version: 'fixture/1',
			promotionId: promotion,
			reviewDigest: 'a'.repeat(64),
			title: 'QA sintético de arquivos',
			sections: [
				{
					title: 'Base experimental',
					text: 'Texto sintético para verificar transporte integral. Não constitui interpretação homologada.',
					evidence: [calculation.facts[0].id]
				}
			],
			limits: ['Somente QA local; nenhum modelo homologado.']
		};
		for (const [revision, state, calc, edit] of [
			[1, 'CALCULATED', calculation, null],
			[2, 'AWAITING_EDITORIAL', null, null],
			[3, 'READY', null, editorial]
		]) {
			await asRole(db, 'service_role', null, () =>
				db.query('select advance_product_run($1,$2,$3,$4,$5,$6)', [
					id,
					owner,
					revision,
					state,
					calc,
					edit
				])
			);
		}
		await db.exec('update product_artifact_policy set enabled=true');
		const read = (user: string, runId: string) =>
			query('authenticated', user, 'read_product_run', { p_id: runId });
		const producer = createArtifactProducer(
			{ read, persist: (name, args) => query('service_role', null, name, args) },
			{ enabled: true }
		);
		const job = (format: ArtifactFormat): ArtifactJob => ({
			owner,
			runId: id,
			revision: 4,
			reviewDigest: editorial.reviewDigest,
			format,
			section: format === 'card' ? 0 : -1
		});
		const event = (user = owner) => {
			const url = new URL(`http://localhost/api/workflows/${id}/artifacts`);
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
		return { db, id, calculation, producer, job, event, read };
	} catch (error) {
		await db.close();
		throw error;
	}
}

it('persists and privately recovers exact PDF, SVG and card bytes from a real natal calculation', async () => {
	const f = await fixture();
	try {
		const raw = await f.read(owner, f.id);
		const run = parseProductRun(raw);
		expect(run?.released).toBe(true);
		expect(run?.cartography?.positions).toEqual(
			(f.calculation.data.positions as { body: string; longitude: number }[]).map((p) => ({
				body: p.body,
				longitude: p.longitude
			}))
		);
		const pdf = await renderProductPdf(raw),
			svg = renderProductSvg(raw),
			card = renderProductCard(raw, 0);
		expect({ pdf: !!pdf, svg: !!svg, card: !!card }).toEqual({ pdf: true, svg: true, card: true });
		if (!pdf || !svg || !card) throw new Error('fixture_render_failed');
		if (process.env.ATV_ARTIFACT_QA === '1') {
			await mkdir('../../test-results/wu044', { recursive: true });
			await writeFile('../../test-results/wu044/natal.pdf', pdf.bytes);
			await writeFile('../../test-results/wu044/natal.svg', svg.svg);
			await writeFile('../../test-results/wu044/card.svg', card.svg);
		}
		const encoded = new TextEncoder();
		const expected = {
			pdf: pdf.bytes,
			svg: encoded.encode(svg.svg),
			card: encoded.encode(card.svg)
		};
		const ids: string[] = [];
		for (const format of ['pdf', 'svg', 'card'] as const) {
			const result = await f.producer.produce(f.job(format));
			if (result.status !== 'stored') throw new Error('fixture_store_failed');
			ids.push(result.artifact.id);
			expect(await f.producer.produce(f.job(format))).toEqual(result);
			const response = await workflowArtifacts(f.event(), f.id, result.artifact.id);
			expect(response.status).toBe(200);
			expect(response.headers.get('content-type')).toBe(artifactFormats[format].mime);
			expect(response.headers.get('cache-control')).toBe('private, no-store');
			expect(response.headers.get('content-disposition')).toMatch(/^attachment;/);
			expect(response.headers.get('content-security-policy')).toContain('sandbox');
			expect(response.headers.get('x-atv-artifact-sha256')).toBe(result.artifact.sha256);
			expect(new Uint8Array(await response.arrayBuffer())).toEqual(expected[format]);
			expect((await workflowArtifacts(f.event(other), f.id, result.artifact.id)).status).toBe(404);
		}
		expect(new TextDecoder().decode(pdf.bytes.slice(0, 5))).toBe('%PDF-');
		for (const p of run!.cartography!.positions)
			expect(svg.svg).toContain(`data-body="${p.body}" data-longitude="${p.longitude}"`);
		expect(svg.svg).toContain('data-house="12"');
		const visible = [...card.svg.matchAll(/<text[^>]*>(.*?)<\/text>/g)]
			.map((m) => m[1].replace(/<[^>]*>/g, ''))
			.join(' ')
			.replace(/\s/g, '');
		expect(visible).toContain(
			'Texto sintético para verificar transporte integral.'.replace(/\s/g, '')
		);
		for (const limit of f.calculation.limits) expect(visible).toContain(limit.replace(/\s/g, ''));
		expect(card.svg).toContain('<tspan class="display">Δ</tspan>');
		const list = (await (await workflowArtifacts(f.event(), f.id)).json()) as {
			artifacts: { id: string }[];
		};
		expect(list.artifacts.map((a: { id: string }) => a.id).sort()).toEqual(ids.sort());
		await f.db.exec('update editorial_promotions set revoked_at=now()');
		for (const id of ids) expect((await workflowArtifacts(f.event(), f.id, id)).status).toBe(404);
	} finally {
		await f.db.close();
	}
}, 30000);

it('preserves polar geometry exclusions in stored SVG instead of inventing houses or Ascendant', async () => {
	const f = await fixture('birth-chart', 80);
	try {
		const result = await f.producer.produce(f.job('svg'));
		if (result.status !== 'stored') throw new Error('fixture_store_failed');
		const response = await workflowArtifacts(f.event(), f.id, result.artifact.id);
		expect(response.status).toBe(200);
		const svg = await response.text();
		expect(svg).not.toContain('data-house=');
		expect(svg).not.toContain('data-angle="ascendant"');
		expect(svg).toContain('data-angle="midheaven"');
		expect(svg.match(/data-body=/g)).toHaveLength(10);
		expect(f.calculation.status).toBe('experimental');
		expect(f.calculation.data.provenance).toMatchObject({
			contract: { productionPromotion: false }
		});
		await f.db.exec('update product_artifact_policy set enabled=false');
		expect((await workflowArtifacts(f.event(), f.id, result.artifact.id)).status).toBe(404);
		await expect(f.producer.produce(f.job('svg'))).rejects.toThrow('artifact_unavailable');
	} finally {
		await f.db.close();
	}
}, 30000);

it('refuses ineligible formats and corrupted stored bodies without issuing a download', async () => {
	const f = await fixture('ascendant');
	try {
		await expect(f.producer.produce(f.job('pdf'))).rejects.toThrow('artifact_unavailable');
		await expect(f.producer.produce({ ...f.job('card'), section: 1 })).rejects.toThrow(
			'artifact_unavailable'
		);
		expect((await f.db.query('select id from product_artifacts')).rows).toHaveLength(0);
		const result = await f.producer.produce(f.job('svg'));
		if (result.status !== 'stored') throw new Error('fixture_store_failed');
		const stored = await f.db.query<{ body: Uint8Array }>(
			'select body from product_artifacts where id=$1',
			[result.artifact.id]
		);
		const original = stored.rows[0].body;
		// Simulate corruption below the privileged API; the same length must still fail SHA-256.
		await f.db.query('update product_artifacts set body=set_byte(body,0,65) where id=$1', [
			result.artifact.id
		]);
		const broken = await workflowArtifacts(f.event(), f.id, result.artifact.id);
		expect(broken.status).toBe(503);
		expect(broken.headers.get('content-disposition')).toBeNull();
		expect(await broken.json()).toEqual({ error: 'artifact_unavailable' });
		await expect(f.producer.produce(f.job('svg'))).rejects.toThrow();
		await f.db.query('update product_artifacts set body=$1 where id=$2', [
			original,
			result.artifact.id
		]);
		expect((await workflowArtifacts(f.event(), f.id, result.artifact.id)).status).toBe(200);
	} finally {
		await f.db.close();
	}
}, 30000);
