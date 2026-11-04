import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { calculateLaunchFacts, LAUNCH_CALCULATION_VERSION } from '../server/launch-calculation';
import {
	composeLaunchReading,
	evaluateLaunchReading,
	launchReadingDigest,
	LAUNCH_READING_VERSION,
	LAUNCH_EDITORIAL_POLICY_VERSION
} from './launch-reading';
import { launchExampleInputs, launchExampleExecutionId } from './launch-reading.fixtures';

/** Explicit opt-in artifact generation; ordinary suites do not mutate the repository. */
describe.skipIf(process.env.P02_WRITE_SAMPLES !== '1')(
	'P02 reproducible synthetic delivery samples',
	() => {
		it('writes selected real local compositions, their honest reviews and measured batch data', async () => {
			const selectedIds = process.env.P02_SAMPLE_PRODUCT_IDS?.split(',').filter(Boolean);
			const benchmarkName = process.env.P02_SAMPLE_BENCHMARK_NAME;
			if (benchmarkName && !/^benchmark-[a-z0-9-]+\.json$/.test(benchmarkName))
				throw new Error('invalid_sample_benchmark_name');
			if (selectedIds?.some((id) => !launchExampleInputs.some((input) => input.productId === id)))
				throw new Error('unknown_sample_product');
			const directory = fileURLToPath(
				new URL('../../../../../docs/p02-lancamentos/samples/', import.meta.url)
			);
			await mkdir(directory, { recursive: true });
			const batchId = `p02-local-${new Date().toISOString()}`;
			const environment = {
				node: process.version,
				platform: process.platform,
				architecture: process.arch,
				runner: 'vitest',
				versions: {
					calculation: LAUNCH_CALCULATION_VERSION,
					reading: LAUNCH_READING_VERSION,
					policy: LAUNCH_EDITORIAL_POLICY_VERSION
				},
				paidCalls: 0,
				productionPrediction: false
			};
			const rows: unknown[] = [];
			const bytes = (value: unknown) => new TextEncoder().encode(JSON.stringify(value)).byteLength;
			for (const [index, input] of launchExampleInputs.entries()) {
				if (selectedIds && !selectedIds.includes(input.productId)) continue;
				const t0 = performance.now();
				const calculation = await calculateLaunchFacts(input, launchExampleExecutionId(index));
				const t1 = performance.now();
				// Snapshot simulates a saved artifact only. No DB row, owner or access claim is made.
				const savedCalculation = JSON.parse(JSON.stringify(calculation));
				const reading = await composeLaunchReading(input, savedCalculation);
				const t2 = performance.now();
				const review = await evaluateLaunchReading(input, savedCalculation, reading);
				const t3 = performance.now();
				const measurement = {
					productId: input.productId,
					status: review.status,
					reasons: review.reasons,
					durationMs: { factual: t1 - t0, composition: t2 - t1, review: t3 - t2, total: t3 - t0 },
					jsonBytes: {
						input: bytes(input),
						calculation: bytes(calculation),
						reading: bytes(reading),
						review: bytes(review)
					}
				};
				const artifact = {
					state: 'EXAMPLE_PRIVATE_REVIEW',
					batchId,
					environment,
					scope:
						'Synthetic input and real local calculation/composition/review. File snapshot only; no persisted owner delivery, access grant, human E5 acceptance or commercial release.',
					measurement,
					input,
					calculation,
					calculationDigest: await launchReadingDigest(calculation),
					reading,
					readingDigest: await launchReadingDigest(reading),
					review
				};
				await writeFile(
					join(directory, `${input.productId}.json`),
					`${JSON.stringify(artifact, null, 2)}\n`,
					'utf8'
				);
				rows.push(measurement);
				expect(review.digest).toBe(artifact.readingDigest);
				expect(review.provenance.commercialPrecisionApproved).toBe(false);
			}
			await writeFile(
				join(
					directory,
					benchmarkName ?? (selectedIds ? 'benchmark-date-presentation.json' : 'benchmark.json')
				),
				`${JSON.stringify(
					{
						state: 'EXAMPLE_PRIVATE_REVIEW',
						batchId,
						environment,
						selectedProductIds: selectedIds ?? launchExampleInputs.map((input) => input.productId),
						methodology:
							'One sequential local batch, no warmup or repeated distribution; elapsed wall-clock durations include concurrent workstation load. JSON byte counts use UTF-8 compact JSON. These measurements do not predict hosted latency, concurrency or currency cost.',
						measurements: rows
					},
					null,
					2
				)}\n`,
				'utf8'
			);
			expect(rows).toHaveLength(selectedIds ? new Set(selectedIds).size : 11);
		}, 120_000);
	}
);
