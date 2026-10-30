import { PDFDocument, rgb, type PDFFont } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { parseFreeToolResult } from '$lib/free-tool-result';
import { horoscopeRange, parseHoroscopeArchivePath } from '$lib/public-horoscope';
import type { FreeToolResult } from '$lib/free-tools';
import type { EditorialDocument } from './editorial';
import bodyData from './pdf-fonts/newsreader-regular.ttf?inline';
import labelData from './pdf-fonts/onest-regular.ttf?inline';
import fallbackData from './pdf-fonts/LiberationSans-Regular.ttf?inline';
import skyArt from './pdf-art/mandala-gravada.png?inline';
import purposeArt from './pdf-art/bussola-gravada.png?inline';
import loveArt from './pdf-art/flor-gravada.png?inline';
import tarotArt from './pdf-art/cartas-gravadas.png?inline';
import dreamArt from './pdf-art/sonhos-gravados.png?inline';

export class FreeToolPdfCharacterError extends Error {
	readonly code = 'pdf_unsupported_character';
	readonly codePoint: string;
	constructor(codePoint: number) {
		super('pdf_unsupported_character');
		this.name = 'FreeToolPdfCharacterError';
		this.codePoint = `U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`;
	}
}

const readingArt: Record<string, string> = {
	ascendente: skyArt,
	'mapa-astral': skyArt,
	'meio-do-ceu': purposeArt,
	'dinheiro-no-mapa': purposeArt,
	'combinacao-do-casal': loveArt,
	'carta-do-dia': tarotArt,
	'carta-do-amor': tarotArt,
	'tarot-sim-ou-nao': tarotArt,
	'registro-de-sonho': dreamArt
};

type PdfReading = Pick<
	FreeToolResult,
	'createdAt' | 'title' | 'summary' | 'facts' | 'limits' | 'chart'
> & {
	tool: string;
	sections: { title: string; paragraphs: string[] }[];
};

/** Exports only the verified, persisted free reading supplied by the ownership route. */
export async function renderFreeToolPdf(value: unknown): Promise<Uint8Array | null> {
	const result = parseFreeToolResult(value);
	if (!result || JSON.stringify(result).length > 80000) return null;
	return renderReadingPdf({
		...result,
		sections: result.sections.map((section) => ({
			title: section.title,
			paragraphs: [section.body]
		}))
	});
}

/** Called only after exact public path/revision admission; no personal result or quota is created. */
export async function renderPublicHoroscopePdf(
	document: EditorialDocument
): Promise<Uint8Array | null> {
	const archive = parseHoroscopeArchivePath(document.path);
	if (!archive || document.kind !== 'horoscope' || !document.calculation) return null;
	return renderReadingPdf({
		tool: 'horoscopo',
		createdAt: document.publishedAt,
		title: document.title,
		summary: horoscopeRange({
			startDate: archive.startDate,
			endDateExclusive: document.calculation.coverageEnd.slice(0, 10)
		}),
		facts: [],
		sections: document.sections.map((section) => ({
			title: section.heading,
			paragraphs: section.paragraphs
		})),
		limits: []
	});
}

