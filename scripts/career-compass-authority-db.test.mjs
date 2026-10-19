import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { dimensions, RUBRIC_VERSION } from '../packages/ai/src/index.ts';
import { setupProductDatabase, file, owner } from './helpers/product-database.mjs';
import { createProductProcessor } from '../apps/worker/src/product-runtime.ts';
import { DELIVERY_REVIEW_VERSION, evaluateProductDelivery } from '../apps/worker/src/product-delivery-review.ts';
import { prepareCareerCompassCandidate } from '../apps/worker/src/career-compass-candidate.ts';
import {
  CAREER_COMPASS_PROMOTION_EVIDENCE_VERSION,
  prepareCareerCompassIssuancePlan,
} from '../apps/worker/src/career-compass-issuance.ts';

const input = {
  version: 'atv-workflow/1.0.0', productId: 'career-compass',
  consent: { storage: true, policyVersion: 'atv-input-consent/1', partner: false, continuity: false },
  birth: { localDateTime: '2000-01-01T12:00:00', utcInstant: '2000-01-01T12:00:00Z',
    timezone: 'UTC', latitude: 0, longitude: 0, locationSource: 'synthetic' },
  context: 'Quero testar uma transição entre projetos de trabalho.',
};
const authority = {
  draft: { reviewers: ['synthetic-draft-reviewer'], calibrations: [] },
  delivery: { reviewers: ['synthetic-delivery-reviewer'], calibrations: [] },
};
const canonical = value => Array.isArray(value)
  ? `[${value.map(canonical).join(',')}]`
  : value !== null && typeof value === 'object'
    ? `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`
    : JSON.stringify(value);
const digest = value => createHash('sha256').update(canonical(value)).digest('hex');
const score = (outputDigest, reviewer) => ({
  rubricVersion: RUBRIC_VERSION, outputDigest, reviewer, source: 'human', calibrationId: null,
  scores: Object.fromEntries(dimensions.map(d => [d, 10])),
  evidence: Object.fromEntries(dimensions.map(d => [d, `Evidência sintética ${d}; uso exclusivo do teste de fronteira.`])),
});
async function as(db, role, fn) {
  await db.exec(`set role ${role}`);
  try { return await fn(); } finally { await db.exec('reset role'); }
}
async function service(db, name, args) {
  const entries = Object.entries(args);
  return as(db, 'service_role', () => db.query(
    `select ${name}(${entries.map(([key], i) => `${key} => $${i + 1}`).join(',')}) as data`,
    entries.map(([, value]) => value),
  ).then(result => result.rows[0].data));
}
async function fixture(t) {
  const db = await setupProductDatabase({ processing: true });
  t.after(() => db.close());
  await db.exec(await file('supabase/migrations/20260915180000_product_artifacts.sql'));
  await db.exec(await file('supabase/migrations/20260923110000_product_editorial_publication.sql'));
  await db.exec(await file('supabase/migrations/20261014220000_career_compass_private_candidates.sql'));
  await db.exec(await file('supabase/migrations/20261014223000_career_compass_authority.sql'));
  await db.exec("update workflow_releases set enabled=true,access_policy='free' where product_id='career-compass'");
  await db.exec('set role authenticated');
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [owner]);
  const id = (await db.query('select request_product_run($1,$2,$3,$4) as data',
    ['career-compass', randomUUID(), input, null])).rows[0].data;
  await db.exec('reset role');
  const processor = createProductProcessor(async (name, args, signal) => {
    signal.throwIfAborted(); return service(db, name, args);
  }, { enabledProducts: ['career-compass'] });
  assert.equal(await processor.step(), 'calculated');
  assert.equal(await processor.step(), 'awaiting_editorial');
  const row = (await db.query('select * from career_compass_candidates where run_id=$1', [id])).rows[0];
  const stored = {
    runId: row.run_id, revision: row.revision,
    contractVersion: row.contract_version, calculation: row.calculation,
    candidateVersion: row.candidate_version, status: row.status,
    candidateDigest: row.candidate_digest, basisDigest: row.basis_digest,
    outputDigest: row.output_digest, deliveryDigest: row.delivery_digest,
    candidate: row.candidate,
  };
  const boundReviews = {
    version: DELIVERY_REVIEW_VERSION, basisDigest: stored.basisDigest,
    deliveryDigest: stored.deliveryDigest,
    draftReview: score(stored.outputDigest, 'synthetic-draft-reviewer'),
    deliveryReview: score(stored.deliveryDigest, 'synthetic-delivery-reviewer'),
  };
  const rebuilt = await prepareCareerCompassCandidate({ runId: stored.runId,
    revision: stored.revision, tier: 'free', calculation: stored.calculation });
  const draft = { runId: stored.runId, revision: stored.revision,
    productId: 'career-compass', tier: 'free', calculation: stored.calculation,
    output: rebuilt.reading };
  const reviewed = await evaluateProductDelivery(draft, boundReviews, authority);
  assert.equal(reviewed.status, 'reviewed_delivery_candidate', reviewed.reason);
  const promotionEvidence = {
    version: CAREER_COMPASS_PROMOTION_EVIDENCE_VERSION,
    productId: 'career-compass', contractVersion: stored.contractVersion,
    candidateVersion: stored.candidateVersion, basisDigest: stored.basisDigest,
    deliveryDigest: stored.deliveryDigest, reviewDigest: reviewed.reviewDigest,
    methodEvidenceDigest: 'a'.repeat(64), corpusEvidenceDigest: 'b'.repeat(64),
    gateReportDigest: 'c'.repeat(64), decision: 'approved',
  };
  const promotion = {
    id: 'synthetic-' + randomUUID(), productId: 'career-compass',
    contractVersion: stored.contractVersion,
    evidenceDigest: digest(promotionEvidence), revokedAt: null,
  };
  const proposal = { stored, boundReviews, trustedReviewers: authority,
    promotion, promotionEvidence, authorityReference: 'synthetic-private-review-only' };
  return { db, id, row, proposal };
}
async function issue(db, args, role = 'atv_career_editorial_authority') {
  const entries = Object.entries(args);
  return as(db, role, () => db.query(
    `select issue_career_compass_editorial_receipt(${entries.map(([key], i) =>
      `${key} => $${i + 1}`).join(',')}) as data`, entries.map(([, value]) => value),
  ).then(result => result.rows[0].data));
}

