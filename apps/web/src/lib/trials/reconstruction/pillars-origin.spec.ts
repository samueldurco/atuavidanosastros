import { describe, expect, it } from 'vitest';
import type { EphemerisProvider, Position } from '@atv/astrology';
import { parseWorkflowInput, type CalculationSnapshot, type WorkflowInput } from '@atv/domain';
import { bodyLabels, zodiacPosition } from '../../../../../worker/src/natal-calculators';
import { calculateTrial } from '../../server/trial-calculation';
import { executeTrialRuntime } from '../../server/trial-computation';
import { approveTrialReading, canonical, composeTrialReading } from '../reading';
import { assertPillarsProjection, projectPillarsReading } from './pillars-facts';
import { PILLARS_ORIGIN_POLICY, verifyPillarsOrigin } from './pillars-origin';

const runId = '00000000-0000-4000-8000-000000000161';
const input: WorkflowInput = {
	version: 'atv-workflow/1.0.0',
	productId: 'three-pillars',
	context: 'Quero observar meu modo de iniciar uma conversa.',
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
let calculated: CalculationSnapshot;
const sample = async () => (calculated ??= await calculateTrial(input, runId));

describe('Três Pilares: origem privada do cálculo', () => {
	it('recalcula um mapa legítimo com o provedor instalado e conserva a aprovação', async () => {
		const calculation = await sample();
		expect(parseWorkflowInput(input)).not.toBeNull();
		expect(await verifyPillarsOrigin(input, calculation)).toEqual({
			ok: true,
			policy: PILLARS_ORIGIN_POLICY
		});
		expect(
			await approveTrialReading(input, calculation, composeTrialReading(input, calculation))
		).not.toBeNull();
	});

	it('recusa um mapa forjado mesmo quando todos os fatos derivados são recompostos', async () => {
		const natal = structuredClone((await sample()).data.natal as CalculationSnapshot);
		const moon = (natal.data.positions as Position[]).find((p) => p.body === 'moon')!;
		moon.longitude = (moon.longitude + 1) % 360;
		const moonFact = natal.facts.find((f) => f.id === 'position-moon')!;
		moonFact.display = `${bodyLabels.moon}: ${zodiacPosition(moon.longitude).display}; movimento ${moon.retrograde ? 'retrógrado' : 'direto'} da candidata`;
		const forged = projectPillarsReading(input, natal);
		assertPillarsProjection(input, forged);
		expect(await verifyPillarsOrigin(input, forged)).toMatchObject({
			ok: false,
			code: 'natal-mismatch',
			path: 'data.natal.data.positions[1].longitude'
		});
		const reading = composeTrialReading(input, forged);
		expect(await approveTrialReading(input, forged, reading)).toBeNull();
		const approved = await approveTrialReading(
			input,
			await sample(),
			composeTrialReading(input, await sample())
		);
		const payload = canonical({ policy: approved!.policy, input, calculation: forged, reading });
		const digest = [
			...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload)))
		]
			.map((byte) => byte.toString(16).padStart(2, '0'))
			.join('');
		expect(
			await executeTrialRuntime({
				operation: 'verify',
				saved: { input, calculation: forged, reading, approval: { ...approved!, digest } }
			})
		).toBe(false);
	});

	it('distingue proveniência adulterada, fato externo e timestamp incoerente', async () => {
		const changedSource = structuredClone(await sample());
		const natal = changedSource.data.natal as CalculationSnapshot;
		(natal.data.provenance as { provider: string }).provider = 'outro';
		const source = natal.facts.find((f) => f.id === 'position-sun')!.source;
		for (const fact of natal.facts) {
			if (fact.kind === 'calculated') fact.source = source.replace('caelus@', 'outro@');
		}
		const coherentSource = projectPillarsReading(input, natal);
		assertPillarsProjection(input, coherentSource);
		expect(await verifyPillarsOrigin(input, coherentSource)).toMatchObject({
			ok: false,
			code: 'natal-mismatch',
			path: 'data.natal.data.provenance.provider'
		});

		const changedFact = structuredClone(await sample());
		changedFact.facts[0].display = 'fato externo';
		expect(await verifyPillarsOrigin(input, changedFact)).toMatchObject({
			ok: false,
			code: 'projection-mismatch',
			path: 'calculation.facts[0].display'
		});

		const changedTime = structuredClone(await sample());
		(changedTime.data.provenance as { calculatedAt: string }).calculatedAt =
			'2026-10-15T00:00:00.000Z';
		expect(await verifyPillarsOrigin(input, changedTime)).toMatchObject({
			ok: false,
			code: 'projection-mismatch',
			path: 'data.provenance.calculatedAt'
		});
	});

	it('falha fechado quando o provedor não consegue recalcular', async () => {
		const unavailable: EphemerisProvider = {
			name: 'unavailable',
			version: '0',
			calculate: async () => {
				throw new Error('falha sintética');
			}
		};
		expect(await verifyPillarsOrigin(input, await sample(), unavailable)).toMatchObject({
			ok: false,
			code: 'recalculation-failed'
		});
	});
});
