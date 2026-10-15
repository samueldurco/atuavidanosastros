import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

// Disposable synthetic identities only. Production identity is never a fixture.
const owner = "00000000-0000-4000-8000-000000000001";
const other = "00000000-0000-4000-8000-000000000002";
const sql = await readFile(
  new URL(
    "../supabase/operations/architecture-owner-evaluation.sql",
    import.meta.url,
  ),
  "utf8",
);
let db;
before(async () => {
  db = new PGlite();
  await db.exec(`
    create schema auth;
    create table auth.users(id uuid primary key, email_confirmed_at timestamptz);
    create table auth.identities(user_id uuid, provider text);
    create table public.atv_trial_grants(owner_id uuid primary key, owner_evaluation boolean not null default false, expires_at timestamptz, revoked_at timestamptz);
    insert into auth.users values ('${owner}', now()), ('${other}', now());
    insert into auth.identities values ('${owner}', 'google'), ('${other}', 'google');
    insert into public.atv_trial_grants(owner_id,expires_at) values ('${owner}', '2099-01-01'), ('${other}', '2099-01-01');
  `);
});
after(async () => {
  await db?.close();
});
async function apply(id) {
  await db.exec("begin");
  try {
    if (id !== undefined)
      await db.query("select set_config('atvna.release_owner_id', $1, true)", [
        id,
      ]);
    const result = await db.exec(sql);
    await db.exec("commit");
    return result.at(-1).rows[0];
  } catch (error) {
    await db.exec("rollback");
    throw error;
  }
}
test("requires an explicitly supplied identity and an existing active verified Google grant", async () => {
  await assert.rejects(apply(), /verified_owner_required/);
  await assert.rejects(
    apply("00000000-0000-4000-8000-000000000003"),
    /verified_active_owner_grant_required/,
  );
  const cases = [
    [
      "update auth.users set email_confirmed_at=null where id=$1",
      "update auth.users set email_confirmed_at=now() where id=$1",
    ],
    [
      "update auth.identities set provider='email' where user_id=$1",
      "update auth.identities set provider='google' where user_id=$1",
    ],
    [
      "update atv_trial_grants set revoked_at=now() where owner_id=$1",
      "update atv_trial_grants set revoked_at=null where owner_id=$1",
    ],
    [
      "update atv_trial_grants set expires_at=now()-interval '1 second' where owner_id=$1",
      "update atv_trial_grants set expires_at='2099-01-01' where owner_id=$1",
    ],
  ];
  for (const [invalidate, restore] of cases) {
    await db.query(invalidate, [owner]);
    await assert.rejects(apply(owner), /verified_active_owner_grant_required/);
    await db.query(restore, [owner]);
    assert.equal(
      (
        await db.query(
          "select count(*)::int n from atv_trial_grants where owner_evaluation",
        )
      ).rows[0].n,
      0,
    );
  }
});
test("refuses a second owner evaluation and never changes that existing grant", async () => {
  await db.query(
    "update atv_trial_grants set owner_evaluation=true where owner_id=$1",
    [other],
  );
  await assert.rejects(apply(owner), /unexpected_existing_owner_evaluation/);
  assert.deepEqual(
    (
      await db.query(
        "select owner_id from atv_trial_grants where owner_evaluation",
      )
    ).rows,
    [{ owner_id: other }],
  );
  await db.query(
    "update atv_trial_grants set owner_evaluation=false where owner_id=$1",
    [other],
  );
});
test("changes only the verified owner flag, preserves validity and is idempotent", async () => {
  const beforeRows = (
    await db.query(
      "select owner_id, expires_at, revoked_at from atv_trial_grants order by owner_id",
    )
  ).rows;
  assert.equal((await apply(owner)).exactly_one_owner_evaluation, true);
  assert.equal((await apply(owner)).exactly_one_owner_evaluation, true);
  assert.deepEqual(
    (
      await db.query(
        "select owner_id, expires_at, revoked_at from atv_trial_grants order by owner_id",
      )
    ).rows,
    beforeRows,
  );
  assert.deepEqual(
    (
      await db.query(
        "select owner_id from atv_trial_grants where owner_evaluation",
      )
    ).rows,
    [{ owner_id: owner }],
  );
});
