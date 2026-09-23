import { randomUUID } from 'node:crypto';
import { expect, it } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { workflowFor, type WorkflowInput, type CalculationSnapshot } from '@atv/domain';
import { SCHEMA_VERSION } from '../../../../../packages/ai/src/contracts';
import {
	dimensions,
	RUBRIC_VERSION,
	type ScoredReview
} from '../../../../../packages/ai/src/director';
import {
	setupProductDatabase,
	owner,
	other,
	file
} from '../../../../../scripts/helpers/product-database.mjs';
import { asRole } from '../../../../../scripts/helpers/artifact-fixture.mjs';
import { createProductProcessor } from '../../../../worker/src/product-runtime';
import { createProductPublisher } from '../../../../worker/src/product-publication';
import { prepareProductFacts } from '../../../../worker/src/product-editorial';
import { prepareProductDelivery } from '../../../../worker/src/product-delivery';
import {
	evaluateProductDelivery,
	DELIVERY_REVIEW_VERSION
} from '../../../../worker/src/product-delivery-review';
import { parseProductRun } from '../product-run';
import { createArtifactProducer } from './product-artifact-producer';
import { renderProductWebExport } from './product-export';
import { workflowApi } from './workflow-api';
import { workflowArtifacts } from './workflow-artifacts';

// Six representative bases, not a claim that all 25 products are finished/homologated.
const products = [
	'birth-chart',
	'date-reading',
	'pair-preview',
	'daily-card',
	'midheaven',
	'dream-reading'
];
interface FixtureRun {
	id: string;
	input: WorkflowInput;
	calculation: CalculationSnapshot;
	editorial: unknown;
	editorial_receipt_id: string | null;
	contract_version: string;
	revision: number;
}
const allowedRpc = new Set([
	'request_product_run',
	'read_product_run',
	'delete_product_run',
	'claim_product_run_work',
	'complete_product_run_work',
	'fail_product_run_work',
	'claim_product_editorial',
	'complete_product_editorial',
	'persist_product_artifact',
	'list_product_artifacts',
	'read_product_artifact'
]);

function inputFor(productId: string): WorkflowInput {
	const kind = workflowFor(productId)!.kind;
	const birth = {
		localDateTime: '2000-01-01T12:00:00',
		utcInstant: '2000-01-01T12:00:00Z',
		timezone: 'UTC',
		latitude: 0,
		longitude: 0,
		locationSource: 'synthetic'
	};
	return {
		version: 'atv-workflow/1.0.0',
		productId,
		consent: {
			storage: true,
			policyVersion: 'atv-input-consent/1',
			partner: kind === 'relationship',
			continuity: false
		},
		...(['natal', 'cycles', 'relationship', 'purpose'].includes(kind) ? { birth } : {}),
		...(kind === 'cycles' ? { targetDate: '2026-09-20' } : {}),
		...(kind === 'relationship' ? { partner: { ...birth, latitude: 10 } } : {}),
		...(kind === 'tarot' ? { questions: ['Qual aspecto posso observar?'] } : {}),
		...(kind === 'dream'
			? {
					dream: {
						date: '2026-09-20',
						narrative: 'Relato sintético: uma porta azul.',
						associations: ['mudança'],
						emotions: ['curiosidade']
					}
				}
			: {}),
		context: 'Contexto sintético <script>alert("fixture")</script>'
	};
}

