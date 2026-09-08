import { mkdir, writeFile } from 'node:fs/promises';
import { evaluateHouseReference } from '../packages/astrology/fixtures/houses/evaluate.ts';

const report = evaluateHouseReference();
await mkdir(new URL('../test-results/', import.meta.url), { recursive: true });
await writeFile(new URL('../test-results/astrology-houses.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ ...report, failures: report.failures.slice(0, 8), failureCount: report.failures.length }, null, 2));
if (report.failures.length) process.exitCode = 1;
