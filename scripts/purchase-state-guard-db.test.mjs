import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { asRole } from './helpers/artifact-fixture.mjs';
import { file, owner, setupProductDatabase } from './helpers/product-database.mjs';

const migration = 'supabase/migrations/20261019143000_purchase_state_guard.sql';
const rollback = 'supabase/rollback/20261019143000_purchase_state_guard.sql';
const freeze = 'supabase/forward-fixes/freeze_purchase_approvals.sql';
const signature = 'public.enforce_purchase_state_transition()';

test('purchase state guard matches domain graph and supports containment and rollback', async t => {
  const db = await setupProductDatabase({ privateOnly: true });
  t.after(() => db.close());
  const offerId = randomUUID();
  await db.exec(`insert into public.products(id,slug,name,universe,state)
    values ('synthetic-cycle','synthetic-cycle','Synthetic cycle','NATAL','DRAFT')`);
  await db.query(`insert into public.offers(id,product_id,code,state)
    values ($1,'synthetic-cycle','synthetic-cycle','DRAFT')`, [offerId]);

  const create = async (state = 'PENDING') => {
    const result = await db.query(`insert into public.purchases
      (user_id,offer_id,provider,transaction_ref,state)
      values ($1,$2,'hotmart',$3,$4) returning id`, [owner, offerId, randomUUID(), state]);
    return result.rows[0].id;
  };
  const setState = (id, state) => db.query(
    'update public.purchases set state=$2 where id=$1 returning state', [id, state]);
  const stateOf = async id => (await db.query(
    'select state from public.purchases where id=$1', [id])).rows[0].state;
  const triggerPresent = async name => (await db.query(`select exists (
    select 1 from pg_trigger where tgrelid='public.purchases'::regclass
      and tgname=$1 and not tgisinternal) as present`, [name])).rows[0].present;

  // This preexisting approval and its entitlement must survive all schema changes.
  const existing = await create('APPROVED');
  await db.query(`insert into public.entitlements(user_id,product_id,purchase_id,state)
    values ($1,'synthetic-cycle',$2,'ACTIVE')`, [owner, existing]);

  await db.exec('begin');
  await db.exec(await file(migration));
  assert.equal(await triggerPresent('purchases_state_transition_guard'), true);
  await db.exec('rollback');
  assert.equal(await triggerPresent('purchases_state_transition_guard'), false);
  assert.equal((await db.query('select to_regprocedure($1) is not null as present',
    [signature])).rows[0].present, false);

  await db.exec(await file(migration));
  for (const role of ['anon', 'authenticated', 'service_role']) {
    assert.equal((await db.query(
      "select has_function_privilege($1,$2,'EXECUTE') as allowed",
      [role, signature])).rows[0].allowed, false);
  }

  const pending = await create();
  assert.equal((await setState(pending, 'APPROVED')).rows[0].state, 'APPROVED');
  assert.equal((await setState(pending, 'APPROVED')).rows[0].state, 'APPROVED');
  await assert.rejects(setState(pending, 'PENDING'), /invalid_purchase_state_transition/);
  assert.equal(await stateOf(pending), 'APPROVED');

  for (const terminal of ['CANCELLED', 'REFUNDED', 'CHARGEDBACK']) {
    const id = await create();
    await setState(id, 'APPROVED');
    await setState(id, terminal);
    assert.equal(await stateOf(id), terminal);
    for (const rejected of ['PENDING', 'APPROVED', ...['CANCELLED', 'REFUNDED', 'CHARGEDBACK'].filter(s => s !== terminal)]) {
      await assert.rejects(setState(id, rejected), /invalid_purchase_state_transition/);
      assert.equal(await stateOf(id), terminal);
    }
    assert.equal((await setState(id, terminal)).rows[0].state, terminal);
  }
  const cancelledPending = await create();
  await setState(cancelledPending, 'CANCELLED');
  await assert.rejects(setState(cancelledPending, 'APPROVED'), /invalid_purchase_state_transition/);
  const neverApproved = await create();
  for (const disallowed of ['REFUNDED', 'CHARGEDBACK']) {
    await assert.rejects(setState(neverApproved, disallowed), /invalid_purchase_state_transition/);
  }
  assert.equal(await stateOf(neverApproved), 'PENDING');

  // Containment blocks new approvals while still permitting genuine revocations.
  await db.exec(await file(freeze));
  assert.equal(await triggerPresent('purchases_approved_insert_freeze'), true);
  await assert.rejects(create('APPROVED'), /purchase_approval_frozen/);
  await assert.rejects(setState(neverApproved, 'APPROVED'), /purchase_approval_frozen/);
  await setState(neverApproved, 'CANCELLED');
  await setState(existing, 'REFUNDED');
  assert.equal(await stateOf(existing), 'REFUNDED');
  assert.equal((await db.query(`select state from public.entitlements
    where purchase_id=$1`, [existing])).rows[0].state, 'ACTIVE');

  // Reapplying the migration removes containment and restores the normal graph.
  await db.exec(await file(migration));
  assert.equal(await triggerPresent('purchases_approved_insert_freeze'), false);
  const resumed = await create();
  await asRole(db, 'service_role', null, () => setState(resumed, 'APPROVED'));
  assert.equal(await stateOf(resumed), 'APPROVED');
  await assert.rejects(setState(existing, 'APPROVED'), /invalid_purchase_state_transition/);

  // A deployed schema rollback retains purchase and entitlement data.
  await db.exec(await file(rollback));
  assert.equal(await triggerPresent('purchases_state_transition_guard'), false);
  assert.equal((await db.query('select to_regprocedure($1) is not null as present',
    [signature])).rows[0].present, false);
  assert.equal(await stateOf(existing), 'REFUNDED');
  assert.equal((await db.query(`select state from public.entitlements
    where purchase_id=$1`, [existing])).rows[0].state, 'ACTIVE');
});
