import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setupProductDatabase, owner, other, file } from './helpers/product-database.mjs';
import { asRole } from './helpers/artifact-fixture.mjs';
import { weekReadingEditorialTestFixture } from './helpers/week-reading-editorial-test-fixture.mjs';
import { createWorkflowRepository, processNextProductRun } from '../apps/worker/src/product-processing.ts';
import { createWeekReadingCalculators } from '../apps/worker/src/week-reading-calculators.ts';
import { prepareProductFacts } from '../apps/worker/src/product-editorial.ts';
import { prepareProductDelivery } from '../apps/worker/src/product-delivery.ts';
import { createProductPublisher } from '../apps/worker/src/product-publication.ts';
import { weekReadingTimeline } from '../apps/web/src/lib/week-reading-timeline.ts';

const service = (db, sql, args = []) => asRole(db, 'service_role', null, () => db.query(sql, args)).then(r => r.rows[0]?.data);
const read = (db, id, user = owner) => asRole(db, 'authenticated', user, () => db.query('select read_product_run($1) as data', [id])).then(r => r.rows[0].data);

// Isolated PostgreSQL/WASM and synthetic owner-issued receipt: never real approval,
// hosted auth or an application receipt issuer. All flags below affect only this DB.
for (const withContext of [true, false]) test(`Week SQL preserves seven samples, references and owner recovery (context=${withContext})`, async t => {
  const db = await setupProductDatabase({ processing: true });
  t.after(() => db.close());
  for (const migration of ['20260915180000_product_artifacts.sql', '20260923110000_product_editorial_publication.sql']) {
    await db.exec(await file(`supabase/migrations/${migration}`));
  }
  await db.exec("update workflow_releases set enabled=true,engine_approved=true,access_policy='free' where product_id='week-reading'");
  const input = {
    version: 'atv-workflow/1.0.0', productId: 'week-reading', targetDate: '2026-09-29',
    birth: { localDateTime: '2000-01-01T12:00:00', utcInstant: '2000-01-01T12:00:00Z', timezone: 'UTC', latitude: 0, longitude: 0, locationSource: 'synthetic-reader-test' },
    consent: { storage: true, partner: false, continuity: false, policyVersion: 'atv-input-consent/1' },
    ...(withContext ? { context: 'Relato sintético para observar a semana.' } : {})
  };
  const key = randomUUID();
  const request = () => asRole(db, 'authenticated', owner, () => db.query('select request_product_run($1,$2,$3) as id', ['week-reading', key, input])).then(r => r.rows[0].id);
  const id = await request();
  assert.equal(await request(), id);
  const repository = createWorkflowRepository(async (name, args, signal) => {
    signal.throwIfAborted();
    assert.ok(['claim_product_run_work', 'complete_product_run_work', 'fail_product_run_work'].includes(name));
    return service(db, `select ${name}(${Object.keys(args).map((k, i) => k + ' => $' + (i + 1)).join(',')}) as data`, Object.values(args));
  });
  assert.equal(await processNextProductRun(repository, createWeekReadingCalculators()), 'calculated');
  assert.equal(await processNextProductRun(repository, createWeekReadingCalculators()), 'awaiting_editorial');
  const row = (await db.query('select * from product_runs where id=$1', [id])).rows[0];
  const facts = prepareProductFacts(row.product_id, row.calculation);
  assert.equal(facts.status, 'prepared');
  const delivery = await prepareProductDelivery({ runId: id, revision: 4, productId: 'week-reading', tier: 'free', calculation: row.calculation, output: weekReadingEditorialTestFixture(facts.facts) });
  assert.equal(delivery.status, 'prepared_for_review', delivery.reason);
  const promotion = 'fixture-' + randomUUID();
  const editorial = { ...delivery.content, promotionId: promotion, reviewDigest: 'a'.repeat(64) };
  await db.query('insert into editorial_promotions values ($1,$2,$3,$4,null)', [promotion, row.product_id, row.contract_version, 'b'.repeat(64)]);
  const receipt = randomUUID();
  await db.query(`insert into product_editorial_receipts(id,run_id,revision,calculation,editorial,promotion_id,promotion_evidence_digest,basis_digest,review_digest,authority_reference,expires_at)
    values ($1,$2,$3,$4,$5,$6,$7,$8,$9,'synthetic-reader-only',clock_timestamp()+interval '1 hour')`,
    [receipt, id, row.revision, row.calculation, editorial, promotion, 'b'.repeat(64), 'c'.repeat(64), editorial.reviewDigest]);
  const publisher = createProductPublisher(async (name, args, signal) => {
    signal.throwIfAborted();
    if (name === 'claim_product_editorial') return service(db, 'select claim_product_editorial($1) as data', [args.p_products]);
    assert.equal(name, 'complete_product_editorial');
    return service(db, 'select complete_product_editorial($1,$2,$3,$4) as data', [args.p_id, args.p_receipt, args.p_token, args.p_revision]);
  }, { enabledProducts: ['week-reading'] });
  assert.equal(await publisher.step(), 'idle');
  assert.equal((await read(db, id)).calculation, null);
  await db.exec('update product_editorial_policy set enabled=true');
  assert.equal(await publisher.step(), 'published');
  assert.equal(await publisher.step(), 'idle');
  const result = await read(db, id);
  assert.equal(result.released, true);
  assert.equal(result.calculation.facts.length, withContext ? 89 : 88);
  assert.deepEqual(result.calculation.facts, row.calculation.facts);
  assert.deepEqual(result.editorial, editorial);
  assert.deepEqual(result.history.map(e => e.state), ['QUEUED', 'CALCULATED', 'AWAITING_EDITORIAL', 'READY']);
  assert.equal(weekReadingTimeline(result).length, 7);
  assert.deepEqual(await read(db, id), result);
  assert.equal(await read(db, id, other), null);
  assert.equal(result.input, undefined);
  assert.equal(result.user_id, undefined);
  assert.equal((await db.query('select count(*)::int as n from library_items where source_id=$1 and user_id=$2', [id, owner])).rows[0].n, 1);
  await db.query('update product_editorial_receipts set revoked_at=now() where id=$1', [receipt]);
  const revoked = await read(db, id);
  assert.equal(revoked.released, false);
  assert.equal(revoked.calculation, null);
  assert.equal(revoked.editorial, null);
  assert.equal(weekReadingTimeline(revoked), null);
});
