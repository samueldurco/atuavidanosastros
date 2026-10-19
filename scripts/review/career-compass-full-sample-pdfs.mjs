/**
 * Private facsimiles of an experimental integral career reading.
 * Runs the existing six-profile test, which calculates and approves each
 * current reading before saving its exact payload. This script cannot publish
 * a product, create a customer run, or alter the interpretation.
 *
 * Usage: node scripts/review/career-compass-full-sample-pdfs.mjs
 *        node scripts/review/career-compass-full-sample-pdfs.mjs --from-saved --expected-compass-sha256=<sha256>
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('../../', import.meta.url)));
const web = path.join(root, 'apps', 'web');
const qa = path.join(web, '.trial-qa', 'compass-v6-saved');
const output = path.join(root, 'output', 'pdf');
const python = process.env.ATVNA_REVIEW_PYTHON ||
  'C:\\Users\\samue\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\python\\python.exe';
const slugs = ['livia', 'ceramics-employment', 'leadership', 'workload', 'study', 'different-birth'];
const sourceFiles = [
  'apps/web/src/lib/trials/reconstruction/compass.ts',
  'apps/web/src/lib/trials/reconstruction/compass-origin.ts',
  'apps/web/src/lib/trials/reconstruction/compass-facts.ts',
  'apps/web/src/lib/trials/reconstruction/compass-qa-profiles.ts',
  'apps/worker/src/career-compass-full-basis.ts',
  'apps/web/src/lib/trials/reading.ts',
  'apps/web/src/lib/server/trial-calculation.ts',
];
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const fromSaved = process.argv.includes('--from-saved');
const expectedArg = process.argv.find((arg) => arg.startsWith('--expected-compass-sha256='));
const expectedCompassSha = expectedArg?.slice('--expected-compass-sha256='.length).toLowerCase();
if (fromSaved && !/^[a-f0-9]{64}$/.test(expectedCompassSha || '')) {
  throw new Error('--from-saved requires --expected-compass-sha256=<64-character SHA-256>');
}
if (!fromSaved && expectedArg) {
  throw new Error('--expected-compass-sha256 is only valid with --from-saved');
}
if (process.argv.slice(2).some((arg) => arg !== '--from-saved' && arg !== expectedArg)) {
  throw new Error('Unknown argument');
}
const sourceDigests = Object.fromEntries(sourceFiles.map((p) => [p, sha(readFileSync(path.join(root, p)))]));
if (fromSaved && sourceDigests[sourceFiles[0]] !== expectedCompassSha) {
  throw new Error(`Career Compass source does not match the editorial freeze: ${sourceDigests[sourceFiles[0]]}`);
}

const started = Date.now();
if (!fromSaved) {
  const vitest = spawnSync(process.execPath, [
    path.join(web, 'node_modules', 'vitest', 'vitest.mjs'),
    'run', 'src/lib/trials/reconstruction/compass.spec.ts',
    '-t', 'regenerates six fictional profiles',
  ], { cwd: web, encoding: 'utf8', maxBuffer: 4_000_000 });
  if (vitest.error || vitest.status !== 0) {
    throw new Error(`The current engine/profile approval test failed:\n${vitest.error || vitest.stderr || vitest.stdout}`);
  }
}
for (const [name, digest] of Object.entries(sourceDigests)) {
  if (sha(readFileSync(path.join(root, name))) !== digest) {
    throw new Error(`Source changed during sample generation: ${name}`);
  }
}

const savedDigests = {};
const samples = slugs.map((slug) => {
  const file = path.join(qa, `${slug}.json`);
  if (!fromSaved && statSync(file).mtimeMs < started - 2000) throw new Error(`Stale profile output: ${slug}`);
  const bytes = readFileSync(file);
  savedDigests[slug] = sha(bytes);
  const saved = JSON.parse(bytes.toString('utf8'));
  if (saved.product_id !== 'career-compass' ||
      saved.reading?.version !== 'atv-career-compass-editorial/6.0.0' ||
      saved.calculation?.version !== 'atv-private-career-compass/5.0.0' ||
      saved.approval?.status !== 'approved' ||
      saved.approval?.scope !== 'private-free-test' ||
      saved.reading?.sections?.length !== 11 ||
      saved.calculation?.facts?.length !== 39) {
    throw new Error(`Unapproved or incomplete current reading: ${slug}`);
  }
  return {
    slug,
    input: saved.input,
    reading: saved.reading,
    calculationVersion: saved.calculation.version,
    approvalPolicy: saved.approval.policy,
    readingSha256: sha(Buffer.from(JSON.stringify(saved.reading), 'utf8')),
  };
});

const render = spawnSync(python, [
  path.join(root, 'scripts', 'review', 'render-career-compass-full-samples.py'), output,
], { cwd: root, input: JSON.stringify(samples), encoding: 'utf8', maxBuffer: 4_000_000 });
if (render.error || render.status !== 0) {
  throw new Error(`PDF renderer failed:\n${render.error || render.stderr || render.stdout}`);
}
const files = render.stdout.trim().split(/\r?\n/).filter(Boolean);
if (files.length !== slugs.length) throw new Error(`Expected ${slugs.length} PDFs, got ${files.length}`);
for (const [name, digest] of Object.entries(sourceDigests)) {
  if (sha(readFileSync(path.join(root, name))) !== digest) {
    throw new Error(`Source changed during PDF rendering: ${name}`);
  }
}
for (const [slug, digest] of Object.entries(savedDigests)) {
  if (sha(readFileSync(path.join(qa, `${slug}.json`))) !== digest) {
    throw new Error(`Saved profile changed during PDF rendering: ${slug}`);
  }
}
const manifest = {
  scope: 'private-owner-review-only',
  status: fromSaved ? 'private-owner-review-facsimile' : 'preview-awaiting-independent-editorial-gate',
  publicDelivery: 'web',
  explanation: 'Private integral reading prototype for owner review. It does not reproduce the free MC-centered web Career Compass or promise the paid Career Map; these PDFs are not a customer offering.',
  generationMode: fromSaved ? 'frozen-saved-json' : 'regenerated-by-vitest',
  engineSourcesSha256: sourceDigests,
  generatorTest: fromSaved ? 'Previously generated and editorially frozen JSON' : 'apps/web/src/lib/trials/reconstruction/compass.spec.ts :: regenerates six fictional profiles',
  samples: samples.map((sample, i) => ({
    slug: sample.slug,
    fictionalName: sample.input.presentation?.name,
    readingVersion: sample.reading.version,
    calculationVersion: sample.calculationVersion,
    approvalPolicy: sample.approvalPolicy,
    savedJsonSha256: savedDigests[sample.slug],
    factCount: 39,
    readingSha256: sample.readingSha256,
    pdf: files[i],
    pdfSha256: sha(readFileSync(files[i])),
  })),
};
writeFileSync(path.join(output, 'atvna-estudo-carreira-integral-amostras-manifest.json'), JSON.stringify(manifest, null, 2));
process.stdout.write(`${files.join('\n')}\n`);
