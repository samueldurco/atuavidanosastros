import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setupProductDatabase, file, owner } from './helpers/product-database.mjs';
import { createPurposeCalculators } from '../apps/worker/src/purpose-calculators.ts';
import { createCareerCompassFullBasisCalculator } from '../apps/worker/src/career-compass-full-basis.ts';
import { careerCompassFullFixture } from '../apps/worker/qa/career-compass-full-fixture.mjs';
import {
  CAREER_COMPASS_FULL_CANDIDATE_VERSION,
  prepareCareerCompassFullCandidate,
  processNextCareerCompassFullCandidate,
  readCareerCompassFullCandidate,
} from '../apps/worker/src/career-compass-full-persistence.ts';

const input = {
  version: 'atv-workflow/1.0.0', productId: 'career-compass',
  consent: { storage: true, policyVersion: 'atv-input-consent/1', partner: false, continuity: false },
  birth: { localDateTime: '2000-01-01T12:00:00', utcInstant: '2000-01-01T12:00:00Z',
    timezone: 'UTC', latitude: 0, longitude: 0, locationSource: 'synthetic' },
  context: 'Avalio uma mudança de trabalho com pouco tempo disponível.'
};
async function as(db, role, user, fn) {
  await db.exec(`set role ${role}`);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user ?? '']);
  try { return await fn(); } finally { await db.exec('reset role'); }
}
async function service(db, name, args = {}) {
  const entries = Object.entries(args);
  return as(db, 'service_role', null, async () => (await db.query(
    `select ${name}(${entries.map(([key], i) => `${key} => $${i + 1}`).join(',')}) as data`,
    entries.map(([, value]) => value))).rows[0].data);
}
const transport = db => async (name, args, signal) => {
  signal.throwIfAborted();
  return service(db, name, args);
};
async function boot(t) {
  const db = await setupProductDatabase({ processing: true });
  t.after(() => db.close());
  await db.exec(await file('supabase/migrations/20261015101959_career_compass_full_private_candidates.sql'));
  await db.exec("update workflow_releases set enabled=true,access_policy='free' where product_id='career-compass'");
  return db;
}
async function run(db, workflowInput = input) {
  const id = await as(db, 'authenticated', owner, async () =>
    (await db.query('select request_product_run($1,$2,$3,$4) as data',
      ['career-compass', randomUUID(), workflowInput, null])).rows[0].data);
  const source = await createPurposeCalculators()['career-compass'](workflowInput,
    { runId: id, signal: new AbortController().signal });
  await db.query("update product_runs set state='AWAITING_EDITORIAL',revision=3,calculation=$2 where id=$1",
    [id, source]);
  return id;
}

test('full candidate migration keeps input private and fences run/revision/source', async t => {
  const db = await boot(t);
  const id = await run(db);
  const claim = await service(db, 'select_next_career_compass_full_candidate', {
    p_candidate_version: CAREER_COMPASS_FULL_CANDIDATE_VERSION,
  });
  assert.equal(claim.runId, id);
  assert.deepEqual(claim.workflowInput, input);
  const candidate = { version: CAREER_COMPASS_FULL_CANDIDATE_VERSION,
    status: 'blocked', publication: 'blocked', reason: 'synthetic_test_gate' };
  const args = { p_run_id: id, p_revision: 3, p_contract_version: claim.contractVersion,
    p_workflow_input: claim.workflowInput, p_source_calculation: claim.sourceCalculation,
    p_candidate_version: claim.candidateVersion, p_candidate: candidate };
  const receipt = await service(db, 'save_career_compass_full_candidate', args);
  assert.equal(receipt.publication, 'blocked');
  assert.equal(receipt.status, 'blocked');
  assert.deepEqual(await service(db, 'save_career_compass_full_candidate', args), receipt);
  assert.equal(await service(db, 'select_next_career_compass_full_candidate', {
    p_candidate_version: CAREER_COMPASS_FULL_CANDIDATE_VERSION,
  }), null);
  assert.deepEqual(await readCareerCompassFullCandidate(transport(db), id, 3,
    new AbortController().signal), candidate);
  await assert.rejects(() => service(db, 'save_career_compass_full_candidate', {
    ...args, p_workflow_input: { ...input, context: 'Troca indevida' },
  }), /stale_full_candidate_basis/);
  await assert.rejects(() => service(db, 'save_career_compass_full_candidate', {
    ...args, p_candidate: { ...candidate, publication: 'released' },
  }), /publication_block_required/);
  await assert.rejects(() => as(db, 'authenticated', owner,
    () => db.query('select * from career_compass_full_candidates')),
  /permission denied/);
  await assert.rejects(() => as(db, 'authenticated', owner,
    () => db.query('select read_career_compass_full_candidate($1,$2,$3)',
      [id, 3, CAREER_COMPASS_FULL_CANDIDATE_VERSION])), /permission denied/);
  await db.query("update product_runs set state='CANCELLED' where id=$1", [id]);
  assert.equal(await service(db, 'read_career_compass_full_candidate', {
    p_run_id: id, p_revision: 3, p_candidate_version: CAREER_COMPASS_FULL_CANDIDATE_VERSION,
  }), null);
});

