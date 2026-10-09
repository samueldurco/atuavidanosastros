import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { randomUUID } from "node:crypto";
import {
  setupProductDatabase,
  owner,
  other,
  file,
} from "./helpers/product-database.mjs";
import { asRole } from "./helpers/artifact-fixture.mjs";
let db;
const ids = {
  own: randomUUID(),
  foreign: randomUUID(),
  deleted: randomUUID(),
  archived: randomUUID(),
  retired: randomUUID(),
};
const item = (
  readingId = ids.own,
  selection = { kind: "hypothesis", sectionIndex: 0 },
) => ({ id: randomUUID(), readingId, selection });
const read = (user = owner) =>
  asRole(
    db,
    "authenticated",
    user,
    async () =>
      (await db.query("select read_atv_trial_continuity() as value")).rows[0]
        .value,
  );
const save = (revision, granted, items, user = owner) =>
  asRole(
    db,
    "authenticated",
    user,
    async () =>
      (
        await db.query("select set_atv_trial_continuity($1,$2,$3) as value", [
          revision,
          granted,
          JSON.stringify(items),
        ])
      ).rows[0].value,
  );
before(async () => {
  db = await setupProductDatabase();
  for (const migration of [
    "20261006140000_private_product_trials.sql",
    "20261007160000_private_reading_experience.sql",
    "20261008140536_private_reconstruction_approval.sql",
    "20261008170000_private_tarot_methods.sql",
    "20261008190000_private_trial_continuity.sql",
  ])
    await db.exec(await file("supabase/migrations/" + migration));
  await asRole(db, "service_role", null, () =>
    db.query("insert into atv_trial_grants(owner_id) values($1),($2)", [
      owner,
      other,
    ]),
  );
  for (const [key, id] of Object.entries(ids))
    await asRole(db, "service_role", null, () =>
      db.query(
        `insert into atv_trial_readings(id,owner_id,product_id,request_key,input,calculation,reading,approval) values($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          id,
          key === "foreign" ? other : owner,
          "direction-journey",
          randomUUID(),
          JSON.stringify({
            productId: "direction-journey",
            birth: "NEVER_EXPORT_BIRTH",
            email: "NEVER_EXPORT_EMAIL",
          }),
          JSON.stringify({ facts: "NEVER_EXPORT_CALCULATION" }),
          JSON.stringify({
            productId: "direction-journey",
            version: "atv-private-reading/5.0.0",
            title: "Jornada escolhida",
            sections: [
              {
                title: "Experimento",
                text: "Hipótese anterior, sem promessa.",
              },
            ],
            limits: ["Interpretação simbólica."],
          }),
          JSON.stringify({
            status: "approved",
            scope: "private-free-test",
            policy: "atv-private-interpretation-review/4.0.0",
            digest: "a".repeat(64),
          }),
        ],
      ),
    );
  await db.query(
    "update atv_trial_readings set archived_at=now() where id=$1",
    [ids.archived],
  );
  // Synthetic historical row: bypasses no client policy and is never a release proof.
  await db.exec("alter table atv_trial_readings disable trigger all");
  await db.query(
    "update atv_trial_readings set product_id='daily-card',input=jsonb_set(input,'{productId}','\"daily-card\"'),reading=jsonb_set(reading,'{productId}','\"daily-card\"') where id=$1",
    [ids.retired],
  );
  await db.exec("alter table atv_trial_readings enable trigger all");
});
after(async () => {
  await db?.close();
});

test("default off, strict owner selection, minimal exact source and stable revision", async () => {
  assert.deepEqual(await read(), {
    revision: 0,
    granted: false,
    available: true,
    items: [],
  });
  const selected = item();
  const result = await save(0, true, [selected]);
  assert.equal(result.revision, 1);
  assert.equal(result.granted, true);
  assert.deepEqual(result.items[0].selection, selected.selection);
  assert.equal(result.items[0].source.text, "Hipótese anterior, sem promessa.");
  const serialized = JSON.stringify(result);
  for (const forbidden of ["NEVER_EXPORT", "input", "calculation", "owner_id"])
    assert.ok(!serialized.includes(forbidden));
  assert.equal((await read(other)).items.length, 0);
  await assert.rejects(save(0, false, []), /revision_conflict/);
  assert.equal((await read()).revision, 1);
});
test("foreign, archived, retired and nonexistent chapters fail atomically", async () => {
  for (const selected of [
    item(ids.foreign),
    item(ids.archived),
    item(ids.retired),
    item(ids.own, { kind: "hypothesis", sectionIndex: 63 }),
  ])
    await assert.rejects(save(1, true, [selected]), /source_unavailable/);
  assert.equal((await read()).revision, 1);
});
test("reject unknown keys, cycles, duplicate UUID case and oversized/invalid reports", async () => {
  const selected = item();
  for (const items of [
    [{ ...selected, source: { text: "forged" } }],
    [item(ids.own, { kind: "cycle", factId: "x" })],
    [selected, { ...selected, id: selected.id.toUpperCase() }],
    [
      item(ids.own, {
        kind: "reported",
        category: "theme",
        text: "x".repeat(601),
      }),
    ],
    [item(ids.own, { kind: "reported", category: "diagnosis", text: "x" })],
    [item(ids.own, { kind: "reported", category: "theme", text: "x\u0001" })],
    [],
    Array.from({ length: 13 }, () => item()),
  ])
    await assert.rejects(save(1, true, items), /invalid_selection/);
  await assert.rejects(save(1, false, [item()]), /invalid_selection/);
  assert.equal((await read()).revision, 1);
});
test("direct writes/reads and anonymous/service RPC are denied", async () => {
  for (const role of ["anon", "authenticated", "service_role"]) {
    await assert.rejects(
      asRole(db, role, owner, () =>
        db.query("select * from atv_trial_continuity_items"),
      ),
      /permission denied/,
    );
    await assert.rejects(
      asRole(db, role, owner, () =>
        db.query("update atv_trial_continuity_state set granted=true"),
      ),
      /permission denied/,
    );
  }
  for (const role of ["anon", "service_role"])
    await assert.rejects(
      asRole(db, role, owner, () =>
        db.query("select read_atv_trial_continuity()"),
      ),
      /permission denied/,
    );
  await assert.rejects(read(null), /authentication_required/);
});
test("fresh archive invalidates source; source deletion cascades without copying text", async () => {
  await save(1, true, [item(ids.deleted)]);
  await db.query(
    "update atv_trial_readings set archived_at=now() where id=$1",
    [ids.deleted],
  );
  assert.equal((await read()).items[0].source, null);
  await db.query("delete from atv_trial_readings where id=$1", [ids.deleted]);
  assert.equal((await read()).items.length, 0);
});
test("revoked trial access blocks source use and new grants but permits deleting authorization", async () => {
  await save(2, true, [
    item(ids.own, {
      kind: "reported",
      category: "recurrence",
      text: "Tema percebido por mim.",
    }),
  ]);
  await db.query(
    "update atv_trial_grants set revoked_at=now() where owner_id=$1",
    [owner],
  );
  const state = await read();
  assert.equal(state.available, false);
  assert.equal(state.items[0].source, null);
  await assert.rejects(save(3, true, [item()]), /continuity_unavailable/);
  const removed = await save(3, false, []);
  assert.equal(removed.granted, false);
  assert.equal(removed.items.length, 0);
  await db.query(
    "update atv_trial_grants set revoked_at=null where owner_id=$1",
    [owner],
  );
});
test("forward fix stops collection while owner read/revocation and source readings survive", async () => {
  await save(4, true, [item()]);
  const count = (
    await db.query("select count(*)::int as n from atv_trial_readings")
  ).rows[0].n;
  await db.exec(
    await file("supabase/rollback/20261008190000_private_trial_continuity.sql"),
  );
  assert.equal((await read()).available, false);
  await assert.rejects(save(5, true, [item()]), /continuity_unavailable/);
  assert.equal((await save(5, false, [])).revision, 6);
  assert.equal(
    (await db.query("select count(*)::int as n from atv_trial_readings"))
      .rows[0].n,
    count,
  );
});
