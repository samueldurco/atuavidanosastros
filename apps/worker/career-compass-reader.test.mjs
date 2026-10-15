import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { CaelusEphemerisProvider } from "../../packages/astrology/src/index.ts";
import { createPurposeCalculators } from "./src/purpose-calculators.ts";
import { prepareCareerCompassCandidate } from "./src/career-compass-candidate.ts";
import {
  CAREER_COMPASS_READER_VERSION,
  careerCompassReaderFact,
} from "./src/product-delivery.ts";
import { buildCareerCompassFreeSamples } from "../../scripts/review/generate-career-compass-free-samples.mjs";

test("Career Compass reader keeps the exact calculated fact separate from a human display", () => {
  assert.equal(
    careerCompassReaderFact("Meio do Céu: 9.156662° de Câncer"),
    "Meio do Céu: aproximadamente 9°09′ de Câncer",
  );
  assert.equal(
    careerCompassReaderFact("Meio do Céu: 29.990000° de Peixes"),
    "Meio do Céu: aproximadamente 29°59′ de Peixes",
  );
  assert.equal(
    careerCompassReaderFact("Meio do Céu: 29.999999° de Peixes"),
    "Meio do Céu: aproximadamente 29°59′ de Peixes",
  );
  assert.equal(careerCompassReaderFact("Meio do Céu: 30.000000° de Peixes"), null);
  assert.equal(careerCompassReaderFact("Meio do Céu: 9.15° de Câncer"), null);
});

test("private free samples reproduce the app reader projection and stable candidate digests", async () => {
  const first = await buildCareerCompassFreeSamples();
  const second = await buildCareerCompassFreeSamples();
  const hash = (value) =>
    createHash("sha256").update(JSON.stringify(value)).digest("hex");
  assert.equal(hash(first), hash(second));
  assert.equal(first.publication, "blocked");
  assert.equal(first.readerVersion, CAREER_COMPASS_READER_VERSION);
  assert.equal(first.profiles.length, 3);
  assert.equal(new Set(first.profiles.map((profile) => profile.id)).size, 3);

  for (const profile of first.profiles) {
    const { reading, readerContent, calculatedMidheavenFact: fact } = profile;
    assert.equal(profile.publication, "blocked");
    assert.equal(readerContent.version, CAREER_COMPASS_READER_VERSION);
    assert.equal(readerContent.title, reading.title);
    assert.equal(readerContent.sections.length, 6);
    assert.deepEqual(readerContent.sections[0].evidence, ["angle-midheaven"]);
    assert.equal(readerContent.sections[0].text, careerCompassReaderFact(fact.display));
    assert.match(fact.display, /^Meio do Céu: \d{1,2}\.\d{6}° de [\p{L}]+$/u);
    assert.equal(profile.calculatedMidheaven, fact.display);
    assert.equal(reading.claims[0].text, fact.display);
    assert.deepEqual(reading.claims[0].evidence, ["angle-midheaven"]);
    assert.equal(reading.claims.length, 5);
    for (let index = 1; index < reading.claims.length; index += 1) {
      assert.equal(readerContent.sections[index].text, reading.claims[index].text);
      assert.deepEqual(readerContent.sections[index].evidence, reading.claims[index].evidence);
    }
    assert.equal(reading.reflections.length, 3);
    for (const [index, question] of reading.reflections.entries()) {
      assert.equal(
        readerContent.sections[5].text.includes(`${index + 1}. ${question}`),
        true,
      );
    }
    assert.equal(readerContent.sections[5].text.startsWith(reading.synthesis[0].text), true);
    for (const digest of [
      profile.basisDigest,
      profile.outputDigest,
      profile.deliveryDigest,
      profile.candidateDigest,
    ]) {
      assert.match(digest, /^[0-9a-f]{64}$/);
    }
  }

  const relocation = first.profiles.find((profile) => profile.id === "lia-territorio");
  assert.ok(relocation);
  for (const section of relocation.readerContent.sections.slice(2, 6)) {
    assert.match(section.text, /destino|mudança de cidade/u);
    assert.doesNotMatch(section.text, /mudança de carreira|novo empregador/u);
  }
});

test("candidate retries reuse the persisted calculation and its provenance digest", async () => {
  const calculator = createPurposeCalculators(new CaelusEphemerisProvider())["career-compass"];
  const runId = "00000000-0000-4000-8000-000000000201";
  const calculation = await calculator({
    version: "atv-workflow/1.0.0",
    productId: "career-compass",
    consent: { storage: true, policyVersion: "atv-input-consent/1", partner: false, continuity: false },
    birth: {
      localDateTime: "2000-01-01T08:00:00",
      utcInstant: "2000-01-01T08:00:00Z",
      timezone: "UTC",
      latitude: 0,
      longitude: 0,
      locationSource: "synthetic",
    },
    context: "Quero mudar de carreira.",
  }, { runId, signal: new AbortController().signal });
  const input = { runId, revision: 1, tier: "free", calculation };
  const first = await prepareCareerCompassCandidate(input);
  const retry = await prepareCareerCompassCandidate(structuredClone(input));
  assert.equal(first.status, "prepared_for_review");
  assert.equal(retry.status, "prepared_for_review");
  assert.equal(retry.candidateDigest, first.candidateDigest);
  assert.equal(retry.assessment.basisDigest, first.assessment.basisDigest);
  assert.equal(retry.delivery.deliveryDigest, first.delivery.deliveryDigest);
  assert.equal(retry.assessment.outputDigest, first.assessment.outputDigest);

  // A new calculation is a new basis; a retry must never recalculate it.
  const recalculated = structuredClone(calculation);
  recalculated.data.provenance.calculatedAt = "2026-10-16T00:00:00.000Z";
  const other = await prepareCareerCompassCandidate({ ...input, calculation: recalculated });
  assert.equal(other.status, "prepared_for_review");
  assert.notEqual(other.assessment.basisDigest, first.assessment.basisDigest);
  assert.equal(other.assessment.outputDigest, first.assessment.outputDigest);
});
