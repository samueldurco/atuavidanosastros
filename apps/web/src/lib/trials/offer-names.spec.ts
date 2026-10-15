import { describe, expect, it } from 'vitest';
import { productOffers, type CalculationSnapshot, type WorkflowInput } from '@atv/domain';
import { calculateTrial } from '../server/trial-calculation';
import {
	approveTrialReading,
	canonical,
	composeOriginalTrialReading,
	composeTrialReading,
	type TrialReading
} from './reading';
import { nameCurrentOffer, OFFER_NAME_REVISION, offerNames20261015 } from './offer-names';

const input: WorkflowInput = {
	version: 'atv-workflow/1.0.0',
	productId: 'birth-chart',
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
};
let cached: CalculationSnapshot;
const sample = async () =>
	(cached ??= await calculateTrial(input, '00000000-0000-4000-8000-000000000715'));

describe('immutable offer names for new private deliveries', () => {
	it('matches the 19 approved offers and records its own immutable revision', () => {
		expect(Object.isFrozen(offerNames20261015)).toBe(true);
		expect(Object.entries(offerNames20261015).sort()).toEqual(
			productOffers.map((product) => [product.id, product.name]).sort()
		);
	});
	it('names new deliveries without changing method, facts, interpretation or the original payload', async () => {
		const calculation = await sample();
		const original = composeOriginalTrialReading(input, calculation);
		const before = canonical(original);
		const current = composeTrialReading(input, calculation);
		expect(current.title).toBe('Mapa Astral Completo');
		expect(current.nameRevision).toBe(OFFER_NAME_REVISION);
		expect(original.title).toBe('Mapa Astral — assinaturas e temas de vida');
		expect(canonical(original)).toBe(before);
		const content = { ...current };
		delete content.nameRevision;
		expect({ ...content, title: original.title }).toEqual(original);
		expect(await approveTrialReading(input, calculation, current)).not.toBeNull();
	});
	it('reopens an unmarked historical payload with its original title and unchanged signed digest', async () => {
		const calculation = await sample();
		const original = composeOriginalTrialReading(input, calculation);
		const saved = JSON.stringify(original);
		const approval = await approveTrialReading(input, calculation, original);
		expect(approval).not.toBeNull();
		const bytes = await crypto.subtle.digest(
			'SHA-256',
			new TextEncoder().encode(
				canonical({ policy: approval!.policy, input, calculation, reading: original })
			)
		);
		const oldDigest = [...new Uint8Array(bytes)]
			.map((byte) => byte.toString(16).padStart(2, '0'))
			.join('');
		expect(approval!.digest).toBe(oldDigest);
		const restored = JSON.parse(saved) as TrialReading;
		expect(await approveTrialReading(input, calculation, restored)).toEqual(approval);
		expect(JSON.stringify(restored)).toBe(saved);
		expect(restored).not.toHaveProperty('nameRevision');
		const named = await approveTrialReading(
			input,
			calculation,
			composeTrialReading(input, calculation)
		);
		expect(named!.digest).not.toBe(oldDigest);
	});
	it('rejects title, naming revision, method content and fact adulteration', async () => {
		const calculation = await sample();
		const original = composeTrialReading(input, calculation);
		for (const mutate of [
			(r: TrialReading) => {
				r.title = 'Nome não aprovado';
			},
			(r: TrialReading) => {
				r.nameRevision = 'unknown' as never;
			},
			(r: TrialReading) => {
				r.nameRevision = undefined;
			},
			(r: TrialReading) => {
				delete r.nameRevision;
			},
			(r: TrialReading) => {
				r.sections[0].text += ' Uma promessa adicional.';
			},
			(r: TrialReading) => {
				r.sections[0].factIds.push('invented-fact');
			}
		]) {
			const candidate = structuredClone(original);
			mutate(candidate);
			expect(await approveTrialReading(input, calculation, candidate)).toBeNull();
		}
	});
	it('does not call a civil month or legacy dream collection a new 30-day delivery', async () => {
		const reading = composeOriginalTrialReading(input, await sample());
		for (const productId of ['personal-calendar', 'dream-atlas', 'career-compass']) {
			const historic = { ...reading, productId, title: 'Título histórico preservado' };
			expect(nameCurrentOffer({ ...input, productId }, historic)).toBe(historic);
		}
		const calendar = nameCurrentOffer(
			{ ...input, productId: 'personal-calendar', forecastPeriod: 'rolling-30-days' },
			{ ...reading, productId: 'personal-calendar' }
		);
		expect(calendar.title).toBe('Calendário de Previsões — Próximos 30 Dias');
		expect(calendar.nameRevision).toBe(OFFER_NAME_REVISION);
	});
});
