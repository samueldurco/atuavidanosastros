import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import type { EditorialDocument } from './editorial';
import { renderPublicHoroscopePdf } from './free-tool-pdf';

const syntheticDocument: EditorialDocument = {
	id: 'synthetic-pdf-layout-only',
	revision: 1,
	state: 'PUBLISHED',
	path: '/horoscopo/aries/daily/2026-10-28',
	kind: 'horoscope',
	title: 'Horóscopo - amostra sintética de QA',
	description: 'Descrição não exibida pela ferramenta e não acrescentada ao PDF.',
	author: { id: 'synthetic', name: 'QA sintético', bio: 'Somente teste de diagramação.' },
	publishedAt: '2026-10-28T00:00:00.000Z',
	modifiedAt: '2026-10-28T00:00:00.000Z',
	sections: [
		{
			heading: 'Texto de teste da publicação',
			paragraphs: [
				'Esta amostra sintética verifica a diagramação de um texto público já consultado. Não é uma previsão, interpretação ou publicação aprovada para leitores.',
				'O documento conserva os parágrafos e a ordem das seções da fonte recebida pelo servidor. O download não cria leitura pessoal e não consome uma cota de cálculo.'
			]
		},
		...Array.from({ length: 6 }, (_, index) => ({
			heading: `Seção sintética ${index + 1}`,
			paragraphs: [
				`Parágrafo inicial ${index + 1}. Este texto repetível serve apenas para observar margens, espaçamento, tamanho de fonte e continuidade entre páginas. A arte aprovada ocupa uma área própria na abertura.`,
				`Parágrafo final ${index + 1}. Letras acentuadas, como Áries, conexão e publicação, devem permanecer legíveis. O mesmo texto é mantido na mesma sequência, sem uma interpretação adicional.`
			]
		}))
	],
	sources: [],
	calculation: {
		engine: 'synthetic-layout-only',
		version: '1',
		factsDigest: 'synthetic-layout-only',
		coverageStart: '2026-10-28T00:00:00.000Z',
		coverageEnd: '2026-10-29T00:00:00.000Z'
	}
};

describe('diagramação do Horóscopo público', () => {
	it('renderiza todos os parágrafos sem alterar a publicação nem criar resultado privado', async () => {
		const before = JSON.stringify(syntheticDocument);
		const bytes = await renderPublicHoroscopePdf(syntheticDocument);
		expect(bytes).not.toBeNull();
		const pdf = await PDFDocument.load(bytes!);
		expect(pdf.getTitle()).toBe(syntheticDocument.title);
		expect(pdf.getPageCount()).toBeGreaterThan(1);
		expect(pdf.getPageCount()).toBeLessThan(5);
		expect(JSON.stringify(syntheticDocument)).toBe(before);
		// Optional local QA artifact, never written during CI or into the application.
		if (process.env.ATV_HOROSCOPE_PDF_EVIDENCE_DIR) {
			await writeFile(
				join(process.env.ATV_HOROSCOPE_PDF_EVIDENCE_DIR, 'horoscope-synthetic-qa.pdf'),
				bytes!
			);
			await writeFile(
				join(process.env.ATV_HOROSCOPE_PDF_EVIDENCE_DIR, 'horoscope-synthetic-qa-source.json'),
				before
			);
		}
	});
	it('não exporta um guia como previsão pública', async () => {
		expect(await renderPublicHoroscopePdf({ ...syntheticDocument, kind: 'guide' })).toBeNull();
	});
});
