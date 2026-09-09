import { mkdirSync, writeFileSync } from 'node:fs';
import { evaluateCoverage } from '../packages/astrology/fixtures/coverage/evaluate.ts';
const result = await evaluateCoverage();
mkdirSync(new URL('../test-results/', import.meta.url), { recursive: true });
writeFileSync(new URL('../test-results/astrology-coverage.json', import.meta.url), `${JSON.stringify(result, null, 2)}\n`);
const { rows, motion, inconclusiveMotion, ...summary } = result;
console.log(JSON.stringify({ ...summary, inconclusiveMotion: inconclusiveMotion.length }, null, 2));
if (result.failures.length) process.exitCode = 1;
