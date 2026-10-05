import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { setupProductDatabase, owner, file } from './helpers/product-database.mjs';
import { asRole } from './helpers/artifact-fixture.mjs';

// Real local PostgreSQL/RLS with synthetic auth only; not hosted JWT validation.
let db;
before(async () => {
  db = await setupProductDatabase();
  await db.exec(await file('supabase/migrations/20260916120000_tiktok_connections.sql'));
});
after(async () => { await db?.close(); });

test('anonymous and authenticated roles cannot read or write credentials', async () => {
  for (const role of ['anon', 'authenticated']) {
    await assert.rejects(asRole(db, role, owner, () => db.query('select * from tiktok_connections')), /permission denied/);
    await assert.rejects(asRole(db, role, owner, () => db.query("delete from tiktok_connections")), /permission denied/);
    const result = await db.query("select has_table_privilege($1,'public.tiktok_connections','INSERT') as allowed", [role]);
    assert.equal(result.rows[0].allowed, false);
  }
});

test('service role writes the single synthetic encrypted connection and updates its timestamp', async () => {
  await asRole(db, 'service_role', null, () => db.query(`insert into tiktok_connections
    (id,owner_user_id,open_id,display_name,avatar_url,scopes,access_expires_at,refresh_expires_at,token_ciphertext,token_iv,last_verified_at)
    values ('primary',$1,'synthetic-id','Synthetic','',array['user.info.basic'],now()+interval '1 day',now()+interval '1 year','synthetic-ciphertext','synthetic-iv',now())`, [owner]));
  await asRole(db, 'service_role', null, () => db.query("update tiktok_connections set display_name='Updated',updated_at='2000-01-01' where id='primary'"));
  const result = await asRole(db, 'service_role', null, () => db.query('select display_name,updated_at > timestamptz \'2000-01-01\' as touched from tiktok_connections'));
  assert.deepEqual(result.rows, [{ display_name: 'Updated', touched: true }]);
  await assert.rejects(asRole(db, 'service_role', null, () => db.query("update tiktok_connections set id='secondary'")), /check constraint/);
});

test('containment removes service access without deleting the stored connection', async () => {
  await db.exec(await file('supabase/forward-fixes/disable_tiktok_connections.sql'));
  await assert.rejects(asRole(db, 'service_role', null, () => db.query('select * from tiktok_connections')), /permission denied/);
  const result = await db.query('select count(*)::int as count from tiktok_connections');
  assert.equal(result.rows[0].count, 1);
  // Restore exactly the original limited grant in this disposable fixture only.
  await db.exec('grant select,insert,update on tiktok_connections to service_role');
  const restored = await asRole(db, 'service_role', null, () => db.query('select count(*)::int as count from tiktok_connections'));
  assert.equal(restored.rows[0].count, 1);
});
