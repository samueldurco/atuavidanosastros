import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { setupProductDatabase, file, owner } from './helpers/product-database.mjs';
import { createProductProcessor } from '../apps/worker/src/product-runtime.ts';
import {
  CAREER_COMPASS_CANDIDATE_VERSION,
  prepareCareerCompassCandidate,
} from '../apps/worker/src/career-compass-candidate.ts';

const input = {
  version: 'atv-workflow/1.0.0', productId: 'career-compass',
  consent: { storage: true, policyVersion: 'atv-input-consent/1', partner: false, continuity: false },
  birth: { localDateTime: '2000-01-01T12:00:00', utcInstant: '2000-01-01T12:00:00Z',
    timezone: 'UTC', latitude: 0, longitude: 0, locationSource: 'synthetic' },
  context: 'Quero testar uma transição entre projetos de trabalho.'
};

async function as(db, role, user, fn) {
  await db.exec(`set role ${role}`);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user ?? '']);
  try { return await fn(); } finally { await db.exec('reset role'); }
}
async function boot(t) {
  const db = await setupProductDatabase({ processing: true });
  t.after(() => db.close());
  await db.exec(await file('supabase/migrations/20261014220000_career_compass_private_candidates.sql'));
  await db.exec("update workflow_releases set enabled=true,access_policy='free' where product_id='career-compass'");
  return db;
}
async function request(db, productInput = input) {
  return as(db, 'authenticated', owner, async () =>
    (await db.query('select request_product_run($1,$2,$3,$4) as data',
      ['career-compass', randomUUID(), productInput, null])).rows[0].data);
}
async function service(db, name, args = {}) {
  const entries = Object.entries(args);
  const params = entries.map(([key], i) => `${key} => $${i + 1}`).join(',');
  return as(db, 'service_role', null, async () =>
    (await db.query(`select ${name}(${params}) as data`, entries.map(([, value]) => value))).rows[0].data);
}
const readCandidate = (db, id, revision, version = CAREER_COMPASS_CANDIDATE_VERSION) =>
  service(db, 'read_career_compass_candidate', {
    p_run_id: id, p_revision: revision, p_candidate_version: version,
  });
const transport = db => async (name, args, signal) => {
  signal.throwIfAborted();
  return service(db, name, args);
};

test('E3 automatically saves one private, versioned candidate after calculated run reaches AWAITING_EDITORIAL', async t => {
  const db = await boot(t);
  const id = await request(db);
  const events = [];
  const runtime = createProductProcessor(transport(db), {
    enabledProducts: ['career-compass'], emit: event => events.push(event),
  });
  assert.equal(await runtime.step(), 'calculated');
  assert.equal(await runtime.step(), 'awaiting_editorial');
  assert.equal(await runtime.step(), 'idle');
  const run = (await db.query('select state,revision,calculation,editorial from product_runs where id=$1', [id])).rows[0];
  assert.equal(run.state, 'AWAITING_EDITORIAL');
  assert.equal(run.revision, 3);
  assert.equal(run.editorial, null);
  const rows = (await db.query('select * from career_compass_candidates where run_id=$1', [id])).rows;
  assert.equal(rows.length, 1);
  const saved = rows[0];
  assert.equal(saved.revision, run.revision);
  assert.equal(saved.contract_version, input.version);
  assert.deepEqual(saved.calculation, run.calculation);
  assert.equal(saved.status, 'prepared_for_review');
  assert.equal(saved.candidate.publication, 'blocked');
  assert.equal(saved.candidate.assessment.status, 'needs_editorial_review');
  assert.equal(saved.candidate.assessment.publication, 'blocked');
  assert.equal(saved.candidate.delivery.publication, 'blocked');
  assert.equal(saved.candidate_digest, saved.candidate.candidateDigest);
  assert.equal(saved.basis_digest, saved.candidate.assessment.basisDigest);
  assert.equal(saved.output_digest, saved.candidate.assessment.outputDigest);
  assert.equal(saved.delivery_digest, saved.candidate.delivery.deliveryDigest);
  assert.equal(saved.candidate.reading.reflections.length, 3);
  assert.equal(new Set(saved.candidate.reading.reflections).size, 3);
  assert.ok(events.some(event => event.event === 'product.career_compass_candidate' && event.outcome === 'prepared_for_review'));
  assert.ok(!JSON.stringify(events).includes(input.context));
  const read = await readCandidate(db, id, 3);
  assert.equal(read.candidateDigest, saved.candidate_digest);
  const ownerView = await as(db, 'authenticated', owner, async () =>
    (await db.query('select read_product_run($1) as data', [id])).rows[0].data);
  assert.equal(ownerView.released, false);
  assert.equal(ownerView.calculation, null);
  assert.equal(ownerView.editorial, null);
  assert.ok(!JSON.stringify(ownerView).includes(input.context));
  await assert.rejects(() => as(db, 'authenticated', owner,
    () => db.query('select * from career_compass_candidates')), /permission denied/);
  await assert.rejects(() => as(db, 'authenticated', owner,
    () => db.query('select read_career_compass_candidate($1,$2,$3)',
      [id, 3, CAREER_COMPASS_CANDIDATE_VERSION])), /permission denied/);
  await assert.rejects(() => as(db, 'authenticated', owner,
    () => db.query('select select_next_career_compass_candidate($1)',
      [CAREER_COMPASS_CANDIDATE_VERSION])), /permission denied/);
  await assert.rejects(() => as(db, 'anon', null,
    () => db.query('select * from career_compass_candidates')), /permission denied/);
  await assert.rejects(() => as(db, 'anon', null,
    () => db.query('select read_career_compass_candidate($1,$2,$3)',
      [id, 3, CAREER_COMPASS_CANDIDATE_VERSION])), /permission denied/);
  await assert.rejects(() => as(db, 'anon', null,
    () => db.query('select select_next_career_compass_candidate($1)',
      [CAREER_COMPASS_CANDIDATE_VERSION])), /permission denied/);
});

