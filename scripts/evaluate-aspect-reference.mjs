import { writeFileSync, mkdirSync } from 'node:fs';
import { evaluateAspectReference } from '../packages/astrology/fixtures/aspects/evaluate.ts';
const report = await evaluateAspectReference();
const destination = new URL('../test-results/', import.meta.url);
mkdirSync(destination, { recursive: true });
writeFileSync(new URL('astrology-aspects.json', destination), JSON.stringify(report, null, 2) + '\n');
const { rows, failures, ...summary } = report;
console.log(JSON.stringify({ ...summary, failureCount: failures.length, failures: failures.slice(0, 8) }, null, 2));
if (failures.length) process.exitCode = 1;
