import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { SCHEMA_VERSION, RUBRIC_VERSION, dimensions } from "@atv/ai";
import { prepareProductDelivery } from "./src/product-delivery.ts";
import {
  evaluateProductDelivery,
  DELIVERY_REVIEW_VERSION,
} from "./src/product-delivery-review.ts";

const authority = {
  draft: {
    reviewers: ["fixture-draft"],
    calibrations: ["fixture-calibration"],
  },
  delivery: {
    reviewers: ["fixture-delivery"],
    calibrations: ["fixture-calibration"],
  },
};
function draft() {
  return {
    runId: "00000000-0000-4000-8000-000000000001",
    revision: 2,
    productId: "daily-card",
    tier: "free",
    calculation: {
      version: "synthetic/1",
      kind: "tarot",
      status: "recorded",
      data: { provenance: "fixture" },
      facts: [
        {
          id: "card",
          kind: "drawn",
          display: "Carta sintética",
          source: "fixture",
        },
      ],
      limits: ["Base não homologada."],
    },
    output: {
      schemaVersion: SCHEMA_VERSION,
      capability: "tarot-reflection",
      scope: "partial",
      title: "Recorte sintético",
      claims: [
        { id: "c1", kind: "fact", text: "Carta sintética", evidence: ["card"] },
      ],
      relations: [],
      synthesis: [
        { claimIds: ["c1"], text: "Síntese para teste, não aprovada." },
      ],
      reflections: ["O que chama sua atenção?"],
      limits: ["Fixture sem avaliação de qualidade real."],
    },
  };
}
function score(outputDigest, reviewer) {
  return {
    rubricVersion: RUBRIC_VERSION,
    outputDigest,
    reviewer,
    source: "human",
    calibrationId: null,
    scores: Object.fromEntries(dimensions.map((d) => [d, 10])),
    evidence: Object.fromEntries(
      dimensions.map((d) => [d, `Fixture ${d}; não calibra qualidade.`]),
    ),
  };
}
async function fixture(input = draft()) {
  const candidate = await prepareProductDelivery(input);
  assert.equal(candidate.status, "prepared_for_review");
  return {
    input,
    candidate,
    review: {
      version: DELIVERY_REVIEW_VERSION,
      basisDigest: candidate.basisDigest,
      deliveryDigest: candidate.deliveryDigest,
      draftReview: score(candidate.outputDigest, "fixture-draft"),
      deliveryReview: score(candidate.deliveryDigest, "fixture-delivery"),
    },
  };
}
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.keys(value)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonical(value[k])}`)
      .join(",")}}`;
  return JSON.stringify(value);
}

test("no review/authority cannot approve; a complete two-pass review remains a blocked candidate", async () => {
  const { input, candidate, review } = await fixture();
  assert.equal(
    (await evaluateProductDelivery(input)).reason,
    "review_required",
  );
  assert.equal(
    (await evaluateProductDelivery(input, review)).reason,
    "reviewer_not_authorized",
  );
  const result = await evaluateProductDelivery(input, review, authority);
  assert.equal(result.status, "reviewed_delivery_candidate");
  assert.equal(result.publication, "blocked");
  assert.equal(result.reason, "authenticated_issuance_and_promotion_required");
  assert.deepEqual(result.content, candidate.content);
  assert.equal("promotionId" in result.content, false);
  assert.equal("reviewDigest" in result.content, false);
  assert.equal(
    result.reviewDigest,
    createHash("sha256")
      .update(
        canonical({
          version: DELIVERY_REVIEW_VERSION,
          basisDigest: candidate.basisDigest,
          outputDigest: candidate.outputDigest,
          deliveryDigest: candidate.deliveryDigest,
          review,
        }),
      )
      .digest("hex"),
  );
});