test('a new candidate version reprocesses the same run revision without replacing the prior draft', async t => {
  const db = await boot(t);
  const id = await request(db);
  const runtime = createProductProcessor(transport(db), { enabledProducts: ['career-compass'] });
  assert.equal(await runtime.step(), 'calculated');
  assert.equal(await runtime.step(), 'awaiting_editorial');
  const currentVersion = CAREER_COMPASS_CANDIDATE_VERSION;
  const current = await readCandidate(db, id, 3, currentVersion);
  assert.equal(current.status, 'prepared_for_review');

  const nextMajor = Number(currentVersion.split('/')[1].split('.')[0]) + 1;
  const nextVersion = `atv-career-compass-candidate/${nextMajor}.0.0`;
  await assert.rejects(() => service(db, 'select_next_career_compass_candidate', {
    p_candidate_version: 'invalid-version',
  }), /invalid_candidate_version/);
  assert.equal(await readCandidate(db, id, 3, nextVersion), null);
  const selected = await service(db, 'select_next_career_compass_candidate', {
    p_candidate_version: nextVersion,
  });
  assert.equal(selected.runId, id);
  assert.equal(selected.revision, 3);
  assert.equal(selected.candidateVersion, nextVersion);
  assert.deepEqual(selected.calculation, current.calculation);

  // Model a later worker release: the authored text may stay the same, while
  // the new version gets its own integrity digest and private review record.
  const nextDigest = createHash('sha256').update(JSON.stringify({
    version: nextVersion,
    basisDigest: current.basisDigest,
    outputDigest: current.outputDigest,
    deliveryDigest: current.deliveryDigest,
  })).digest('hex');
  const candidate = { ...current.candidate, version: nextVersion, candidateDigest: nextDigest };
  const args = {
    p_run_id: id, p_revision: 3, p_contract_version: selected.contractVersion,
    p_calculation: selected.calculation, p_candidate_version: nextVersion,
    p_candidate: candidate,
  };
  const receipt = await service(db, 'save_career_compass_candidate', args);
  assert.equal(receipt.candidateVersion, nextVersion);
  assert.equal(receipt.candidateDigest, nextDigest);
  assert.equal(receipt.publication, 'blocked');
  assert.equal((await readCandidate(db, id, 3, nextVersion)).candidateDigest, nextDigest);
  assert.equal((await readCandidate(db, id, 3, currentVersion)).candidateDigest, current.candidateDigest);
  assert.equal((await db.query('select count(*)::int as count from career_compass_candidates where run_id=$1',
    [id])).rows[0].count, 2);
  assert.equal(await service(db, 'select_next_career_compass_candidate', {
    p_candidate_version: nextVersion,
  }), null);
  assert.equal(await runtime.step(), 'idle');
  const ownerView = await as(db, 'authenticated', owner, async () =>
    (await db.query('select read_product_run($1) as data', [id])).rows[0].data);
  assert.equal(ownerView.released, false);
  assert.equal(ownerView.editorial, null);
});

test('private read rejects cancelled and stale revisions; owner deletion cascades candidates', async t => {
  const db = await boot(t);
  const runtime = createProductProcessor(transport(db), { enabledProducts: ['career-compass'] });

  const cancelledId = await request(db);
  assert.equal(await runtime.step(), 'calculated');
  assert.equal(await runtime.step(), 'awaiting_editorial');
  assert.ok(await readCandidate(db, cancelledId, 3));
  await db.query("update product_runs set state='CANCELLED' where id=$1", [cancelledId]);
  assert.equal(await readCandidate(db, cancelledId, 3), null);

  const staleId = await request(db);
  assert.equal(await runtime.step(), 'calculated');
  assert.equal(await runtime.step(), 'awaiting_editorial');
  await db.query('update product_runs set revision=revision+1 where id=$1', [staleId]);
  assert.equal(await readCandidate(db, staleId, 3), null);
  assert.equal(await readCandidate(db, staleId, 4), null);

  const deleted = await as(db, 'authenticated', owner, async () =>
    (await db.query('select delete_product_run($1) as data', [cancelledId])).rows[0].data);
  assert.equal(deleted, true);
  assert.equal((await db.query('select count(*)::int as count from career_compass_candidates where run_id=$1',
    [cancelledId])).rows[0].count, 0);
});

