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
import { persistRenderedProductArtifact } from "../apps/worker/src/product-artifacts.ts";
const migration = "20261104094016_atv_plus_commercial_memberships.sql";
test("commercial memberships: gated checkout, inbox activation, intake, stable gifts and due dispatch", async (t) => {
  const db = await setupProductDatabase();
  t.after(() => db.close());
  await db.exec(
    await file("supabase/migrations/20260923180000_natal_onboarding.sql"),
  );
  await db.exec(
    await file("supabase/migrations/20260915180000_product_artifacts.sql"),
  );
  await db.exec(await file("supabase/migrations/" + migration));
  const rpc = (name, args = [], role = "authenticated", user = owner) =>
    asRole(db, role, user, () =>
      db.query(
        `select ${name}(${args.map((_, i) => "$" + (i + 1)).join(",")}) as data`,
        args,
      ),
    ).then((r) => r.rows[0].data);
  assert.deepEqual(await rpc("atv_plus_public_offers", [], "anon", null), []);
  assert.equal(
    (await db.query("select count(*)::int n from atv_plus_commercial_offers"))
      .rows[0].n,
    9,
  );
  await assert.rejects(
    () =>
      db.exec("update atv_plus_commercial_offers set commercial_enabled=true"),
    /check constraint/,
  );
  await assert.rejects(
    () =>
      db.exec(
        "update atv_plus_release_gates set generation_enabled=true,workflow_product_id='birth-chart'",
      ),
    /check constraint/,
  );
  await assert.rejects(
    () => rpc("atv_plus_start_checkout", ["atv-plus-ampliado-3m"]),
    /commercial_offer_unavailable/,
  );
  await assert.rejects(
    () => rpc("process_atv_plus_hotmart_event", ["event-1"]),
    /permission denied/,
  );
  for (const table of [
    "atv_plus_commercial_offers",
    "atv_plus_contacts",
    "atv_plus_release_gates",
    "atv_plus_checkout_intents",
  ]) {
    await assert.rejects(
      () =>
        asRole(db, "authenticated", owner, () =>
          db.query("select * from " + table),
        ),
      /permission denied/,
    );
  }
  // Explicit synthetic release is local test setup only, never migration configuration.
  await db.exec(
    `update atv_plus_commercial_offers set commercial_enabled=true,commercial_terms_approved=true,terms_approval_reference='fixture-local-only',hotmart_product_id='fixture-product',hotmart_offer_code='fixture-offer',checkout_url='https://pay.hotmart.com/FIXTURE',total_minor=12345,approved_at=now() where id='atv-plus-ampliado-3m'`,
  );
  const publicOffers = await rpc("atv_plus_public_offers", [], "anon", null);
  assert.equal(publicOffers.length, 1);
  assert.equal(Object.hasOwn(publicOffers[0], "checkout_url"), false);
  await assert.rejects(
    () =>
      db.exec(
        "update atv_plus_commercial_offers set total_minor=null where commercial_enabled",
      ),
    /check constraint/,
  );
  await assert.rejects(
    () =>
      db.exec(
        "update atv_plus_commercial_offers set checkout_url=null where commercial_enabled",
      ),
    /check constraint/,
  );
  const intent = await rpc("atv_plus_start_checkout", ["atv-plus-ampliado-3m"]);
  assert.match(intent.checkout_url, /sck=/);
  const notification = {
    id: "event-1",
    event: "PURCHASE_APPROVED",
    data: {
      product: { id: "fixture-product" },
      purchase: {
        transaction: "fixture-transaction",
        offer: { code: "fixture-offer" },
        origin: { sck: intent.intent_id },
        price: { value: 123.45, currency_value: "BRL" },
      },
      subscription: { subscriber: { code: "fixture-subscription" } },
    },
  };
  const inbox = async (event) =>
    db.query(
      "insert into webhook_inbox(provider,external_event_id,event_type,signature_verified,payload_hash,payload) values('hotmart',$1,$2,true,$3,$4)",
      [event.id, event.event, "a".repeat(64), event],
    );
  await inbox(notification);
  const activated = await rpc(
    "process_atv_plus_hotmart_event",
    ["event-1"],
    "service_role",
    null,
  );
  assert.equal(activated.state, "processed");
  assert.equal(
    (
      await rpc(
        "process_atv_plus_hotmart_event",
        ["event-1"],
        "service_role",
        null,
      )
    ).state,
    "already_processed",
  );
  const membership = activated.membership_id;
  assert.equal((await rpc("atv_plus_membership_state")).memberships.length, 1);
  assert.equal(
    (await rpc("atv_plus_membership_state", [], "authenticated", other))
      .memberships.length,
    0,
  );
  await assert.rejects(
    () =>
      asRole(db, "authenticated", owner, () =>
        db.exec("update atv_plus_memberships set status='ACTIVE'"),
      ),
    /permission denied/,
  );
  const profile = randomUUID();
  await db.query(
    "insert into natal_profiles(id,user_id,version,local_date,local_time,location_label,country_code,timezone_iana,utc_instant,latitude,longitude,location_source) values($1,$2,1,'1990-08-15','12:00','Cidade sintética','BR','America/Sao_Paulo','1990-08-15T15:00:00Z',-23,-46,'fixture')",
    [profile, owner],
  );
  await db.query(
    "insert into natal_storage_consents(user_id,revision,granted,policy_version) values($1,1,true,'atv-natal-storage/1')",
    [owner],
  );
  await db.query(
    "update profiles set onboarding_revision=1,onboarding_state='COMPLETE' where id=$1",
    [owner],
  );
  const location = {
    label: "Cidade sintética",
    countryCode: "BR",
    timezone: "America/Sao_Paulo",
    latitude: -23,
    longitude: -46,
  };
  await assert.rejects(
    () =>
      rpc("atv_plus_complete_onboarding", [
        membership,
        profile,
        "+5511999990000",
        true,
        { ...location, latitude: 91 },
      ]),
    /solar_return_location_invalid/,
  );
  await assert.rejects(
    () =>
      rpc(
        "atv_plus_complete_onboarding",
        [membership, profile, "+5511999990000", true, location],
        "authenticated",
        other,
      ),
    /active_membership_required/,
  );
  const onboarding = await rpc("atv_plus_complete_onboarding", [
    membership,
    profile,
    "+5511999990000",
    true,
    location,
  ]);
  assert.equal(onboarding.contact.verified, false);
  assert.equal(onboarding.contact.whatsapp_masked, "•••• 0000");
  const initial = onboarding.deliveries;
  assert.ok(initial.length > 5);
  const solar = initial.find((d) => d.kind === "solar-return"),
    gift = initial.find((d) => d.kind === "natal-brief");
  assert.ok(solar && gift);
  assert.ok(new Date(solar.due_at) <= new Date());
  assert.equal(solar.period_start, solar.period_end);
  assert.ok(
    initial
      .filter((d) => !["solar-return", "natal-brief"].includes(d.kind))
      .every((d) => new Date(d.due_at) > new Date()),
  );
  const repeated = await rpc("atv_plus_complete_onboarding", [
    membership,
    profile,
    "+5511999990000",
    true,
    location,
  ]);
  assert.equal(repeated.deliveries.length, initial.length);
  assert.equal(
    (await rpc("atv_plus_dispatch_due", [], "service_role", null)).queued,
    0,
  );
  assert.equal(
    (
      await db.query("select gate_code from atv_plus_deliveries where id=$1", [
        solar.id,
      ])
    ).rows[0].gate_code,
    "content_not_released",
  );
  await db.exec(
    "update atv_plus_release_gates set generation_enabled=true,channel_enabled=true,workflow_product_id='birth-chart',approval_reference='fixture-local-only'",
  );
  await rpc("atv_plus_dispatch_due", [], "service_role", null);
  assert.equal(
    (
      await db.query("select gate_code from atv_plus_deliveries where id=$1", [
        solar.id,
      ])
    ).rows[0].gate_code,
    "pipeline_unavailable",
  );
  await db.exec(
    "update workflow_releases set enabled=true,engine_approved=true where product_id='birth-chart'; update product_artifact_policy set enabled=true",
  );
  await rpc("atv_plus_dispatch_due", [], "service_role", null);
  assert.equal(
    (
      await db.query("select gate_code from atv_plus_deliveries where id=$1", [
        solar.id,
      ])
    ).rows[0].gate_code,
    "whatsapp_not_verified",
  );
  await db.query(
    "update atv_plus_contacts set verified_at=now(),verification_reference='fixture-test' where owner_id=$1",
    [owner],
  );
  assert.equal(
    (await rpc("atv_plus_dispatch_due", [], "service_role", null)).queued,
    2,
  );
  assert.equal(
    (await rpc("atv_plus_dispatch_due", [], "service_role", null)).queued,
    0,
  );
  assert.equal(
    (
      await db.query(
        "select count(*)::int n from jobs where job_type='atv_plus.generate'",
      )
    ).rows[0].n,
    2,
  );
  const step = (action, artifactId = null, messageId = null) =>
    rpc(
      "atv_plus_delivery_step",
      [gift.id, action, artifactId, messageId],
      "service_role",
      null,
    );
  assert.equal((await step("CLAIM")).state, "PROCESSING");
  const reading = await readyArtifactFixture(db, "birth-chart", owner, {
    version: "atv-workflow/1.0.0",
    productId: "birth-chart",
    consent: {
      storage: true,
      policyVersion: "atv-input-consent/1",
      partner: false,
      continuity: false,
    },
    birth: {
      localDateTime: "1990-08-15T12:00:00",
      utcInstant: "1990-08-15T15:00:00Z",
      timezone: "America/Sao_Paulo",
      latitude: -23,
      longitude: -46,
      locationSource: "fixture",
    },
  });
  const artifactRpc = (name, args) =>
    asRole(db, "service_role", null, () =>
      db.query(
        `select ${name}(${Object.keys(args)
          .map((key, i) => key + " => $" + (i + 1))
          .join(",")}) as data`,
        Object.values(args),
      ),
    ).then((r) => r.rows[0].data);
  const artifact = await persistRenderedProductArtifact(artifactRpc, {
    owner,
    reading,
    format: "pdf",
    section: -1,
    rendererVersion: "atv-pdf-export/1.0.0",
    bytes: new TextEncoder().encode("%PDF-1.4\n% synthetic QA only\n%%EOF"),
  });
  await assert.rejects(
    () => step("ATTACH", artifact.id),
    /approved_pdf_required/,
  );
  // A fixture may bind the request key; production must create the correct run from its claim.
  await db.query("update product_runs set request_key=$1 where id=$2", [
    gift.id,
    reading.id,
  ]);
  assert.equal((await step("ATTACH", artifact.id)).state, "READY");
  await db.query("update profiles set deleted_at=now() where id=$1", [owner]);
  assert.equal(
    (
      await asRole(db, "authenticated", owner, () =>
        db.query("select * from atv_plus_memberships"),
      )
    ).rows.length,
    0,
  );
  await assert.rejects(() => step("BEGIN_SEND"), /delivery_gate_closed/);
  await db.query("update profiles set deleted_at=null where id=$1", [owner]);
  assert.equal((await step("BEGIN_SEND")).state, "SENDING");
  assert.equal(
    (await step("UNCERTAIN")).code,
    "delivery_reconciliation_required",
  );
  assert.equal((await step("ACCEPTED", null, "fixture-message")).state, "SENT");
  assert.equal((await step("CLAIM")).state, "SENT");
  assert.equal(
    (await step("CONFIRM", null, "fixture-message")).state,
    "DELIVERED",
  );
  assert.equal((await step("CLAIM")).state, "DELIVERED");
  assert.equal(
    (await step("CONFIRM", null, "fixture-message")).state,
    "DELIVERED",
  );
  const revoked = {
    ...notification,
    id: "event-refund",
    event: "PURCHASE_REFUNDED",
  };
  await inbox(revoked);
  await rpc(
    "process_atv_plus_hotmart_event",
    [revoked.id],
    "service_role",
    null,
  );
  assert.equal(
    (
      await db.query("select status from atv_plus_memberships where id=$1", [
        membership,
      ])
    ).rows[0].status,
    "SUSPENDED",
  );
  assert.equal(
    (
      await db.query(
        "select count(*)::int n from atv_plus_deliveries where state<>'CANCELLED'",
      )
    ).rows[0].n,
    1,
  );
  assert.equal(
    (
      await db.query(
        "select count(*)::int n from atv_plus_deliveries where state='DELIVERED'",
      )
    ).rows[0].n,
    1,
  );
});

