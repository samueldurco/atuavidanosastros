import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import type { RequestEvent } from '@sveltejs/kit';
import {
	artifactEligible,
	artifactFormats,
	type ArtifactFormat,
	type WorkflowInput
} from '@atv/domain';
import {
	setupProductDatabase,
	owner,
	other,
	file
} from '../../../../../scripts/helpers/product-database.mjs';
import { asRole } from '../../../../../scripts/helpers/artifact-fixture.mjs';
import { createNatalCalculators } from '../../../../worker/src/natal-calculators';
import { createCoupleDossierCalculators } from '../../../../worker/src/couple-dossier-calculators';
import { createWeekReadingCalculators } from '../../../../worker/src/week-reading-calculators';
import { weekReadingEditorialTestFixture } from '../../../../../scripts/helpers/week-reading-editorial-test-fixture.mjs';
import { coupleDossierEditorialTestFixture } from '../../../../../scripts/helpers/couple-dossier-editorial-test-fixture.mjs';
import { validateCalculation } from '../../../../worker/src/product-processing';
import { SCHEMA_VERSION } from '../../../../../packages/ai/src/contracts';
import { prepareProductFacts } from '../../../../worker/src/product-editorial';
import { prepareProductDelivery } from '../../../../worker/src/product-delivery';
import { birthChartEditorialTestFixture } from '../../../../../scripts/helpers/career-editorial-test-fixture.mjs';
import { parseProductRun } from '../product-run';
import { createArtifactProducer, type ArtifactJob } from './product-artifact-producer';
import { renderProductPdf } from './product-pdf';
import { renderProductSvg } from './product-svg';
import { renderProductCard } from './product-card';
import { renderProductWebExport } from './product-export';
import { workflowArtifacts } from './workflow-artifacts';

