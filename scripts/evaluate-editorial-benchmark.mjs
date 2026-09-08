import { readFileSync } from 'node:fs';
import { evaluateSample } from '../packages/ai/src/lab/benchmark.ts';

const source = new URL('../docs/intelligence/benchmarks/2026-09-08-baseline.json', import.meta.url);
const run = JSON.parse(readFileSync(source, 'utf8'));
if (run.dataClass !== 'synthetic') throw new Error('Only synthetic laboratory artifacts are accepted.');
process.stdout.write(JSON.stringify(run.samples.map(evaluateSample), null, 2) + '\n');
