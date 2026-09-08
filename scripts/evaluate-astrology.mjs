import { mkdirSync, writeFileSync } from 'node:fs';
import { evaluateHorizons } from '../packages/astrology/fixtures/horizons/evaluate.ts';

const report = await evaluateHorizons();
mkdirSync(new URL('../test-results/', import.meta.url), { recursive: true });
writeFileSync(new URL('../test-results/astrology-horizons.json', import.meta.url), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ count: report.count, failures: report.failures, maxLongitudeArcsec: Math.max(...report.rows.map((row) => row.angularErrorArcsec)), maxLatitudeArcsec: Math.max(...report.rows.map((row) => row.latitudeErrorArcsec)), maxDistanceRelative: Math.max(...report.rows.map((row) => row.distanceRelativeError)) }, null, 2));
if (report.failures.length) process.exitCode = 1;
