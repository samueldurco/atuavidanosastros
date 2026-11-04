import { test } from "node:test";
import assert from "node:assert/strict";
import {
  offeredProductIds,
  workflowOfferProductIds,
  launchProductIds,
  productTrialHref,
  productOffers,
  atvPlusPlans,
  atvPlusSelectionAllowed,
} from "./src/index.ts";

test("all thirty public offers retain their engine-specific trial destination", () => {
  assert.equal(offeredProductIds.length, 30);
  assert.equal(new Set(offeredProductIds).size, 30);
  assert.equal(workflowOfferProductIds.length, 19);
  assert.equal(launchProductIds.length, 11);
  assert.deepEqual(offeredProductIds, [...workflowOfferProductIds, ...launchProductIds]);
  for (const id of workflowOfferProductIds) {
    assert.equal(productTrialHref(id), `/testar-produtos/${id}`);
  }
  for (const id of launchProductIds) {
    assert.equal(productTrialHref(id), `/testar-lancamentos/${id}`);
    assert.equal(productOffers.find((product) => product.id === id)?.state, "PREPARING");
  }
});

test("catalogue membership never adds a launch to ATV+ consumption rights", () => {
  for (const id of launchProductIds) {
    for (const plan of atvPlusPlans) {
      assert.equal(atvPlusSelectionAllowed(plan.id, [id]), false);
    }
  }
});
