import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { build } from "esbuild";
import { CORPUS } from "./lib/public-horoscope-corpus.mjs";
import {
  composeHoroscopeBatch,
  composeDocumentAndClaims,
  assertRuntimeComposition,
} from "./lib/public-horoscope-compose.mjs";

export const DATED_POLICY = "atvna-horoscope-policy-2026-10-20-v1";
export const SOLAR_METHOD = "atv-solar-symbolic-sectors/1.0.0";
export const SIGNS = [
  "aries",
  "touro",
  "gemeos",
  "cancer",
  "leao",
  "virgem",
  "libra",
  "escorpiao",
  "sagitario",
  "capricornio",
  "aquario",
  "peixes",
];
export const canonical = (value) =>
  Array.isArray(value)
    ? `[${value.map(canonical).join(",")}]`
    : value && typeof value === "object"
      ? `{${Object.keys(value)
          .sort()
          .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
          .join(",")}}`
      : JSON.stringify(value);
export const sha = (value) => createHash("sha256").update(value).digest("hex");
export const digest = (value) => sha(canonical(value));
export const solarSector = (longitude, sign) => {
  if (
    !Number.isFinite(longitude) ||
    longitude < 0 ||
    longitude >= 360 ||
    !SIGNS.includes(sign)
  )
    throw Error("Invalid solar sector input");
  return 1 + ((Math.floor(longitude / 30) - SIGNS.indexOf(sign) + 12) % 12);
};

export function validateCopy(copy, facts) {
  if (
    !copy ||
    copy.methodVersion !== SOLAR_METHOD ||
    !copy.authoringAgent?.trim() ||
    copy.period !== facts.period ||
    copy.startDate !== facts.startDate ||
    !Array.isArray(copy.readings) ||
    copy.readings.length !== 12 ||
    SIGNS.some(
      (sign) => copy.readings.filter((row) => row.sign === sign).length !== 1,
    )
  )
    throw Error(
      "One authored reading for each sign and this exact coverage is required",
    );
  if (
    !Array.isArray(copy.requiredFactors) ||
    copy.requiredFactors.length < 2 ||
    copy.requiredFactors.some((id) => !facts.selectedIds.includes(id))
  )
    throw Error("Authored factors must exist in the calculated selection");
  const paragraphs = new Set();
  for (const reading of copy.readings) {
    if (
      !reading.title?.trim() ||
      !reading.name?.trim() ||
      !reading.description?.trim() ||
      !Array.isArray(reading.paragraphs) ||
      reading.paragraphs.length < 3 ||
      reading.paragraphs.some(
        (p) => typeof p !== "string" || p.trim().split(/\s+/).length < 40,
      )
    )
      throw Error(`Insufficient interpretation for ${reading.sign}`);
    for (const paragraph of reading.paragraphs) {
      if (paragraphs.has(paragraph))
        throw Error("Repeated interpretation across signs");
      paragraphs.add(paragraph);
    }
  }
}

export function algorithmManifest(root) {
  return Object.fromEntries(
    [
      "scripts/lib/public-horoscope-compose.mjs",
      "scripts/prepare-dated-horoscope.mjs",
    ].map((file) => [file, sha(fs.readFileSync(path.resolve(root, file)))]),
  );
}

export async function calculationAdapter(root) {
  const temporary = path.resolve(root, "output/horoscope-preparer-runtime");
  fs.mkdirSync(temporary, { recursive: true });
  const modulePath = path.join(temporary, "calculation.mjs");
  await build({
    entryPoints: [
      path.join(root, "apps/worker/src/public-horoscope-calculation.ts"),
    ],
    outfile: modulePath,
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node22",
    alias: {
      "@atv/domain": path.join(root, "packages/domain/src/index.ts"),
      "@atv/astrology": path.join(root, "packages/astrology/src/index.ts"),
    },
  });
  return import(pathToFileURL(modulePath).href);
}

