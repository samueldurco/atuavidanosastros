import { PDFDocument, rgb, type PDFFont } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import type { SavedTrial } from './reading';
import { trialText } from './exports';
import { experienceFor } from './experience';
import { buildChartScene } from './chart-engine-v2';
import { drawChartScenePdf } from './chart-pdf';
import { tarotMethodFor } from '@atv/domain';
import { buildTarotScene } from './tarot-diagram';
import { tarotArtwork } from './tarot-artwork';
import { PAIR_VERSION } from './reconstruction/pair-facts';
import { SYNASTRY_VERSION } from './reconstruction/synastry-facts';
import { DOSSIER_VERSION } from './reconstruction/dossier-facts';
import { WEEK_VERSION } from './reconstruction/week-facts';
import { SOLAR_VERSION } from './reconstruction/solar-facts';
import {
	CALENDAR_VERSION,
	PERIOD_VERSION,
	type CalendarData
} from './reconstruction/calendar-facts';
import bodyData from './pdf-fonts/newsreader-regular.ttf?inline';
import labelData from './pdf-fonts/onest-regular.ttf?inline';
import displayData from './pdf-fonts/bodoni-moda-regular.ttf?inline';
import { pdfBrandMark, pdfCoverFor } from '../data/visual-v4-pdf';
import { visualExportPalette } from '../data/visual-v4-export';
import { mvpProductDesign } from '../data/mvp-visual';
import careerCover from '../../../static/brand/mvp/assets/revisao/bussola-gravada-pdf.png?inline';

const careerDesign = mvpProductDesign('career-compass');
const designColor = (hex: string) =>
	rgb(
		Number.parseInt(hex.slice(1, 3), 16) / 255,
		Number.parseInt(hex.slice(3, 5), 16) / 255,
		Number.parseInt(hex.slice(5, 7), 16) / 255
	);

/** Keep method details readable in the client PDF; audit versions remain in the saved record. */
export function pdfPresentationSource(productId: string, source: string) {
	switch (productId) {
		case 'direction-journey':
			return 'Acompanhamento de 30 dias baseado em datas civis, no objetivo informado e na revisão dos experimentos. Não utiliza cálculo astrológico.';
		case 'personal-calendar':
		case 'career-forecast-30d':
			return 'Síntese original com observações a cada seis horas e contexto consentido.';
		case 'solar-return':
			return 'Carta anual própria, com regências modernas, cinco aspectos maiores anuais até 4° e observações diárias mensais até 2°.';
		case 'week-reading':
			return 'Busca temporal preservada e seleção de cinco aspectos maiores até 2°.';
		default:
			return source;
	}
}

/** The embedded PDF fonts do not include Greek Delta. Expand the symbol in display only. */
export function pdfDisplayText(value: string) {
	return value.normalize('NFC').replace(/ΔT/g, 'delta T');
}

/** Present the facts that support the reading; the unabridged record stays in TXT. */
export function pdfReferenceFacts(saved: SavedTrial) {
	const version = saved.calculation.version;
	const calendar = [CALENDAR_VERSION, PERIOD_VERSION].includes(version);
	const relationship = [SYNASTRY_VERSION, DOSSIER_VERSION].includes(version);
	const selected = new Set(
		saved.reading.sections
			.filter((section) => section.title !== 'Referências desta leitura')
			.flatMap((section) => section.factIds)
	);
	return saved.calculation.facts
		.filter(
			(fact) =>
				(!calendar || !/^calendar-(window|position|day)-/.test(fact.id)) &&
				(!(relationship || version === SOLAR_VERSION) || selected.has(fact.id)) &&
				!/^day-\d+-|series$/.test(fact.id) &&
				!/(?:nenhum|sem) aspecto/i.test(fact.display) &&
				fact.display.length <= 650
		)
		.map((fact) => ({
			...fact,
			// The same precision qualification already appears once in the method appendix.
			display: relationship
				? fact.display.replace(/ Precisão não certificada; estabilidade desconhecida\./g, '')
				: fact.display
		}));
}

