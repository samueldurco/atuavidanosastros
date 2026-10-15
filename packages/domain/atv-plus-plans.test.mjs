import { test } from "node:test";
import assert from "node:assert/strict";
import {
  atvPlusPlans,
  atvPlusPlanFor,
  atvPlusPolicy,
  atvPlusSelectionAllowed,
  atvPlusForecastProductIds,
  atvPlusBasicProductIds,
  atvPlusExtendedProductIds,
  atvPlusSeparateOfferIds,
} from "./src/atv-plus-plans.ts";
import {
  offeredProductIds,
  productOffers,
  productCatalog,
  productDefinitionFor,
  productDefinitionForSlug,
  productSlugAliases,
} from "./src/catalog.ts";

test("the public offer has 19 unique products across six universes, preserving historical IDs", () => {
  assert.equal(productOffers.length, 19);
  assert.equal(new Set(offeredProductIds).size, 19);
  assert.equal(
    new Set(productOffers.map((product) => product.universe)).size,
    6,
  );
  for (const product of productOffers) {
    assert.ok(product);
    assert.equal(product.state, "PREPARING");
    assert.equal(product.personalized, true);
  }
  for (const id of [
    "ascendant",
    "midheaven",
    "career-compass",
    "horoscope",
    "pair-preview",
    "dream-journal",
    "tarot-single-card",
    "direction-journey",
  ]) {
    assert.ok(productDefinitionFor(id), id);
    assert.equal(offeredProductIds.includes(id), false, id);
  }
  assert.equal(
    new Set(productCatalog.map((product) => product.slug)).size,
    productCatalog.length,
  );
});

test("old commercial slugs resolve to canonical offers without changing saved execution identities", () => {
  for (const [slug, id] of Object.entries(productSlugAliases)) {
    const product = productDefinitionForSlug(slug);
    assert.equal(product?.id, id, slug);
    assert.notEqual(product?.slug, slug, slug);
    assert.equal(productDefinitionForSlug(product.slug)?.id, id);
  }
  assert.equal(
    productDefinitionForSlug("jornada-direcao")?.id,
    "career-forecast-30d",
  );
  assert.equal(
    productDefinitionFor("direction-journey")?.name,
    "Jornada de Carreira",
  );
  for (const slug of ["unknown", "__proto__", "constructor"])
    assert.equal(productDefinitionForSlug(slug), undefined);
});

test("all plans are bounded 30-day definitions and do not activate billing or gate free history", () => {
  assert.deepEqual(
    atvPlusPlans.map((plan) => plan.id),
    ["essencial", "ampliado", "premium"],
  );
  for (const plan of atvPlusPlans) {
    assert.equal(plan.cycleDays, 30);
    assert.equal(plan.forecastAllowance, 1);
    assert.equal(atvPlusSelectionAllowed(plan.id, []), true);
    for (const id of plan.forecastProductIds)
      assert.ok(productDefinitionFor(id));
  }
  assert.equal(atvPlusPlanFor("total"), undefined);
  assert.equal(atvPlusSelectionAllowed("unknown", []), false);
  assert.equal(atvPlusPolicy.billingEnabled, false);
  assert.equal(atvPlusPolicy.deliveredHistoryRemainsAfterCancellation, true);
  assert.equal(atvPlusPolicy.freeToolsRequireSubscription, false);
  assert.equal(atvPlusPolicy.accountHistoryRequiresSubscription, false);
  assert.equal(atvPlusPolicy.unlimitedReadings, false);
});

test("every tier chooses only one forecast, including repeated attempts at the same forecast", () => {
  for (const plan of atvPlusPlans) {
    for (const first of atvPlusForecastProductIds) {
      assert.equal(atvPlusSelectionAllowed(plan.id, [first]), true);
      for (const second of atvPlusForecastProductIds)
        assert.equal(atvPlusSelectionAllowed(plan.id, [first, second]), false);
    }
  }
});

test("Essencial excludes additional readings and Ampliado accepts just one basic reading", () => {
  for (const basic of atvPlusBasicProductIds) {
    assert.equal(
      atvPlusSelectionAllowed("essencial", ["personal-calendar", basic]),
      false,
    );
    assert.equal(
      atvPlusSelectionAllowed("ampliado", ["personal-calendar", basic]),
      true,
    );
    for (const second of atvPlusBasicProductIds)
      assert.equal(atvPlusSelectionAllowed("ampliado", [basic, second]), false);
  }
  for (const larger of atvPlusExtendedProductIds)
    assert.equal(atvPlusSelectionAllowed("ampliado", [larger]), false);
});

test("Premium accepts any mix of two basic readings OR one larger reading, never both options", () => {
  for (const first of atvPlusBasicProductIds) {
    for (const second of atvPlusBasicProductIds) {
      assert.equal(
        atvPlusSelectionAllowed("premium", [
          "career-forecast-30d",
          first,
          second,
        ]),
        true,
      );
      assert.equal(
        atvPlusSelectionAllowed("premium", [first, second, first]),
        false,
      );
    }
    for (const larger of atvPlusExtendedProductIds) {
      assert.equal(atvPlusSelectionAllowed("premium", [first, larger]), false);
      assert.equal(
        atvPlusSelectionAllowed("premium", ["personal-calendar", larger]),
        true,
      );
    }
  }
  for (const first of atvPlusExtendedProductIds)
    for (const second of atvPlusExtendedProductIds)
      assert.equal(atvPlusSelectionAllowed("premium", [first, second]), false);
});

test("avulso and unknown products cannot spend subscription allowances", () => {
  assert.ok(atvPlusSeparateOfferIds.includes("date-reading"));
  assert.ok(atvPlusSeparateOfferIds.includes("birth-chart"));
  assert.ok(atvPlusSeparateOfferIds.includes("tarot-astrological-mandala"));
  for (const plan of atvPlusPlans)
    for (const id of [
      ...atvPlusSeparateOfferIds,
      "loja",
      "atv-plus",
      "daily-card",
      "unrecognized",
    ])
      assert.equal(
        atvPlusSelectionAllowed(plan.id, [id]),
        false,
        `${plan.id}:${id}`,
      );
});