export async function prepare({
  root,
  copyPath,
  outputPath,
  factsPath,
  period,
  startDate,
  now = new Date(),
}) {
  root = path.resolve(root);
  const output = path.resolve(root, outputPath);
  if (!output.startsWith(root + path.sep) || fs.existsSync(output))
    throw Error(
      "Output must be a new directory within the workspace; frozen packages are never overwritten",
    );
  let copy = copyPath
    ? JSON.parse(fs.readFileSync(path.resolve(root, copyPath), "utf8"))
    : null;
  period = copy?.period ?? period;
  startDate = copy?.startDate ?? startDate;
  if (
    !["daily", "weekly", "monthly"].includes(period) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(startDate)
  )
    throw Error("Explicit daily/weekly/monthly coverage required");
  const { calculatePublicHoroscope, assertPublicHoroscopeSnapshot } =
    await calculationAdapter(root);
  const facts = factsPath
    ? JSON.parse(fs.readFileSync(path.resolve(root, factsPath), "utf8"))
    : await calculatePublicHoroscope(
        startDate,
        period,
        new AbortController().signal,
      );
  assertPublicHoroscopeSnapshot(facts);
  if (
    facts.period !== period ||
    startDate < facts.startDate ||
    startDate >= facts.endDateExclusive
  )
    throw Error("Requested date and period do not match the factual coverage");
  if (
    facts.engine !== "caelus" ||
    facts.engineVersion !== "0.24.1" ||
    facts.provenance.provider !== "caelus" ||
    facts.provenance.algorithmVersion !== "atv-caelus-adapter-v3"
  )
    throw Error("Authorized calculation provenance required");
  const recurring = !copy;
  const manifest = algorithmManifest(root);
  if (recurring) {
    copy = composeHoroscopeBatch(facts);
    copy.composition.algorithmDigest = digest(manifest);
  }
  validateCopy(copy, facts);
  const frozenAt = now.toISOString();
  const methodBytes = fs.readFileSync(
    path.join(root, "docs/contracts/public-horoscope-dated-automation.md"),
  );
  const factsBytes = Buffer.from(JSON.stringify(facts, null, 2) + "\n");
  const copyBytes = recurring
    ? Buffer.from(JSON.stringify(copy, null, 2) + "\n")
    : fs.readFileSync(path.resolve(root, copyPath));
  fs.mkdirSync(output, { recursive: true });
  const write = (file, value) =>
    fs.writeFileSync(
      path.join(output, file),
      JSON.stringify(value, null, 2) + "\n",
    );
  fs.writeFileSync(path.join(output, "facts.json"), factsBytes);
  fs.writeFileSync(path.join(output, "method.md"), methodBytes);
  fs.writeFileSync(path.join(output, "authored-copy.json"), copyBytes);
  if (recurring) write("corpus.json", CORPUS);
  const documentDigests = {};
  const claimsDigests = {};
  const generated = [];
  for (const reading of copy.readings) {
    const id = `horoscopo-${reading.sign}-${copy.period}-${copy.startDate}`;
    let document = {
      id,
      revision: 1,
      state: "PUBLISHED",
      kind: "horoscope",
      path: `/horoscopo/${reading.sign}/${copy.period}/${copy.startDate}`,
      title: `${reading.name}: ${reading.title}`,
      description: reading.description,
      author: {
        id: "atvna-horoscopo-automatizado",
        name: "ATVNA",
        type: "Organization",
        bio: "Publicação ATVNA com redação e revisão editorial automatizadas identificadas. Sem revisão humana.",
      },
      automationDisclosure: {
        generatedWithAI: true,
        humanReview: false,
        reviewMode: "separate-pass",
      },
      publishedAt: frozenAt,
      modifiedAt: frozenAt,
      sections: [
        { heading: reading.title, paragraphs: reading.paragraphs },
        {
          heading: "Como esta leitura foi construída",
          paragraphs: [
            `Esta é uma interpretação simbólica geral para ${reading.name}, com cobertura de ${facts.startDate} até ${facts.endDateExclusive}, em UTC. O signo escolhido inicia doze setores simbólicos; eles não são casas do seu mapa natal. O mesmo céu é interpretado a partir de setores diferentes para cada signo.`,
            "As relações mencionadas foram observadas em uma grade de seis horas. Elas não indicam duração completa nem horários exatos de acontecimentos. A base calculada tem precisão integral ainda experimental. Os exemplos ilustram a interpretação e não afirmam fatos da sua vida.",
            "Conteúdo elaborado com IA e submetido a revisão automatizada independente da redação, sem revisão humana. A interpretação simbólica não demonstra causalidade científica nem oferece previsão garantida de acontecimentos.",
          ],
        },
      ],
      sources: [
        {
          title: "Caelus — código do motor de efemérides utilizado",
          url: "https://github.com/heavyblotto/caelus",
        },
      ],
      calculation: {
        engine: facts.engine,
        version: facts.version,
        factsDigest: digest(facts),
        coverageStart: `${facts.startDate}T00:00:00.000Z`,
        coverageEnd: `${facts.endDateExclusive}T00:00:00.000Z`,
      },
    };
    // Intended publication bytes only. No registry, admission, review or signature is created here.
    let claims = {
      documentId: id,
      methodVersion: SOLAR_METHOD,
      authoringAgent: copy.authoringAgent,
      sign: reading.sign,
      factsDigest: digest(facts),
      claims: copy.requiredFactors.map((factorId, index) => {
        const factor = facts.candidates.find(
          (candidate) => candidate.id === factorId,
        );
        const bodies = factor.bodies;
        const observations = facts.rows.map((row) => ({
          at: row[0],
          sectors: Object.fromEntries(
            bodies.map((body) => [
              body,
              solarSector(row[1 + facts.bodies.indexOf(body)], reading.sign),
            ]),
          ),
        }));
        return {
          section: 0,
          paragraph: index,
          factorId,
          observations,
          interpretation: reading.paragraphs[index],
          sampledFactor: factor,
        };
      }),
    };
    if (recurring)
      ({ document, claims } = composeDocumentAndClaims(
        facts,
        reading.sign,
        frozenAt,
      ));
    documentDigests[id] = digest(document);
    claimsDigests[id] = digest(claims);
    generated.push({ document, claims });
    write(`${id}.document.json`, document);
    write(`${id}.claims.json`, claims);
  }
  const scope = {
    schemaVersion: "atv-dated-horoscope-preparation-v1",
    status: "PREPARED_NOT_REVIEWED_NOT_SIGNED_NOT_ADMITTED",
    policyVersion: DATED_POLICY,
    methodVersion: SOLAR_METHOD,
    keyId: "github-actions-editorial-20261006-01",
    reviewerId: "atvna-editorial-service",
    period: facts.period,
    startDate: facts.startDate,
    endDateExclusive: facts.endDateExclusive,
    frozenAt,
    authoringAgent: copy.authoringAgent,
    factsDigest: digest(facts),
    documentDigests,
    claimsDigests,
    ...(recurring
      ? { composition: copy.composition, algorithmManifest: manifest }
      : {}),
    evidence: [
      { path: "facts.json", sha256: sha(factsBytes) },
      { path: "method.md", sha256: sha(methodBytes) },
      { path: "authored-copy.json", sha256: sha(copyBytes) },
    ],
    remainingGates: [
      recurring
        ? "independent-corpus-and-algorithm-review"
        : "independent-editorial-review",
      "real-external-signature",
      "admission",
      "visual-a11y-ci",
      "hosted-verification",
    ],
  };
  write("scope.json", scope);
  if (recurring) {
    for (const { document, claims } of generated) {
      const checks = assertRuntimeComposition({
        document,
        claims,
        facts,
        scope,
      });
      write(`${document.id}.runtime.json`, {
        schema: "atv-dated-horoscope-runtime-v1",
        documentId: document.id,
        documentDigest: digest(document),
        factsDigest: digest(facts),
        claimsDigest: digest(claims),
        scopeDigest: digest(scope),
        composition: scope.composition,
        verifiedAt: frozenAt,
        checks,
        decision: "PASS",
      });
    }
  }
  return {
    output,
    documents: Object.keys(documentDigests).length,
    factsDigest: scope.factsDigest,
    status: scope.status,
  };
}

