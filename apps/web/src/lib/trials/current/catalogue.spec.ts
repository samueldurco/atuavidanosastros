import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { offeredProductIds, type WorkflowInput, type DreamAtlasFactSource } from '@atv/domain';
import { calculateTrial } from '../../server/trial-calculation';
import { approveTrialReading, composeTrialReading, type SavedTrial } from '../reading';
import { trialPdf } from '../pdf';

const directory = process.env.ATV_CURRENT_QA_DIR;
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const birth = (date = '2000-01-01T12:00:00') => ({
	localDateTime: date,
	utcInstant: `${date}Z`,
	timezone: 'UTC',
	latitude: 0,
	longitude: 0,
	locationSource: 'synthetic'
});
const sources: DreamAtlasFactSource[] = [2, 12, 29].map((day, i) => ({
	version: 'atv-dream-atlas-entry/1',
	id: uuid(900 + i),
	revision: 1,
	dreamDate: `2026-09-${String(day).padStart(2, '0')}`,
	narrative: [
		'Procurei a entrada da casa. Depois encontrei uma chave.',
		'Entrei na casa. Depois saí pela porta.',
		'Entrei na casa. Depois esperei na janela.'
	][i]!,
	emotions: [i === 1 ? 'medo' : 'curiosidade'],
	associations: ['mudança de casa'],
	includeInSynthesis: true
}));

function fixture(productId: string): WorkflowInput {
	return {
		version: 'atv-workflow/1.0.0',
		productId,
		...(!productId.startsWith('tarot-') && !productId.startsWith('dream-')
			? { birth: birth() }
			: {}),
		...(['synastry', 'couple-dossier'].includes(productId)
			? { partner: birth('2001-07-12T07:00:00') }
			: {}),
		...(productId === 'couple-dossier'
			? {
					context: 'Queremos conversar sobre distância e responsabilidades.',
					questions: [
						'Como conversar sem transformar diferenças em discussão?',
						'Como conciliar nossos projetos futuros?'
					]
				}
			: {}),
		...(productId === 'life-atlas'
			? {
					atlas: {
						priorities: [
							'Trabalho e contribuição',
							'Autocuidado e rotina',
							'Vínculos e acordos',
							'Aprendizado e expressão'
						]
					}
				}
			: {}),
		...(['week-reading', 'date-reading', 'personal-calendar', 'career-forecast-30d'].includes(
			productId
		)
			? { targetDate: '2026-10-15' }
			: {}),
		...(['personal-calendar', 'career-forecast-30d'].includes(productId)
			? { forecastPeriod: 'rolling-30-days' as const }
			: {}),
		...(productId === 'solar-return'
			? {
					targetDate: '2026-01-01',
					returnYear: 2026,
					returnLocation: {
						city: 'São Paulo',
						timezone: 'America/Sao_Paulo',
						latitude: -23.55,
						longitude: -46.63,
						locationSource: 'synthetic-return'
					}
				}
			: {}),
		...(productId.startsWith('tarot-') ? { focus: 'Como participar melhor da relação?' } : {}),
		...(['dream-reading', 'dream-dossier'].includes(productId)
			? {
					dream: {
						date: '2026-09-30',
						narrative:
							'Eu não conseguia abrir a porta. Depois entrei pela passagem e me sentei perto da janela.',
						emotions: ['curiosidade', 'medo'],
						associations: ['mudança de casa']
					}
				}
			: {}),
		...(productId === 'dream-atlas' ? { dreamAtlas: { startDate: '2026-09-01' } } : {}),
		consent: {
			storage: true,
			partner: ['synastry', 'couple-dossier'].includes(productId),
			continuity: productId === 'dream-dossier',
			policyVersion: 'atv-input-consent/1'
		}
	} as WorkflowInput;
}

describe('catalogue current interpretation integration', () => {
	it.each(offeredProductIds)(
		'%s delivers the current edition and rejects altered conclusions',
		async (productId) => {
			const id = uuid(offeredProductIds.indexOf(productId) + 701),
				input = fixture(productId);
			const calculation = await calculateTrial(
				input,
				id,
				productId.startsWith('dream-') ? sources : []
			);
			const reading = composeTrialReading(input, calculation);
			expect(reading.version).toBe('atv-current-reading/1.0.0');
			expect(reading.nameRevision).toBe('atv-offer-name/2026-10-15');
			const approval = await approveTrialReading(input, calculation, reading);
			expect(approval, productId).not.toBeNull();
			const tampered = structuredClone(reading);
			tampered.sections[0]!.text += '\nUma conclusão acrescentada sem base.';
			expect(await approveTrialReading(input, calculation, tampered)).toBeNull();
			const unsupported = structuredClone(reading);
			unsupported.interpretation!.conclusions[0]!.factIds = ['invented'];
			expect(await approveTrialReading(input, calculation, unsupported)).toBeNull();
			if (directory) {
				const saved: SavedTrial = {
					id,
					product_id: productId,
					created_at: '2026-10-19T12:00:00Z',
					input,
					calculation,
					reading,
					approval: approval!
				};
				const pdf = await trialPdf(saved);
				const pages = (await PDFDocument.load(pdf)).getPageCount();
				expect(pages).toBeGreaterThan(1);
				await mkdir(directory, { recursive: true });
				await writeFile(join(directory, `${productId}.json`), JSON.stringify(saved, null, 2));
				await writeFile(join(directory, `${productId}.pdf`), pdf);
				await writeFile(
					join(directory, `${productId}.txt`),
					[
						reading.title,
						reading.opening,
						...reading.sections.flatMap((s) => [s.title, s.text]),
						...reading.questions,
						reading.practice
					].join('\n\n')
				);
			}
		},
		60000
	);
});