test('private worker claim saves complete blocked reading and verifies export integrity', async t => {
  const db = await boot(t);
  const id = await run(db);
  const snapshot = await createCareerCompassFullBasisCalculator()(input,
    { runId: id, signal: new AbortController().signal });
  const claim = await service(db, 'select_next_career_compass_full_candidate', {
    p_candidate_version: CAREER_COMPASS_FULL_CANDIDATE_VERSION,
  });
  const draft = await prepareCareerCompassFullCandidate(claim,
    async () => careerCompassFullFixture(snapshot), new AbortController().signal);
  assert.equal(draft.status, 'prepared_for_review', draft.reason);
  let providerCalls = 0;
  const outcome = await processNextCareerCompassFullCandidate(transport(db), async facts => {
    providerCalls += 1;
    assert.equal(facts.completeness, 'complete');
    assert.equal(facts.editorialProfile, 'atv-career-compass-editorial/2.0.0');
    return careerCompassFullFixture(snapshot);
  });
  assert.equal(outcome, 'prepared_for_review');
  assert.equal(providerCalls, 1);
  const candidate = await readCareerCompassFullCandidate(transport(db), id, 3,
    new AbortController().signal);
  assert.equal(candidate.status, 'prepared_for_review');
  assert.equal(candidate.publication, 'blocked');
  assert.equal(candidate.assessment.publication, 'blocked');
  assert.equal(candidate.delivery.publication, 'blocked');
  assert.equal(candidate.delivery.content.sections.length, 11);
  assert.match(candidate.delivery.basisDigest, /^[a-f0-9]{64}$/);
  assert.match(candidate.delivery.outputDigest, /^[a-f0-9]{64}$/);
  assert.match(candidate.delivery.deliveryDigest, /^[a-f0-9]{64}$/);
  const changedSource = structuredClone(claim.sourceCalculation);
  changedSource.data.birthBinding.sha256 = '0'.repeat(64);
  await db.query('update product_runs set calculation=$2 where id=$1', [id, changedSource]);
  await db.query('update career_compass_full_candidates set source_calculation=$2 where run_id=$1',
    [id, changedSource]);
  await assert.rejects(() => readCareerCompassFullCandidate(transport(db), id, 3,
    new AbortController().signal), /full_candidate_source_integrity_failed/);
  await db.query('update product_runs set calculation=$2 where id=$1',
    [id, claim.sourceCalculation]);
  await db.query('update career_compass_full_candidates set source_calculation=$2 where run_id=$1',
    [id, claim.sourceCalculation]);
  const persisted = (await db.query('select state,revision from product_runs where id=$1', [id])).rows[0];
  assert.equal(persisted.state, 'AWAITING_EDITORIAL');
  assert.equal(persisted.revision, 3);
  assert.equal(await processNextCareerCompassFullCandidate(transport(db), async () => {
    throw new Error('duplicate_provider_call');
  }), 'idle');

  await db.query(`update career_compass_full_candidates
    set candidate=jsonb_set(candidate,'{delivery,content,sections,1,text}','"Adulterado"')
    where run_id=$1 and revision=3`, [id]);
  await assert.rejects(() => readCareerCompassFullCandidate(transport(db), id, 3,
    new AbortController().signal), /full_candidate_integrity_failed/);
  await db.query('update career_compass_full_candidates set candidate=$2 where run_id=$1',
    [id, candidate]);
  await db.query(`update career_compass_full_candidates
    set candidate=jsonb_set(candidate,'{assessment,status}','"reviewed_candidate"')
    where run_id=$1 and revision=3`, [id]);
  await assert.rejects(() => readCareerCompassFullCandidate(transport(db), id, 3,
    new AbortController().signal), /full_candidate_integrity_failed/);
});

test('private forward fix removes RPC execution while retaining draft rows', async t => {
  const db = await boot(t);
  const id = await run(db);
  const claim = await service(db, 'select_next_career_compass_full_candidate', {
    p_candidate_version: CAREER_COMPASS_FULL_CANDIDATE_VERSION,
  });
  assert.equal(claim.runId, id);
  await db.exec(await file('supabase/forward-fixes/20261015101959_disable_career_compass_full_candidates.sql'));
  await assert.rejects(() => service(db, 'select_next_career_compass_full_candidate', {
    p_candidate_version: CAREER_COMPASS_FULL_CANDIDATE_VERSION,
  }), /permission denied/);
  const table = await db.query('select count(*)::int as count from career_compass_full_candidates');
  assert.equal(table.rows[0].count, 0);
});
