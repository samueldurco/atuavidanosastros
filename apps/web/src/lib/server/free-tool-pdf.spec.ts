import { describe, expect, it } from 'vitest';
import { PDFDict, PDFDocument, PDFName } from 'pdf-lib';
import { calculateFreeToolResult } from './free-tools-calculation';
import { FreeToolPdfCharacterError, renderFreeToolPdf } from './free-tool-pdf';

const natal = {
	utcInstant: '2000-01-01T12:00:00.000Z',
	localDateTime: '2000-01-01T09:00:00',
	timezone: 'UTC-03:00',
	latitude: -23.5505,
	longitude: -46.6333,
	locationSource: 'synthetic-pdf-test'
};
const dream = {
	date: '2026-10-28',
	narrative: 'Sonhei com uma casa azul e uma janela aberta para um jardim.',
	emotions: ['curiosidade'],
	associations: ['casa da infância']
};
const readings = [
	['ascendente', natal],
	['mapa-astral', natal],
	['meio-do-ceu', natal],
	['dinheiro-no-mapa', natal],
	[
		'combinacao-do-casal',
		{
			first: natal,
			second: {
				...natal,
				utcInstant: '2001-02-03T15:30:00.000Z',
				localDateTime: '2001-02-03T12:30:00'
			},
			consent: true
		}
	],
	['carta-do-dia', {}],
	['carta-do-amor', {}],
	['registro-de-sonho', dream]
] as const;

describe('PDF da leitura gratuita', () => {
	it.each(readings)(
		'exporta a leitura calculada de %s com fonte, metadados e notas completas',
		async (tool, input) => {
			const result = await calculateFreeToolResult(tool, input);
			if (tool === 'mapa-astral') expect(result.limits.join(' ')).toContain('ΔT');
			const bytes = await renderFreeToolPdf(result);
			expect(bytes).not.toBeNull();
			expect(new TextDecoder().decode(bytes!.slice(0, 8))).toBe('%PDF-1.7');
			const document = await PDFDocument.load(bytes!);
			expect(document.getTitle()).toBe(result.title);
			expect(document.getPageCount()).toBeGreaterThan(0);
			expect(document.getPageCount()).toBeLessThan(8);
			const images = document.getPage(0).node.Resources()?.lookup(PDFName.of('XObject'), PDFDict);
			expect(images?.keys().length).toBeGreaterThan(0);
		}
	);
	it('exporta um relato com palavra larga maior que a linha sem rejeitar ou truncar o resultado', async () => {
		const narrative = `Sonhei com uma palavra enorme: ${'W'.repeat(900)}. O jardim continuava depois dela.`;
		const result = await calculateFreeToolResult('registro-de-sonho', { ...dream, narrative });
		const bytes = await renderFreeToolPdf(result);
		expect(bytes).not.toBeNull();
		expect(result.sections.find((section) => section.id === 'narrative')?.body).toBe(narrative);
		const document = await PDFDocument.load(bytes!);
		expect(document.getPageCount()).toBeGreaterThan(1);
	});
	it('rejeita resultado inválido e identifica caracteres não representáveis, sem alterar o relato', async () => {
		expect(await renderFreeToolPdf({ tool: 'registro-de-sonho' })).toBeNull();
		const result = await calculateFreeToolResult('registro-de-sonho', {
			date: '2026-10-28',
			narrative: 'Sonhei com um jardim muito bonito e uma lua 🌙.',
			emotions: [],
			associations: []
		});
		const saved = JSON.stringify(result);
		const failure = await renderFreeToolPdf(result).catch((failure) => failure);
		expect(failure).toBeInstanceOf(FreeToolPdfCharacterError);
		expect(failure).toMatchObject({ code: 'pdf_unsupported_character', codePoint: 'U+1F319' });
		expect(JSON.stringify(result)).toBe(saved);
	});
});
