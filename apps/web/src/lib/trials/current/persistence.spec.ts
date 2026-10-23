import { describe, expect, it } from 'vitest';
import type { CalculationSnapshot, WorkflowInput } from '@atv/domain';
import { calculateTrial } from '../../server/trial-calculation';
import { approveTrialReading, composeTrialReading, type SavedTrial } from '../reading';
import { trialText } from '../exports';
import { reviewCurrentReading } from './index';

const inputFor = (productId: WorkflowInput['productId']): WorkflowInput => ({
	version: 'atv-workflow/1.0.0',
	productId,
	targetDate: '2026-10-15',
	forecastPeriod: 'rolling-30-days',
	context: 'Quero compreender os próximos acordos no trabalho.',
	birth: {
		localDateTime: '2000-01-01T12:00:00',
		utcInstant: '2000-01-01T12:00:00Z',
		timezone: 'UTC',
		latitude: 0,
		longitude: 0,
		locationSource: 'synthetic'
	},
	consent: {
		storage: true,
		partner: false,
		continuity: false,
		policyVersion: 'atv-input-consent/1'
	}
});

// JSONB orders object keys by length then byte value; object insertion order is not a contract.
function persisted<T>(value: T): T {
	if (Array.isArray(value)) return value.map(persisted) as T;
	if (value && typeof value === 'object')
		return Object.fromEntries(
			Object.entries(value)
				.sort(([a], [b]) => a.length - b.length || a.localeCompare(b))
				.map(([key, item]) => [key, persisted(item)])
		) as T;
	return value;
}

type CalendarSnapshot = CalculationSnapshot & {
	data: { samples: { inputTemplate: Record<string, unknown> } };
};

describe('current calendar reading after JSONB persistence', () => {
	for (const productId of ['personal-calendar', 'career-forecast-30d'] as const) {
		it(`${productId}: reordered persisted keys preserve projection, approval and TXT`, async () => {
			const input = inputFor(productId);
			const calculation = (await calculateTrial(
				input,
				'00000000-0000-4000-8000-000000000194'
			)) as CalendarSnapshot;
			const original = composeTrialReading(input, calculation);
			const stored = persisted(calculation);
			expect(Object.keys(stored.data.samples.inputTemplate)).not.toEqual(
				Object.keys(calculation.data.samples.inputTemplate)
			);
			const reopened = composeTrialReading(persisted(input), stored);
			expect(reopened).toEqual(original);
			expect(reviewCurrentReading(stored, reopened)).toEqual([]);
			const approval = await approveTrialReading(persisted(input), stored, persisted(reopened));
			expect(approval?.status).toBe('approved');
			const saved: SavedTrial = {
				id: '00000000-0000-4000-8000-000000000194',
				product_id: productId,
				created_at: '2026-10-23T12:00:00Z',
				input: persisted(input),
				calculation: stored,
				reading: reopened,
				approval: approval!
			};
			expect(trialText(saved)).toContain(reopened.title);
			expect(trialText(saved)).toContain(reopened.sections[0].text);
			for (const tamper of ['extra-key', 'missing-key', 'changed-value'] as const) {
				const altered = structuredClone(stored);
				const template = altered.data.samples.inputTemplate;
				if (tamper === 'extra-key') template.unexpected = true;
				if (tamper === 'missing-key') delete template.locationSource;
				if (tamper === 'changed-value') template.latitude = 1;
				expect(() => composeTrialReading(input, altered), tamper).toThrow(
					'Grade diária incompleta ou divergente.'
				);
				expect(await approveTrialReading(input, altered, reopened), tamper).toBeNull();
			}
		}, 30_000);
	}
});
