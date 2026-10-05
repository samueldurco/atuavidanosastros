import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { asRole } from "./helpers/artifact-fixture.mjs";
import {
  file,
  other,
  owner,
  setupProductDatabase,
} from "./helpers/product-database.mjs";

let db;
let runId;
const entryId = randomUUID();
const input = {
  version: "atv-workflow/1.0.0",
  productId: "dream-atlas",
  consent: {
    storage: true,
    policyVersion: "atv-input-consent/1",
    partner: false,
    continuity: false,
  },
  dreamAtlas: { startDate: "2026-10-01" },
};
const sql = {
  read: "select read_dream_atlas_entries($1) as value",
  save: "select save_dream_atlas_entry($1,$2,$3,$4,$5,$6,$7,$8) as value",
  delete: "select delete_dream_atlas_entry($1,$2) as value",
};
const entry = (revision = 0) => [
  runId,
  entryId,
  revision,
  "2026-10-02",
  "Um sonho sintético para testar a privacidade.",
  JSON.stringify(["curiosidade"]),
  JSON.stringify(["janela"]),
  false,
];
async function call(role, user, statement, args) {
  return asRole(
    db,
    role,
    user,
    async () => (await db.query(statement, args)).rows[0]?.value,
  );
}

before(async () => {
  db = await setupProductDatabase();
  await db.exec(
    await file("supabase/migrations/20260928130000_product_continuity.sql"),
  );
  await db.exec(
    await file("supabase/migrations/20261005110000_dream_atlas_diary.sql"),
  );
  await db.exec(
    await file("supabase/migrations/20261005120000_dream_atlas_period_read.sql"),
  );
  // Fixture release is local only; the migration leaves the real release off.
  await db.exec(
    "update workflow_releases set enabled=true,access_policy='free' where product_id='dream-atlas'",
  );
  runId = await call(
    "authenticated",
    owner,
    "select request_product_run($1,$2,$3) as value",
    ["dream-atlas", randomUUID(), input],
  );
}, 30000);
after(async () => {
  await db?.close();
});

test("owner can save, read, revise and exclude an entry; dates and revisions are bounded", async () => {
  assert.equal(await call("authenticated", owner, sql.save, entry()), 1);
  const saved = await call("authenticated", owner, sql.read, [runId]);
  assert.equal(saved.startDate, "2026-10-01");
  assert.equal(saved.entries.length, 1);
  assert.equal(saved.entries[0].includeInSynthesis, false);
  assert.equal(saved.entries[0].narrative, entry()[4]);
  assert.equal(await call("authenticated", owner, sql.save, entry(1)), 2);
  await assert.rejects(
    call("authenticated", owner, sql.save, entry(1)),
    /revision_conflict/,
  );
  await assert.rejects(
    call("authenticated", owner, sql.save, [
      runId,
      randomUUID(),
      0,
      "2026-10-31",
      "fora do período",
      "[]",
      "[]",
      true,
    ]),
    /entry_outside_period/,
  );
});

test("another owner and direct table access cannot see private entries", async () => {
  await assert.rejects(
    call("authenticated", other, sql.read, [runId]),
    /atlas_run_unavailable/,
  );
  await assert.rejects(
    call("authenticated", other, sql.save, entry(2)),
    /atlas_run_unavailable/,
  );
  await assert.rejects(
    asRole(db, "authenticated", owner, () =>
      db.query("select * from dream_atlas_entries"),
    ),
    /permission denied/,
  );
});

test("forged run input cannot authorize diary writes", async () => {
  const forgedId = randomUUID();
  await db.query(
    "insert into product_runs(id,user_id,product_id,request_key,contract_version,input) values ($1,$2,$3,$4,$5,$6)",
    [
      forgedId,
      owner,
      "dream-atlas",
      randomUUID(),
      input.version,
      { ...input, historicalDreams: ["sem autorização"] },
    ],
  );
  await assert.rejects(
    call("authenticated", owner, sql.save, [
      forgedId,
      randomUUID(),
      0,
      "2026-10-02",
      "texto",
      "[]",
      "[]",
      true,
    ]),
    /atlas_unreleased/,
  );
});

test("disabled release stops writes but preserves owner read and deletion", async () => {
  await db.exec(
    "update workflow_releases set enabled=false where product_id='dream-atlas'",
  );
  await assert.rejects(
    call("authenticated", owner, sql.save, entry(2)),
    /atlas_unreleased/,
  );
  assert.equal(
    (await call("authenticated", owner, sql.read, [runId])).entries.length,
    1,
  );
  assert.equal(
    await call("authenticated", owner, sql.delete, [runId, entryId]),
    true,
  );
  assert.deepEqual(await call("authenticated", owner, sql.read, [runId]), {
    startDate: "2026-10-01",
    entries: [],
  });
});

test("forward fix can revoke writes without deleting data or blocking owner access", async () => {
  await db.exec(
    "update workflow_releases set enabled=true where product_id='dream-atlas'",
  );
  assert.equal(await call("authenticated", owner, sql.save, entry()), 1);
  await db.exec(
    "revoke execute on function public.save_dream_atlas_entry(uuid,uuid,integer,date,text,jsonb,jsonb,boolean) from authenticated",
  );
  await assert.rejects(
    call("authenticated", owner, sql.save, entry(1)),
    /permission denied/,
  );
  assert.equal(
    (await call("authenticated", owner, sql.read, [runId])).entries.length,
    1,
  );
  assert.equal(
    await call("authenticated", owner, sql.delete, [runId, entryId]),
    true,
  );
});