test('private issuance plan independently rebuilds the candidate and binds both reviews and promotion evidence', async t => {
  const { db, proposal } = await fixture(t);
  const plan = await prepareCareerCompassIssuancePlan(proposal);
  assert.equal(plan.status, 'issuance_plan');
  assert.equal(plan.publication, 'blocked');
  assert.equal(plan.rpc, 'issue_career_compass_editorial_receipt');
  const tampered = structuredClone(proposal);
  tampered.stored.candidate.reading.title += ' adulterado';
  assert.equal((await prepareCareerCompassIssuancePlan(tampered)).reason, 'candidate_reconstruction_mismatch');
  const untrusted = structuredClone(proposal);
  untrusted.trustedReviewers.delivery.reviewers = [];
  assert.equal((await prepareCareerCompassIssuancePlan(untrusted)).status, 'blocked');
  const unsupported = structuredClone(proposal);
  unsupported.promotionEvidence.gateReportDigest = 'd'.repeat(64);
  assert.equal((await prepareCareerCompassIssuancePlan(unsupported)).reason, 'promotion_evidence_mismatch');
  const members = (await db.query("select count(*)::int as n from pg_auth_members m join pg_roles r on r.oid=m.roleid where r.rolname='atv_career_editorial_authority'")).rows[0].n;
  assert.equal(members, 0);
  const role = (await db.query("select rolcanlogin,rolinherit from pg_roles where rolname='atv_career_editorial_authority'")).rows[0];
  assert.deepEqual(role, { rolcanlogin: false, rolinherit: false });
});

test('receipt RPC is private, fenced, gated, idempotent and leaves reader unpublished', async t => {
  const { db, id, proposal } = await fixture(t);
  const plan = await prepareCareerCompassIssuancePlan(proposal);
  assert.equal(plan.status, 'issuance_plan');
  await db.query('insert into editorial_promotions(id,product_id,contract_version,evidence_digest) values($1,$2,$3,$4)',
    [proposal.promotion.id, 'career-compass', input.version, proposal.promotion.evidenceDigest]);
  for (const role of ['anon', 'authenticated', 'service_role'])
    await assert.rejects(() => issue(db, plan.args, role), /permission denied/);
  await assert.rejects(() => as(db, 'atv_career_editorial_authority', () =>
    db.query('select * from career_compass_receipt_evidence')), /permission denied/);
  await assert.rejects(() => issue(db, plan.args), /release_evidence_required/);
  await db.exec("update workflow_releases set engine_approved=true where product_id='career-compass'");
  await db.exec("update workflow_releases set enabled=false where product_id='career-compass'");
  await assert.rejects(() => issue(db, plan.args), /release_evidence_required/);
  await db.exec("update workflow_releases set enabled=true where product_id='career-compass'");
  await db.exec('update editorial_promotions set revoked_at=now()');
  await assert.rejects(() => issue(db, plan.args), /promotion_evidence_required/);
  await db.exec('update editorial_promotions set revoked_at=null');
  const stale = { ...plan.args, p_revision: plan.args.p_revision + 1 };
  await assert.rejects(() => issue(db, stale), /stale_run_basis/);
  const wrong = { ...plan.args, p_delivery_digest: 'f'.repeat(64) };
  await assert.rejects(() => issue(db, wrong), /candidate_evidence_mismatch/);
  const receipt = await issue(db, plan.args);
  assert.equal(receipt.status, 'private_receipt_issued');
  assert.deepEqual(await issue(db, plan.args), receipt);
  const conflict = { ...plan.args, p_review_digest: 'e'.repeat(64) };
  await assert.rejects(() => issue(db, conflict), /receipt_conflict/);
  const run = (await db.query('select state,editorial from product_runs where id=$1', [id])).rows[0];
  assert.equal(run.state, 'AWAITING_EDITORIAL');
  assert.equal(run.editorial, null);
  const policy = (await db.query('select enabled from product_editorial_policy')).rows[0];
  assert.equal(policy.enabled, false);
  const evidence = (await db.query('select * from career_compass_receipt_evidence where receipt_id=$1',
    [receipt.receiptId])).rows[0];
  assert.equal(evidence.candidate_digest, plan.args.p_candidate_digest);
  const saved = (await db.query('select * from product_editorial_receipts where id=$1',
    [receipt.receiptId])).rows[0];
  assert.deepEqual(saved.editorial, { ...proposal.stored.candidate.delivery.content,
    promotionId: proposal.promotion.id, reviewDigest: plan.args.p_review_digest });
  await assert.rejects(() => as(db, 'service_role', () => db.query('select * from career_compass_receipt_evidence')),
    /permission denied/);
  await db.exec('set role authenticated');
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [owner]);
  const reader = (await db.query('select read_product_run($1) as data', [id])).rows[0].data;
  await db.exec('reset role');
  assert.equal(reader.released, false);
  assert.equal(reader.editorial, null);
});
