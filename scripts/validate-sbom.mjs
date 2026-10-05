import { readFileSync } from 'node:fs';

const path = process.argv[2];

if (!path) {
  throw new Error('Usage: node scripts/validate-sbom.mjs <spdx-json-file>');
}

const sbom = JSON.parse(readFileSync(path, 'utf8'));
const packages = sbom.packages;
const names = new Set(Array.isArray(packages) ? packages.map((entry) => entry.name) : []);

if (!sbom.spdxVersion?.startsWith('SPDX-2.') || !Array.isArray(packages) || packages.length < 100) {
  throw new Error('SPDX inventory is missing or unexpectedly small');
}

for (const name of ['typescript', 'svelte']) {
  if (!names.has(name)) {
    throw new Error(`SPDX inventory is missing ${name}`);
  }
}

console.log(`Validated SPDX inventory: ${packages.length} packages, including TypeScript and Svelte.`);
