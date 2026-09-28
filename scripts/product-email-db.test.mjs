import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  setupProductDatabase,
  owner,
  other,
  file,
} from "./helpers/product-database.mjs";
import { asRole, readyArtifactFixture } from "./helpers/artifact-fixture.mjs";

test("durable email history: owner discovery, bounds and forward-fix", async (t) => {
  const db = await setupProductDatabase();
  t.after(() => db.close());
  await db.exec(
    await file("supabase/migrations/20260925220000_product_email_requests.sql"),
  );
  await db.exec(
    await file("supabase/migrations/20260928113000_product_email_history.sql"),
  );
  const reading = await readyArtifactFixture(db);
  const call = (sql, args, user = owner, role = "authenticated") =>
    asRole(db, role, user, () => db.query(sql, args)).then(
      (r) => r.rows[0].data,
    );
  const history = (id = reading.id, user = owner, role = "authenticated") =>
    call("select list_product_email_requests($1) as data", [id], user, role);

  await t.test(
    "empty/unowned are identical; identity, permissions and null input fail closed",
    async () => {
      assert.deepEqual(await history(), []);
      assert.deepEqual(await history(randomUUID()), []);
      assert.deepEqual(await history(reading.id, other), []);
      await assert.rejects(() => history(reading.id, null), /auth_required/);
      await assert.rejects(() => history(null), /invalid_input/);
      for (const role of ["anon", "service_role"])
        await assert.rejects(
          () => history(reading.id, owner, role),
          /permission denied/,
        );
      assert.equal(
        (await db.query("select enabled from product_email_policy")).rows[0]
          .enabled,
        false,
      );
    },
  );

  const key = randomUUID();
  let receipt;
  await t.test(
    "actual acceptance is discoverable without its key; reads do not mutate records",
    async () => {
      await db.exec("update product_email_policy set enabled=true");
      receipt = await call("select request_product_email($1,$2) as data", [
        key,
        {
          version: "atv-email-request/1",
          runId: reading.id,
          expectedRevision: reading.revision,
          reviewDigest: reading.reviewDigest,
          consent: {
            transactional: true,
            policyVersion: "atv-email-delivery/1",
            recipient: "account-owner",
          },
        },
      ]);
      const before = await db.query("select * from product_email_requests");
      assert.deepEqual(await history(), [receipt]);
      assert.deepEqual(await history(reading.id, other), []);
      assert.deepEqual(
        await db.query("select * from product_email_requests"),
        before,
      );
      assert.deepEqual(
        Object.keys(receipt).sort(),
        [
          "id",
          "runId",
          "revision",
          "reviewDigest",
          "state",
          "createdAt",
          "cancelledAt",
        ].sort(),
      );
    },
  );

  await t.test(
    "revoked gates, disabled policy and inactive profile preserve discovery/cancellation",
    async () => {
      await db.exec(
        "update product_email_policy set enabled=false; update workflow_releases set enabled=false; update profiles set deleted_at=now(); update product_runs set revision=5",
      );
      assert.deepEqual(await history(), [receipt]);
      receipt = await call("select cancel_product_email_request($1) as data", [
        receipt.id,
      ]);
      assert.equal(receipt.state, "CANCELLED");
      assert.deepEqual(await history(), [receipt]);
    },
  );

  await t.test(
    "synthetic retained revisions are bounded to eight and sorted newest first",
    async () => {
      // Direct local seeds exercise storage bounds, not real acceptance of these versions.
      for (let revision = 1; revision <= 8; revision++) {
        if (revision === reading.revision) continue;
        await db.query(
          "insert into product_email_requests(user_id,run_id,request_key,revision,review_digest,command) values($1,$2,$3,$4,$5,$6)",
          [owner, reading.id, randomUUID(), revision, reading.reviewDigest, {}],
        );
      }
      const receipts = await history();
      assert.deepEqual(
        receipts.map((r) => r.revision),
        [8, 7, 6, 5, 4, 3, 2, 1],
      );
      assert.equal(new Set(receipts.map((r) => r.id)).size, 8);
      await assert.rejects(
        () =>
          db.query(
            "insert into product_email_requests(user_id,run_id,request_key,revision,review_digest,command) values($1,$2,$3,9,$4,$5)",
            [owner, reading.id, randomUUID(), reading.reviewDigest, {}],
          ),
        /check constraint/,
      );
      await assert.rejects(
        () =>
          db.query(
            "insert into product_email_requests(user_id,run_id,request_key,revision,review_digest,command) values($1,$2,$3,8,$4,$5)",
            [owner, reading.id, randomUUID(), reading.reviewDigest, {}],
          ),
        /unique constraint/,
      );
    },
  );

  await t.test(
    "acceptance forward-fix preserves history; history forward-fix preserves old recovery and cancellation",
    async () => {
      await db.exec(
        await file("supabase/forward-fixes/disable_product_email_requests.sql"),
      );
      assert.equal((await history()).length, 8);
      await db.exec(
        await file("supabase/forward-fixes/disable_product_email_history.sql"),
      );
      await assert.rejects(() => history(), /permission denied/);
      assert.deepEqual(
        await call("select read_product_email_request($1) as data", [key]),
        receipt,
      );
      assert.deepEqual(
        await call("select cancel_product_email_request($1) as data", [
          receipt.id,
        ]),
        receipt,
      );
      assert.equal(
        (await db.query("select count(*) from product_email_requests")).rows[0]
          .count,
        8,
      );
      await db.exec("delete from product_runs");
      assert.equal(
        (await db.query("select count(*) from product_email_requests")).rows[0]
          .count,
        0,
      );
    },
  );
});