test("each stage requires its own exact digest and authorized reviewer/calibration", async () => {
  const { input, review } = await fixture();
  for (const stage of ["draftReview", "deliveryReview"]) {
    for (const mutate of [
      (r) => (r[stage].outputDigest = "a".repeat(64)),
      (r) => (r[stage].reviewer = "unknown"),
      (r) => {
        r[stage].source = "calibrated-reviewer";
        r[stage].calibrationId = "unknown";
      },
    ]) {
      const changed = structuredClone(review);
      mutate(changed);
      const result = await evaluateProductDelivery(input, changed, authority);
      assert.equal(result.status, "needs_editorial_review");
      assert.equal(result.reviewDigest, null);
      assert.equal("content" in result, false);
    }
    const calibrated = structuredClone(review);
    calibrated[stage].source = "calibrated-reviewer";
    calibrated[stage].calibrationId = "fixture-calibration";
    assert.equal(
      (await evaluateProductDelivery(input, calibrated, authority)).status,
      "reviewed_delivery_candidate",
    );
  }
  const copied = structuredClone(review);
  copied.deliveryReview = structuredClone(review.draftReview);
  const shared = { draft: authority.draft, delivery: authority.draft };
  assert.equal(
    (await evaluateProductDelivery(input, copied, shared)).reason,
    "delivery_review_not_approved",
  );
});

test("run, revision, product, tier, provenance, limits, questions and text changes invalidate prior review", async () => {
  const { input, review } = await fixture();
  for (const mutate of [
    (d) => (d.runId = "00000000-0000-4000-8000-000000000002"),
    (d) => d.revision++,
    (d) => (d.productId = "tarot-focus"),
    (d) => (d.tier = "premium"),
    (d) => (d.calculation.data.provenance = "changed"),
    (d) => d.calculation.limits.push("Outro limite."),
    (d) => (d.output.title = "Outro título"),
    (d) => d.output.reflections.push("Que outra alternativa aparece?"),
    (d) => d.output.limits.push("Outro limite editorial."),
  ]) {
    const changed = structuredClone(input);
    mutate(changed);
    const result = await evaluateProductDelivery(changed, review, authority);
    assert.equal(result.reason, "review_basis_mismatch");
    assert.equal(result.reviewDigest, null);
    assert.equal("content" in result, false);
  }
});

test("strict bounded review schema rejects missing/extra fields, invalid grades and malformed values safely", async () => {
  const { input, review } = await fixture();
  const mutations = [
    (r) => (r.version = "stale"),
    (r) => delete r.deliveryReview,
    (r) => (r.approved = true),
    (r) => (r.deliveryReview = null),
    (r) => (r.deliveryReview.reviewer = 42),
    (r) => (r.deliveryReview.source = "machine"),
    (r) => (r.deliveryReview.calibrationId = "unneeded"),
    (r) => (r.deliveryReview.outputDigest = "short"),
    (r) => (r.deliveryReview.evidence.depth = ""),
    (r) => (r.deliveryReview.evidence.depth = "x".repeat(2001)),
    (r) => (r.deliveryReview.evidence.extra = "fake"),
    (r) => delete r.deliveryReview.evidence.depth,
    (r) => (r.deliveryReview.scores.depth = "10"),
    (r) => (r.deliveryReview.scores.depth = NaN),
    (r) => (r.deliveryReview.scores.depth = Infinity),
    (r) => (r.deliveryReview.scores.depth = 11),
    (r) => (r.deliveryReview.scores.depth = -1),
    (r) => (r.deliveryReview.scores.extra = 10),
    (r) => (r.deliveryReview.scores = []),
    (r) => (r.deliveryReview.extra = "ignored?"),
    (r) => (r.deliveryReview.evidence.depth = { text: "fake" }),
    (r) => {
      for (const stage of ["draftReview", "deliveryReview"])
        for (const key of dimensions)
          r[stage].evidence[key] = "界".repeat(1900);
    },
  ];
  for (const mutate of mutations) {
    const changed = structuredClone(review);
    mutate(changed);
    const result = await evaluateProductDelivery(input, changed, authority);
    assert.equal(result.reason, "invalid_review");
    assert.equal(result.reviewDigest, null);
    assert.equal("content" in result, false);
  }
  assert.equal(
    (await evaluateProductDelivery(input, null, authority)).reason,
    "invalid_review",
  );
  assert.equal(
    (await evaluateProductDelivery(input, () => {}, authority)).reason,
    "invalid_input",
  );
  for (const bad of [
    null,
    {},
    {
      draft: authority.draft,
      delivery: { reviewers: "fixture-delivery", calibrations: [] },
    },
  ])
    assert.equal(
      (await evaluateProductDelivery(input, review, bad)).reason,
      "invalid_authority",
    );
});

