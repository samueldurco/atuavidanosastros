import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import type { CalculationSnapshot } from '@atv/domain';
import type { NatalChart } from '@atv/astrology';
import {
	createCareerCompassFullBasisCalculator,
	validCareerCompassFullBasis
} from '../../../../../worker/src/career-compass-full-basis';
import { prepareCareerCompassV6Origin } from './compass-origin';
import { compassQaProfiles } from './compass-qa-profiles';

// Complete-object SHA-256 baselines from the six editorially reviewed V6 snapshots.
// Only the calculation clock is excluded; every fact, chapter and citation remains pinned.
const expectedDigests: Record<string, { calculation: string; reading: string }> = {
	livia: {
		calculation: '4a443a14dd70160642f68efd852299bf86870b9105a4c41963720f67a16efc82',
		reading: '88e3a4d777b6e86b9811d6d5b0fe45417fe3be302dbb550342a8c676a83494be'
	},
	'ceramics-employment': {
		calculation: '8d841863eb54cdbefcabb923624692575c17c90999d85b91bdffac8bd239db4d',
		reading: 'a779a384f833c0d4d9e1ea6dde9267a94c61af1981d67e858521590cb0392d5f'
	},
	leadership: {
		calculation: '094c378d684f2e6afd3fe6e101ef91a263e10142c370a83e226208fd4629b3ab',
		reading: '9809fec110c044c8e7d1717fb3c11e7387a6b750ea7bfcc2d3896ee697db4380'
	},
	workload: {
		calculation: 'c80776fbf4d9bb06346ce465cf46436e67689d2594aa6f31f661214e453aac65',
		reading: 'd965b0ff8631dd857ee21cf4b8887c7693aa10584d9d448d24e6eb66b52ea541'
	},
	study: {
		calculation: 'eb07d2001717e86502aa1c4ada96176811405fd8baa379a712d7e4f806283fc6',
		reading: 'b77e8de9a2e2b7fb0f26205ecb6d0ce5d20d1584d8388356d6d036e36bf03c7d'
	},
	'different-birth': {
		calculation: '9e48cbe5ce0a805d203eb6e9c64d21bf1f90f78069d06753c26604da40740f20',
		reading: 'bbcc9ac61db8aaa0e8c9a194966f902abf904b6155e125512b3688aec1055986'
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

	it('rejects a coherent full basis assembled from a substituted provider', async () => {
		const input = compassQaProfiles[0]!.input;
		const trusted = (await fullBasisCalculator(input, { runId, signal })) as CalculationSnapshot;
		const chart = structuredClone(trusted.data.chart as NatalChart);
		chart.positions[0]!.longitude = (chart.positions[0]!.longitude + 0.5) % 360;
		const substituted = (await createCareerCompassFullBasisCalculator({
			name: chart.provenance.provider,
			version: chart.provenance.providerVersion,
			async calculate() {
				return structuredClone(chart);
			}
		})(input, { runId, signal })) as CalculationSnapshot;
		expect(validCareerCompassFullBasis(input, substituted)).toBe(true);
		expect(await prepareCareerCompassV6Origin(input, substituted, signal)).toMatchObject({
			status: 'blocked',
			publication: 'blocked',
			reason: 'origin_mismatch'
		});
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
