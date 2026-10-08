import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { expect, it } from 'vitest';
import { calculateTarotMethod, tarotMethods, type WorkflowInput } from '@atv/domain';
import { approveTrialReading, composeTrialReading, type SavedTrial } from '../reading';
import { trialPdf } from '../pdf';
import { buildTarotScene, tarotSceneSvg } from '../tarot-diagram';

const directory = process.env.ATV_TAROT_QA_DIR;
for (const method of tarotMethods) {
	it.skipIf(!directory)(
		`exports ${method.name} with the saved draw`,
		async () => {
			const input: WorkflowInput = {
				version: 'atv-workflow/1.0.0',
				productId: method.id,
				consent: {
					storage: true,
					partner: false,
					continuity: false,
					policyVersion: 'atv-input-consent/1'
				}
			};
			const id = '00000000-0000-4000-8000-000000000084';
			const calculation = await calculateTarotMethod(input, id, AbortSignal.timeout(10000));
			const reading = composeTrialReading(input, calculation);
			const approval = await approveTrialReading(input, calculation, reading);
			if (!approval) throw Error('tarot_approval_missing');
			expect(approval.status).toBe('approved');
			const saved: SavedTrial = {
				id,
				product_id: method.id,
				created_at: '2026-10-08T12:00:00Z',
				input,
				calculation,
				reading,
				approval
			};
			const scene = buildTarotScene(saved),
				pdf = await trialPdf(saved);
			expect((await PDFDocument.load(pdf)).getPageCount()).toBeGreaterThanOrEqual(4);
			await mkdir(directory!, { recursive: true });
			await writeFile(join(directory!, `${method.id}.pdf`), pdf);
			await writeFile(join(directory!, `${method.id}.svg`), tarotSceneSvg(scene));
			await writeFile(join(directory!, `${method.id}.json`), JSON.stringify(saved, null, 2));
		},
		30000
	);
}
