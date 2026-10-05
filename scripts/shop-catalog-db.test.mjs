import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setupProductDatabase as setup, file } from './helpers/product-database.mjs';

async function as(db, role, fn) {
  await db.exec(`set role ${role}`);
  try { return await fn(); } finally { await db.exec('reset role'); }
}

test('shop candidates stay private and cannot become published offers', async () => {
  const db = await setup();
  try {
    await db.exec(await file('supabase/migrations/20261005130000_shop_catalog_preparation.sql'));
    assert.equal((await db.query('select count(*)::integer as count from public.shop_catalog_candidates')).rows[0].count, 0);
    await assert.rejects(
      () => as(db, 'anon', () => db.query('select * from public.shop_catalog_candidates')),
      /permission denied/
    );
    await assert.rejects(
      () => as(db, 'authenticated', () => db.query('select * from public.shop_taxonomy_candidates')),
      /permission denied/
    );

    const item = await as(db, 'service_role', () => db.query(
      "insert into public.shop_catalog_candidates(slug,name,item_kind) values ('item-sintetico','Item sintético','VARIANT') returning id,state"
    ));
    assert.equal(item.rows[0].state, 'DRAFT');
    const id = item.rows[0].id;
    const category = await as(db, 'service_role', () => db.query(
      "insert into public.shop_taxonomy_candidates(kind,slug,name) values ('CATEGORY','categoria-sintetica','Categoria sintética') returning id"
    ));
    await as(db, 'service_role', () => db.query(
      'insert into public.shop_candidate_taxonomy(candidate_id,taxonomy_id) values ($1,$2)',
      [id, category.rows[0].id]
    ));
    await as(db, 'service_role', () => db.query(
      'insert into public.shop_candidate_signs(candidate_id,sign_slug) values ($1,$2)', [id, 'aries']
    ));
    await assert.rejects(
      () => as(db, 'service_role', () => db.query("update public.shop_catalog_candidates set state='ACTIVE' where id=$1", [id])),
      /check constraint/
    );
    await assert.rejects(
      () => as(db, 'service_role', () => db.query('insert into public.shop_candidate_signs(candidate_id,sign_slug) values ($1,$2)', [id, 'ofiuco'])),
      /check constraint/
    );
    await db.exec(await file('supabase/forward-fixes/disable_shop_catalog_preparation.sql'));
    await assert.rejects(
      () => as(db, 'service_role', () => db.query('select * from public.shop_catalog_candidates')),
      /permission denied/
    );
    assert.equal((await db.query('select count(*)::integer as count from public.shop_catalog_candidates')).rows[0].count, 1);
  } finally {
    await db.close();
  }
});