test("commercial migration coexists with the hosted base without private product pipeline", async (t) => {
  const db = await setupProductDatabase({ privateOnly: true });
  t.after(() => db.close());
  await db.exec(
    await file("supabase/migrations/20260923180000_natal_onboarding.sql"),
  );
  await db.exec(await file("supabase/migrations/" + migration));
  const missing = await db.query(
    "select to_regclass('public.workflow_releases') w,to_regclass('public.product_runs') r,to_regclass('public.product_artifacts') a",
  );
  assert.deepEqual(missing.rows[0], { w: null, r: null, a: null });
  assert.equal(
    (
      await asRole(db, "service_role", null, () =>
        db.query(
          "select atv_plus_private.pipeline_available('solar-return') allowed",
        ),
      )
    ).rows[0].allowed,
    false,
  );
  assert.deepEqual(
    (
      await asRole(db, "anon", null, () =>
        db.query("select atv_plus_public_offers() offers"),
      )
    ).rows[0].offers,
    [],
  );
  await db.exec(
    await file(
      "supabase/rollbacks/20261104094016_atv_plus_commercial_disable.sql",
    ),
  );
  assert.equal(
    (await db.query("select count(*)::int n from atv_plus_commercial_offers"))
      .rows[0].n,
    9,
  );
});