// Local PGlite only: synthetic identity/editorial approval, real natal calculator and renderers.
// This does not certify a model, hosted JWT/PostgREST, transport or a production release.
async function fixture(
	product = 'birth-chart',
	latitude = 0,
	completeBirthScope = false,
	withContext = true
) {
	const db = await setupProductDatabase();
	try {
		await db.exec(await file('supabase/migrations/20260915180000_product_artifacts.sql'));
		await db.exec(await file('supabase/migrations/20261005150000_language_renderer_versions.sql'));
		await db.exec(await file('supabase/migrations/20260929020000_product_pdf_renderer_1_2.sql'));
		await db.exec(await file('supabase/migrations/20261005150000_language_renderer_versions.sql'));
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
		if (product === 'couple-dossier') {
			input.partner = {
				...input.birth!,
				localDateTime: '2001-07-03T12:00:00',
				utcInstant: '2001-07-03T12:00:00Z'
			};
			input.consent.partner = true;
			input.context = 'Contexto sintético consentido: conversar sobre autonomia e reparação.';
		}
		if (product === 'week-reading') {
			input.targetDate = '2026-09-29';
			if (withContext)
				input.context = 'Contexto sintético consentido: observar trabalho, vínculo e ritmo.';
		}
		await db.query(
			"update workflow_releases set enabled=true,engine_approved=true,access_policy='free' where product_id=$1",
			[product]
		);
		const id = (await query('authenticated', owner, 'request_product_run', {
			p_product_id: product,
			p_request_key: randomUUID(),
			p_input: input
		})) as string;
		const calculators =
			product === 'couple-dossier'
				? createCoupleDossierCalculators({
						id: 'synthetic-dossier-artifact-not-approved',
						version: 'qa-fixture-1',
						aspects: [
							{ kind: 'conjunction', orbDegrees: 5 },
							{ kind: 'square', orbDegrees: 5 }
						]
					})
				: product === 'week-reading'
					? createWeekReadingCalculators()
					: createNatalCalculators();
		const calculation = validateCalculation(
			await calculators[product](input, {
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
		if (completeBirthScope || product === 'couple-dossier' || product === 'week-reading') {
			const prepared = prepareProductFacts(product, calculation);
			if (prepared.status !== 'prepared') throw new Error('fixture_facts_failed');
			const delivery = await prepareProductDelivery({
				runId: id,
				revision: 3,
				productId: product,
				tier: product === 'couple-dossier' ? 'premium' : 'intermediate',
				calculation,
				output:
					product === 'week-reading'
						? weekReadingEditorialTestFixture(prepared.facts)
						: product === 'couple-dossier'
							? coupleDossierEditorialTestFixture(prepared.facts)
							: {
									schemaVersion: SCHEMA_VERSION,
									capability: 'natal-synthesis',
									scope: 'partial',
									title: 'Mapa Astral - prova sintética dos formatos',
									limits: ['Somente QA local; leitura e motor não homologados.'],
									...birthChartEditorialTestFixture(prepared.facts)
								}
			});
			if (delivery.status !== 'prepared_for_review') throw new Error('fixture_delivery_failed');
			Object.assign(editorial, delivery.content);
		}
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
		return { db, id, calculation, editorial, producer, job, event, read };
	} catch (error) {
		await db.close();
		throw error;
	}
}

for (const withContext of [true, false]) {
	it(`recovers complete Week PDF bytes privately with context ${withContext}`, async () => {
		const f = await fixture('week-reading', 0, false, withContext);
		try {
			const raw = await f.read(owner, f.id),
				run = parseProductRun(raw);
			expect(artifactEligible('week-reading', 'pdf')).toBe(true);
			expect(artifactEligible('week-reading', 'svg')).toBe(false);
			expect(run?.calculation?.facts).toHaveLength(withContext ? 89 : 88);
			expect(run?.editorial?.sections).toHaveLength(withContext ? 22 : 21);
			expect(run?.editorial?.sections).toEqual(f.editorial.sections);
			const pdf = await renderProductPdf(raw);
			if (!pdf || !run?.editorial || !run.calculation) throw new Error('week_pdf_render_failed');
			const document = await PDFDocument.load(pdf.bytes, { updateMetadata: false });
			expect(document.getPageCount()).toBeGreaterThan(1);
			expect(document.getPageCount()).toBeLessThanOrEqual(40);
			expect(document.getTitle()).toBe(run.editorial.title);
			expect(pdf.filename).toMatch(/^atv-week-reading-[a-f0-9-]+-r4\.pdf$/);
			expect(pdf.bytes).toEqual((await renderProductPdf(raw))?.bytes);
			if (process.env.ATV_WEEK_PDF_QA === '1') {
				const suffix = withContext ? 'context' : 'no-context';
				const directory = process.env.ATV_WEEK_PDF_QA_DIR === 'wu185' ? 'wu185' : 'wu184';
				await mkdir(`../../test-results/${directory}`, { recursive: true });
				await writeFile(`../../test-results/${directory}/week-${suffix}.pdf`, pdf.bytes);
				await writeFile(
					`../../test-results/${directory}/week-${suffix}-expected.json`,
					JSON.stringify(
						{ calculation: run.calculation, editorial: run.editorial, history: run.history },
						null,
						2
					)
				);
			}
			await f.db.exec('update product_artifact_policy set enabled=false');
			await expect(f.producer.produce(f.job('pdf'))).rejects.toThrow();
			expect(
				(
					await f.db.query<{ count: number }>(
						'select count(*)::int as count from product_artifacts'
					)
				).rows[0].count
			).toBe(0);
			await f.db.exec('update product_artifact_policy set enabled=true');
			const stored = await f.producer.produce(f.job('pdf'));
			if (stored.status !== 'stored') throw new Error('week_pdf_store_failed');
			expect(await f.producer.produce(f.job('pdf'))).toEqual(stored);
			const download = await workflowArtifacts(f.event(), f.id, stored.artifact.id);
			expect(download.status).toBe(200);
			expect(download.headers.get('content-type')).toBe('application/pdf');
			expect(download.headers.get('cache-control')).toBe('private, no-store');
			expect(download.headers.get('content-disposition')).toMatch(/^attachment;/);
			expect(download.headers.get('x-atv-artifact-sha256')).toBe(stored.artifact.sha256);
			expect(new Uint8Array(await download.arrayBuffer())).toEqual(pdf.bytes);
			expect((await workflowArtifacts(f.event(other), f.id, stored.artifact.id)).status).toBe(404);
			await expect(f.producer.produce({ ...f.job('pdf'), revision: 3 })).rejects.toThrow();
			await expect(
				f.producer.produce({ ...f.job('pdf'), reviewDigest: 'c'.repeat(64) })
			).rejects.toThrow();
			await expect(f.producer.produce({ ...f.job('pdf'), owner: other })).rejects.toThrow();
			const listed = (await (await workflowArtifacts(f.event(), f.id)).json()) as {
				artifacts: { id: string }[];
			};
			expect(listed.artifacts).toHaveLength(1);
			expect(listed.artifacts[0].id).toBe(stored.artifact.id);
			await f.db.exec(await file('supabase/forward-fixes/disable_week_reading_pdf_artifacts.sql'));
			await expect(f.producer.produce(f.job('pdf'))).rejects.toThrow();
			const savedAfterFix = await workflowArtifacts(f.event(), f.id, stored.artifact.id);
			expect(savedAfterFix.status).toBe(200);
			expect(new Uint8Array(await savedAfterFix.arrayBuffer())).toEqual(pdf.bytes);
			await f.db.exec(
				await file('supabase/migrations/20261005150000_language_renderer_versions.sql')
			);
			expect(await f.producer.produce(f.job('pdf'))).toEqual(stored);
			await f.db.exec("update workflow_releases set enabled=false where product_id='week-reading'");
			expect((await workflowArtifacts(f.event(), f.id, stored.artifact.id)).status).toBe(404);
			await expect(f.producer.produce(f.job('pdf'))).rejects.toThrow();
			await f.db.exec("update workflow_releases set enabled=true where product_id='week-reading'");
			await f.db.exec('update editorial_promotions set revoked_at=now()');
			expect((await workflowArtifacts(f.event(), f.id, stored.artifact.id)).status).toBe(404);
			await expect(f.producer.produce(f.job('pdf'))).rejects.toThrow();
			expect(parseProductRun(await f.read(owner, f.id))?.editorial).toBeNull();
		} finally {
			await f.db.close();
		}
	}, 30000);
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

it('recovers the full birth editorial projection and exact web, PDF and SVG artifacts privately', async () => {
	const f = await fixture('birth-chart', 0, true);
	try {
		const raw = await f.read(owner, f.id);
		const run = parseProductRun(raw);
		expect(run?.editorial?.sections).toEqual(f.editorial.sections);
		expect(run?.editorial?.sections).toHaveLength(13);
		expect(run?.calculation?.facts).toHaveLength(24);
		const web = renderProductWebExport(raw),
			pdf = await renderProductPdf(raw),
			svg = renderProductSvg(raw);
		if (!web || !pdf || !svg) throw new Error('birth_scope_render_failed');
		for (const section of f.editorial.sections) {
			expect(web.html).toContain(section.title);
			expect(web.html).toContain(section.text);
			for (const id of section.evidence) expect(web.html).toContain(`(${id})`);
		}
		for (const fact of f.calculation.facts) {
			expect(web.html).toContain(fact.display);
			expect(web.html).toContain(fact.source);
		}
		for (let i = 1; i <= 12; i++) expect(web.html).toContain(`Cúspide da Casa ${i} (house-${i})`);
		expect(web.html).toContain('Síntese do Mapa Astral (1) e três perguntas práticas');
		expect(svg.svg.match(/data-body=/g)).toHaveLength(10);
		expect(svg.svg.match(/data-house=/g)).toHaveLength(12);
		expect(svg.svg.match(/data-angle=/g)).toHaveLength(2);
		if (process.env.ATV_BIRTH_QA === '1') {
			await mkdir('../../test-results/wu124', { recursive: true });
			await writeFile('../../test-results/wu124/birth-chart.pdf', pdf.bytes);
			await writeFile('../../test-results/wu124/birth-chart.html', web.html);
			await writeFile('../../test-results/wu124/birth-chart.svg', svg.svg);
			await writeFile(
				'../../test-results/wu124/delivery.json',
				JSON.stringify(f.editorial, null, 2)
			);
		}
		const encoded = new TextEncoder();
		const expected = {
			web: encoded.encode(web.html),
			pdf: pdf.bytes,
			svg: encoded.encode(svg.svg)
		};
		const ids: string[] = [];
		for (const format of ['web', 'pdf', 'svg'] as const) {
			const result = await f.producer.produce(f.job(format));
			if (result.status !== 'stored') throw new Error('birth_scope_store_failed');
			ids.push(result.artifact.id);
			expect(await f.producer.produce(f.job(format))).toEqual(result);
			const response = await workflowArtifacts(f.event(), f.id, result.artifact.id);
			expect(response.status).toBe(200);
			expect(response.headers.get('content-type')).toBe(artifactFormats[format].mime);
			expect(new Uint8Array(await response.arrayBuffer())).toEqual(expected[format]);
			expect((await workflowArtifacts(f.event(other), f.id, result.artifact.id)).status).toBe(404);
		}
		await f.db.exec('update editorial_promotions set revoked_at=now()');
		for (const id of ids) expect((await workflowArtifacts(f.event(), f.id, id)).status).toBe(404);
		expect(parseProductRun(await f.read(owner, f.id))?.editorial).toBeNull();
	} finally {
		await f.db.close();
	}
}, 30000);

it('recovers the complete synthetic Dossier web/PDF bytes privately and withholds them after revocation', async () => {
	const f = await fixture('couple-dossier');
	try {
		const raw = await f.read(owner, f.id),
			run = parseProductRun(raw);
		expect(run?.calculation?.facts).toHaveLength(121);
		expect(run?.editorial?.sections).toHaveLength(35);
		expect(run?.editorial?.sections).toEqual(f.editorial.sections);
		const web = renderProductWebExport(raw),
			pdf = await renderProductPdf(raw);
		if (!web || !pdf) throw new Error('dossier_scope_render_failed');
		for (const section of f.editorial.sections) {
			expect(web.html).toContain(section.title);
			expect(web.html).toContain(section.text);
		}
		for (const fact of f.calculation.facts) {
			expect(web.html).toContain(fact.id);
			expect(web.html).toContain(fact.display);
			expect(web.html).toContain(fact.source);
		}
		const expected = { web: new TextEncoder().encode(web.html), pdf: pdf.bytes };
		const ids: string[] = [];
		for (const format of ['web', 'pdf'] as const) {
			const result = await f.producer.produce(f.job(format));
			if (result.status !== 'stored') throw new Error('dossier_scope_store_failed');
			ids.push(result.artifact.id);
			expect(await f.producer.produce(f.job(format))).toEqual(result);
			const response = await workflowArtifacts(f.event(), f.id, result.artifact.id);
			expect(response.status).toBe(200);
			expect(response.headers.get('cache-control')).toBe('private, no-store');
			expect(response.headers.get('x-atv-artifact-sha256')).toBe(result.artifact.sha256);
			expect(new Uint8Array(await response.arrayBuffer())).toEqual(expected[format]);
			expect((await workflowArtifacts(f.event(other), f.id, result.artifact.id)).status).toBe(404);
		}
		await f.db.exec('update editorial_promotions set revoked_at=now()');
		for (const id of ids) expect((await workflowArtifacts(f.event(), f.id, id)).status).toBe(404);
		expect(parseProductRun(await f.read(owner, f.id))?.editorial).toBeNull();
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
