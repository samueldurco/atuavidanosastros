import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import type { CalculationSnapshot } from '@atv/domain';
import { createCareerCompassFullBasisCalculator } from '../../../../../worker/src/career-compass-full-basis';
import { prepareCareerCompassV6Origin } from './compass-origin';
import { compassQaProfiles } from './compass-qa-profiles';

// Complete-object SHA-256 baselines from the six editorially reviewed V6 snapshots.
// Only the calculation clock is excluded; every fact, chapter and citation remains pinned.
const expectedDigests: Record<string, { calculation: string; reading: string }> = {
	livia: {
		calculation: '4a443a14dd70160642f68efd852299bf86870b9105a4c41963720f67a16efc82',
		reading: 'db25de2f06d86ab7aa78f89b496fcc16f660e79fb217c8be8286b18886cadd84'
	},
	'ceramics-employment': {
		calculation: '8d841863eb54cdbefcabb923624692575c17c90999d85b91bdffac8bd239db4d',
		reading: '9e25e7731966a7e516bd6411561b8af70ac042d826280d23a874841327fb17cb'
	},
	leadership: {
		calculation: '094c378d684f2e6afd3fe6e101ef91a263e10142c370a83e226208fd4629b3ab',
		reading: '2e56146ff78989655674d0c4d27a88a448bcab331f2ad027c9a4b3133a1a86ae'
	},
	workload: {
		calculation: 'c80776fbf4d9bb06346ce465cf46436e67689d2594aa6f31f661214e453aac65',
		reading: 'd0af0c3a674ca22f7fc8564432321e9f6b49a7b5692c0d6fa2d681247d1b9392'
	},
	study: {
		calculation: 'eb07d2001717e86502aa1c4ada96176811405fd8baa379a712d7e4f806283fc6',
		reading: '8bcb5c75b4c4ac39dfbbfded7a78a7c12a18b2998212c473f679a418a8338756'
	},
	'different-birth': {
		calculation: '9e48cbe5ce0a805d203eb6e9c64d21bf1f90f78069d06753c26604da40740f20',
		reading: '2c4eff4bba4411b0726dbe4775c89f0de8e94318f2df9e109a4ca9254d1bae59'
	}
};
const runId = '00000000-0000-4000-8000-000000000150';
const signal = new AbortController().signal;
const fullBasisCalculator = createCareerCompassFullBasisCalculator();
const stable = (value: unknown): unknown =>
	Array.isArray(value)
		? value.map(stable)
		: value !== null && typeof value === 'object'
			? Object.fromEntries(
					Object.entries(value)
						.filter(([key]) => key !== 'calculatedAt')
						.sort(([left], [right]) => left.localeCompare(right))
						.map(([key, part]) => [key, stable(part)])
				)
			: value;
const digest = (value: unknown) =>
	createHash('sha256')
		.update(JSON.stringify(stable(value)))
		.digest('hex');

describe('career-compass V6 deterministic origin candidate', () => {
	it('rebuilds the six saved fictional readings from the worker full basis', async () => {
		expect(compassQaProfiles.map((profile) => profile.slug)).toEqual(Object.keys(expectedDigests));
		for (const profile of compassQaProfiles) {
			const name = profile.slug;
			const fullBasis = (await fullBasisCalculator(profile.input, {
				runId,
				signal
			})) as CalculationSnapshot;
			const result = await prepareCareerCompassV6Origin(profile.input, fullBasis, signal);
			expect(result.status, name).toBe('prepared_for_review');
			expect(result.publication, name).toBe('blocked');
			if (result.status !== 'prepared_for_review') continue;
			expect(digest(result.calculation), `${name}: integral factual projection`).toBe(
				expectedDigests[name]!.calculation
			);
			expect(digest(result.reading), `${name}: integral V6 reading`).toBe(
				expectedDigests[name]!.reading
			);
			expect(result.reading.sections, name).toHaveLength(11);
		}
	});

	it('fails closed when the captured basis, context or birth is changed', async () => {
		const input = compassQaProfiles[0]!.input;
		const fullBasis = (await fullBasisCalculator(input, { runId, signal })) as CalculationSnapshot;
		const changedChart = structuredClone(fullBasis);
		const chart = changedChart.data.chart as { positions: { longitude: number }[] };
		chart.positions[0]!.longitude += 0.5;
		for (const [candidateInput, basis] of [
			[input, changedChart],
			[{ ...input, context: 'Outro contexto' }, fullBasis],
			[{ ...input, birth: { ...input.birth!, longitude: -45 } }, fullBasis]
		] as const) {
			const result = await prepareCareerCompassV6Origin(candidateInput, basis, signal);
			expect(result).toMatchObject({
				status: 'blocked',
				publication: 'blocked',
				reason: 'invalid_full_basis'
			});
			expect('reading' in result).toBe(false);
		}
	});
});
