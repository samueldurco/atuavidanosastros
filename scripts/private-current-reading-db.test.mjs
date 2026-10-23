import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { mkdtemp, unlink, rmdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { setupProductDatabase, owner, other, file } from './helpers/product-database.mjs';
import { asRole } from './helpers/artifact-fixture.mjs';

// Build the actual Edge entry point just as the release does, not a hand-written
// approval fixture or a pre-existing ignored bundle. All data remains local.
const migration = '20261023165415_current_reading_approval_contract.sql';
const runtimeKey = 'synthetic-local-runtime-key';
const input = {
  version: 'atv-workflow/1.0.0',
  productId: 'birth-chart',
  birth: {
    localDateTime: '2000-01-01T12:00:00', utcInstant: '2000-01-01T12:00:00Z',
    timezone: 'UTC', latitude: 0, longitude: 0, locationSource: 'synthetic',
  },
  consent: { storage: true, partner: false, continuity: false, policyVersion: 'atv-input-consent/1' },
};
const legacyPolicies = [
  ...[1, 2, 3].map((n) => `atv-private-trial-approval/${n}.0.0`),
  'atv-private-interpretation-review/4.0.0',
];
const readingId = randomUUID();
const requestKey = randomUUID();
let db, edition, currentPolicy, handler, temporaryDirectory, temporaryBundle;

async function runtime(request) {
  const response = await handler(new Request('https://runtime.invalid', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-atv-runtime-key': runtimeKey },
    body: JSON.stringify(request),
  }));
  assert.equal(response.status, 200, 'the real runtime must accept the synthetic request');
  const body = await response.json();
  assert.equal(body.protocol, 'atv-trial-runtime/1');
  return body.result;
}

function save({ id = randomUUID(), user = owner, key = randomUUID(), approval = edition.approval } = {}) {
  return asRole(db, 'service_role', null, () => db.query(
    `insert into atv_trial_readings(id,owner_id,product_id,request_key,input,calculation,reading,approval)
     values($1,$2,$3,$4,$5,$6,$7,$8) returning id`,
    [id, user, input.productId, key, ...[input, edition.calculation, edition.reading, approval].map(JSON.stringify)],
  ));
}

function approvalConstraint(error) {
  assert.equal(error.code, '23514');
  assert.equal(error.constraint, 'atv_trial_readings_approval_check');
  return true;
}

before(async () => {
  temporaryDirectory = await mkdtemp(join(tmpdir(), 'atv-current-reading-db-'));
  temporaryBundle = join(temporaryDirectory, 'runtime.mjs');
  await build({
    entryPoints: [fileURLToPath(new URL('../supabase/functions/atv-trial-runtime/handler.ts', import.meta.url))],
    outfile: temporaryBundle, bundle: true, platform: 'neutral', format: 'esm', target: 'es2022', minify: true,
    alias: {
      '@atv/domain': fileURLToPath(new URL('../packages/domain/src/index.ts', import.meta.url)),
      '@atv/astrology': fileURLToPath(new URL('../packages/astrology/src/index.ts', import.meta.url)),
    },
    conditions: ['import', 'default'],
  });
  handler = (await import(pathToFileURL(temporaryBundle).href)).trialRuntimeHandler(runtimeKey);
  // Tie the bundle contract to current source so rebuilding only one side cannot
  // silently leave this persistence regression testing a retired review policy.
  const source = await file('apps/web/src/lib/trials/current/index.ts');
  currentPolicy = /export const CURRENT_REVIEW_POLICY = '([^']+)'/.exec(source)?.[1];
  const currentVersion = /export const CURRENT_READING_VERSION = '([^']+)'/.exec(source)?.[1];
  assert.ok(currentPolicy && currentVersion, 'current reading source exports its version and policy');
  edition = await runtime({ operation: 'generate', input, runId: randomUUID(), sources: [] });
  assert.ok(edition?.approval, 'the actual birth-chart composition must pass interpretation review');
  assert.equal(edition.reading.version, currentVersion);
  assert.equal(edition.approval.policy, currentPolicy);

  db = await setupProductDatabase({ privateOnly: true });
  for (const name of [
    '20261006140000_private_product_trials.sql',
    '20261007160000_private_reading_experience.sql',
    '20261008140536_private_reconstruction_approval.sql',
  ]) await db.exec(await file('supabase/migrations/' + name));
  await asRole(db, 'service_role', null, () => db.query(
    'insert into atv_trial_grants(owner_id) values($1),($2)', [owner, other],
  ));
  for (const policy of legacyPolicies) await save({ approval: { ...edition.approval, policy } });

  // Reproduce the production failure with a genuine runtime approval before the
  // forward migration; the same payload must then survive saving and reopening.
  await assert.rejects(save({ id: readingId, key: requestKey }), approvalConstraint);
  await db.exec(await file('supabase/migrations/' + migration));
  await save({ id: readingId, key: requestKey });
});
after(async () => {
  await db?.close();
  if (temporaryBundle) await unlink(temporaryBundle).catch((error) => {
    if (error.code !== 'ENOENT') throw error;
  });
  if (temporaryDirectory) await rmdir(temporaryDirectory);
});

