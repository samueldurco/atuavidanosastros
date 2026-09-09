import { readFileSync } from 'node:fs';
import { evaluateSample } from '../packages/ai/src/lab/benchmark.ts';

const results = {};
for (const phase of ['baseline', 'focal']) {
  const source = new URL(`../docs/intelligence/benchmarks/2026-09-08-${phase}.json`, import.meta.url);
  const run = JSON.parse(readFileSync(source, 'utf8'));
  if (run.dataClass !== 'synthetic') throw new Error('Only synthetic laboratory artifacts are accepted.');
  results[phase] = run.samples.map((sample) => evaluateSample(sample));
}
process.stdout.write(JSON.stringify(results, null, 2) + '\n');