test("both stages apply all Director thresholds including premium and hard safety/fidelity floors", async () => {
  for (const tier of ["free", "intermediate", "premium"]) {
    const input = draft();
    input.tier = tier;
    const { review } = await fixture(input);
    for (const stage of ["draftReview", "deliveryReview"])
      for (const dimension of dimensions) {
        const changed = structuredClone(review),
          floor = ["responsibility", "factualFidelity"].includes(dimension)
            ? 10
            : tier === "premium"
              ? 8
              : 7;
        changed[stage].scores[dimension] = floor - 0.1;
        const result = await evaluateProductDelivery(input, changed, authority);
        assert.equal(result.status, "rejected");
        assert.equal(
          result.reason,
          `${stage === "draftReview" ? "draft" : "delivery"}_review_not_approved`,
        );
        changed[stage].scores[dimension] = floor;
        assert.equal(
          (await evaluateProductDelivery(input, changed, authority)).status,
          "reviewed_delivery_candidate",
        );
      }
  }
});

test("mechanical/schema/representability failures cannot be overridden by perfect scores", async () => {
  const { input, review } = await fixture();
  for (const mutate of [
    (d) => (d.output.claims[0].text = "Fato inventado"),
    (d) => (d.output.reflections[0] = "Seu futuro está garantido"),
    (d) => (d.output.scope = "integrated"),
    (d) => (d.output.limits = ["x".repeat(1201)]),
    (d) => (d.output.extra = "fake"),
    (d) => (d.tier = "__proto__"),
  ]) {
    const changed = structuredClone(input);
    mutate(changed);
    const result = await evaluateProductDelivery(changed, review, authority);
    assert.equal(result.status, "rejected");
    assert.equal(result.publication, "blocked");
    assert.equal(result.reviewDigest, null);
  }
  assert.equal(
    (await evaluateProductDelivery(null, review, authority)).status,
    "rejected",
  );
});

test("audit digest is canonical and binds both reviewers, rationale, scores and calibration", async () => {
  const { input, review } = await fixture(),
    baseline = await evaluateProductDelivery(input, review, authority);
  for (const stage of ["draftReview", "deliveryReview"])
    for (const mutate of [
      (r) => (r[stage].evidence.depth += " Detalhe."),
      (r) => (r[stage].scores.depth = 9),
      (r) => {
        r[stage].source = "calibrated-reviewer";
        r[stage].calibrationId = "fixture-calibration";
      },
    ]) {
      const changed = structuredClone(review);
      mutate(changed);
      const result = await evaluateProductDelivery(input, changed, authority);
      assert.equal(result.status, "reviewed_delivery_candidate");
      assert.notEqual(result.reviewDigest, baseline.reviewDigest);
    }
  const reordered = JSON.parse(
    JSON.stringify(review, (key, value) =>
      value && !Array.isArray(value) && typeof value === "object"
        ? Object.fromEntries(Object.entries(value).reverse())
        : value,
    ),
  );
  assert.equal(
    (await evaluateProductDelivery(input, reordered, authority)).reviewDigest,
    baseline.reviewDigest,
  );
});

test("caller mutation cannot race draft, review or authority capture across asynchronous hashing", async () => {
  const { input, review } = await fixture(),
    trusted = structuredClone(authority);
  const baseline = await evaluateProductDelivery(input, review, trusted),
    pending = evaluateProductDelivery(input, review, trusted);
  input.revision++;
  review.deliveryReview.evidence.depth = "changed";
  trusted.delivery.reviewers = [];
  assert.deepEqual(await pending, baseline);
  const f = await fixture();
  const denied = {
    draft: authority.draft,
    delivery: { reviewers: [], calibrations: [] },
  };
  const rejecting = evaluateProductDelivery(f.input, f.review, denied);
  denied.delivery.reviewers.push("fixture-delivery");
  assert.equal((await rejecting).reason, "reviewer_not_authorized");
});