test('save is idempotent for the same run revision and rejects stale or changed basis', async t => {
  const db = await boot(t);
  const id = await request(db);
  const runtime = createProductProcessor(transport(db), { enabledProducts: ['career-compass'] });
  await runtime.step();
  await runtime.step();
  const selected = await readCandidate(db, id, 3);
  const args = { p_run_id: id, p_revision: 3, p_contract_version: selected.contractVersion,
    p_calculation: selected.calculation, p_candidate_version: selected.candidateVersion,
    p_candidate: selected.candidate };
  const first = await service(db, 'save_career_compass_candidate', args);
  assert.equal(first.status, 'prepared_for_review');
  assert.equal(first.candidateDigest, selected.candidateDigest);
  await assert.rejects(() => service(db, 'save_career_compass_candidate', {
    ...args, p_candidate: { ...selected.candidate, version: 'altered' },
  }), /candidate_conflict|invalid_candidate_digest/);
  await assert.rejects(() => service(db, 'save_career_compass_candidate', {
    ...args, p_calculation: { ...selected.calculation, facts: [] },
  }), /stale_candidate_basis/);
  await db.query("update product_runs set state='CANCELLED',revision=revision+1 where id=$1", [id]);
  await assert.rejects(() => service(db, 'save_career_compass_candidate', args), /stale_candidate_basis/);
  assert.equal((await db.query('select count(*)::int as count from career_compass_candidates where run_id=$1', [id])).rows[0].count, 1);
});

test('private candidate failure stays observable without READY, receipt, or leaked context', async t => {
  const db = await boot(t);
  const id = await request(db);
  const runtime = createProductProcessor(transport(db), { enabledProducts: ['career-compass'] });
  await runtime.step();
  await runtime.step();
  const selected = await readCandidate(db, id, 3);
  assert.equal((await prepareCareerCompassCandidate({ runId: id, revision: 3, tier: 'free',
    calculation: { ...selected.calculation, facts: [] } })).status, 'blocked');
  const events = [];
  const failedTransport = async (name, args, signal) => {
    if (name === 'save_career_compass_candidate') throw Error(`secret ${input.context}`);
    return transport(db)(name, args, signal);
  };
  // New revision is pending; transport error leaves it eligible for retry.
  await db.query('delete from career_compass_candidates where run_id=$1', [id]);
  assert.equal(await createProductProcessor(failedTransport, {
    enabledProducts: ['career-compass'], emit: event => events.push(event),
  }).step(), 'idle');
  assert.equal((await db.query('select count(*)::int as count from career_compass_candidates where run_id=$1', [id])).rows[0].count, 0);
  assert.equal((await db.query('select state,editorial from product_runs where id=$1', [id])).rows[0].state, 'AWAITING_EDITORIAL');
  assert.ok(events.some(event => event.event === 'product.career_compass_candidate' && event.outcome === 'unavailable'));
  assert.ok(!JSON.stringify(events).includes(input.context));
  assert.equal(await createProductProcessor(transport(db), { enabledProducts: ['career-compass'] }).step(), 'idle');
  assert.equal((await db.query('select count(*)::int as count from career_compass_candidates where run_id=$1', [id])).rows[0].count, 1);
});

test('invalid stored projection is recorded as a blocked private candidate', async t => {
  const db = await boot(t);
  const id = await request(db);
  const runtime = createProductProcessor(transport(db), { enabledProducts: ['career-compass'] });
  await runtime.step();
  await runtime.step();
  await db.query('delete from career_compass_candidates where run_id=$1', [id]);
  await db.query("update product_runs set calculation=jsonb_set(calculation,'{facts,0,display}','\"Meio do Céu: adulterado\"') where id=$1", [id]);
  assert.equal(await runtime.step(), 'idle');
  const row = (await db.query('select * from career_compass_candidates where run_id=$1', [id])).rows[0];
  assert.equal(row.status, 'blocked');
  assert.equal(row.candidate.publication, 'blocked');
  assert.equal(row.candidate_digest, null);
  assert.equal(row.blocked_reason, row.candidate.reason);
  assert.equal((await db.query('select state from product_runs where id=$1', [id])).rows[0].state, 'AWAITING_EDITORIAL');
});

test('forward fix disables private E3 RPCs while retaining saved drafts', async t => {
  const db = await boot(t);
  const id = await request(db);
  const runtime = createProductProcessor(transport(db), { enabledProducts: ['career-compass'] });
  await runtime.step();
  await runtime.step();
  await db.exec(await file('supabase/forward-fixes/20261014220000_disable_career_compass_candidates.sql'));
  await assert.rejects(() => service(db, 'select_next_career_compass_candidate',
    { p_candidate_version: CAREER_COMPASS_CANDIDATE_VERSION }), /permission denied/);
  await assert.rejects(() => readCandidate(db, id, 3), /permission denied/);
  assert.equal((await db.query('select count(*)::int as count from career_compass_candidates where run_id=$1', [id])).rows[0].count, 1);
  assert.equal((await db.query('select state from product_runs where id=$1', [id])).rows[0].state, 'AWAITING_EDITORIAL');
});