/** Local book export. This module is dynamically imported only by the download page. */
export async function trialPdf(
	saved: SavedTrial,
	loadTarotArtwork: (cardId: string) => Promise<Uint8Array> = async (cardId) => {
		const response = await fetch(tarotArtwork(cardId), {
			signal: AbortSignal.timeout(15000)
		});
		if (!response.ok) throw Error('tarot_pdf_artwork_unavailable');
		return new Uint8Array(await response.arrayBuffer());
	}
) {
	const deadline = Date.now() + 20000;
	if (trialText(saved).length > 650000) throw Error('pdf_too_large');
	const doc = await PDFDocument.create();
	doc.registerFontkit(fontkit);
	const r = saved.reading;
	const career = saved.product_id === 'career-compass';
	const body = await doc.embedFont(bodyData, { subset: !career }),
		// Full Onest embedding maps common ligatures to incorrect CIDs (e.g. the
		// "t" in "Método"), widening small labels and corrupting text extraction.
		label = await doc.embedFont(labelData, { subset: true }),
		display = await doc.embedFont(displayData, { subset: !career });
	const engraving = await doc.embedPng(career ? careerCover : pdfCoverFor(saved.product_id));
	const brand = await doc.embedPng(pdfBrandMark());
	const format = experienceFor(saved.product_id).format;
	const rollingPeriod = saved.calculation.version === PERIOD_VERSION;
	const calendar = rollingPeriod || saved.calculation.version === CALENDAR_VERSION;
	const book = format === 'book' || calendar;
	const chapters = r.sections.filter((s) => s.title !== 'Referências desta leitura');
	doc.setTitle(r.title);
	doc.setAuthor('A Tua Vida nos Astros');
	doc.setLanguage('pt-BR');
	doc.setCreationDate(new Date(saved.created_at));
	doc.setCreator('atv-reading-pdf/4');
	const width = 595.28,
		height = 841.89,
		margin = 54,
		available = width - 2 * margin;
	const palette = visualExportPalette(saved.product_id);
	const color = (hex: string) =>
		rgb(
			...([1, 3, 5].map((n) => parseInt(hex.slice(n, n + 2), 16) / 255) as [number, number, number])
		);
	const ink = career ? designColor(careerDesign.ink) : color(palette.ink),
		muted = career ? rgb(89 / 255, 99 / 255, 101 / 255) : rgb(0.298, 0.337, 0.345),
		gold = career ? designColor(careerDesign.accent) : color(palette.line),
		cream = career ? rgb(246 / 255, 239 / 255, 223 / 255) : rgb(1, 1, 1);
	let page = doc.addPage([width, height]),
		y = height - 78;
	const charsets = new Map([body, label, display].map((f) => [f, new Set(f.getCharacterSet())]));
	const widths = new Map([body, label, display].map((f) => [f, new Map<string, number>()]));
	const safe = (value: string, font: PDFFont) =>
		Array.from(pdfDisplayText(value))
			.map((c) =>
				charsets.get(font)!.has(c.codePointAt(0)!)
					? c
					: `[U+${c.codePointAt(0)!.toString(16).toUpperCase()}]`
			)
			.join('');
	const background = () => page.drawRectangle({ x: 0, y: 0, width, height, color: cream });
	background();
	const newPage = () => {
		if (doc.getPageCount() >= 100) throw Error('pdf_page_limit');
		page = doc.addPage([width, height]);
		background();
		y = height - 78;
	};
	const line = (value: string, font: PDFFont, size: number) => {
		if (Date.now() > deadline) throw Error('pdf_deadline');
		if (y < 70) newPage();
		page.drawText(value, { x: margin, y, font, size, color: ink });
		y -= size * 1.5;
	};
	const wrap = (value: string, font: PDFFont, size: number, maxWidth = available) => {
		const lines: string[] = [];
		const measure = (value: string) => {
			const key = `${size}:${value}`,
				cache = widths.get(font)!;
			let w = cache.get(key);
			if (w === undefined) {
				w = font.widthOfTextAtSize(value, size);
				cache.set(key, w);
			}
			return w;
		};
		const space = measure(' ');
		for (const raw of value.replace(/\r\n?/g, '\n').split('\n')) {
			let current = '',
				w = 0;
			for (const word of safe(raw, font).split(/\s+/)) {
				const ww = measure(word);
				if (ww > maxWidth) {
					if (current) {
						lines.push(current);
						current = '';
						w = 0;
					}
					for (const c of word) {
						const cw = measure(c);
						if (w + cw > maxWidth) {
							lines.push(current);
							current = '';
							w = 0;
						}
						current += c;
						w += cw;
					}
				} else if (current && w + space + ww > maxWidth) {
					lines.push(current);
					current = word;
					w = ww;
				} else {
					w += (current ? space : 0) + ww;
					current += (current ? ' ' : '') + word;
				}
			}
			lines.push(current);
		}
		return lines;
	};
	const paragraphHeight = (value: string, font = body, size = 12, after = 9) =>
		wrap(value, font, size).reduce((n, l) => n + (l ? size * 1.5 : size * 0.8), after);
	const headingHeight = (value: string, size = 17) =>
		8 + paragraphHeight(value, career ? body : label, size);
	const paragraph = (value: string, font = body, size = 12, after = 9) => {
		const lines = wrap(value, font, size);
		const needed = paragraphHeight(value, font, size, after);
		// Keep short paragraphs together and avoid a single line across a page turn.
		if (lines.length <= 7 && needed > y - 70) newPage();
		for (let i = 0; i < lines.length; i++) {
			if (lines[i] && y - 70 < size * 1.5 && i < lines.length - 1) newPage();
			if (lines[i]) line(lines[i], font, size);
			else y -= size * 0.8;
		}
		y -= after;
	};
	const heading = (value: string, size = 17, reserve = 120) => {
		if (y < 70 + reserve) newPage();
		y -= 8;
		paragraph(value, career ? body : label, size);
	};
	// Cover: no app navigation, evaluation form or browser-print chrome.
	const coverSize = engraving.scaleToFit(career ? 192 : 270, career ? 192 : 198);
	page.drawImage(brand, { x: margin, y: height - 49, width: 22, height: 22 });
	page.drawRectangle({ x: margin, y: height - 56, width: available, height: 0.6, color: gold });
	page.drawText('A TUA VIDA NOS ASTROS', {
		x: margin + 30,
		y: height - 43,
		font: label,
		size: 10,
		color: muted
	});
	if (career) {
		page.drawRectangle({
			x: width - margin - 220,
			y: height - 322,
			width: 220,
			height: 244,
			color: designColor(careerDesign.tint)
		});
		page.drawRectangle({
			x: width - margin - 207,
			y: height - 310,
			width: 194,
			height: 220,
			color: rgb(250 / 255, 243 / 255, 229 / 255),
			borderColor: rgb(184 / 255, 167 / 255, 141 / 255),
			borderWidth: 0.7
		});
		page.drawImage(engraving, {
			x: width - margin - 206,
			y: height - 282,
			...coverSize
		});
		page.drawText('ORIENTAÇÃO', {
			x: width - margin - 193,
			y: height - 302,
			font: label,
			size: 8,
			color: ink
		});
		page.drawText(`${careerDesign.number} / ATVNA`, {
			x: width - margin - 85,
			y: height - 302,
			font: label,
			size: 7,
			color: ink
		});
		page.drawRectangle({ x: margin, y: height - 115, width: 44, height: 2, color: gold });
		page.drawText(careerDesign.caption.toLocaleUpperCase('pt-BR'), {
			x: margin,
			y: height - 138,
			font: label,
			size: 9,
			color: ink
		});
	} else {
		page.drawImage(engraving, {
			x: (width - coverSize.width) / 2,
			y: height - 90 - coverSize.height,
			...coverSize
		});
	}
	y = career ? height - 370 : height - 90 - coverSize.height - 40;
	paragraph(r.title, career ? body : display, book ? 34 : 25);
	y -= 18;
	paragraph(r.opening, body, book ? 17 : 12);
	if (saved.input.presentation?.name) paragraph(saved.input.presentation.name, body, 20);
	if (saved.input.presentation?.partnerName)
		paragraph(`Com ${saved.input.presentation.partnerName}`, body, 17);
	if (saved.input.birth) {
		const b = saved.input.birth;
		paragraph(
			`${b.localDateTime.replace('T', ' · ')} · ${saved.input.presentation?.city ?? 'Local informado'} · ${b.timezone}`,
			label,
			10
		);
	}
	if (book) y = Math.min(y - 30, 310);
	paragraph(
		`Salva em ${new Date(saved.created_at).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`,
		label,
		10
	);
	if (book) newPage();
	if (calendar) {
		const data = saved.calculation.data as unknown as CalendarData;
		heading(rollingPeriod ? 'Seus próximos 30 dias' : 'Seu mês, data por data', 23);
		paragraph(
			'Dias e horários usam UTC. Os números indicam mudanças selecionadas. O ponto assinala um marco informado por você. Abra o capítulo da data para acompanhar a leitura.'
		);
		const top = y - 20,
			cell = available / 7,
			offset = (new Date(data.days[0].startInstant).getUTCDay() + 6) % 7;
		['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].forEach((name, i) =>
			page.drawText(name, {
				x: margin + i * cell + 12,
				y: top,
				size: 10,
				font: label,
				color: muted
			})
		);
		data.days.forEach((day, index) => {
			const slot = offset + index,
				x = margin + (slot % 7) * cell,
				topY = top - 20 - Math.floor(slot / 7) * 72;
			page.drawRectangle({
				x,
				y: topY - 65,
				width: cell - 4,
				height: 65,
				color: rgb(0.995, 0.986, 0.96),
				borderColor: gold,
				borderWidth: 0.5
			});
			page.drawText(
				rollingPeriod ? day.date.slice(8, 10) + '/' + day.date.slice(5, 7) : String(index + 1),
				{
					x: x + 9,
					y: topY - 20,
					size: 16,
					font: display,
					color: ink
				}
			);
			const selectedIds = new Set(
				saved.reading.interpretation
					? saved.reading.sections.flatMap((section) => section.factIds)
					: (saved.reading.editorial?.selection.map((selection) => selection.factId) ?? [])
			);
			const count = data.events.filter(
				(event) => event.date === day.date && selectedIds.has(event.id)
			).length;
			page.drawText(`${count} ${count === 1 ? 'sinal' : 'sinais'}`, {
				x: x + 6,
				y: topY - 42,
				size: 8,
				font: label,
				color: muted
			});
			if (saved.input.calendarMarks?.entries.some((m) => m.date === day.date))
				page.drawCircle({ x: x + cell - 15, y: topY - 14, size: 3, color: gold });
		});
		y = top - 20 - Math.ceil((offset + data.days.length) / 7) * 72 - 20;
		paragraph(
			saved.reading.interpretation
				? 'Os sinais remetem aos movimentos desenvolvidos na leitura. A quantidade não indica dias melhores ou piores. As observações ocorrem a cada seis horas; os picos são aproximações.'
				: 'Zero sinais não descreve a qualidade do dia. Registre também experiências que contrariaram uma hipótese. As observações ocorrem a cada seis horas; picos não certificam o instante exato.',
			label,
			10
		);
		newPage();
	}
	// Geometry is read from the saved calculation, never inferred from prose.
	const chartPeople: ('first' | 'second' | undefined)[] = [
		SYNASTRY_VERSION,
		DOSSIER_VERSION
	].includes(saved.calculation.version)
		? [undefined, 'first', 'second']
		: saved.calculation.version === SOLAR_VERSION
			? [undefined, 'second']
			: ['synastry', 'couple-dossier'].includes(saved.product_id) ||
				  (saved.product_id === 'pair-preview' && saved.calculation.version !== PAIR_VERSION)
				? ['first', 'second']
				: [
							'three-pillars',
							'birth-chart',
							'life-atlas',
							'ascendant',
							'career-compass',
							'purpose-career',
							'midheaven',
							'date-reading',
							'week-reading',
							'personal-calendar',
							'career-forecast-30d'
					  ].includes(saved.product_id)
					? [undefined]
					: [];
	if (!book && chartPeople.length) newPage();
	for (const person of chartPeople) {
		const scene = buildChartScene(saved, { person });
		drawChartScenePdf(page, scene, label, margin, height - margin, width - margin * 2);
		newPage();
	}
	const contents: { page: typeof page; y: number; index: number }[] = [];
	if (tarotMethodFor(saved.product_id)) {
		if (!book) newPage();
		const scene = buildTarotScene(saved);
		const legendColumns = scene.cards.length > 10 ? 2 : 1;
		const legendColumnWidth = (available - (legendColumns - 1) * 20) / legendColumns;
		const legendRows = Math.ceil(scene.cards.length / legendColumns);
		const legend = scene.cards.map((card, index) => ({
			column: Math.floor(index / legendRows),
			lines: wrap(
				`${card.position}. ${card.positionName}: ${card.name}`,
				label,
				9.5,
				legendColumnWidth
			)
		}));
		const legendHeight = Math.max(
			...Array.from({ length: legendColumns }, (_, column) =>
				legend
					.filter((entry) => entry.column === column)
					.reduce((total, entry) => total + entry.lines.length * 9.5 * 1.5, 0)
			)
		);
		const diagramWidth = Math.min(
			available,
			((height - margin - 70 - 25 - legendHeight) * scene.width) / scene.height
		);
		const diagramX = margin + (available - diagramWidth) / 2;
		drawChartScenePdf(page, scene, label, diagramX, height - margin, diagramWidth);
		// Download only the drawn cards from this site; never bundle the entire deck
		// into the PDF client module or send the reading to an external image service.
		const artwork = new Map(
			await Promise.all(
				[...new Set(scene.images.map((item) => item.cardId))].map(
					async (cardId) => [cardId, await doc.embedJpg(await loadTarotArtwork(cardId))] as const
				)
			)
		);
		const scale = diagramWidth / scene.width;
		for (const item of scene.images) {
			const image = artwork.get(item.cardId)!;
			const fit = Math.min(item.w / image.width, item.h / image.height) * scale;
			const imageWidth = image.width * fit,
				imageHeight = image.height * fit;
			page.drawImage(image, {
				x: diagramX + (item.x + item.w / 2) * scale - imageWidth / 2,
				y: height - margin - (item.y + item.h / 2) * scale - imageHeight / 2,
				width: imageWidth,
				height: imageHeight
			});
		}
		// Keep the full position key on the same page as the spread. Measure it
		// first so long card names preserve their type size without crossing a footer.
		const legendTop = height - margin - scene.height * scale - 25;
		y = legendTop;
		let lowest = legendTop;
		for (const [index, entry] of legend.entries()) {
			if (index % legendRows === 0) y = legendTop;
			for (const text of entry.lines) {
				page.drawText(text, {
					x: margin + entry.column * (legendColumnWidth + 20),
					y,
					font: label,
					size: 9.5,
					color: ink
				});
				y -= 9.5 * 1.5;
			}
			lowest = Math.min(lowest, y);
		}
		y = lowest;
		newPage();
	}
	if (book) {
		heading('Índice da sua leitura', 23);
		paragraph(
			'A síntese apresenta as relações centrais desta leitura. O índice permite voltar aos temas e consultar os dados que sustentam a interpretação.'
		);
		chapters.forEach((s, index) => {
			if (y < 105) newPage();
			contents.push({ page, y, index });
			paragraph(
				tarotMethodFor(saved.product_id)
					? s.title
					: `${String(index + 1).padStart(2, '0')} · ${s.title}`,
				label,
				10,
				5
			);
		});
		newPage();
	}
	const chapterPages: number[] = [];
	for (const [i, s] of chapters.entries()) {
		if (book && !career && !rollingPeriod && i > 0 && y < height - 200 && s.text.length > 900)
			newPage();
		const chapterTitle = tarotMethodFor(saved.product_id)
			? s.title
			: `${String(i + 1).padStart(2, '0')} · ${s.title}`;
		const datedBlocks =
			rollingPeriod && /^\d{2}\/\d{2}\/\d{4}\n/.test(s.text) ? s.text.split('\n\n') : null;
		heading(
			chapterTitle,
			17,
			headingHeight(chapterTitle) +
				Math.min(paragraphHeight(datedBlocks?.[0] ?? s.text), datedBlocks ? height - 220 : 108)
		);
		chapterPages.push(doc.getPageCount());
		if (datedBlocks) {
			// A date and its observations form one reading unit in the rolling edition.
			for (const block of datedBlocks) {
				const needed = paragraphHeight(block);
				if (needed <= height - 148 && needed > y - 70) newPage();
				paragraph(block);
			}
		} else paragraph(s.text);
	}
	for (const item of contents)
		item.page.drawText(String(chapterPages[item.index]), {
			x: width - margin - 14,
			y: item.y,
			font: label,
			size: 10,
			color: muted
		});
	// Reflection is optional; a complete interpretation does not depend on an exercise.
	if (r.questions.length) {
		heading(
			'Perguntas para refletir',
			17,
			Math.min(
				height - 148,
				headingHeight('Perguntas para refletir') +
					r.questions.reduce((sum, q, i) => sum + paragraphHeight(`${i + 1}. ${q}`), 0)
			)
		);
		r.questions.forEach((q, i) => paragraph(`${i + 1}. ${q}`));
	}
	if (r.practice.trim()) {
		const practiceTitle =
			r.version === 'atv-current-reading/1.0.0'
				? 'Para levar desta leitura'
				: 'Experimento prático';
		heading(
			practiceTitle,
			17,
			Math.min(height - 148, headingHeight(practiceTitle) + paragraphHeight(r.practice))
		);
		paragraph(r.practice);
	}
	if ([PAIR_VERSION, SYNASTRY_VERSION, DOSSIER_VERSION].includes(saved.calculation.version)) {
		const references = r.sections.find((s) => s.title === 'Referências desta leitura');
		if (references) {
			heading(references.title, 15);
			paragraph(references.text, label, 9);
		}
	}
	// A short Tarot closing can share its page with the appendix instead of becoming an orphan.
	if (book && !career && (!tarotMethodFor(saved.product_id) || y < height - 250)) newPage();
	const reconstructed = r.version === 'atv-product-reconstruction/4.0.0';
	heading(
		reconstructed
			? 'Sobre esta leitura'
			: book
				? 'Apêndice · método e limites'
				: 'Método e limites',
		career ? 20 : book ? 23 : 15
	);
	paragraph(pdfPresentationSource(saved.product_id, r.source), label, 9, career ? 4 : 9);
	if (reconstructed && tarotMethodFor(saved.product_id)) {
		paragraph(
			'As cartas e suas posições pertencem à tiragem registrada. Reabrir esta leitura ou baixar outro formato preserva a mesma tiragem. Uma nova leitura começa com um novo registro.',
			label,
			9
		);
		paragraph(
			'A leitura combina os símbolos das cartas com a função de cada posição e, quando informado, o foco escolhido por você. Use essas relações para examinar possibilidades e atitudes; elas não comprovam acontecimentos futuros nem pensamentos ou intenções de outras pessoas.',
			label,
			9
		);
	} else if (saved.calculation.version === DOSSIER_VERSION) {
		r.limits.slice(-9).forEach((limit) => paragraph(limit, label, 9));
	} else if (saved.calculation.version === SYNASTRY_VERSION) {
		r.limits.slice(-6).forEach((limit) => paragraph(limit, label, 9));
	} else if (saved.calculation.version === PAIR_VERSION) {
		r.limits.slice(-4).forEach((limit) => paragraph(limit, label, 9));
	} else if (
		[WEEK_VERSION, SOLAR_VERSION, CALENDAR_VERSION, PERIOD_VERSION].includes(
			saved.calculation.version
		)
	) {
		r.limits.forEach((limit) => paragraph(limit, label, 9));
	} else if (saved.product_id === 'direction-journey') {
		r.limits.forEach((limit) => paragraph(limit, label, 9));
	} else if (reconstructed) {
		paragraph(
			'A abordagem é tropical, psicológica e humanista, com regências modernas. O mapa organiza hipóteses de reflexão; não determina acontecimentos, profissão ou comportamento. Compare a leitura com sua experiência e com as condições concretas da situação.',
			label,
			9
		);
		paragraph(
			'Horário e local de nascimento influenciam os ângulos e as casas. Confira os dados informados. Contatos planetários são selecionados por função, regência e proximidade; uma seleção não descreve todas as possibilidades do mapa.',
			label,
			9
		);
	} else if (career) r.limits.forEach((l) => paragraph(l, label, 9, 4));
	else r.limits.forEach((l) => paragraph(l, label, 9));
	if (book && !career) {
		heading('Dados para conferir', 15);
		const compact = pdfReferenceFacts(saved);
		compact.forEach((f) => paragraph(f.display, label, 8, 4));
		const omitted = saved.calculation.facts.length - compact.length;
		if (omitted)
			paragraph(
				'Este apêndice reúne os dados selecionados para consulta. A cópia TXT da mesma leitura preserva o registro completo e suas fontes.',
				label,
				9
			);
		if (!reconstructed)
			paragraph(
				'As referências de cada dado e o registro integral de revisão permanecem na cópia TXT desta leitura.',
				label,
				9
			);
	}
	for (const [i, p] of doc.getPages().entries()) {
		p.drawLine({
			start: { x: margin, y: 48 },
			end: { x: width - margin, y: 48 },
			color: gold,
			thickness: 0.5
		});
		p.drawText('A Tua Vida nos Astros', {
			x: margin,
			y: 32,
			font: career ? body : label,
			size: career ? 9 : 8,
			color: muted
		});
		p.drawText(`${i + 1} / ${doc.getPageCount()}`, {
			x: width - 92,
			y: 32,
			font: label,
			size: 8,
			color: muted
		});
	}
	const bytes = await doc.save();
	if (Date.now() > deadline) throw Error('pdf_deadline');
	if (bytes.length > 8000000) throw Error('pdf_byte_limit');
	return bytes;
}
