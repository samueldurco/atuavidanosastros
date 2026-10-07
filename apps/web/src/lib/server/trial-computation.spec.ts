import { expect, it } from 'vitest';
import { executeTrialRuntime } from './trial-computation';
import { composeLegacyTrialReading } from '../trials/legacy-reading';
import { approveTrialReading } from '../trials/reading';
import type { WorkflowInput } from '@atv/domain';
const input: WorkflowInput = {
	version: 'atv-workflow/1.0.0',
	productId: 'dream-reading',
	consent: {
		storage: true,
		partner: false,
		continuity: false,
		policyVersion: 'atv-input-consent/1'
	},
	dream: {
		date: '2026-10-06',
		narrative: 'Sonhei com uma ponte e senti curiosidade.',
		emotions: ['curiosidade'],
		associations: ['travessia']
	}
};
const request = {
	operation: 'generate',
	input,
	runId: '00000000-0000-4000-8000-000000000001',
	sources: []
};
it('gera, verifica e reedita sem recalcular fatos nem alterar a leitura original', async () => {
	const edition = await executeTrialRuntime(request);
	expect(edition && typeof edition === 'object').toBe(true);
	if (!edition || typeof edition !== 'object') throw new Error('edition missing');
	const legacy = composeLegacyTrialReading(input, edition.calculation);
	const approval = (await approveTrialReading(input, edition.calculation, legacy))!;
	const saved = { input, calculation: edition.calculation, reading: legacy, approval };
	expect(await executeTrialRuntime({ operation: 'verify', saved })).toBe(true);
	const revised = await executeTrialRuntime({ operation: 'revise', saved });
	expect(revised).toEqual(edition);
	expect(saved.reading).toEqual(legacy);
	expect(
		await executeTrialRuntime({
			operation: 'verify',
			saved: { ...saved, reading: { ...legacy, opening: 'adulterado' } }
		})
	).toBe(false);
	expect(
		await executeTrialRuntime({
			operation: 'revise',
			saved: { ...saved, approval: { ...approval, digest: 'adulterado' } }
		})
	).toBeNull();
});
it('recusa fontes fornecidas fora do contrato e operações desconhecidas', async () => {
	await expect(executeTrialRuntime({ ...request, sources: [{ id: 'invalid' }] })).rejects.toThrow();
	await expect(executeTrialRuntime({ ...request, sources: Array(151).fill({}) })).rejects.toThrow();
	await expect(executeTrialRuntime({ operation: 'write-database' })).rejects.toThrow();
});
it('aceita registros próprios com identificação e revisão nos dois produtos de histórico', async () => {
	const source = {
		version: 'atv-dream-atlas-entry/1',
		id: '00000000-0000-4000-8000-000000000041',
		revision: 1,
		dreamDate: '2026-10-06',
		narrative: 'Vi uma ponte e reconheci uma pessoa amiga.',
		associations: ['travessia'],
		emotions: ['curiosidade'],
		includeInSynthesis: true
	};
	for (const productId of ['dream-atlas', 'dream-dossier']) {
		const edition = await executeTrialRuntime({
			...request,
			input: {
				version: input.version,
				productId,
				consent: { ...input.consent, continuity: productId === 'dream-dossier' },
				...(productId === 'dream-atlas'
					? { dreamAtlas: { startDate: '2026-10-01' } }
					: { dream: input.dream })
			},
			sources: [source]
		});
		expect(edition && typeof edition === 'object' && edition.approval.status).toBe('approved');
	}
	await expect(executeTrialRuntime({ ...request, sources: [null] })).rejects.toThrow();
});
