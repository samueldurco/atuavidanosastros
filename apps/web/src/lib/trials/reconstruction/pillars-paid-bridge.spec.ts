import { describe, expect, it } from 'vitest';
import type { WorkflowInput } from '@atv/domain';
import {
	createThreePillarsPaidDraft,
	reviewThreePillarsPaidDraft,
	threePillarsPaidBridgeContract
} from '../../server/three-pillars-paid-bridge';
import { threePillarsPaidCandidateContract } from '../../../../../worker/src/three-pillars-paid-candidate';

const input: WorkflowInput = {
	version: 'atv-workflow/1.0.0',
	productId: 'three-pillars',
	context: 'Quero observar como inicio uma conversa e apresento minhas necessidades.',
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
const context = {
	runId: '00000000-0000-4000-8000-000000000163',
	signal: new AbortController().signal
};
let draft: Awaited<ReturnType<typeof createThreePillarsPaidDraft>>;
const sample = async () => (draft ??= await createThreePillarsPaidDraft(input, context));

describe('Three Pillars paid bridge, staged only', () => {
	it('replays origin and composes all v5.1 chapters against the persisted paid facts', async () => {
		const result = await sample();
		expect(result).not.toBeNull();
		expect(result!.publication).toBe('blocked');
		expect(result!.status).toBe('unverified_candidate');
		expect(result!.calculation.version).toBe(threePillarsPaidBridgeContract.calculationVersion);
		expect(result!.content.version).toBe(threePillarsPaidCandidateContract.version);
		expect(result!.content.sections).toHaveLength(15);
		expect(result!.calculation.facts.length).toBeGreaterThan(
			(result!.calculation.data.natal as { facts: unknown[] }).facts.length
		);
		const evidence = new Set(result!.calculation.facts.map((fact) => fact.id));
		for (const section of result!.content.sections)
			for (const id of section.evidence) expect(evidence.has(id), id).toBe(true);
		expect(result!.content.sections[1].text.length).toBeGreaterThan(220);
		expect(result!.content.sections[11].text.length).toBeGreaterThan(220);
		expect(await reviewThreePillarsPaidDraft(input, result)).toEqual([]);
		expect(await reviewThreePillarsPaidDraft(input, JSON.parse(JSON.stringify(result)))).toEqual(
			[]
		);
	});

	it('fails closed when facts, interpretation, contract, or input are changed', async () => {
		const original = await sample();
		expect(original).not.toBeNull();
		const changes = {
			fact: (copy: NonNullable<typeof original>) => {
				copy.calculation.facts[0]!.display = 'inventado';
			},
			chapter: (copy: NonNullable<typeof original>) => {
				copy.content.sections[1]!.text = 'Texto diferente';
			},
			candidate: (copy: NonNullable<typeof original>) => {
				copy.publication = 'approved' as 'blocked';
			},
			contract: (copy: NonNullable<typeof original>) => {
				copy.calculation.data.paidContract = 'other';
			}
		};
		for (const [label, change] of Object.entries(changes)) {
			const copy = structuredClone(original!);
			change(copy);
			expect(await reviewThreePillarsPaidDraft(input, copy), label).not.toEqual([]);
		}
		const changedInput = structuredClone(input);
		changedInput.context = 'Outro contexto.';
		expect(await reviewThreePillarsPaidDraft(changedInput, original)).not.toEqual([]);
	});
});
