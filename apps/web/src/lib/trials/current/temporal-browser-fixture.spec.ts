import { expect, it } from 'vitest';
import type { WorkflowInput } from '@atv/domain';
import { calculateTrial } from '../../server/trial-calculation';
import { approveTrialReading, composeTrialReading } from '../reading';
import { reviewCurrentReading } from './index';

it('approves the weekly browser fixture even when one theme persists across its phases', async () => {
	const input: WorkflowInput = {
		version: 'atv-workflow/1.0.0',
		productId: 'week-reading',
		targetDate: '2026-10-06',
		context:
			'Fuso atual declarado: America/Sao_Paulo (não usado para calcular dias locais).\nTema escolhido: Organização e prioridades.\n\nContexto declarado: Quero rever o excesso de tarefas sem abandonar meu projeto.',
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
	const calculation = await calculateTrial(input, '00000000-0000-4000-8000-000000000031');
	const reading = composeTrialReading(input, calculation);
	expect(reviewCurrentReading(calculation, reading)).toEqual([]);
	const repeated = reading.sections
		.filter((s, i, all) => all.findIndex((p) => p.text === s.text) !== i)
		.map((s) => s.title);
	expect(repeated, 'a persistent theme should produce coherent phase continuity').toEqual([]);
	expect(await approveTrialReading(input, calculation, reading)).not.toBeNull();
}, 20_000);
