import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { asRole } from './helpers/artifact-fixture.mjs';
import { file, other, owner, setupProductDatabase } from './helpers/product-database.mjs';

const migration = 'supabase/migrations/20261019120515_owned_offer_history_read.sql';
const functionName = 'public.owned_purchase_offers(uuid[])';

async function lookup(db, user, offerIds) {
  const result = await asRole(db, 'authenticated', user, () =>
    db.query('select * from public.owned_purchase_offers($1::uuid[])', [offerIds]));
  return result.rows.sort((a, b) => a.offer_id.localeCompare(b.offer_id));
}

test('owned offer lookup is transactional, owner-scoped, and exposes only product links', async t => {
  const db = await setupProductDatabase({ privateOnly: true });
  t.after(() => db.close());

  // The migration is reversible as one transaction, leaving no callable lookup
  // or supporting index if deployment rolls back before commit.
  await db.exec('begin');
  await db.exec(await file(migration));
  assert.equal((await db.query('select to_regprocedure($1) is not null as present',
    [functionName])).rows[0].present, true);
  await db.exec('rollback');
  assert.equal((await db.query('select to_regprocedure($1) is not null as present',
    [functionName])).rows[0].present, false);
  assert.equal((await db.query("select to_regclass('public.purchases_owner_offer_idx') is not null as present"))
    .rows[0].present, false);

  await db.exec(await file(migration));
  const grants = await db.query(`select
    has_function_privilege('anon', $1, 'EXECUTE') as anon,
    has_function_privilege('authenticated', $1, 'EXECUTE') as authenticated,
    has_function_privilege('service_role', $1, 'EXECUTE') as service_role`, [functionName]);
  assert.deepEqual(grants.rows[0], { anon: false, authenticated: true, service_role: false });

  const offerOwnerActive = randomUUID();
  const offerOwnerRetired = randomUUID();
  const offerOtherPaused = randomUUID();
  const offerUnbought = randomUUID();
  await db.exec(`insert into public.products(id, slug, name, universe, state) values
    ('synthetic-owner-active', 'synthetic-owner-active', 'Synthetic owner active', 'NATAL', 'ACTIVE'),
    ('synthetic-owner-retired', 'synthetic-owner-retired', 'Synthetic owner retired', 'NATAL', 'PAUSED'),
    ('synthetic-other-paused', 'synthetic-other-paused', 'Synthetic other paused', 'NATAL', 'PAUSED'),
    ('synthetic-unbought', 'synthetic-unbought', 'Synthetic unbought', 'NATAL', 'ACTIVE')`);
  await db.query(`insert into public.offers
    (id, product_id, code, state, hotmart_product_id, hotmart_offer_code) values
    ($1, 'synthetic-owner-active', 'synthetic-owner-active', 'ACTIVE', 'secret-owner-active', 'secret-code-active'),
    ($2, 'synthetic-owner-retired', 'synthetic-owner-retired', 'RETIRED', 'secret-owner-retired', 'secret-code-retired'),
    ($3, 'synthetic-other-paused', 'synthetic-other-paused', 'PAUSED', 'secret-other-paused', 'secret-code-paused'),
    ($4, 'synthetic-unbought', 'synthetic-unbought', 'ACTIVE', 'secret-unbought', 'secret-code-unbought')`,
    [offerOwnerActive, offerOwnerRetired, offerOtherPaused, offerUnbought]);
  await db.query(`insert into public.purchases
    (user_id, offer_id, provider, transaction_ref, state) values
    ($1, $3, 'hotmart', 'synthetic-owner-active', 'APPROVED'),
    ($1, $4, 'hotmart', 'synthetic-owner-retired', 'REFUNDED'),
    ($2, $5, 'hotmart', 'synthetic-other-paused', 'APPROVED')`,
    [owner, other, offerOwnerActive, offerOwnerRetired, offerOtherPaused]);

  const requested = [offerUnbought, offerOtherPaused, offerOwnerRetired, offerOwnerActive,
    offerOwnerRetired];
  assert.deepEqual(await lookup(db, owner, requested), [
    { offer_id: offerOwnerActive, product_id: 'synthetic-owner-active' },
    { offer_id: offerOwnerRetired, product_id: 'synthetic-owner-retired' },
  ].sort((a, b) => a.offer_id.localeCompare(b.offer_id)));
  assert.deepEqual(await lookup(db, other, requested), [
    { offer_id: offerOtherPaused, product_id: 'synthetic-other-paused' },
  ]);
  assert.deepEqual(await lookup(db, null, requested), []);

  // Existing public RLS keeps active catalog offers visible, but ownership of a
  // retired or paused offer must not expose its checkout IDs or offer code.
  const visibleOffers = await asRole(db, 'authenticated', owner, () => db.query(
    'select id, hotmart_product_id, hotmart_offer_code from public.offers where id = any($1::uuid[])',
    [requested]));
  assert.deepEqual(visibleOffers.rows.map(row => row.id).sort(),
    [offerOwnerActive, offerUnbought].sort());
  assert.deepEqual(Object.keys((await lookup(db, owner, [offerOwnerRetired]))[0]).sort(),
    ['offer_id', 'product_id']);

  await assert.rejects(() => asRole(db, 'anon', null, () =>
    db.query('select * from public.owned_purchase_offers($1::uuid[])', [requested])),
  /permission denied/i);
  await assert.rejects(() => asRole(db, 'service_role', null, () =>
    db.query('select * from public.owned_purchase_offers($1::uuid[])', [requested])),
  /permission denied/i);
  await assert.rejects(() => lookup(db, owner, Array.from({ length: 76 }, () => randomUUID())),
    /invalid_offer_batch/);

  // A deployed migration can be forward-fixed without deleting purchases.
  await db.exec(await file('supabase/rollback/20261019120515_owned_offer_history_read.sql'));
  assert.equal((await db.query('select to_regprocedure($1) is not null as present',
    [functionName])).rows[0].present, false);
  assert.equal((await db.query("select to_regclass('public.purchases_owner_offer_idx') is not null as present"))
    .rows[0].present, false);
  assert.equal((await db.query("select count(*)::int as count from public.purchases"))
    .rows[0].count, 3);
});
