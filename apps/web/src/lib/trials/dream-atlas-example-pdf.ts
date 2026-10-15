import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { SavedTrial } from './reading';
import { trialPdf } from './pdf';

/** Presentation stamp only: the approved reading and its digest stay untouched. */
export async function dreamAtlasExamplePdf(saved: SavedTrial) {
	const pdf = await PDFDocument.load(await trialPdf(saved));
	const font = await pdf.embedFont(StandardFonts.Helvetica);
	pdf.setTitle('Demonstração fictícia — Diário de Sonhos — 30 Dias');
	pdf.setSubject(
		'Exemplo privado para avaliação. Relatos inteiramente fictícios; não é um diário pessoal.'
	);
	for (const page of pdf.getPages()) {
		page.drawText('DEMONSTRAÇÃO FICTÍCIA · SEM DADOS PESSOAIS', {
			x: 54,
			y: page.getHeight() - 28,
			size: 9,
			font,
			color: rgb(0.16, 0.26, 0.3)
		});
	}
	return pdf.save();
}