async function fixture(productId: string) {
	const db = await setupProductDatabase({ processing: true });
	try {
		await db.exec(await file('supabase/migrations/20260915180000_product_artifacts.sql'));
		await db.exec(
			await file('supabase/migrations/20260923110000_product_editorial_publication.sql')
		);
		// DB-owner fixtures only: no provider/eval/reviewer authority is certified here.
		await db.query(
			"update workflow_releases set enabled=true,engine_approved=true,access_policy='free' where product_id=$1",
			[productId]
		);
		const query = async (
			role: string,
			user: string | null,
			name: string,
			args: Record<string, unknown>
		) => {
			if (!allowedRpc.has(name)) throw new Error('unexpected_fixture_rpc');
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
		const event = (user = owner, body?: unknown) => {
			const url = new URL('http://localhost/api/workflows');
			return {
				url,
				request: new Request(
					url,
					body === undefined
						? {}
						: {
								method: 'POST',
								headers: { origin: url.origin, 'content-type': 'application/json' },
								body: JSON.stringify(body)
							}
				),
				locals: {
					supabase: {
						auth: { getClaims: async () => ({ data: { claims: { sub: user } }, error: null }) },
						rpc: async (name: string, args: Record<string, unknown>) => {
							try {
								return { data: await query('authenticated', user, name, args), error: null };
							} catch (error) {
								return {
									data: null,
									error: { message: error instanceof Error ? error.message : 'fixture_error' }
								};
							}
						}
					}
				}
			} as unknown as RequestEvent;
		};
		const rpc = async (name: string, args: Record<string, unknown>, signal: AbortSignal) => {
			signal.throwIfAborted();
			return query('service_role', null, name, args);
		};
		const processor = createProductProcessor(rpc, { enabledProducts: [productId] });
		const publisher = createProductPublisher(rpc, { enabledProducts: [productId] });
		const read = async (id: string) =>
			parseProductRun(await query('authenticated', owner, 'read_product_run', { p_id: id }));
		// A deliberately synthetic approval, inserted as the test database owner, never through service RPC.
		const approve = async (id: string) => {
			const r = (await db.query<FixtureRun>('select * from product_runs where id=$1', [id]))
				.rows[0];
			const promotionId = 'fixture-' + randomUUID(),
				receiptId = randomUUID();
			const facts = prepareProductFacts(productId, r.calculation);
			if (facts.status !== 'prepared') throw new Error('fixture_invalid_facts');
			const draft = {
				runId: id,
				revision: r.revision,
				productId,
				tier: 'free' as const,
				calculation: r.calculation,
				output: {
					schemaVersion: SCHEMA_VERSION,
					capability: facts.facts.capability,
					scope: 'partial',
					title: 'Leitura sintética de integração',
					claims: [
						{
							id: 'c1',
							kind: 'fact',
							text: r.calculation.facts[0].display,
							evidence: [r.calculation.facts[0].id]
						}
					],
					relations: [],
					synthesis: [
						{ claimIds: ['c1'], text: 'Síntese sintética, sem interpretação homologada.' }
					],
					reflections: ['Que associação pessoal aparece nesse recorte?'],
					limits: [
						'Aprovação fictícia somente para verificar persistência, permissões e recuperação.'
					]
				}
			};
			const candidate = await prepareProductDelivery(draft);
			if (candidate.status !== 'prepared_for_review') throw new Error('fixture_invalid_delivery');
			// Synthetic two-pass review tests the gate, never actual reviewer authentication/quality.
			const score = (outputDigest: string): ScoredReview => ({
				rubricVersion: RUBRIC_VERSION,
				outputDigest,
				reviewer: 'fixture-reviewer',
				source: 'human',
				calibrationId: null,
				scores: Object.fromEntries(dimensions.map((d) => [d, 10])) as ScoredReview['scores'],
				evidence: Object.fromEntries(
					dimensions.map((d) => [d, 'Fixture de integração; não calibra qualidade.'])
				) as ScoredReview['evidence']
			});
			const review = {
				version: DELIVERY_REVIEW_VERSION,
				basisDigest: candidate.basisDigest,
				deliveryDigest: candidate.deliveryDigest,
				draftReview: score(candidate.outputDigest),
				deliveryReview: score(candidate.deliveryDigest)
			};
			const authority = { reviewers: ['fixture-reviewer'], calibrations: [] };
			expect((await evaluateProductDelivery(draft, review)).reason).toBe('reviewer_not_authorized');
			const assessed = await evaluateProductDelivery(draft, review, {
				draft: authority,
				delivery: authority
			});
			if (
				assessed.status !== 'reviewed_delivery_candidate' ||
				!assessed.content ||
				!assessed.reviewDigest
			)
				throw new Error('fixture_invalid_review');
			expect(assessed.publication).toBe('blocked');
			// Test DB-owner issuance only. The audit digest does NOT authenticate this fixture review.
			const editorial = {
				...assessed.content,
				promotionId,
				reviewDigest: assessed.reviewDigest
			};
			await db.query('insert into editorial_promotions values ($1,$2,$3,$4,null)', [
				promotionId,
				productId,
				r.contract_version,
				'b'.repeat(64)
			]);
			await db.query(
				`insert into product_editorial_receipts(id,run_id,revision,calculation,editorial,promotion_id,
        promotion_evidence_digest,basis_digest,review_digest,authority_reference,expires_at)
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9,'synthetic-vertical-test',now()+interval '1 hour')`,
				[
					receiptId,
					id,
					r.revision,
					r.calculation,
					editorial,
					promotionId,
					'b'.repeat(64),
					candidate.basisDigest,
					assessed.reviewDigest
				]
			);
			return receiptId;
		};
		const producer = createArtifactProducer(
			{
				read: (user, id, signal) => {
					signal.throwIfAborted();
					return query('authenticated', user, 'read_product_run', { p_id: id });
				},
				persist: rpc
			},
			{ enabled: true }
		);
		const store = async (id: string) => {
			const run = await read(id);
			if (!run?.editorial) throw new Error('fixture_unreleased');
			const result = await producer.produce({
				owner,
				runId: id,
				revision: run.revision,
				reviewDigest: run.editorial.reviewDigest,
				format: 'web',
				section: -1
			});
			if (result.status !== 'stored') throw new Error('fixture_not_stored');
			return result.artifact;
		};
		return { db, event, processor, publisher, read, approve, store };
	} catch (error) {
		await db.close();
		throw error;
	}
}

for (const productId of products)
	it(`${productId}: real base → private publication → persisted web → owner history → independently reviewed reprocessing`, async () => {
		const f = await fixture(productId);
		try {
			const body = { requestKey: randomUUID(), input: inputFor(productId) };
			const created = await workflowApi(f.event(owner, body), 'create');
			expect(created.status).toBe(202);
			const { runId } = (await created.json()) as { runId: string };
			expect(await (await workflowApi(f.event(owner, body), 'create')).json()).toEqual({ runId });
			expect((await workflowApi(f.event(other), 'read', runId)).status).toBe(404);
			expect(await f.processor.step()).toBe('calculated');
			expect(await f.processor.step()).toBe('awaiting_editorial');
			expect(await f.publisher.step()).toBe('idle');
			await f.db.exec(
				'update product_editorial_policy set enabled=true; update product_artifact_policy set enabled=true'
			);
			expect(await f.publisher.step()).toBe('idle'); // Policy does not substitute for review.
			const parentReceipt = await f.approve(runId);
			expect(await f.publisher.step()).toBe('published');
			const parent = await f.read(runId);
			expect(parent?.released).toBe(true);
			expect(parent?.libraryItemId).toBeTruthy();
			expect(parent?.history.map((e) => e.state)).toEqual([
				'QUEUED',
				'CALCULATED',
				'AWAITING_EDITORIAL',
				'READY'
			]);
			const artifact = await f.store(runId);
			expect(await f.store(runId)).toEqual(artifact);
			const response = await workflowArtifacts(f.event(), runId, artifact.id);
			expect(response.status).toBe(200);
			expect(response.headers.get('cache-control')).toBe('private, no-store');
			const html = await response.text();
			expect(html).toBe(renderProductWebExport(parent)?.html);
			expect(html).toContain('&lt;script&gt;');
			expect(html).not.toContain('<script>');
			expect(html).toContain('Síntese sintética, sem interpretação homologada.');
			expect(html).toContain('Que associação pessoal aparece nesse recorte?');
			expect(html).toContain('Escopo declarado: parcial.');
			expect((await workflowArtifacts(f.event(other), runId, artifact.id)).status).toBe(404);
			const listed = (await (await workflowArtifacts(f.event(), runId)).json()) as {
				artifacts: unknown[];
			};
			expect(listed.artifacts).toHaveLength(1);

			const requestKey = randomUUID();
			expect((await workflowApi(f.event(other, { requestKey }), 'reprocess', runId)).status).toBe(
				404
			);
			const reprocessed = await workflowApi(f.event(owner, { requestKey }), 'reprocess', runId);
			expect(reprocessed.status).toBe(202);
			const { runId: childId } = (await reprocessed.json()) as { runId: string };
			expect(childId).not.toBe(runId);
			expect(
				await (await workflowApi(f.event(owner, { requestKey }), 'reprocess', runId)).json()
			).toEqual({ runId: childId });
			const childBefore = await f.read(childId);
			expect(childBefore?.parentId).toBe(runId);
			expect(childBefore?.released).toBe(false);
			const rows = (
				await f.db.query<FixtureRun>(
					'select id,input,calculation,editorial,editorial_receipt_id from product_runs where id=any($1)',
					[[runId, childId]]
				)
			).rows;
			const source = rows.find((r) => r.id === runId)!,
				child = rows.find((r) => r.id === childId)!;
			expect(child.input).toEqual(source.input);
			expect(child.editorial).toBeNull();
			expect(child.editorial_receipt_id).toBeNull();
			if (productId === 'daily-card') expect(child.calculation).toEqual(source.calculation);
			else expect(await f.processor.step()).toBe('calculated');
			expect(await f.processor.step()).toBe('awaiting_editorial');
			expect(await f.publisher.step()).toBe('idle');
			expect((await workflowArtifacts(f.event(), childId, artifact.id)).status).toBe(404);
			const childReceipt = await f.approve(childId);
			expect(childReceipt).not.toBe(parentReceipt);
			expect(await f.publisher.step()).toBe('published');
			const childArtifact = await f.store(childId);
			expect(childArtifact.id).not.toBe(artifact.id);
			expect((await workflowArtifacts(f.event(), childId, artifact.id)).status).toBe(404);

			await f.db.query('update product_editorial_receipts set revoked_at=now() where id=$1', [
				parentReceipt
			]);
			expect((await f.read(runId))?.released).toBe(false);
			expect((await workflowArtifacts(f.event(), runId, artifact.id)).status).toBe(404);
			expect((await f.read(childId))?.released).toBe(true);
			expect((await workflowArtifacts(f.event(), childId, childArtifact.id)).status).toBe(200);
			expect((await workflowApi(f.event(owner, {}), 'delete', runId)).status).toBe(200);
			expect(await f.read(runId)).toBeNull();
			expect((await f.read(childId))?.parentId).toBeNull();
			expect((await workflowArtifacts(f.event(), childId, childArtifact.id)).status).toBe(200);
			expect((await workflowApi(f.event(owner, {}), 'delete', childId)).status).toBe(200);
			for (const table of [
				'product_runs',
				'product_editorial_receipts',
				'product_editorial_work',
				'product_artifacts'
			])
				expect(
					(await f.db.query<{ n: number }>(`select count(*)::int as n from ${table}`)).rows[0].n
				).toBe(0);
		} finally {
			await f.db.close();
		}
	}, 30000);
