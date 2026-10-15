import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createPurposeCalculators } from "../src/purpose-calculators.ts";
import {
  CAREER_COMPASS_CANDIDATE_VERSION,
  prepareCareerCompassCandidate,
} from "../src/career-compass-candidate.ts";
import {
  CAREER_COMPASS_CANDIDATE_VERSION as HISTORICAL_VERSION,
  prepareCareerCompassCandidate as prepareHistoricalCandidate,
} from "../src/career-compass-candidate-v1.8.3.ts";

// Private, synthetic QA evidence. This script does not write to the database or
// create a release, editorial review, receipt, library item, or public delivery.
const calculate = createPurposeCalculators()["career-compass"];
const cases = [
  {
    id: "ceramics-no-materials-cancer",
    utcTime: "00:00:00",
    context:
      "Sou ceramista e quero desenvolver uma peça de cerâmica, mas não tenho argila nem acesso a forno.",
  },
  {
    id: "ceramics-no-materials-capricorn",
    utcTime: "12:00:00",
    context:
      "Sou ceramista e quero desenvolver uma peça de cerâmica, mas não tenho argila nem acesso a forno.",
  },
  {
    id: "ceramics-access-unknown",
    utcTime: "14:00:00",
    context: "Sou ceramista e quero desenvolver uma peça de cerâmica.",
  },
];

const profiles = [];
for (const entry of cases) {
  const runId = createHash("sha256").update(entry.id).digest("hex");
  const syntheticRunId = `${runId.slice(0, 8)}-${runId.slice(8, 12)}-4000-8000-${runId.slice(12, 24)}`;
  const calculation = await calculate(
    {
      version: "atv-workflow/1.0.0",
      productId: "career-compass",
      consent: {
        storage: true,
        policyVersion: "atv-input-consent/1",
        partner: false,
        continuity: false,
      },
      birth: {
        localDateTime: `2000-01-01T${entry.utcTime}`,
        utcInstant: `2000-01-01T${entry.utcTime}Z`,
        timezone: "UTC",
        latitude: 0,
        longitude: 0,
        locationSource: "synthetic",
      },
      context: entry.context,
    },
    { runId: syntheticRunId, signal: new AbortController().signal },
  );
  const input = {
    runId: syntheticRunId,
    revision: 1,
    tier: "free",
    calculation,
  };
  const versions = [];
  for (const [version, prepare] of [
    [HISTORICAL_VERSION, prepareHistoricalCandidate],
    [CAREER_COMPASS_CANDIDATE_VERSION, prepareCareerCompassCandidate],
  ]) {
    const candidate = await prepare(input);
    if (candidate.status !== "prepared_for_review")
      throw new Error(`${entry.id}:${version}:${candidate.reason}`);
    versions.push({
      version,
      status: candidate.status,
      publication: candidate.publication,
      candidateDigest: candidate.candidateDigest,
      basisDigest: candidate.assessment.basisDigest,
      outputDigest: candidate.assessment.outputDigest,
      deliveryDigest: candidate.delivery.deliveryDigest,
      sections: candidate.delivery.content.sections,
    });
  }
  profiles.push({
    id: entry.id,
    syntheticInput: {
      localDateTime: `2000-01-01T${entry.utcTime}`,
      timezone: "UTC",
      latitude: 0,
      longitude: 0,
      context: entry.context,
    },
    midheaven: versions[0].sections.find((section) => section.title === "Seu Meio do Céu")?.text,
    versions,
  });
}

const output = {
  purpose: "private_editorial_comparison_only",
  publication: "blocked",
  caveat: "Amostras sintéticas do candidato; não são entregas publicadas nem aprovação editorial.",
  profiles,
};
const destination = fileURLToPath(new URL("./career-compass-v1.8.4-comparison.json", import.meta.url));
await writeFile(destination, `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(destination);