test("email acceptance receipts: persistence, isolation, cancellation and fail-closed gates", async (t) => {
  const db = await setupProductDatabase();
  t.after(() => db.close());
  await db.exec(
    await file("supabase/migrations/20260925220000_product_email_requests.sql"),
  );
  const reading = await readyArtifactFixture(db);
  const command = (run = reading) => ({
    version: "atv-email-request/1",
    runId: run.id,
    expectedRevision: run.revision,
    reviewDigest: run.reviewDigest,
    consent: {
      transactional: true,
      policyVersion: "atv-email-delivery/1",
      recipient: "account-owner",
    },
  });
  const call = (sql, args, user = owner, role = "authenticated") =>
    asRole(db, role, user, () => db.query(sql, args)).then(
      (r) => r.rows[0].data,
    );
  const request = (key, input = command(), user = owner) =>
    call("select request_product_email($1,$2) as data", [key, input], user);
  const recover = (key, user = owner) =>
    call("select read_product_email_request($1) as data", [key], user);
  const cancel = (id, user = owner) =>
    call("select cancel_product_email_request($1) as data", [id], user);
  const count = async () =>
    (await db.query("select count(*) from product_email_requests")).rows[0]
      .count;
  const key = randomUUID();
  let saved;

  await t.test(
    "acceptance defaults off; every direct table/policy access and service/anon RPC is forbidden",
    async () => {
      assert.equal(
        (await db.query("select enabled from product_email_policy")).rows[0]
          .enabled,
        false,
      );
      await assert.rejects(() => request(key), /email_disabled/);
      assert.equal(await count(), 0);
      for (const role of ["anon", "authenticated", "service_role"]) {
        for (const sql of [
          "select * from product_email_requests",
          "delete from product_email_requests",
          "select * from product_email_policy",
          "update product_email_policy set enabled=true",
        ])
          await assert.rejects(
            () => asRole(db, role, owner, () => db.exec(sql)),
            /permission denied/,
          );
      }
      for (const role of ["anon", "service_role"]) {
        for (const [sql, args] of [
          ["select request_product_email($1,$2) as data", [key, command()]],
          ["select read_product_email_request($1) as data", [key]],
          ["select cancel_product_email_request($1) as data", [key]],
        ])
          await assert.rejects(
            () => call(sql, args, owner, role),
            /permission denied/,
          );
      }
      await assert.rejects(
        () => request(key, command(), null),
        /auth_required/,
      );
      await assert.rejects(() => recover(key, null), /auth_required/);
      await assert.rejects(() => cancel(key, null), /auth_required/);
      await db.exec("update product_email_policy set enabled=true");
    },
  );

  await t.test(
    "strict minimal command refuses injected destination, provider, owner, URL and invalid consent/types",
    async () => {
      const valid = command();
      const invalid = [
        null,
        [],
        {},
        { ...valid, email: "nobody@example.invalid" },
        { ...valid, userId: other },
        { ...valid, url: "https://example.invalid" },
        { ...valid, provider: "untrusted" },
        { ...valid, version: "wrong" },
        { ...valid, runId: "not-a-uuid" },
        { ...valid, expectedRevision: "4" },
        { ...valid, expectedRevision: 0 },
        { ...valid, expectedRevision: 9 },
        { ...valid, expectedRevision: 4.1 },
        { ...valid, reviewDigest: "A".repeat(64) },
        { ...valid, consent: { ...valid.consent, transactional: false } },
        { ...valid, consent: { ...valid.consent, recipient: "partner" } },
        { ...valid, consent: { ...valid.consent, marketing: true } },
        { ...valid, consent: { ...valid.consent, policyVersion: "old" } },
        { ...valid, extra: "x".repeat(2100) },
      ];
      for (const value of invalid)
        await assert.rejects(() => request(key, value), /invalid_input/);
      await assert.rejects(() => request(null), /invalid_input/);
      assert.equal(await count(), 0);
    },
  );

  await t.test(
    "fresh released owner revision/review and Library membership are required, with no partial write",
    async () => {
      await assert.rejects(
        () => request(key, command(), other),
        /email_unavailable/,
      );
      await assert.rejects(
        () => request(key, { ...command(), runId: randomUUID() }),
        /email_unavailable/,
      );
      await assert.rejects(
        () => request(key, { ...command(), expectedRevision: 3 }),
        /email_unavailable/,
      );
      await assert.rejects(
        () => request(key, { ...command(), reviewDigest: "c".repeat(64) }),
        /email_unavailable/,
      );
      for (const [disable, restore] of [
        [
          "update workflow_releases set enabled=false where product_id='daily-card'",
          "update workflow_releases set enabled=true where product_id='daily-card'",
        ],
        [
          "update workflow_releases set contract_version='revoked' where product_id='daily-card'",
          "update workflow_releases set contract_version='atv-workflow/1.0.0' where product_id='daily-card'",
        ],
        [
          "update editorial_promotions set revoked_at=now()",
          "update editorial_promotions set revoked_at=null",
        ],
        [
          "update product_runs set state='AWAITING_EDITORIAL'",
          "update product_runs set state='READY'",
        ],
        [
          "update library_items set archived_at=now()",
          "update library_items set archived_at=null",
        ],
      ]) {
        await db.exec(disable);
        await assert.rejects(() => request(key), /email_unavailable/);
        await db.exec(restore);
      }
      await db.query("update profiles set deleted_at=now() where id=$1", [
        owner,
      ]);
      await assert.rejects(() => request(key), /profile_unavailable/);
      await db.query("update profiles set deleted_at=null where id=$1", [
        owner,
      ]);
      assert.equal(await count(), 0);
    },
  );

  await t.test(
    "persists only REQUESTED receipt and recovers the exact lost acknowledgement",
    async () => {
      saved = await request(key);
      assert.equal(saved.runId, reading.id);
      assert.equal(saved.revision, 4);
      assert.equal(saved.reviewDigest, reading.reviewDigest);
      assert.equal(saved.state, "REQUESTED");
      assert.equal(saved.cancelledAt, null);
      assert.deepEqual(
        Object.keys(saved).sort(),
        [
          "id",
          "runId",
          "revision",
          "reviewDigest",
          "state",
          "createdAt",
          "cancelledAt",
        ].sort(),
      );
      assert.deepEqual(await recover(key), saved);
      assert.deepEqual(await request(key), saved);
      assert.equal(await count(), 1);
      const record = (await db.query("select * from product_email_requests"))
        .rows[0];
      assert.deepEqual(record.command, command());
      assert.equal(Object.hasOwn(record, "email"), false);
      assert.equal(Object.hasOwn(record, "body"), false);
      assert.equal(await recover(key, other), null);
      assert.equal(await cancel(saved.id, other), null);
      assert.equal(await recover(randomUUID()), null);
      assert.equal(await cancel(randomUUID()), null);
      await assert.rejects(
        () => request(key, { ...command(), reviewDigest: "c".repeat(64) }),
        /idempotency_conflict/,
      );
      await assert.rejects(
        () => request(randomUUID()),
        /email_already_requested/,
      );
      assert.equal(await count(), 1);
    },
  );

  await t.test(
    "read-only recovery and exact-key retry survive revocation, without renewing permission",
    async () => {
      await db.exec(
        "update product_email_policy set enabled=false; update editorial_promotions set revoked_at=now()",
      );
      assert.deepEqual(await recover(key), saved);
      assert.deepEqual(await request(key), saved);
      await assert.rejects(() => request(randomUUID()), /email_disabled/);
      await db.query("update profiles set deleted_at=now() where id=$1", [
        owner,
      ]);
      assert.deepEqual(await recover(key), saved);
      await assert.rejects(() => request(key), /profile_unavailable/);
      saved = await cancel(saved.id);
      assert.equal(saved.state, "CANCELLED");
      assert.ok(saved.cancelledAt);
      assert.deepEqual(await cancel(saved.id), saved);
      assert.deepEqual(await recover(key), saved);
      await db.query("update profiles set deleted_at=null where id=$1", [
        owner,
      ]);
      assert.deepEqual(await request(key), saved);
      await db.exec(
        "update product_email_policy set enabled=true; update editorial_promotions set revoked_at=null",
      );
      await assert.rejects(
        () => request(randomUUID()),
        /email_already_requested/,
      );
    },
  );

  await t.test(
    "astrological reading requires current engine approval, and another owner has independent receipts",
    async () => {
      const natal = await readyArtifactFixture(db, "birth-chart", other),
        natalKey = randomUUID();
      await db.exec(
        "update workflow_releases set engine_approved=false where product_id='birth-chart'",
      );
      await assert.rejects(
        () => request(natalKey, command(natal), other),
        /email_unavailable/,
      );
      await db.exec(
        "update workflow_releases set engine_approved=true where product_id='birth-chart'",
      );
      const receipt = await request(natalKey, command(natal), other);
      assert.equal(receipt.runId, natal.id);
      assert.equal(await recover(natalKey), null);
      await db.query("delete from product_runs where id=$1", [natal.id]);
      assert.equal(await recover(natalKey, other), null);
    },
  );

  await t.test(
    "rolling quota includes cancellations; retry/recovery/cancel are valid at capacity",
    async () => {
      const rows = [];
      // Superuser fixture reaches capacity without fabricating production approvals.
      for (let i = 0; i < 19; i++) {
        const reading = await readyArtifactFixture(db);
        rows.push(reading.id);
        const receipt = await request(randomUUID(), command(reading));
        if (i % 2 === 0) await cancel(receipt.id);
      }
      const next = await readyArtifactFixture(db);
      rows.push(next.id);
      assert.equal(await count(), 20);
      await assert.rejects(
        () => request(randomUUID(), command(next)),
        /request_limit/,
      );
      assert.equal(await count(), 20);
      assert.deepEqual(await request(key), saved);
      assert.deepEqual(await recover(key), saved);
      assert.deepEqual(await cancel(saved.id), saved);
      // Exactly 24 hours ago is outside the rolling window.
      await db.exec(
        "update product_email_requests set created_at=now()-interval '24 hours'",
      );
      const accepted = await request(randomUUID(), command(next));
      assert.equal(accepted.state, "REQUESTED");
      for (const id of rows)
        await db.query("delete from product_runs where id=$1", [id]);
    },
  );

  await t.test(
    "retained receipt cap is independent of rolling time and refuses atomically",
    async () => {
      const rows = [];
      try {
        // Seed historical revisions directly in this synthetic database. Creating
        // 99 new runs would hit the separate product-run quota before this cap.
        let seeded = 0;
        while (seeded < 99) {
          const reading = await readyArtifactFixture(db);
          rows.push(reading.id);
          for (
            let revision = 1;
            revision <= 8 && seeded < 99;
            revision++, seeded++
          ) {
            await db.query(
              `insert into product_email_requests(user_id,run_id,request_key,revision,review_digest,command,created_at)
            values($1,$2,$3,$4,$5,$6,now()-interval '2 days')`,
              [
                owner,
                reading.id,
                randomUUID(),
                revision,
                reading.reviewDigest,
                command({ ...reading, revision }),
              ],
            );
          }
        }
        const next = await readyArtifactFixture(db);
        rows.push(next.id);
        assert.equal(await count(), 100);
        await assert.rejects(
          () => request(randomUUID(), command(next)),
          /request_limit/,
        );
        assert.equal(await count(), 100);
        assert.equal((await request(key)).id, saved.id);
      } finally {
        for (const id of rows)
          await db.query("delete from product_runs where id=$1", [id]);
      }
    },
  );

  await t.test(
    "forward fix preserves recovery/cancellation and run deletion cascades receipts",
    async () => {
      await db.exec(
        await file("supabase/forward-fixes/disable_product_email_requests.sql"),
      );
      await assert.rejects(() => request(key), /permission denied/);
      const recovered = await recover(key);
      assert.equal(recovered.id, saved.id);
      assert.deepEqual(await cancel(saved.id), recovered);
      assert.equal(
        (await db.query("select enabled from product_email_policy")).rows[0]
          .enabled,
        false,
      );
      await call("select delete_product_run($1) as data", [reading.id]);
      assert.equal(await recover(key), null);
      assert.equal(await count(), 0);
    },
  );
});
