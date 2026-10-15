/**
 * Reproducible private source for the three free Career Compass facsimiles.
 * Reader copy is taken exclusively from the current app delivery projection.
 * This creates no receipt, account, persisted run, or publication permission.
 *
 * Usage: node scripts/review/generate-career-compass-free-samples.mjs [output.json]
 */
import { mkdir, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { CaelusEphemerisProvider } from "../../packages/astrology/src/index.ts";
import { createPurposeCalculators } from "../../apps/worker/src/purpose-calculators.ts";
import {
  CAREER_COMPASS_CANDIDATE_VERSION,
  prepareCareerCompassCandidate,
} from "../../apps/worker/src/career-compass-candidate.ts";
import { CAREER_COMPASS_READER_VERSION } from "../../apps/worker/src/product-delivery.ts";

const repoRoot = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const REVIEW_CLOCK = "2026-10-15T00:00:00.000Z";
export const DEFAULT_OUTPUT = resolve(
  repoRoot,
  "output/pdf/bussola-gratis-facsimiles-1.8.7.json",
);

const cases = Object.freeze([
  {
    id: "ana-carga",
    fictionalName: "Ana",
    situation: "Sobrecarga no trabalho",
    time: "00:00:00",
    context: "Estou sobrecarregada e quero reduzir a carga.",
    runId: "00000000-0000-4000-8000-000000000101",
  },
  {
    id: "bruno-transicao",
    fictionalName: "Bruno",
    situation: "Mudança de carreira",
    time: "08:00:00",
    context: "Quero mudar de carreira.",
    runId: "00000000-0000-4000-8000-000000000102",
  },
  {
    id: "lia-territorio",
    fictionalName: "Lia",
    situation: "Mudança de cidade",
    time: "16:00:00",
    context: "Quero mudar de cidade por oportunidades de trabalho.",
    runId: "00000000-0000-4000-8000-000000000103",
  },
]);

function syntheticInput(sample) {
  const localDateTime = `2000-01-01T${sample.time}`;
  return {
    version: "atv-workflow/1.0.0",
    productId: "career-compass",
    consent: {
      storage: true,
      policyVersion: "atv-input-consent/1",
      partner: false,
      continuity: false,
    },
    birth: {
      localDateTime,
      utcInstant: `${localDateTime}Z`,
      timezone: "UTC",
      latitude: 0,
      longitude: 0,
      locationSource: "synthetic",
    },
    context: sample.context,
  };
}

function requireValidCandidate(sample, calculation, candidate) {
  if (
    candidate.status !== "prepared_for_review" ||
    candidate.publication !== "blocked" ||
    candidate.version !== CAREER_COMPASS_CANDIDATE_VERSION ||
    candidate.delivery.status !== "prepared_for_review" ||
    candidate.delivery.publication !== "blocked" ||
    candidate.delivery.content.version !== CAREER_COMPASS_READER_VERSION
  ) {
    throw new Error(`${sample.id}: current candidate is not a blocked, reviewable free reading`);
  }
  const fact = calculation.facts.find((item) => item.id === "angle-midheaven");
  const evidence = candidate.facts.facts.find((item) => item.id === "angle-midheaven");
  const claim = candidate.reading.claims.find((item) => item.id === "midheaven-fact");
  const readerFact = candidate.delivery.content.sections[0];
  if (
    !fact ||
    !evidence ||
    !claim ||
    fact.display !== evidence.display ||
    fact.source !== evidence.source ||
    claim.text !== fact.display ||
    claim.kind !== "fact" ||
    JSON.stringify(claim.evidence) !== '["angle-midheaven"]' ||
    JSON.stringify(readerFact.evidence) !== '["angle-midheaven"]' ||
    !/^Meio do Céu: aproximadamente \d{1,2}°\d{2}′ de [\p{L}]+$/u.test(readerFact.text) ||
    candidate.delivery.content.sections.length !== 6 ||
    candidate.reading.reflections.length !== 3 ||
    !candidate.reading.reflections.every((question, index) =>
      candidate.delivery.content.sections[5].text.includes(`${index + 1}. ${question}`),
    )
  ) {
    throw new Error(`${sample.id}: reader projection diverged from calculated fact or reading contract`);
  }
  return fact;
}

export async function buildCareerCompassFreeSamples() {
  const engine = new CaelusEphemerisProvider();
  // The engine records wall-clock calculation time in its provenance and that
  // field enters the basis digest. Fix only that metadata in this private test
  // adapter so identical synthetic inputs give reproducible candidate hashes.
  const reviewProvider = {
    name: engine.name,
    version: engine.version,
    async calculate(input) {
      const chart = await engine.calculate(input);
      return {
        ...chart,
        provenance: { ...chart.provenance, calculatedAt: REVIEW_CLOCK },
      };
    },
  };
  const calculator = createPurposeCalculators(reviewProvider)["career-compass"];
  const profiles = [];
  for (const sample of cases) {
    const input = syntheticInput(sample);
    const calculation = await calculator(input, {
      runId: sample.runId,
      signal: new AbortController().signal,
    });
    const candidate = await prepareCareerCompassCandidate({
      runId: sample.runId,
      revision: 1,
      tier: "free",
      calculation,
    });
    const fact = requireValidCandidate(sample, calculation, candidate);
    profiles.push({
      id: sample.id,
      fictionalName: sample.fictionalName,
      situation: sample.situation,
      syntheticInput: { birth: input.birth, context: input.context },
      calculatedMidheaven: fact.display,
      calculatedMidheavenFact: fact,
      calculationVersion: calculation.version,
      candidateVersion: candidate.version,
      readerVersion: candidate.delivery.content.version,
      publication: candidate.publication,
      status: candidate.status,
      basisDigest: candidate.assessment.basisDigest,
      outputDigest: candidate.assessment.outputDigest,
      deliveryDigest: candidate.delivery.deliveryDigest,
      candidateDigest: candidate.candidateDigest,
      reading: candidate.reading,
      readerContent: candidate.delivery.content,
    });
  }
  return {
    artifactKind: "private-facsimile-source",
    productId: "career-compass",
    tier: "free",
    candidateVersion: CAREER_COMPASS_CANDIDATE_VERSION,
    readerVersion: CAREER_COMPASS_READER_VERSION,
    reviewClock: REVIEW_CLOCK,
    publication: "blocked",
    note: "Perfis e dados natais inteiramente fictícios. Conteúdo gerado pelo motor e pela projeção de leitura atuais; apenas o relógio de metadados da simulação foi fixado para reproduzir os hashes. Não representa emissão pública.",
    profiles,
  };
}

export async function writeCareerCompassFreeSamples(outputPath = DEFAULT_OUTPUT) {
  const payload = await buildCareerCompassFreeSamples();
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return outputPath;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  if (process.argv.length > 3) throw new Error("Usage: node generate-career-compass-free-samples.mjs [output.json]");
  const output = await writeCareerCompassFreeSamples(
    process.argv[2] ? resolve(process.argv[2]) : DEFAULT_OUTPUT,
  );
  console.log(output);
}
