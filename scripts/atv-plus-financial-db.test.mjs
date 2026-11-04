import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import {
  setupProductDatabase,
  owner,
  file,
} from "./helpers/product-database.mjs";
import { asRole } from "./helpers/artifact-fixture.mjs";

const migration = "20261104094016_atv_plus_commercial_memberships.sql";

async function fixture(t) {
  const db = await setupProductDatabase({ privateOnly: true });
  t.after(() => db.close());
  await db.exec(
    await file("supabase/migrations/20260923180000_natal_onboarding.sql"),
  );
  await db.exec(await file(`supabase/migrations/${migration}`));
  const rpc = (name, args = [], role = "authenticated", user = owner) =>
    asRole(db, role, user, () =>
      db.query(
        `select ${name}(${args.map((_, i) => "$" + (i + 1)).join(",")}) as data`,
        args,
      ),
    ).then((result) => result.rows[0].data);
  const released = new Map();
  const release = async (offerId) => {
    const offer = {
      offerId,
      productId: `fixture-product-${offerId}`,
      offerCode: `fixture-code-${offerId}`,
      totalMinor: 12345,
    };
    await db.query(
      `update atv_plus_commercial_offers set commercial_enabled=true,
      commercial_terms_approved=true,terms_approval_reference='fixture-local-only',
      hotmart_product_id=$2,hotmart_offer_code=$3,checkout_url='https://pay.hotmart.com/FIXTURE',
      total_minor=$4,approved_at=now() where id=$1`,
      [offerId, offer.productId, offer.offerCode, offer.totalMinor],
    );
    released.set(offerId, offer);
    return offer;
  };
  const notification = (offerId, intent, overrides = {}) => {
    const offer = released.get(offerId);
    const eventId = randomUUID();
    return {
      id: eventId,
      event: "PURCHASE_APPROVED",
      data: {
        product: { id: offer.productId },
        purchase: {
          transaction: `fixture-tx-${eventId}`,
          offer: { code: offer.offerCode },
          origin: { sck: intent.intent_id },
          price: { value: offer.totalMinor / 100, currency_value: "BRL" },
        },
        subscription: { subscriber: { code: `fixture-sub-${eventId}` } },
      },
      ...overrides,
    };
  };
  const process = async (event) => {
    const hash = createHash("sha256")
      .update(JSON.stringify(event))
      .digest("hex");
    await db.query(
      `insert into webhook_inbox(provider,external_event_id,event_type,
      signature_verified,payload_hash,payload) values('hotmart',$1,$2,true,$3,$4)`,
      [event.id, event.event, hash, event],
    );
    return rpc(
      "process_atv_plus_hotmart_event",
      [event.id],
      "service_role",
      null,
    );
  };
  const buy = async (offerId) => {
    const intent = await rpc("atv_plus_start_checkout", [offerId]);
    const event = notification(offerId, intent);
    const result = await process(event);
    assert.equal(result.state, "processed");
    assert.ok(result.membership_id);
    return { intent, event, membershipId: result.membership_id };
  };
  const onboard = async (membershipId) => {
    const profile = randomUUID();
    await db.query(
      `insert into natal_profiles(id,user_id,version,local_date,local_time,
      location_label,country_code,timezone_iana,utc_instant,latitude,longitude,location_source)
      values($1,$2,1,'1990-08-15','12:00','Cidade sintética','BR','America/Sao_Paulo',
      '1990-08-15T15:00:00Z',-23,-46,'fixture')`,
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
    await rpc("atv_plus_complete_onboarding", [
      membershipId,
      profile,
      "+5511999990000",
      true,
      {
        label: "Cidade sintética",
        countryCode: "BR",
        timezone: "America/Sao_Paulo",
        latitude: -23,
        longitude: -46,
      },
    ]);
    return profile;
  };
  return { db, rpc, release, notification, process, buy, onboard };
}

test("paid checkout retains its approved snapshot after offer changes and delayed notification", async (t) => {
  const { db, rpc, release, notification, process } = await fixture(t);
  const offerId = "atv-plus-essencial-3m";
  const offer = await release(offerId);
  const intent = await rpc("atv_plus_start_checkout", [offerId]);
  await db.query(
    `update atv_plus_checkout_intents set created_at=now()-interval '3 days',
    expires_at=now()-interval '2 days' where id=$1`,
    [intent.intent_id],
  );
  await db.query(
    `update atv_plus_commercial_offers set commercial_enabled=false,
    hotmart_product_id='fixture-replacement-product',hotmart_offer_code='fixture-replacement-code',
    total_minor=54321,terms_approval_reference='fixture-replacement-terms' where id=$1`,
    [offerId],
  );
  const event = notification(offerId, intent);
  const activated = await process(event);
  assert.equal(activated.state, "processed");
  const membership = (
    await db.query(
      `select id,status,provider_product_id,provider_offer_code,
    total_minor,currency from atv_plus_memberships where id=$1`,
      [activated.membership_id],
    )
  ).rows[0];
  assert.equal(membership.status, "ACTIVE");
  assert.equal(membership.provider_product_id, offer.productId);
  assert.equal(membership.provider_offer_code, offer.offerCode);
  assert.equal(membership.total_minor, offer.totalMinor);
  assert.equal(membership.currency, "BRL");
  const replay = await process({
    ...event,
    id: randomUUID(),
    event: "PURCHASE_COMPLETE",
  });
  assert.equal(replay.membership_id, membership.id);
  assert.equal(
    (await db.query("select count(*)::int n from atv_plus_memberships")).rows[0]
      .n,
    1,
  );
  const cancelled = structuredClone(event);
  cancelled.id = randomUUID();
  cancelled.event = "SUBSCRIPTION_CANCELLATION";
  cancelled.data.subscriber = event.data.subscription.subscriber;
  delete cancelled.data.purchase;
  delete cancelled.data.subscription;
  await process(cancelled);
  assert.equal(
    (
      await db.query("select status from atv_plus_memberships where id=$1", [
        membership.id,
      ])
    ).rows[0].status,
    "CANCELLED",
  );
  await process({ ...event, id: randomUUID(), event: "PURCHASE_REFUNDED" });
  assert.equal(
    (
      await db.query("select status from atv_plus_memberships where id=$1", [
        membership.id,
      ])
    ).rows[0].status,
    "SUSPENDED",
  );
});

test("checkout binding rejects wrong amount, currency, product, offer and a second transaction", async (t) => {
  const { db, rpc, release, notification, process } = await fixture(t);
  const offerId = "atv-plus-essencial-3m";
  await release(offerId);
  for (const change of [
    (event) => {
      event.data.purchase.price.value = 1;
    },
    (event) => {
      event.data.purchase.price.currency_value = "USD";
    },
    (event) => {
      event.data.product.id = "fixture-unapproved-product";
    },
    (event) => {
      event.data.purchase.offer.code = "fixture-unapproved-code";
    },
    (event) => {
      event.data.purchase.origin.sck = randomUUID();
    },
  ]) {
    const intent = await rpc("atv_plus_start_checkout", [offerId]);
    const event = notification(offerId, intent);
    change(event);
    await process(event);
    assert.equal(
      (await db.query("select count(*)::int n from atv_plus_memberships"))
        .rows[0].n,
      0,
    );
  }
  const intent = await rpc("atv_plus_start_checkout", [offerId]);
  const first = notification(offerId, intent);
  const accepted = await process(first);
  assert.ok(accepted.membership_id);
  await process(notification(offerId, intent));
  assert.equal(
    (await db.query("select count(*)::int n from atv_plus_memberships")).rows[0]
      .n,
    1,
  );
});

test("upgrade replaces unsent forecast work and its refund restores remaining lower paid forecasts", async (t) => {
  const { db, rpc, release, process, buy } = await fixture(t);
  await release("atv-plus-essencial-12m");
  await release("atv-plus-premium-3m");
  const original = await buy("atv-plus-essencial-12m");
  const profile = randomUUID();
  await db.query(
    `insert into natal_profiles(id,user_id,version,local_date,local_time,
    location_label,country_code,timezone_iana,utc_instant,latitude,longitude,location_source)
    values($1,$2,1,'1990-08-15','12:00','Cidade sintética','BR','America/Sao_Paulo',
    '1990-08-15T15:00:00Z',-23,-46,'fixture')`,
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
  await rpc("atv_plus_complete_onboarding", [
    original.membershipId,
    profile,
    "+5511999990000",
    true,
    {
      label: "Cidade sintética",
      countryCode: "BR",
      timezone: "America/Sao_Paulo",
      latitude: -23,
      longitude: -46,
    },
  ]);
  const forecasts = (
    await db.query(
      `select id,state from atv_plus_deliveries where membership_id=$1
    and kind='personal-horoscope' and due_at<now()+interval '3 months' order by due_at`,
      [original.membershipId],
    )
  ).rows;
  assert.ok(forecasts.length > 2);
  const alreadySent = forecasts[0].id;
  await db.query(
    "update atv_plus_deliveries set state='SENT',provider_message_id='fixture-sent-before-upgrade' where id=$1",
    [alreadySent],
  );
  const upgrade = await buy("atv-plus-premium-3m");
  const replaced = (
    await db.query(
      `select id from atv_plus_deliveries where membership_id=$1
    and gate_code='membership_upgraded' and state='CANCELLED'`,
      [original.membershipId],
    )
  ).rows;
  assert.ok(replaced.length > 0);
  assert.equal(
    (
      await db.query("select state from atv_plus_deliveries where id=$1", [
        alreadySent,
      ])
    ).rows[0].state,
    "SENT",
  );
  assert.equal(
    (
      await db.query(
        "select count(*)::int n from atv_plus_deliveries where kind='solar-return'",
      )
    ).rows[0].n,
    1,
  );
  await process({
    ...upgrade.event,
    id: randomUUID(),
    event: "PURCHASE_REFUNDED",
  });
  for (const delivery of replaced) {
    const row = (
      await db.query(
        "select state,gate_code from atv_plus_deliveries where id=$1",
        [delivery.id],
      )
    ).rows[0];
    assert.deepEqual(row, { state: "SCHEDULED", gate_code: null });
  }
  assert.equal(
    (
      await db.query("select state from atv_plus_deliveries where id=$1", [
        alreadySent,
      ])
    ).rows[0].state,
    "SENT",
  );
  assert.equal(
    (
      await db.query("select status from atv_plus_memberships where id=$1", [
        original.membershipId,
      ])
    ).rows[0].status,
    "ACTIVE",
  );
  assert.equal(
    (
      await db.query("select status from atv_plus_memberships where id=$1", [
        upgrade.membershipId,
      ])
    ).rows[0].status,
    "SUSPENDED",
  );
});

test("renewal and downgrade start after paid higher terms; cancellation preserves end and expiration closes access", async (t) => {
  const { db, rpc, release, buy } = await fixture(t);
  for (const offerId of [
    "atv-plus-premium-6m",
    "atv-plus-premium-3m",
    "atv-plus-essencial-3m",
  ])
    await release(offerId);
  const first = await buy("atv-plus-premium-6m");
  const row = async (id) =>
    (
      await db.query(
        "select status,starts_at,ends_at from atv_plus_memberships where id=$1",
        [id],
      )
    ).rows[0];
  const paid = await row(first.membershipId);
  const renewal = await buy("atv-plus-premium-3m");
  const renewed = await row(renewal.membershipId);
  assert.equal(
    new Date(renewed.starts_at).toISOString(),
    new Date(paid.ends_at).toISOString(),
  );
  const downgrade = await buy("atv-plus-essencial-3m");
  assert.equal(
    new Date((await row(downgrade.membershipId)).starts_at).toISOString(),
    new Date(renewed.ends_at).toISOString(),
  );
  await rpc("atv_plus_cancel_membership", [first.membershipId]);
  const cancelled = await row(first.membershipId);
  assert.equal(cancelled.status, "CANCELLED");
  assert.equal(
    new Date(cancelled.ends_at).toISOString(),
    new Date(paid.ends_at).toISOString(),
  );
  await db.query(
    "update atv_plus_memberships set starts_at=now()-interval '7 months',ends_at=now()-interval '1 second' where id=$1",
    [first.membershipId],
  );
  await rpc("atv_plus_dispatch_due", [], "service_role", null);
  assert.equal((await row(first.membershipId)).status, "EXPIRED");
});

test("a terminal notification before approval prevents a later financial grant", async (t) => {
  const { db, rpc, release, notification, process } = await fixture(t);
  const offerId = "atv-plus-ampliado-3m";
  await release(offerId);
  const intent = await rpc("atv_plus_start_checkout", [offerId]);
  const approved = notification(offerId, intent);
  await process({
    ...approved,
    id: randomUUID(),
    event: "PURCHASE_CHARGEBACK",
  });
  await process(approved);
  assert.equal(
    (await db.query("select count(*)::int n from atv_plus_memberships")).rows[0]
      .n,
    0,
  );
});

test("a later paid purchase receives gifts never sent before a refund without duplicating sent gifts", async (t) => {
  const { db, rpc, release, process, buy, onboard } = await fixture(t);
  const offerId = "atv-plus-premium-3m";
  await release(offerId);
  const refunded = await buy(offerId);
  const profile = await onboard(refunded.membershipId);
  const intake = (membershipId) =>
    rpc("atv_plus_complete_onboarding", [
      membershipId,
      profile,
      "+5511999990000",
      true,
      {
        label: "Cidade sintética",
        countryCode: "BR",
        timezone: "America/Sao_Paulo",
        latitude: -23,
        longitude: -46,
      },
    ]);
  const giftsBefore = (
    await db.query(
      "select id,kind from atv_plus_deliveries where kind in ('solar-return','natal-full')",
    )
  ).rows;
  assert.equal(giftsBefore.length, 2);
  await process({
    ...refunded.event,
    id: randomUUID(),
    event: "PURCHASE_REFUNDED",
  });
  assert.equal(
    (
      await db.query(
        "select count(*)::int n from atv_plus_deliveries where state='CANCELLED' and gate_code='membership_suspended'",
      )
    ).rows[0].n > 0,
    true,
  );
  const replacement = await buy(offerId);
  await intake(replacement.membershipId);
  const giftsAfter = (
    await db.query(
      "select id,kind,membership_id,state from atv_plus_deliveries where kind in ('solar-return','natal-full')",
    )
  ).rows;
  assert.equal(giftsAfter.length, 2);
  for (const gift of giftsAfter) {
    assert.equal(gift.membership_id, replacement.membershipId);
    assert.equal(gift.state, "SCHEDULED");
    assert.ok(giftsBefore.some((previous) => previous.id === gift.id));
  }
  await db.query(
    "update atv_plus_deliveries set state='SENT',provider_message_id='fixture-gift-sent-'||id::text where kind in ('solar-return','natal-full')",
  );
  await process({
    ...replacement.event,
    id: randomUUID(),
    event: "PURCHASE_REFUNDED",
  });
  const third = await buy(offerId);
  await intake(third.membershipId);
  const finalGifts = (
    await db.query(
      "select membership_id,state from atv_plus_deliveries where kind in ('solar-return','natal-full')",
    )
  ).rows;
  assert.equal(finalGifts.length, 2);
  for (const gift of finalGifts) {
    assert.equal(gift.membership_id, replacement.membershipId);
    assert.equal(gift.state, "SENT");
  }
});