test('current runtime approval saves after migration and verifies after a database JSON round trip', async () => {
  const reopened = await asRole(db, 'authenticated', owner, () => db.query(
    'select input,calculation,reading,approval from atv_trial_readings where id=$1', [readingId],
  ));
  assert.equal(reopened.rows.length, 1);
  const saved = reopened.rows[0];
  assert.deepEqual(saved, { input, ...edition });
  assert.equal(saved.approval.policy, currentPolicy);
  assert.equal(await runtime({ operation: 'verify', saved }), true);
  const altered = structuredClone(saved);
  altered.reading.title += ' altered';
  assert.equal(await runtime({ operation: 'verify', saved: altered }), false);
});

test('expansion preserves all four approved historical policy contracts', async () => {
  const result = await asRole(db, 'authenticated', owner, () => db.query(
    "select approval->>'policy' as policy from atv_trial_readings order by policy",
  ));
  assert.deepEqual(result.rows.map((r) => r.policy), [...legacyPolicies, currentPolicy].sort());
});

test('status, scope, policy and digest checks still reject malformed or unreviewed approvals', async () => {
  const invalid = [
    { ...edition.approval, status: 'rejected' },
    { ...edition.approval, scope: 'public' },
    { ...edition.approval, policy: 'unknown-review-policy' },
    { ...edition.approval, digest: 'a'.repeat(63) },
    { ...edition.approval, digest: 'G'.repeat(64) },
    { ...edition.approval, digest: null },
    ...['status', 'scope', 'policy', 'digest'].map((field) => {
      const approval = { ...edition.approval };
      delete approval[field];
      return approval;
    }),
    JSON.stringify(edition.approval),
    {},
  ];
  for (const approval of invalid) await assert.rejects(save({ approval }), approvalConstraint);
});

test('clients cannot forge approvals and readers remain isolated by owner and active grant', async () => {
  await assert.rejects(asRole(db, 'anon', null, () => db.query('select id from atv_trial_readings')), /permission denied/);
  assert.equal((await asRole(db, 'authenticated', other, () => db.query(
    'select id from atv_trial_readings where id=$1', [readingId],
  ))).rows.length, 0);
  for (const privilege of ['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE']) {
    const result = await asRole(db, 'authenticated', owner, () => db.query(
      "select has_table_privilege(current_user,'public.atv_trial_readings',$1) as allowed", [privilege],
    ));
    assert.equal(result.rows[0].allowed, false, `authenticated cannot ${privilege} a reviewed reading`);
  }
  await asRole(db, 'service_role', null, () => db.query(
    'update atv_trial_grants set revoked_at=now() where owner_id=$1', [owner],
  ));
  try {
    assert.equal((await asRole(db, 'authenticated', owner, () => db.query(
      'select id from atv_trial_readings where id=$1', [readingId],
    ))).rows.length, 0);
    await assert.rejects(save(), (error) => error.code === '42501' && /trial_access_revoked/.test(error.message));
  } finally {
    await asRole(db, 'service_role', null, () => db.query(
      'update atv_trial_grants set revoked_at=null where owner_id=$1', [owner],
    ));
  }
});

test('retry keys retain the first approved reading and remain scoped to each owner', async () => {
  await assert.rejects(save({ key: requestKey }), (error) => error.code === '23505');
  const own = await asRole(db, 'authenticated', owner, () => db.query(
    'select id,approval from atv_trial_readings where request_key=$1', [requestKey],
  ));
  assert.deepEqual(own.rows, [{ id: readingId, approval: edition.approval }]);
  const otherId = randomUUID();
  await save({ id: otherId, user: other, key: requestKey });
  const theirs = await asRole(db, 'authenticated', other, () => db.query(
    'select id from atv_trial_readings where request_key=$1', [requestKey],
  ));
  assert.deepEqual(theirs.rows, [{ id: otherId }]);
});

test('optional schema rollback refuses to invalidate or delete saved current readings', async () => {
  const count = (await db.query('select count(*)::int as n from atv_trial_readings')).rows[0].n;
  await assert.rejects(db.exec(await file('supabase/rollback/' + migration)), /current readings exist/);
  assert.equal((await db.query('select count(*)::int as n from atv_trial_readings')).rows[0].n, count);
  await save();
});

test('schema rollback succeeds without current readings and preserves all historical policies', async () => {
  await asRole(db, 'service_role', null, () => db.query(
    "delete from atv_trial_readings where approval->>'policy'=$1", [currentPolicy],
  ));
  await db.exec(await file('supabase/rollback/' + migration));
  await assert.rejects(save(), approvalConstraint);
  const historical = await db.query("select approval->>'policy' as policy from atv_trial_readings order by policy");
  assert.deepEqual(historical.rows.map((row) => row.policy), [...legacyPolicies].sort());
  await db.exec(await file('supabase/migrations/' + migration));
  await save();
});
