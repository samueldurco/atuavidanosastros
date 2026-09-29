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
import {
	birthChartEditorialTestFixture,
	careerEditorialTestFixture,
	ascendantEditorialTestFixture,
	midheavenEditorialTestFixture,
	tarotFocusEditorialTestFixture,
	tarotYesNoEditorialTestFixture,
	dreamJournalEditorialTestFixture,
	dateReadingEditorialTestFixture,
	pairPreviewEditorialTestFixture,
	dreamReadingEditorialTestFixture,
	threeQuestionsEditorialTestFixture,
	dailyCardEditorialTestFixture,
	threePillarsEditorialTestFixture
} from '../../../../../scripts/helpers/career-editorial-test-fixture.mjs';
import {
	createProductCalculators,
	createProductProcessor
} from '../../../../worker/src/product-runtime';
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

// All thirteen existing partial bases, not a claim that all 25 products are finished/homologated.
const products = [
	'birth-chart',
	'three-pillars',
	'ascendant',
	'date-reading',
	'pair-preview',
	'daily-card',
	'three-questions',
	'tarot-focus',
	'tarot-yes-no',
	'midheaven',
	'dream-reading',
	'dream-journal',
	'career-compass'
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
		...(kind === 'tarot'
			? {
					questions: Array.from(
						{ length: productId === 'three-questions' ? 3 : 1 },
						(_, index) => `Questão ${index + 1}: qual aspecto posso observar?`
					)
				}
			: {}),
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
			await file('supabase/migrations/20260928234000_product_artifact_renderer_versions.sql')
		);
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
				tier: productId === 'birth-chart' ? ('intermediate' as const) : ('free' as const),
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
					...careerEditorialTestFixture(facts.facts),
					...threePillarsEditorialTestFixture(facts.facts),
					...birthChartEditorialTestFixture(facts.facts),
					...ascendantEditorialTestFixture(facts.facts),
					...midheavenEditorialTestFixture(facts.facts),
					...dailyCardEditorialTestFixture(facts.facts),
					...tarotFocusEditorialTestFixture(facts.facts),
					...tarotYesNoEditorialTestFixture(facts.facts),
					...threeQuestionsEditorialTestFixture(facts.facts),
					...dreamJournalEditorialTestFixture(facts.facts),
					...dreamReadingEditorialTestFixture(facts.facts),
					limits: [
						'Aprovação fictícia somente para verificar persistência, permissões e recuperação.'
					],
					...dateReadingEditorialTestFixture(facts.facts),
					...pairPreviewEditorialTestFixture(facts.facts)
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
		const store = async (id: string, format: 'web' | 'svg' = 'web') => {
			const run = await read(id);
			if (!run?.editorial) throw new Error('fixture_unreleased');
			const result = await producer.produce({
				owner,
				runId: id,
				revision: run.revision,
				reviewDigest: run.editorial.reviewDigest,
				format,
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

it('vertical integration explicitly covers every registered partial calculator', () => {
	expect([...products].sort()).toEqual(Object.keys(createProductCalculators()).sort());
});

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
			if (productId === 'three-questions') {
				expect(parent?.editorial?.sections).toHaveLength(8);
				for (let index = 1; index <= 3; index++) {
					const question = parent?.calculation?.facts.find((f) => f.id === `question-${index}`);
					const card = parent?.calculation?.facts.find((f) => f.id === `card-${index}`);
					expect(question).toBeDefined();
					expect(card).toBeDefined();
					expect(parent?.editorial?.sections[(index - 1) * 2]).toEqual({
						title: `Pergunta ${index} e carta registrada — Fatos registrados`,
						text: `${question!.display}\n\n${card!.display}`,
						evidence: [question!.id, card!.id]
					});
					expect(html).toContain(`question-${index}-reading`);
				}
				expect(html).toContain('Convergências e tensões entre as três perguntas');
				expect(html).toContain('Síntese das Três Perguntas (1) e três perguntas práticas');
			}
			if (productId === 'career-compass') {
				expect(html).toContain('Síntese sintética sem revisão editorial.');
				for (const role of ['public-direction', 'work-possibilities', 'tension-or-excess'])
					expect(html).toContain(role);
				for (const question of [
					'Que contribuição quero observar?',
					'Em qual ambiente posso testá-la?',
					'Qual experimento reversível cabe nesta semana?'
				])
					expect(html).toContain(question);
			} else if (productId === 'three-pillars') {
				expect(html).toContain('Síntese integrada de fixture sem autoridade editorial.');
				for (const role of ['sun-moon-dynamics', 'ascendant-expression'])
					expect(html).toContain(role);
				for (const question of [
					'Que intenção quero observar?',
					'Qual necessidade pede espaço?',
					'Qual abordagem posso experimentar de modo reversível?'
				])
					expect(html).toContain(question);
			} else if (productId === 'birth-chart') {
				const persisted = (
					await f.db.query<FixtureRun>('select * from product_runs where id=$1', [runId])
				).rows[0];
				const prepared = prepareProductFacts(productId, persisted.calculation);
				if (prepared.status !== 'prepared') throw new Error('natal_facts_not_prepared');
				const fixture = birthChartEditorialTestFixture(prepared.facts);
				for (const claim of fixture.claims ?? []) {
					expect(html).toContain(claim.id);
					for (const factId of claim.evidence) expect(html).toContain(factId);
				}
				for (const question of fixture.reflections ?? []) expect(html).toContain(question);
				expect(html).toContain('Síntese de fixture cobrindo referências; sem revisão legítima.');
			} else if (productId === 'ascendant') {
				expect(parent?.editorial?.sections).toHaveLength(5);
				for (const role of ['ascendant-approach', 'ascendant-possibilities', 'ascendant-tension'])
					expect(html).toContain(role);
				for (const question of [
					'Como quero iniciar um primeiro contato?',
					'Que alternativa de iniciativa posso observar?',
					'Qual experimento reversível ajuda a ajustar minha abordagem?'
				])
					expect(html).toContain(question);
				expect(
					parent?.editorial?.sections.every(
						(section) => section.evidence.join() === 'angle-ascendant'
					)
				).toBe(true);
				expect(
					parent?.calculation?.facts
						.filter((fact) => fact.kind === 'calculated')
						.map((fact) => fact.id)
				).toEqual(['angle-ascendant']);
				expect(
					parent?.calculation?.facts.find((fact) => fact.id === 'personal-context')?.kind
				).toBe('reported');
				expect(parent?.cartography?.angles.midheaven).toBeNull();
				expect(parent?.cartography?.positions).toEqual([]);
			} else if (productId === 'midheaven') {
				expect(parent?.editorial?.sections).toHaveLength(5);
				for (const role of [
					'midheaven-contribution',
					'midheaven-possibilities',
					'midheaven-tension'
				])
					expect(html).toContain(role);
				for (const question of [
					'Que contribuição pública quero observar?',
					'Em que ambiente posso testar essa contribuição?',
					'Qual experimento reversível cabe na minha rotina?'
				])
					expect(html).toContain(question);
				expect(
					parent?.editorial?.sections.every(
						(section) => section.evidence.join() === 'angle-midheaven'
					)
				).toBe(true);
				expect(
					parent?.calculation?.facts
						.filter((fact) => fact.kind === 'calculated')
						.map((fact) => fact.id)
				).toEqual(['angle-midheaven']);
				expect(parent?.cartography).toBeNull();
			} else if (productId === 'daily-card') {
				expect(html).toContain('Síntese de cobertura da carta e pergunta; sem conteúdo aprovado.');
				expect(html).toContain('Que observação posso fazer ao testar um pequeno experimento hoje?');
				expect(parent?.editorial?.sections).toHaveLength(6);
				expect(parent?.editorial?.sections.map((section) => section.title)).toEqual([
					'Carta registrada — Fato [daily-card-fact]',
					'Pergunta relatada — Fato [daily-question-fact]',
					'Possibilidade e observação do dia — Hipótese [daily-observation]',
					'Conexão com sua pergunta — Hipótese [daily-question]',
					'Um pequeno experimento — Hipótese [daily-practice]',
					'Síntese da Carta do Dia (1) e uma pergunta prática'
				]);
				expect(
					parent?.calculation?.facts.filter((fact) => fact.kind === 'drawn').map((fact) => fact.id)
				).toEqual(['card-1']);
				expect(parent?.cartography).toBeNull();
			} else if (productId === 'tarot-focus') {
				expect(parent?.editorial?.sections.map((section) => section.title)).toEqual([
					'Carta registrada — Fato [tarot-focus-fact]',
					'Pergunta relatada — Fato [focus-question-fact]',
					'Possibilidade, tensão e alternativa — Hipótese [focus-symbol]',
					'Conexão com sua pergunta — Hipótese [focus-question]',
					'Um pequeno experimento — Hipótese [focus-practice]',
					'Síntese do Foco Agora (1) e uma pergunta prática'
				]);
				expect(html).toContain('Síntese de cobertura da carta e pergunta; sem conteúdo aprovado.');
				expect(html).toContain('Que observação posso fazer ao testar um pequeno experimento hoje?');
				expect(parent?.editorial?.sections).toHaveLength(6);
				expect(
					parent?.calculation?.facts.filter((fact) => fact.kind === 'drawn').map((fact) => fact.id)
				).toEqual(['card-1']);
				expect(parent?.cartography).toBeNull();
			} else if (productId === 'tarot-yes-no') {
				expect(parent?.editorial?.sections.map((section) => section.title)).toEqual([
					'Carta registrada — Fato [tarot-yes-no-fact]',
					'Pergunta relatada — Fato [yes-no-question-fact]',
					'Possibilidades, limites e alternativas — Hipótese [yes-no-conditions]',
					'Sua pergunta e o que verificar — Hipótese [yes-no-question]',
					'Sua escolha e um passo reversível — Hipótese [yes-no-autonomy]',
					'Síntese do Sim/Não responsável (1) e uma pergunta prática'
				]);
				expect(html).toContain('Síntese de cobertura da carta e pergunta; sem conteúdo aprovado.');
				expect(html).toContain('Que observação posso fazer ao testar um pequeno experimento hoje?');
				expect(parent?.editorial?.sections).toHaveLength(6);
				expect(
					parent?.calculation?.facts.filter((fact) => fact.kind === 'drawn').map((fact) => fact.id)
				).toEqual(['card-1']);
			} else if (productId === 'three-questions') {
				expect(html).toContain(
					'Síntese estrutural de três perguntas e cartas; sem conteúdo aprovado.'
				);
				for (const question of [
					'Que possibilidade posso observar no primeiro par?',
					'Que limite posso verificar no segundo par?',
					'Que alternativa posso testar no terceiro par?'
				])
					expect(html).toContain(question);
			} else if (productId === 'dream-journal') {
				expect(parent?.editorial?.sections).toHaveLength(7);
				for (const [index, prefix] of [
					'dream-date',
					'dream-narrative-',
					'dream-emotion-',
					'dream-association-',
					'dream-context'
				].entries()) {
					const facts = parent!.calculation!.facts.filter((fact) => fact.id.startsWith(prefix));
					expect(parent!.editorial!.sections[index].evidence).toEqual(facts.map((fact) => fact.id));
					expect(parent!.editorial!.sections[index].text).toBe(
						facts.map((fact) => fact.display).join('\n\n')
					);
				}
				expect(html).toContain('Relato sintético: uma porta azul.');
				expect(html).toContain('curiosidade');
				expect(html).toContain('mudança');
				expect(html).toContain(
					'Síntese de fixture limitada ao relato, sem consulta de histórico ou aprovação editorial.'
				);
				expect(html).toContain(
					'Que associação pessoal você gostaria de explorar a partir deste relato?'
				);
				expect(html).toContain('dream-observation');
			} else if (productId === 'dream-reading') {
				expect(parent?.editorial?.sections).toHaveLength(8);
				expect(html).toContain('Relato registrado — Fatos registrados');
				expect(html).toContain(
					'Síntese da Leitura Essencial de Sonhos (1) e duas perguntas exploratórias'
				);
				expect(html).toContain('dream-elements');
				expect(html).toContain('dream-personal-meaning');
				expect(html).toContain(
					'Síntese sintética para testar referências; histórico não consultado e recorrência não avaliada.'
				);
				expect(html).toContain(
					'Que associação pessoal você gostaria de explorar com um elemento do relato?'
				);
				expect(html).toContain('O que você gostaria de observar na sua experiência atual?');
			} else if (productId === 'date-reading') {
				expect(parent?.editorial?.sections).toHaveLength(7);
				expect(html).toContain('Base natal — Fatos registrados');
				expect(html).toContain('Amostra da data (12h UTC) — Fatos registrados');
				expect(html).toContain('Síntese da Leitura da Data (1) e três perguntas práticas');
				expect(html).toContain('date-natal-basis');
				expect(html).toContain('date-sample');
				expect(html).toContain('date-contrast');
				expect(html).toContain('Contraste simbólico sintético; não calcula aspectos ou eventos');
				expect(html).toContain('O que gostaria de observar na data escolhida?');
				expect(html).toContain('Base parcial: amostra única das 12h UTC; sem aspectos');
			} else if (productId === 'pair-preview') {
				expect(html).toContain('pair-person-a');
				expect(html).toContain('pair-person-b');
				expect(html).toContain('pair-negotiation');
				expect(html).toContain('Possibilidades sintéticas para conversa');
				expect(html).toContain('Que conversa consentida gostaria de propor?');
				expect(html).toContain('identidade e autorização bilateral não foram verificadas');
			} else {
				expect(html).toContain('Síntese sintética, sem interpretação homologada.');
				expect(html).toContain('Que associação pessoal aparece nesse recorte?');
			}
			expect(html).toContain('Escopo declarado: parcial.');
			expect((await workflowArtifacts(f.event(other), runId, artifact.id)).status).toBe(404);
			const svg = productId === 'ascendant' ? await f.store(runId, 'svg') : null;
			if (svg) {
				expect(await f.store(runId, 'svg')).toEqual(svg);
				const response = await workflowArtifacts(f.event(), runId, svg.id);
				expect(response.status).toBe(200);
				expect(response.headers.get('content-type')).toContain('image/svg+xml');
				const image = await response.text();
				expect(image).toContain('Ascendente');
				expect(image).not.toContain('data-body=');
				expect((await workflowArtifacts(f.event(other), runId, svg.id)).status).toBe(404);
			}
			const listed = (await (await workflowArtifacts(f.event(), runId)).json()) as {
				artifacts: unknown[];
			};
			expect(listed.artifacts).toHaveLength(svg ? 2 : 1);

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
			if (workflowFor(productId)!.kind === 'tarot')
				expect(child.calculation).toEqual(source.calculation);
			else expect(await f.processor.step()).toBe('calculated');
			expect(await f.processor.step()).toBe('awaiting_editorial');
			expect(await f.publisher.step()).toBe('idle');
			expect((await workflowArtifacts(f.event(), childId, artifact.id)).status).toBe(404);
			const childReceipt = await f.approve(childId);
			expect(childReceipt).not.toBe(parentReceipt);
			expect(await f.publisher.step()).toBe('published');
			const childArtifact = await f.store(childId);
			expect(childArtifact.id).not.toBe(artifact.id);
			if (productId === 'dream-journal' || productId === 'dream-reading') {
				const reopened = await f.read(runId);
				const regenerated = await f.read(childId);
				expect(reopened?.editorial?.sections).toEqual(parent?.editorial?.sections);
				expect(regenerated?.calculation?.facts).toEqual(parent?.calculation?.facts);
				expect(regenerated?.editorial?.sections).toEqual(parent?.editorial?.sections);
			}
			expect((await workflowArtifacts(f.event(), childId, artifact.id)).status).toBe(404);

			await f.db.query('update product_editorial_receipts set revoked_at=now() where id=$1', [
				parentReceipt
			]);
			expect((await f.read(runId))?.released).toBe(false);
			expect((await workflowArtifacts(f.event(), runId, artifact.id)).status).toBe(404);
			if (svg) expect((await workflowArtifacts(f.event(), runId, svg.id)).status).toBe(404);
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

it('polar Ascendant persists its unavailable basis but cannot produce reviewed delivery or artifacts', async () => {
	const f = await fixture('ascendant');
	try {
		const input = inputFor('ascendant');
		input.birth!.latitude = 70;
		const created = await workflowApi(
			f.event(owner, { requestKey: randomUUID(), input }),
			'create'
		);
		expect(created.status).toBe(202);
		const { runId } = (await created.json()) as { runId: string };
		expect(await f.processor.step()).toBe('calculated');
		expect(await f.processor.step()).toBe('awaiting_editorial');
		const saved = (await f.db.query<FixtureRun>('select * from product_runs where id=$1', [runId]))
			.rows[0];
		expect((saved.calculation.data.angles as { ascendant: number | null }).ascendant).toBeNull();
		expect(prepareProductFacts('ascendant', saved.calculation)).toEqual({
			status: 'blocked',
			reason: 'insufficient_facts'
		});
		expect(
			(
				await prepareProductDelivery({
					runId,
					revision: saved.revision,
					productId: 'ascendant',
					tier: 'free',
					calculation: saved.calculation,
					output: {
						schemaVersion: SCHEMA_VERSION,
						capability: 'natal-synthesis',
						scope: 'partial',
						title: 'Tentativa sintética sem base disponível',
						claims: [
							{
								id: 'c1',
								kind: 'fact',
								text: saved.calculation.facts[0].display,
								evidence: [saved.calculation.facts[0].id]
							}
						],
						relations: [],
						synthesis: [{ claimIds: ['c1'], text: 'A forma válida não substitui a base ausente.' }],
						reflections: ['Que informação ainda falta?'],
						limits: ['Fixture sintética; não é interpretação homologada.']
					}
				})
			).reason
		).toBe('insufficient_facts');
		await f.db.exec(
			'update product_editorial_policy set enabled=true; update product_artifact_policy set enabled=true'
		);
		await expect(f.approve(runId)).rejects.toThrow('fixture_invalid_facts');
		expect(await f.publisher.step()).toBe('idle');
		const pending = await f.read(runId);
		expect(pending?.released).toBe(false);
		expect(pending?.libraryItemId).toBeTruthy();
		expect(pending?.history.map((event) => event.state)).toEqual([
			'QUEUED',
			'CALCULATED',
			'AWAITING_EDITORIAL'
		]);
		await expect(f.store(runId)).rejects.toThrow('fixture_unreleased');
		expect((await workflowArtifacts(f.event(), runId)).status).toBe(404);
		expect((await workflowApi(f.event(other), 'read', runId)).status).toBe(404);
		const after = (await f.db.query<FixtureRun>('select * from product_runs where id=$1', [runId]))
			.rows[0];
		expect(after.calculation).toEqual(saved.calculation);
		expect(after.editorial).toBeNull();
		expect(after.editorial_receipt_id).toBeNull();
		for (const table of ['product_editorial_receipts', 'product_artifacts'])
			expect(
				(await f.db.query<{ n: number }>(`select count(*)::int as n from ${table}`)).rows[0].n
			).toBe(0);
	} finally {
		await f.db.close();
	}
}, 30000);