async function renderReadingPdf(result: PdfReading): Promise<Uint8Array | null> {
	if (JSON.stringify(result).length > 80000) return null;
	const doc = await PDFDocument.create();
	doc.registerFontkit(fontkit);
	doc.setTitle(result.title);
	doc.setAuthor('A Tua Vida nos Astros');
	doc.setCreator('ATVNA · leitura gratuita · 1.0');
	doc.setLanguage('pt-BR');
	doc.setCreationDate(new Date(result.createdAt));
	const body = await doc.embedFont(bodyData, { subset: true });
	const label = await doc.embedFont(labelData, { subset: true });
	const fallback = await doc.embedFont(fallbackData, { subset: true });
	const ink = rgb(0.063, 0.2, 0.267),
		gold = rgb(0.62, 0.45, 0.23);
	const supported = new Map(
		[body, label, fallback].map((font) => [font, new Set(font.getCharacterSet())])
	);
	let page = doc.addPage([595.28, 841.89]),
		y = 747;
	function decorate() {
		page.drawText('A TUA VIDA NOS ASTROS', { x: 52, y: 796, font: label, size: 10, color: ink });
		page.drawLine({
			start: { x: 52, y: 780 },
			end: { x: 543, y: 780 },
			thickness: 0.7,
			color: gold
		});
		page.drawText(`Leitura gratuita · ${doc.getPageCount()}`, {
			x: 52,
			y: 34,
			font: label,
			size: 8,
			color: ink
		});
	}
	decorate();
	function ensureSpace(height: number) {
		if (y - height < 60) {
			if (doc.getPageCount() >= 20) throw new Error('pdf_size_limit');
			page = doc.addPage([595.28, 841.89]);
			y = 747;
			decorate();
		}
	}
	function runs(text: string, preferred: PDFFont) {
		const result: { text: string; font: PDFFont }[] = [];
		for (const character of text) {
			const code = character.codePointAt(0)!;
			const font = supported.get(preferred)!.has(code)
				? preferred
				: supported.get(fallback)!.has(code)
					? fallback
					: null;
			if (!font) throw new FreeToolPdfCharacterError(code);
			const previous = result.at(-1);
			if (previous?.font === font) previous.text += character;
			else result.push({ text: character, font });
		}
		return result;
	}
	function width(text: string, font: PDFFont, size: number) {
		return runs(text, font).reduce(
			(total, run) => total + run.font.widthOfTextAtSize(run.text, size),
			0
		);
	}
	function line(text: string, font: PDFFont, size: number) {
		ensureSpace(size * 1.45);
		let x = 52;
		for (const run of runs(text, font)) {
			page.drawText(run.text, { x, y, font: run.font, size, color: ink });
			x += run.font.widthOfTextAtSize(run.text, size);
		}
		y -= size * 1.45;
	}
	function wrappedLines(text: string, size: number, font: PDFFont, maxWidth = 491) {
		const lines: string[] = [];
		const safe = text.normalize('NFC');
		for (const block of safe.split(/\r?\n/)) {
			let current = '';
			for (const word of block.split(/\s+/).filter(Boolean)) {
				const next = current ? `${current} ${word}` : word;
				if (width(next, font, size) <= maxWidth) {
					current = next;
					continue;
				}
				if (current) lines.push(current);
				current = '';
				// Split a long token only at its actual rendered width. Every
				// character survives, including fallback glyphs such as Delta.
				for (const character of word) {
					if (current && width(current + character, font, size) > maxWidth) {
						lines.push(current);
						current = '';
					}
					current += character;
				}
			}
			if (current) lines.push(current);
		}
		return lines;
	}
	function paragraph(text: string, size = 12, font = body, maxWidth = 491) {
		const lines = wrappedLines(text, size, font, maxWidth);
		for (let i = 0; i < lines.length; i++) {
			// Keep the final two lines together instead of stranding a short
			// continuation at the top of the following page.
			ensureSpace(size * 1.45 * Math.min(2, lines.length - i));
			line(lines[i], font, size);
		}
		y -= 8;
	}
	function heading(text: string) {
		ensureSpace(17 * 1.45 * 2 + 12 * 1.45 + 16);
		paragraph(text, 17);
	}
	try {
		const art = await doc.embedPng(result.tool === 'horoscopo' ? skyArt : readingArt[result.tool]);
		// The approved engraving occupies its own opening area. Text never
		// flows beneath it, and subsequent pages keep the compact header.
		page.drawImage(art, { x: 439, y: 660, width: 104, height: 104 });
		paragraph(result.title, 25, body, 359);
		if (result.tool !== 'horoscopo')
			paragraph(
				new Date(result.createdAt).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
				9,
				label
			);
		y = Math.min(y, 636);
		paragraph(result.summary, 14);
		for (const fact of result.facts) paragraph(`${fact.label}: ${fact.value}`, 11);
		for (const section of result.sections) {
			y -= 8;
			heading(section.title);
			for (const text of section.paragraphs) paragraph(text);
		}
		if (result.chart?.positions.length) {
			heading('Posições do mapa');
			for (const position of result.chart.positions)
				paragraph(`${position.name}: ${position.longitude.toFixed(2)}° de longitude eclíptica`, 11);
		}
		if (result.limits.length) {
			const notesHeight =
				wrappedLines('Método e limites', 17, body).length * 17 * 1.45 +
				8 +
				result.limits.reduce(
					(total, limit) => total + wrappedLines(limit, 11, body).length * 11 * 1.45 + 8,
					0
				);
			if (notesHeight <= 687) ensureSpace(notesHeight);
			heading('Método e limites');
			for (const limit of result.limits) paragraph(limit, 11);
		}
		const bytes = await doc.save();
		return bytes.byteLength <= 2000000 ? bytes : null;
	} catch (failure) {
		if (failure instanceof FreeToolPdfCharacterError) throw failure;
		return null;
	}
}
