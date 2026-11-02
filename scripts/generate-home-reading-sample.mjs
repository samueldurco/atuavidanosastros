import { build } from "esbuild";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// Local, reproducible demonstration. No account, database or hosted service is accessed.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const temporary = await mkdtemp(resolve(tmpdir(), "atv-home-reading-"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const publicPath = "apps/web/src/lib/data/home-reading-sample.json";
const evidencePath = "docs/qa/HOME_READING_SAMPLE_2026-11-02.json";
const runId = "home-reading-sample-20261102-v1";
const requireFromWeb = createRequire(resolve(root, "apps/web/package.json"));
const prettier = requireFromWeb("prettier");

try {
  const output = resolve(temporary, "sample.mjs");
  await build({
    stdin: {
      contents: `
import { calculateTrial } from './apps/web/src/lib/server/trial-calculation';
import { composeTrialReading, approveTrialReading } from './apps/web/src/lib/trials/reading';
import { buildChartScene, chartSceneSvg, CHART_ENGINE_VERSION } from './apps/web/src/lib/trials/chart-engine-v2';
import { trialGeometry, bodyNames } from './apps/web/src/lib/trials/cartography';
import { chartPosition, chartWheelSvg } from './apps/web/src/lib/astrological-chart-presentation';
export async function generate() {
	const input = {
		version: 'atv-workflow/1.0.0', productId: 'birth-chart',
		consent: { storage: true, partner: false, continuity: false, policyVersion: 'atv-input-consent/1' },
		birth: {
			localDateTime: '1998-05-12T09:00:00', utcInstant: '1998-05-12T12:00:00Z',
			timezone: 'America/Sao_Paulo', latitude: -23.5505, longitude: -46.6333,
			locationSource: 'synthetic'
		}
	};
	const calculation = await calculateTrial(input, '${runId}');
	const reading = composeTrialReading(input, calculation);
	const approval = await approveTrialReading(input, calculation, reading);
	if (!approval || approval.scope !== 'private-free-test') throw Error('home_sample_private_gate_rejected');
	const saved = { id: '${runId}', product_id: 'birth-chart', created_at: '2026-11-02T00:00:00Z', input, calculation, reading, approval };
	const geometry = trialGeometry(saved);
	const scene = buildChartScene(saved, { houses: true, degrees: true, aspects: 'major' });
	const positions = geometry.positions.map(p => ({
		body: p.body, name: bodyNames[p.body], longitude: p.longitude,
		...chartPosition(p.longitude, geometry.houses.cusps)
	}));
	const angles = Object.entries(geometry.angles).map(([key, longitude]) => ({
		body: key, name: key === 'ascendant' ? 'Ascendente' : 'Meio do Céu', longitude,
		...chartPosition(longitude)
	}));
	// Whole, unchanged sections from the current compositor; never a newly written delivery.
	const sectionIndices = [0, reading.sections.length - 1];
	const excerpts = sectionIndices.map(index => ({ index, ...reading.sections[index] }));
	const sample = {
		version: 'atv-home-reading-sample/1', productId: 'birth-chart', title: reading.title,
		fictional: true,
		profile: {
			label: 'Perfil fictício', date: '12 de maio de 1998', time: '9h',
			location: 'São Paulo, Brasil', timezone: input.birth.timezone,
			note: 'Data, horário e coordenadas escolhidos apenas para esta demonstração; não pertencem a uma pessoa identificada.'
		},
		excerpts,
		chart: { version: CHART_ENGINE_VERSION, svg: chartWheelSvg(chartSceneSvg(scene)), positions, angles, cusps: geometry.houses.cusps },
		question: reading.questions[0],
		limits: {
			method: 'Zodíaco tropical · casas Placidus',
			calculation: 'Cálculo experimental. Horário e local influenciam casas e ângulos.',
			interpretation: 'Leitura simbólica: uma hipótese de reflexão, sem diagnóstico ou previsão de acontecimentos.'
		},
		provenance: { calculationVersion: calculation.version, readingVersion: reading.version, source: reading.source }
	};
	return { input, calculation, reading, approval, sectionIndices, sample };
}`,
      resolveDir: root,
      loader: "ts",
    },
    outfile: output,
    bundle: true,
    platform: "node",
    format: "esm",
    target: "es2022",
    alias: {
      "@atv/domain": resolve(root, "packages/domain/src/index.ts"),
      "@atv/astrology": resolve(root, "packages/astrology/src/index.ts"),
      $lib: resolve(root, "apps/web/src/lib"),
    },
    conditions: ["import", "default"],
    logLevel: "warning",
  });
  const { generate } = await import(pathToFileURL(output).href);
  const { input, calculation, reading, approval, sectionIndices, sample } =
    await generate();
  const publicBytes = await prettier.format(JSON.stringify(sample), {
    ...(await prettier.resolveConfig(resolve(root, publicPath))),
    parser: "json",
    plugins: [],
  });
  const sourcePaths = [
    "scripts/generate-home-reading-sample.mjs",
    "apps/web/src/lib/server/trial-calculation.ts",
    "apps/web/src/lib/trials/reading.ts",
    "apps/web/src/lib/trials/current/natal.ts",
    "apps/web/src/lib/trials/chart-engine-v2.ts",
    "apps/web/src/lib/astrological-chart-presentation.ts",
  ];
  const sourceHashes = Object.fromEntries(
    await Promise.all(
      sourcePaths.map(async (path) => [
        path,
        sha256(await readFile(resolve(root, path))),
      ]),
    ),
  );
  const evidence = {
    version: "atv-home-reading-sample-evidence/1",
    runId,
    command: "node scripts/generate-home-reading-sample.mjs",
    inputSource:
      "Wholly synthetic fixture authored specifically for the HOME demonstration; no saved private delivery or personal profile imported.",
    persistence: "none",
    providers:
      "none; local deterministic calculation and existing versioned editorial compositor",
    reproducibility:
      "Public excerpt and chart are reproducible from this fixed synthetic input. The full private approval digest also includes the real calculation timestamp and is refreshed on each generation; no provenance clock is overwritten.",
    publicArtifact: {
      path: publicPath,
      sha256: sha256(publicBytes),
      bytes: Buffer.byteLength(publicBytes),
    },
    approvalScope:
      "The existing approval below covers private-free-test only. It is not public editorial approval, commercial release, hosted release or production precision homologation.",
    publicReview: { status: "separate-review-required", report: null },
    selection: {
      sectionIndices,
      rule: "First interpretative chapter and closing synthesis, copied whole and unchanged from the generated current reading.",
    },
    sourceHashes,
    input,
    calculation,
    reading,
    approval,
  };
  for (const [path, bytes] of [
    [publicPath, publicBytes],
    [evidencePath, `${JSON.stringify(evidence, null, 2)}\n`],
  ]) {
    await mkdir(dirname(resolve(root, path)), { recursive: true });
    await writeFile(resolve(root, path), bytes);
  }
  console.log(
    JSON.stringify(
      {
        publicPath,
        sha256: evidence.publicArtifact.sha256,
        bytes: evidence.publicArtifact.bytes,
        evidencePath,
        privateApproval: approval,
        excerpts: sample.excerpts.map(({ index, title, text, factIds }) => ({
          index,
          title,
          words: text.split(/\s+/).length,
          factIds,
        })),
      },
      null,
      2,
    ),
  );
} finally {
  // This directory was created by mkdtemp under the OS temporary directory above.
  if (
    resolve(temporary).startsWith(resolve(tmpdir()) + "\\") ||
    resolve(temporary).startsWith(resolve(tmpdir()) + "/")
  ) {
    await rm(temporary, { recursive: true, force: true });
  }
}
