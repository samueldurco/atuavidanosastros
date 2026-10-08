import { PDFDocument, rgb, type PDFFont } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import type { SavedTrial } from './reading';
import { trialText } from './exports';
import { experienceFor } from './experience';
import { buildChartScene } from './chart-engine-v2';
import { drawChartScenePdf } from './chart-pdf';
import { tarotMethodFor } from '@atv/domain';
import { buildTarotScene } from './tarot-diagram';
import bodyData from './pdf-fonts/newsreader-regular.ttf?inline';
import labelData from './pdf-fonts/onest-regular.ttf?inline';
import displayData from './pdf-fonts/bodoni-moda-regular.ttf?inline';
import coverArt from '../data/visual-v3-pdf.generated.json';

/** Local book export. This module is dynamically imported only by the download page. */
export async function trialPdf(saved: SavedTrial) {
	const deadline = Date.now() + 20000;
	if (trialText(saved).length > 650000) throw Error('pdf_too_large');
	const doc = await PDFDocument.create();
	doc.registerFontkit(fontkit);
	const body = await doc.embedFont(bodyData, { subset: true }),
		label = await doc.embedFont(labelData, { subset: true }),
		display = await doc.embedFont(displayData, { subset: true });
	const r = saved.reading;
	const theme = coverArt.products[saved.product_id as keyof typeof coverArt.products] ?? 'B01';
	const engraving = await doc.embedPng(coverArt.themes[theme as keyof typeof coverArt.themes]);
	const format = experienceFor(saved.product_id).format;
	const book = format === 'book';
	const chapters = r.sections.filter((s) => s.title !== 'Referências desta leitura');
	doc.setTitle(r.title);
	doc.setAuthor('A Tua Vida nos Astros');
	doc.setLanguage('pt-BR');
	doc.setCreationDate(new Date(saved.created_at));
	doc.setCreator('atv-reading-pdf/3');
	const width = 595.28,
		height = 841.89,
		margin = 54,
		available = width - 2 * margin;
	const ink = rgb(0.063, 0.169, 0.227),
		muted = rgb(0.298, 0.337, 0.345),
		gold = rgb(0.475, 0.357, 0.192),
		cream = rgb(0.969, 0.949, 0.906);
	let page = doc.addPage([width, height]),
		y = height - 78;
	const charsets = new Map([body, label, display].map((f) => [f, new Set(f.getCharacterSet())]));
	const widths = new Map([body, label, display].map((f) => [f, new Map<string, number>()]));
	const safe = (value: string, font: PDFFont) =>
		Array.from(value.normalize('NFC'))
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
	const wrap = (value: string, font: PDFFont, size: number) => {
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
				if (ww > available) {
					if (current) {
						lines.push(current);
						current = '';
						w = 0;
					}
					for (const c of word) {
						const cw = measure(c);
						if (w + cw > available) {
							lines.push(current);
							current = '';
							w = 0;
						}
						current += c;
						w += cw;
					}
				} else if (current && w + space + ww > available) {
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
	const headingHeight = (value: string, size = 17) => 8 + paragraphHeight(value, label, size);
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
		paragraph(value, label, size);
	};
	// Cover: no app navigation, evaluation form or browser-print chrome.
	page.drawImage(engraving, { x: width - margin - 92, y: height - 168, width: 92, height: 92 });
	page.drawRectangle({ x: margin, y: height - 115, width: 44, height: 2, color: gold });
	page.drawText('A TUA VIDA NOS ASTROS', {
		x: margin,
		y: height - 98,
		font: label,
		size: 10,
		color: muted
	});
	y = height - 205;
	paragraph(r.title, display, book ? 34 : 25);
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
	// Geometry is read from the saved calculation, never inferred from prose.
	const chartPeople: ('first' | 'second' | undefined)[] = [
		'synastry',
		'pair-preview',
		'couple-dossier'
	].includes(saved.product_id)
		? ['first', 'second']
		: [
					'three-pillars',
					'birth-chart',
					'life-atlas',
					'ascendant',
					'career-compass',
					'purpose-career',
					'midheaven'
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
		drawChartScenePdf(page, scene, label, margin, height - margin, available);
		y = height - margin - (scene.height * available) / scene.width - 25;
		paragraph(
			scene.cards.length === 1
				? 'A carta e sua função correspondem ao capítulo da posição. O diagrama preserva a tiragem salva.'
				: 'A numeração corresponde aos capítulos das posições. A síntese relaciona as cartas; o diagrama preserva a tiragem salva.',
			label,
			11
		);
		if (scene.cards.length > 3) {
			for (const card of scene.cards)
				paragraph(`${card.position}. ${card.positionName}: ${card.name}`, label, 9.5, 0);
		}
		newPage();
	}
	if (book) {
		heading('Índice da sua leitura', 23);
		paragraph(
			'Comece pela síntese e aprofunde os temas que deseja investigar. Compare os capítulos com uma situação concreta; suas observações podem confirmar ou contrariar a interpretação.'
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
		if (
			book &&
			i > 0 &&
			(s.text.length > 900 ||
				(saved.product_id === 'career-compass' && s.title === 'Sua página de decisão'))
		)
			newPage();
		heading(
			tarotMethodFor(saved.product_id) ? s.title : `${String(i + 1).padStart(2, '0')} · ${s.title}`
		);
		chapterPages.push(doc.getPageCount());
		paragraph(s.text);
	}
	for (const item of contents)
		item.page.drawText(String(chapterPages[item.index]), {
			x: width - margin - 14,
			y: item.y,
			font: label,
			size: 10,
			color: muted
		});
	// Keep the brief reflection/practice closing together; avoid a page with only two lines.
	heading(
		'Perguntas para refletir',
		17,
		Math.min(
			height - 148,
			headingHeight('Perguntas para refletir') +
				r.questions.reduce((sum, q, i) => sum + paragraphHeight(`${i + 1}. ${q}`), 0) +
				headingHeight('Experimento prático') +
				paragraphHeight(r.practice)
		)
	);
	r.questions.forEach((q, i) => paragraph(`${i + 1}. ${q}`));
	heading('Experimento prático', 17, 0);
	paragraph(r.practice);
	if (book) newPage();
	const reconstructed = r.version === 'atv-product-reconstruction/4.0.0';
	heading(
		reconstructed
			? 'Sobre esta leitura'
			: book
				? 'Apêndice · método e limites'
				: 'Método e limites',
		book ? 23 : 15
	);
	paragraph(r.source, label, 9);
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
	} else r.limits.forEach((l) => paragraph(l, label, 9));
	if (book) {
		heading('Dados para conferir', 15);
		const compact = saved.calculation.facts.filter(
			(f) =>
				!/^day-\d+-|series$/.test(f.id) &&
				!/nenhum aspecto/i.test(f.display) &&
				f.display.length <= 650
		);
		compact.forEach((f) => paragraph(f.display, label, 8, 4));
		const omitted = saved.calculation.facts.length - compact.length;
		if (omitted)
			paragraph(
				`${omitted} registros extensos, amostras diárias ou pares sem aspecto não foram repetidos neste apêndice. A cópia TXT da mesma leitura preserva todos os fatos completos e suas fontes.`,
				label,
				9
			);
		if (!reconstructed) {
			const sources = [...new Set(saved.calculation.facts.map((f) => f.source))];
			const record = `Conteúdo: ${r.version}\nPolítica: ${saved.approval.policy}\nLeitura: ${saved.id}\nRegistro: ${saved.approval.digest}`;
			heading(
				'Fontes e registro da revisão',
				15,
				Math.min(
					height - 148,
					headingHeight('Fontes e registro da revisão', 15) +
						sources.reduce((sum, source) => sum + paragraphHeight(source, label, 8, 4), 0) +
						paragraphHeight(record, label, 8)
				)
			);
			sources.forEach((source) => paragraph(source, label, 8, 4));
			paragraph(record, label, 8);
		}
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
			font: label,
			size: 8,
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
