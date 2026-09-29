import { PDFDocument, rgb, type PDFFont } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { productCatalog } from '@atv/domain';
import { parseProductRun, runLabels } from '../product-run';
import { productFactLabel } from '../product-fact-label';
import { weekTemporalFacts } from '../week-temporal-facts';
import displayData from './pdf-fonts/bodoni-moda-regular.ttf?inline';
import bodyData from './pdf-fonts/newsreader-regular.ttf?inline';
import labelData from './pdf-fonts/onest-regular.ttf?inline';

export const PDF_EXPORT_VERSION = 'atv-pdf-export/1.2.0';
export const PDF_LIMITS = Object.freeze({
	characters: 120_000,
	pages: 40,
	bytes: 8_000_000,
	milliseconds: 5_000
});
class PdfUnavailable extends Error {}

/** Only the current authorized projection belongs here. No HTML, URL, raw input or provider access. */
export async function renderProductPdf(value: unknown) {
	const run = parseProductRun(value);
	const product = productCatalog.find((entry) => entry.id === run?.productId);
	if (!run?.released || !run.editorial || !run.calculation || !product?.delivery.includes('pdf'))
		return null;
	const { editorial, calculation } = run;
	if (JSON.stringify(run).length > PDF_LIMITS.characters) return null;
	const started = performance.now();
	const checkTime = () => {
		if (performance.now() - started > PDF_LIMITS.milliseconds) throw new PdfUnavailable();
	};
	try {
		const doc = await PDFDocument.create();
		doc.registerFontkit(fontkit);
		doc.setTitle(editorial.title);
		doc.setAuthor('A Tua Vida nos Astros');
		doc.setCreator(PDF_EXPORT_VERSION);
		doc.setProducer(PDF_EXPORT_VERSION);
		doc.setCreationDate(new Date(run.createdAt));
		doc.setModificationDate(new Date(run.updatedAt));
		doc.setLanguage('pt-BR');
		const display = await doc.embedFont(displayData, { subset: true });
		const body = await doc.embedFont(bodyData, { subset: true });
		const label = await doc.embedFont(labelData, { subset: true });
		const ink = rgb(0.08, 0.13, 0.22),
			muted = rgb(0.28, 0.32, 0.39),
			gold = rgb(0.56, 0.43, 0.25);
		const width = 595.28,
			height = 841.89,
			margin = 54,
			contentWidth = width - margin * 2;
		const fonts = new Map<PDFFont, Set<number>>();
		// Repeated recorded facts and reference labels share exact font/size/text measurements.
		// Keep the same metrics and wrapping while bounding work for complete relational reports.
		const widths = new Map<PDFFont, Map<number, Map<string, number>>>();
		for (const font of [display, body, label]) fonts.set(font, new Set(font.getCharacterSet()));
		const validate = (text: string, font: PDFFont) => {
			for (const character of text) {
				if ('\n\r\t'.includes(character)) continue;
				const point = character.codePointAt(0)!;
				if (
					point < 32 ||
					point === 127 ||
					(!fonts.get(font)!.has(point) && !(character === 'Δ' && fonts.get(display)!.has(point)))
				)
					throw new PdfUnavailable();
			}
		};
		let page = doc.addPage([width, height]);
		let y = height - 86;
		const decorate = () => {
			page.drawText('A Tua Vida nos Astros', {
				x: margin,
				y: height - 43,
				size: 9,
				font: label,
				color: ink
			});
			page.drawLine({
				start: { x: margin, y: height - 55 },
				end: { x: width - margin, y: height - 55 },
				thickness: 0.6,
				color: gold
			});
		};
		decorate();
		const ensure = (space: number) => {
			checkTime();
			if (y - space >= 66) return;
			if (doc.getPageCount() >= PDF_LIMITS.pages) throw new PdfUnavailable();
			page = doc.addPage([width, height]);
			y = height - 86;
			decorate();
		};
		const paragraph = (text: string, font = body, size = 12, leading = 17, gap = 10) => {
			validate(text, font);
			// The motor's mandatory ΔT warning uses the embedded brand display glyph.
			// Keep every original character; all previously supported text keeps its original font/layout.
			const runs = (value: string) =>
				!value.includes('Δ') || fonts.get(font)!.has(916)
					? [{ text: value, font }]
					: value
							.split(/(Δ)/)
							.filter(Boolean)
							.map((text) => ({ text, font: text === 'Δ' ? display : font }));
			const measure = (value: string) =>
				runs(value).reduce((sum, run) => {
					let sizes = widths.get(run.font);
					if (!sizes) widths.set(run.font, (sizes = new Map()));
					let texts = sizes.get(size);
					if (!texts) sizes.set(size, (texts = new Map()));
					let width = texts.get(run.text);
					if (width === undefined) {
						width = run.font.widthOfTextAtSize(run.text, size);
						texts.set(run.text, width);
					}
					return sum + width;
				}, 0);
			const line = (value: string) => {
				ensure(leading);
				if (measure(value) > contentWidth + 0.01) throw new PdfUnavailable();
				let x = margin;
				const pieces = runs(value);
				for (const [index, run] of pieces.entries()) {
					page.drawText(run.text, {
						x,
						y,
						size,
						font: run.font,
						color: font === label ? muted : ink
					});
					if (index < pieces.length - 1) x += run.font.widthOfTextAtSize(run.text, size);
				}
				y -= leading;
			};
			for (const part of text.replace(/\r\n?/g, '\n').split('\n')) {
				let pending = '';
				for (const word of part.trim().split(/[ \t]+/)) {
					const next = pending ? `${pending} ${word}` : word;
					if (measure(next) <= contentWidth) {
						pending = next;
						continue;
					}
					if (pending) {
						line(pending);
						pending = '';
					}
					if (measure(word) <= contentWidth) {
						pending = word;
						continue;
					}
					// Break long identifiers without dropping or inserting characters.
					for (const character of word) {
						if (measure(pending + character) > contentWidth) {
							line(pending);
							pending = '';
						}
						pending += character;
					}
				}
				line(pending);
			}
			y -= gap;
		};
		const heading = (text: string) => {
			y -= 16;
			ensure(85);
			paragraph(text, display, 24, 29, 14);
		};
		paragraph(product.name, label, 10, 15);
		paragraph(editorial.title, display, 28, 34, 16);
		paragraph(`Revisão ${run.revision} | ${run.updatedAt}`, label, 9, 14);
		paragraph(
			'Cópia pessoal da sua leitura. Excluir ou revogar o acesso na Biblioteca não apaga arquivos já baixados.',
			body,
			12,
			17,
			20
		);
		const temporalFacts = weekTemporalFacts(run);
		if (temporalFacts) {
			heading('Busca temporal experimental');
			paragraph(`Método: ${run.calculation.version}.`, label, 9, 14, 6);
			paragraph(temporalFacts.summary);
			paragraph(
				'Contagens nominais por corpo. A grade horária não certifica cobertura contínua, precisão do motor ou períodos favoráveis.'
			);
		}
		heading('Sua leitura');
		for (const section of editorial.sections) {
			ensure(80);
			paragraph(section.title, display, 19, 24, 10);
			paragraph(section.text);
			paragraph(
				`Base: ${section.evidence.map((id) => productFactLabel(run.productId, id)).join(' · ')}`,
				label,
				9,
				14,
				18
			);
		}
		heading('Base e limites');
		for (const fact of calculation.facts) {
			ensure(65);
			paragraph(productFactLabel(run.productId, fact.id), label, 10, 15, 4);
			paragraph(fact.display, body, 12, 17, 4);
			paragraph(fact.source, label, 9, 14, 14);
		}
		paragraph(`Método: ${calculation.version}. Edição: ${editorial.version}.`, label, 9, 14);
		for (const limit of [...calculation.limits, ...editorial.limits]) paragraph(limit);
		paragraph(
			'Esta leitura é simbólica e não determina suas escolhas. Não substitui orientação profissional.'
		);
		// Keep the compact version history and provenance together when possible.
		ensure(200 + run.history.length * 20);
		heading('Histórico desta versão');
		for (const entry of run.history)
			paragraph(
				`Revisão ${entry.revision} | ${runLabels[entry.state]} | ${entry.at}`,
				label,
				9,
				14,
				6
			);
		paragraph(
			`Registro: ${run.id}\nExportador: ${PDF_EXPORT_VERSION}\nRevisão editorial: ${editorial.reviewDigest}`,
			label,
			9,
			14,
			16
		);
		paragraph(
			'Para recuperar o estado atual ou solicitar nova versão, entre na sua Biblioteca. Esta cópia não se atualiza automaticamente.'
		);
		for (const [index, sheet] of doc.getPages().entries()) {
			sheet.drawLine({
				start: { x: margin, y: 51 },
				end: { x: width - margin, y: 51 },
				thickness: 0.4,
				color: gold
			});
			sheet.drawText(
				`Cópia pessoal | Revisão ${run.revision} | ${index + 1} / ${doc.getPageCount()}`,
				{ x: margin, y: 35, font: label, size: 8, color: muted }
			);
		}
		checkTime();
		const bytes = await doc.save();
		checkTime();
		if (bytes.length > PDF_LIMITS.bytes) return null;
		return { bytes, filename: `atv-${product.id}-${run.id}-r${run.revision}.pdf` };
	} catch (error) {
		if (error instanceof PdfUnavailable) return null;
		throw error;
	}
}