export function scheduledPeriods(mode, referenceDate) {
  if (
    !["bootstrap", "next"].includes(mode) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(referenceDate)
  )
    throw Error(
      "Explicit bootstrap/next mode and UTC reference date are required",
    );
  const reference = new Date(`${referenceDate}T00:00:00.000Z`);
  if (
    !Number.isFinite(reference.getTime()) ||
    reference.toISOString().slice(0, 10) !== referenceDate ||
    reference.getUTCFullYear() < 1900 ||
    reference.getUTCFullYear() > 2099
  )
    throw Error("Reference date is not a civil UTC date");
  const target = new Date(reference);
  if (mode === "next") target.setUTCDate(target.getUTCDate() + 1);
  if (target.getUTCFullYear() > 2099)
    throw Error("Target date is outside the supported factual interval");
  const startDate = target.toISOString().slice(0, 10);
  const periods =
    mode === "bootstrap"
      ? ["daily", "weekly", "monthly"]
      : [
          "daily",
          ...(target.getUTCDay() === 1 ? ["weekly"] : []),
          ...(target.getUTCDate() === 1 ? ["monthly"] : []),
        ];
  return { startDate, periods };
}

export async function prepareScheduled({
  root,
  mode,
  referenceDate,
  outputPath,
  now = new Date(),
}) {
  const { startDate, periods } = scheduledPeriods(mode, referenceDate);
  root = path.resolve(root);
  const output = path.resolve(root, outputPath);
  if (!output.startsWith(root + path.sep) || fs.existsSync(output))
    throw Error(
      "Scheduled output must be a new directory within the workspace",
    );
  const packages = [];
  for (const period of periods) {
    const directory = path
      .relative(root, path.join(output, period))
      .replaceAll("\\", "/");
    await prepare({ root, outputPath: directory, period, startDate, now });
    const scope = JSON.parse(
      fs.readFileSync(path.join(root, directory, "scope.json"), "utf8"),
    );
    packages.push({
      directory,
      period,
      startDate: scope.startDate,
      endDateExclusive: scope.endDateExclusive,
      scopeDigest: digest(scope),
    });
  }
  const index = {
    schema: "atv-dated-horoscope-batch-v1",
    mode,
    referenceDate,
    preparedAt: now.toISOString(),
    packages,
    directories: packages.map((item) => item.directory),
  };
  fs.writeFileSync(
    path.join(output, "index.json"),
    JSON.stringify(index, null, 2) + "\n",
  );
  return index;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
) {
  if (process.argv[2] === "--schedule") {
    const [mode, referenceDate, outputPath] = process.argv.slice(3);
    if (!outputPath)
      throw Error(
        "Usage: node scripts/prepare-dated-horoscope.mjs --schedule <bootstrap|next> <reference-date-UTC> <new-output-dir>",
      );
    console.log(
      JSON.stringify(
        await prepareScheduled({
          root: process.cwd(),
          mode,
          referenceDate,
          outputPath,
        }),
      ),
    );
  } else if (process.argv[2] === "--compose") {
    const [startDate, period, outputPath, factsPath] = process.argv.slice(3);
    if (!outputPath)
      throw Error(
        "Usage: node scripts/prepare-dated-horoscope.mjs --compose <date> <daily|weekly|monthly> <new-output-dir> [facts.json]",
      );
    console.log(
      JSON.stringify(
        await prepare({
          root: process.cwd(),
          startDate,
          period,
          outputPath,
          factsPath,
        }),
      ),
    );
  } else {
    const [copyPath, outputPath, factsPath] = process.argv.slice(2);
    if (!copyPath || !outputPath)
      throw Error(
        "Usage: node scripts/prepare-dated-horoscope.mjs <authored-copy.json> <new-output-dir> [frozen-facts.json]",
      );
    console.log(
      JSON.stringify(
        await prepare({ root: process.cwd(), copyPath, outputPath, factsPath }),
      ),
    );
  }
}
