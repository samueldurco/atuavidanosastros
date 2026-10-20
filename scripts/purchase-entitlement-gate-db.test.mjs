import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { asRole } from './helpers/artifact-fixture.mjs';
import { file, other, owner, setupProductDatabase } from './helpers/product-database.mjs';

const migration = 'supabase/migrations/20261019133000_purchase_entitlement_gate.sql';
const rollback = 'supabase/rollback/20261019133000_purchase_entitlement_gate.sql';
const input = productId => ({ version: 'atv-workflow/1.0.0', productId,
  consent: { storage: true, policyVersion: 'atv-input-consent/1' } });

test('purchase-backed entitlements are rechecked at all three SQL gates', async t => {
  const db = await setupProductDatabase();
  t.after(() => db.close());
  for (const name of ['20260925140000_product_request_access.sql',
    '20260928130000_product_continuity.sql', '20261005110000_dream_atlas_diary.sql']) {
    await db.exec(await file(`supabase/migrations/${name}`));
  }

  // The deployment can be rolled back before commit without leaving any gate changed.
  await db.exec('begin');
  await db.exec(await file(migration));
  assert.equal((await db.query("select to_regprocedure('public.has_current_product_entitlement(uuid,text)') is not null as present")).rows[0].present, true);
  await db.exec('rollback');
  assert.equal((await db.query("select to_regprocedure('public.has_current_product_entitlement(uuid,text)') is not null as present")).rows[0].present, false);
  await db.exec(await file(migration));

  for (const role of ['anon', 'authenticated', 'service_role']) {
    assert.equal((await db.query("select has_function_privilege($1,'public.has_current_product_entitlement(uuid,text)','EXECUTE') as allowed", [role])).rows[0].allowed, false);
  }

  await db.exec(`insert into public.products(id,slug,name,universe,state) values
    ('birth-chart','birth-chart','Synthetic birth chart','NATAL','ACTIVE'),
    ('dream-atlas','dream-atlas','Synthetic dream atlas','DREAM','ACTIVE')`);
  await db.exec("update public.workflow_releases set enabled=true where product_id in ('birth-chart','dream-atlas')");
  const birthOffer = randomUUID();
  const dreamOffer = randomUUID();
  await db.query(`insert into public.offers(id,product_id,code,state) values
    ($1,'birth-chart','synthetic-birth-offer','DRAFT'),
    ($2,'dream-atlas','synthetic-dream-offer','DRAFT')`, [birthOffer, dreamOffer]);

  const purchase = async (user, offer, state) => {
    const result = await db.query(`insert into public.purchases(user_id,offer_id,provider,transaction_ref,state)
      values($1,$2,'hotmart',$3,$4) returning id`, [user, offer, randomUUID(), state]);
    return result.rows[0].id;
  };
  const entitlement = (product, purchaseId = null) => db.query(`insert into public.entitlements
    (user_id,product_id,purchase_id,state) values($1,$2,$3,'ACTIVE')`, [owner, product, purchaseId]);
  const run = (product, key = randomUUID(), payload = input(product)) =>
    asRole(db, 'authenticated', owner, () => db.query(
      'select public.request_product_run($1,$2,$3) as id', [product, key, payload]));
  const access = product => asRole(db, 'authenticated', owner, async () =>
    (await db.query('select public.read_product_request_access($1) as value', [product])).rows[0].value.state);

  const birthPurchase = await purchase(owner, birthOffer, 'APPROVED');
  await entitlement('birth-chart', birthPurchase);
  const key = randomUUID();
  const first = (await run('birth-chart', key)).rows[0].id;
  assert.equal(await access('birth-chart'), 'AVAILABLE');

  for (const state of ['CANCELLED', 'REFUNDED', 'CHARGEDBACK', 'PENDING']) {
    await db.query('update public.purchases set state=$1 where id=$2', [state, birthPurchase]);
    assert.equal(await access('birth-chart'), 'ACCESS_REQUIRED');
    await assert.rejects(run('birth-chart'), /entitlement_required/);
  }
  // A retry returns only the prior run ID; it never queues a new run or event.
  assert.equal((await run('birth-chart', key)).rows[0].id, first);
  assert.equal((await db.query('select count(*)::int as count from public.product_runs where user_id=$1', [owner])).rows[0].count, 1);
  assert.equal((await db.query('select count(*)::int as count from public.product_run_events where user_id=$1', [owner])).rows[0].count, 1);

  const foreignPurchase = await purchase(other, birthOffer, 'APPROVED');
  await entitlement('birth-chart', foreignPurchase);
  assert.equal(await access('birth-chart'), 'ACCESS_REQUIRED');
  await assert.rejects(run('birth-chart'), /entitlement_required/);

  const mismatchedPurchase = await purchase(owner, dreamOffer, 'APPROVED');
  await entitlement('birth-chart', mismatchedPurchase);
  assert.equal(await access('birth-chart'), 'ACCESS_REQUIRED');
  await assert.rejects(run('birth-chart'), /entitlement_required/);

  // Legitimate grants without a purchase remain valid (owner/trial issuance).
  await entitlement('birth-chart');
  assert.equal(await access('birth-chart'), 'AVAILABLE');
  assert.ok((await run('birth-chart')).rows[0].id);

  const wrongDreamPurchase = await purchase(owner, birthOffer, 'APPROVED');
  await entitlement('dream-atlas', wrongDreamPurchase);
  assert.equal(await access('dream-atlas'), 'ACCESS_REQUIRED');
  await assert.rejects(run('dream-atlas'), /entitlement_required/);

  const dreamPurchase = await purchase(owner, dreamOffer, 'APPROVED');
  await entitlement('dream-atlas', dreamPurchase);
  const today = (await db.query("select (now() at time zone 'UTC')::date::text as day")).rows[0].day;
  const dreamInput = { ...input('dream-atlas'), consent: { ...input('dream-atlas').consent,
    continuity: false, partner: false }, dreamAtlas: { startDate: today } };
  const dreamRun = (await run('dream-atlas', randomUUID(), dreamInput)).rows[0].id;
  const save = (entryId = randomUUID()) => asRole(db, 'authenticated', owner, () => db.query(
    `select public.save_dream_atlas_entry($1,$2,0,$3,'Relato sintético.',
      '[]'::jsonb,'[]'::jsonb,true) as revision`, [dreamRun, entryId, today]));
  assert.equal((await save()).rows[0].revision, 1);
  await db.query("update public.purchases set state='REFUNDED' where id=$1", [dreamPurchase]);
  assert.equal(await access('dream-atlas'), 'ACCESS_REQUIRED');
  await assert.rejects(run('dream-atlas', randomUUID(), dreamInput), /entitlement_required/);
  await assert.rejects(save(), /atlas_unreleased/);
  await entitlement('dream-atlas');
  assert.equal(await access('dream-atlas'), 'AVAILABLE');
  assert.equal((await save()).rows[0].revision, 1);

  // Operational containment revokes access without destroying any user data.
  await db.exec(await file('supabase/forward-fixes/disable_purchase_entitlement_gate.sql'));
  await assert.rejects(run('birth-chart'), /permission denied/i);
  assert.equal((await db.query('select count(*)::int as count from public.product_runs where user_id=$1', [owner])).rows[0].count, 3);

  // A deployed rollback fails closed while restoring the former function bodies.
  await db.exec(await file(rollback));
  assert.equal((await db.query("select to_regprocedure('public.has_current_product_entitlement(uuid,text)') is not null as present")).rows[0].present, false);
  for (const signature of ['public.request_product_run(text,uuid,jsonb,uuid)',
    'public.read_product_request_access(text)',
    'public.save_dream_atlas_entry(uuid,uuid,integer,date,text,jsonb,jsonb,boolean)']) {
    assert.equal((await db.query("select has_function_privilege('authenticated',$1,'EXECUTE') as allowed", [signature])).rows[0].allowed, false);
  }
  await assert.rejects(run('birth-chart'), /permission denied/i);
  await db.exec(await file(migration));
  assert.equal(await access('birth-chart'), 'AVAILABLE');
});
