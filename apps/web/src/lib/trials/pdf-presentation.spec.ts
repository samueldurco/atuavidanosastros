import { describe, expect, it } from 'vitest';
import { mkdir, writeFile } from 'node:fs/promises';
import { PDFDocument } from 'pdf-lib';
import type { WorkflowInput } from '@atv/domain';
import { calculateTrial } from '../server/trial-calculation';
import { approveTrialReading, composeTrialReading } from './reading';
import { pdfDisplayText, pdfPresentationSource, trialPdf } from './pdf';

describe('client PDF presentation', () => {
	it('describes civil direction without internal versions or astrology', () => {
		const source = pdfPresentationSource(
			'direction-journey',
			'Método atv-direction/1.0.0; fatos civis atv-native/2.0.0; sem cálculo astrológico.'
		);
		expect(source).toContain('datas civis');
		expect(source).toContain('Não utiliza cálculo astrológico');
		expect(source).not.toMatch(/atv-|\/\d+\.\d+\.\d+/);
	});

	it.each([
		['personal-calendar', 'observações a cada seis horas'],
		['solar-return', 'aspectos maiores anuais até 4°'],
		['week-reading', 'aspectos maiores até 2°']
	])('keeps the %s method readable', (product, detail) => {
		const source = pdfPresentationSource(product, 'atv-internal/1.0.0');
		expect(source).toContain(detail);
		expect(source).not.toContain('atv-internal');
	});

	it('expands unsupported delta in display while leaving the saved wording available', () => {
		const technical = 'Mudança de ΔT entre as datas';
		expect(pdfDisplayText(technical)).toBe('Mudança de delta T entre as datas');
		expect(pdfDisplayText(technical)).not.toContain('[U+394]T');
		expect(technical).toContain('ΔT');
	});

	it('renders the approved MVP career cover with a real synthetic reading', async () => {
		const id = '00000000-0000-4000-8000-000000000084';
		const input: WorkflowInput = {
			version: 'atv-workflow/1.0.0',
			productId: 'career-compass',
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
		const calculation = await calculateTrial(input, id);
		const reading = composeTrialReading(input, calculation);
		const approval = await approveTrialReading(input, calculation, reading);
		expect(approval).not.toBeNull();
		const bytes = await trialPdf({
			id,
			product_id: input.productId,
			created_at: '2026-10-14T12:00:00Z',
			input,
			calculation,
			reading,
			approval: approval!
		});
		const pdf = await PDFDocument.load(bytes);
		expect(pdf.getPageCount()).toBeGreaterThanOrEqual(3);
		expect(pdf.getTitle()).toBe(reading.title);
		if (process.env.ATVNA_PDF_VISUAL_QA === '1') {
			await mkdir('tmp/pdfs', { recursive: true });
			await writeFile('tmp/pdfs/career-compass-mvp-qa.pdf', bytes);
		}
	}, 30000);
});
