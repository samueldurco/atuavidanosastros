import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { setupProductDatabase, owner, other, file } from './helpers/product-database.mjs';
import { asRole } from './helpers/artifact-fixture.mjs';

let db;
const migration = '20261008140536_private_reconstruction_approval.sql';
const current = 'atv-private-interpretation-review/4.0.0';
const policies = [1, 2, 3].map((n) => `atv-private-trial-approval/${n}.0.0`);
const insert = (policy, role = 'service_role', user = null, status = 'approved') =>
  asRole(db, role, user, () => db.query(
    `insert into atv_trial_readings(id,owner_id,product_id,request_key,input,calculation,reading,approval)
     values($1,$2,'career-compass',$3,$4,'{}',$4,$5)`,
    [randomUUID(), owner, randomUUID(), JSON.stringify({ productId: 'career-compass' }),
      JSON.stringify({ status, scope: 'private-free-test', policy, digest: 'a'.repeat(64) })],
  ));
before(async () => {
  db = await setupProductDatabase();
  await db.exec(await file('supabase/migrations/20261006140000_private_product_trials.sql'));
  await db.exec(await file('supabase/migrations/20261007160000_private_reading_experience.sql'));
  await asRole(db, 'service_role', null, () => db.query('insert into atv_trial_grants(owner_id) values($1),($2)', [owner, other]));
  for (const policy of policies) await insert(policy);
  await db.exec(await file('supabase/migrations/' + migration));
});
after(async () => { await db?.close(); });

test('expanded approval preserves historical editions and accepts the reviewed reconstruction', async () => {
  await insert(current);
  const own = await asRole(db, 'authenticated', owner, () => db.query('select approval from atv_trial_readings'));
  assert.deepEqual(own.rows.map((r) => r.approval.policy).sort(), [...policies, current].sort());
  assert.equal((await asRole(db, 'authenticated', owner, () => db.query('select has_atv_trial_access() as access'))).rows[0].access, true);
  assert.equal((await db.query('select expires_at,revoked_at from atv_trial_grants where owner_id=$1', [owner])).rows[0].expires_at, null);
  await assert.rejects(insert('unknown'), /check constraint/);
  await assert.rejects(insert(current, 'service_role', null, 'rejected'), /check constraint/);
});
test('expanded approval cannot be forged by a client and retains owner isolation', async () => {
  await assert.rejects(insert(current, 'authenticated', owner), /permission denied/);
  await assert.rejects(asRole(db, 'anon', null, () => db.query('select * from atv_trial_readings')), /permission denied/);
  assert.equal((await asRole(db, 'authenticated', other, () => db.query('select * from atv_trial_readings'))).rows.length, 0);
});
test('schema rollback refuses to invalidate or discard persisted reconstructed readings', async () => {
  const beforeCount = (await db.query('select count(*)::int as n from atv_trial_readings')).rows[0].n;
  await assert.rejects(db.exec(await file('supabase/rollback/' + migration)), /reconstructed readings exist/);
  assert.equal((await db.query('select count(*)::int as n from atv_trial_readings')).rows[0].n, beforeCount);
  await insert(current);
});
