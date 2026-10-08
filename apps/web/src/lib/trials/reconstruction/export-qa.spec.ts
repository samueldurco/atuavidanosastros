import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { expect, it } from 'vitest';
import { calculateTrial } from '../../server/trial-calculation';
import { approveTrialReading, composeTrialReading, type SavedTrial } from '../reading';
import { trialPdf } from '../pdf';
import { buildChartScene, chartSceneSvg } from '../chart-engine-v2';
import type { WorkflowInput } from '@atv/domain';

const directory = process.env.ATV_RECONSTRUCTION_QA_DIR;
for (const productId of [
	'career-compass',
	'purpose-career',
	'three-pillars',
	'birth-chart',
	'ascendant',
	'midheaven'
] as const) {
	it.skipIf(!directory)(
		`exports complete ${productId} for visual inspection`,
		async () => {
			const input: WorkflowInput = {
				version: 'atv-workflow/1.0.0',
				productId,
				birth: {
					localDateTime: '2000-01-01T12:00:00',
					utcInstant: '2000-01-01T12:00:00Z',
					timezone: 'UTC',
					latitude: 0,
					longitude: 0,
					locationSource: 'synthetic'
				},
				context: 'Quero comparar uma mudança de área com a função atual.',
				consent: {
					storage: true,
					partner: false,
					continuity: false,
					policyVersion: 'atv-input-consent/1'
				}
			};
			const id = '00000000-0000-4000-8000-000000000084';
			const calculation = await calculateTrial(input, id);
			const reading = composeTrialReading(input, calculation);
			const approval = await approveTrialReading(input, calculation, reading);
			expect(approval).not.toBeNull();
			const saved: SavedTrial = {
				id,
				product_id: productId,
				created_at: '2026-10-08T12:00:00Z',
				input,
				calculation,
				reading,
				approval: approval!
			};
			const pdf = await trialPdf(saved);
			expect((await PDFDocument.load(pdf)).getPageCount()).toBeGreaterThan(3);
			await mkdir(directory!, { recursive: true });
			await writeFile(join(directory!, `${productId}.pdf`), pdf);
			await writeFile(join(directory!, `${productId}.svg`), chartSceneSvg(buildChartScene(saved)));
			await writeFile(join(directory!, `${productId}.json`), JSON.stringify(saved, null, 2));
		},
		30000
	);
}
