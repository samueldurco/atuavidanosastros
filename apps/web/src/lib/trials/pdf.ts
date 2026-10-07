import { PDFDocument, rgb, type PDFFont } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import type { SavedTrial } from './reading';
import { trialText } from './exports';
import { trialGeometry, bodyNames, bodyGlyphs, signNames, nominalDegree } from './cartography';
import bodyData from './pdf-fonts/newsreader-regular.ttf?inline';
import labelData from './pdf-fonts/onest-regular.ttf?inline';

/** Local book export. This module is dynamically imported only by the download page. */
export async function trialPdf(saved: SavedTrial) {
	const deadline = Date.now() + 20000;
	if (trialText(saved).length > 650000) throw Error('pdf_too_large');
	const doc = await PDFDocument.create();
	doc.registerFontkit(fontkit);
	const body = await doc.embedFont(bodyData, { subset: true }),
		label = await doc.embedFont(labelData, { subset: true });
	const r = saved.reading;
	doc.setTitle(r.title);
	doc.setAuthor('A Tua Vida nos Astros');
	doc.setLanguage('pt-BR');
	doc.setCreationDate(new Date(saved.created_at));
	doc.setCreator('atv-private-trial-pdf/2');
	const width = 595.28,
		height = 841.89,
		margin = 54,
		available = width - 2 * margin;
	const ink = rgb(0.07, 0.12, 0.21),
		muted = rgb(0.34, 0.39, 0.46),
		gold = rgb(0.61, 0.46, 0.25),
		cream = rgb(0.985, 0.975, 0.955);
	let page = doc.addPage([width, height]),
		y = height - 78;
	const charsets = new Map([body, label].map((f) => [f, new Set(f.getCharacterSet())]));
	const widths = new Map([body, label].map((f) => [f, new Map<string, number>()]));
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
	const paragraph = (value: string, font = body, size = 12) => {
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
		const needed = lines.reduce((n, l) => n + (l ? size * 1.5 : size * 0.8), 9);
		// Keep short paragraphs together and avoid a single line across a page turn.
		if (lines.length <= 7 && needed > y - 70) newPage();
		for (let i = 0; i < lines.length; i++) {
			if (lines[i] && y - 70 < size * 1.5 && i < lines.length - 1) newPage();
			if (lines[i]) line(lines[i], font, size);
			else y -= size * 0.8;
		}
		y -= 9;
	};
	const heading = (value: string, size = 17, reserve = 120) => {
		if (y < 70 + reserve) newPage();
		y -= 8;
		paragraph(value, label, size);
	};
	// Cover: no app navigation, evaluation form or browser-print chrome.
	page.drawRectangle({ x: margin, y: height - 115, width: 44, height: 2, color: gold });
	page.drawText('A TUA VIDA NOS ASTROS', {
		x: margin,
		y: height - 98,
		font: label,
		size: 10,
		color: muted
	});
	y = height - 205;
	paragraph(r.title, body, 34);
	y -= 18;
	paragraph(r.opening, body, 17);
	y = Math.min(y - 30, 310);
	paragraph('Sua leitura para observar, refletir e experimentar.', label, 12);
	paragraph(
		'Teste privado gratuito · sua avaliação é independente da revisão automática.',
		label,
		10
	);
	paragraph(
		`Salva em ${new Date(saved.created_at).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`,
		label,
		10
	);
	newPage();
	// Geometry is read from the saved calculation, never inferred from prose.
	if (['birth-chart', 'life-atlas', 'ascendant'].includes(saved.product_id)) {
		const g = trialGeometry(saved),
			cx = width / 2,
			cy = height - 300,
			scale = 0.68;
		heading('Seu mapa em uma imagem', 23);
		const point = (a: number, rad: number) => ({
			x: cx - rad * scale * Math.cos((a * Math.PI) / 180),
			y: cy - rad * scale * Math.sin((a * Math.PI) / 180)
		});
		const radial = (a: number, r1: number, r2: number, color = muted) =>
			page.drawLine({ start: point(a, r1), end: point(a, r2), thickness: 0.5, color });
		page.drawCircle({ x: cx, y: cy, size: 255 * scale, borderColor: ink, borderWidth: 1 });
		for (let a = 0; a < 360; a += 5) radial(a, a % 30 === 0 ? 235 : 246, 255);
		signNames.forEach((s, i) => {
			const p = point(i * 30 + 15, 282);
			const v = safe(s, label);
			page.drawText(v, {
				x: p.x - label.widthOfTextAtSize(v, 8) / 2,
				y: p.y - 3,
				font: label,
				size: 8,
				color: ink
			});
		});
		g.houses.cusps.forEach((a, i) => {
			radial(a, 65, 235);
			const next = g.houses.cusps[(i + 1) % 12],
				p = point((a + ((next - a + 360) % 360) / 2) % 360, 155);
			page.drawText(`${i + 1}`, { x: p.x - 3, y: p.y - 3, font: label, size: 7, color: muted });
		});
		g.aspects.forEach((a) => {
			const first = g.positions.find((p) => p.body === a.first)!,
				second = g.positions.find((p) => p.body === a.second)!;
			page.drawLine({
				start: point(first.longitude, 123),
				end: point(second.longitude, 123),
				thickness: 0.5,
				color: ['square', 'opposition'].includes(a.kind)
					? rgb(0.65, 0.36, 0.28)
					: a.kind === 'conjunction'
						? gold
						: rgb(0.28, 0.43, 0.54),
				opacity: 0.6
			});
		});
		g.positions.forEach((p) => {
			const radius = 216 - (g.tracks.get(p.body) ?? 0) * 26,
				pos = point(p.longitude, radius);
			radial(p.longitude, radius + 12, 235);
			page.drawCircle({ x: pos.x, y: pos.y, size: 8.7, color: cream });
			page.drawSvgPath(bodyGlyphs[p.body], {
				x: pos.x,
				y: pos.y,
				scale: 0.65,
				borderColor: ink,
				borderWidth: 1.6
			});
		});
		Object.entries(g.angles).forEach(([name, a]) => {
			if (a === null) return;
			radial(a, 55, 263, gold);
			const p = point(a, 70);
			page.drawRectangle({ x: p.x - 11, y: p.y + 3, width: 24, height: 12, color: cream });
			page.drawText(name === 'ascendant' ? 'ASC' : 'MC', {
				x: p.x - 8,
				y: p.y + 6,
				font: label,
				size: 8,
				color: gold
			});
		});
		y = height - 525;
		for (let i = 0; i < g.positions.length; i += 2) {
			const left = g.positions[i],
				right = g.positions[i + 1];
			paragraph(
				`${bodyNames[left.body]}: ${nominalDegree(left.longitude)}${right ? `     |     ${bodyNames[right.body]}: ${nominalDegree(right.longitude)}` : ''}`,
				label,
				9
			);
		}
		if (g.angles.ascendant !== null)
			paragraph(
				`ASC: ${nominalDegree(g.angles.ascendant)}${g.angles.midheaven !== null ? ` · MC: ${nominalDegree(g.angles.midheaven)}` : ''}`,
				label,
				9
			);
		paragraph(
			'Zodíaco tropical; zero de Áries à esquerda; longitudes no sentido anti-horário. Glifos identificam os planetas; números identificam as casas disponíveis. Linhas azuis: sextil/trígono; terracota: quadratura/oposição; ouro: conjunção.',
			label,
			8
		);
		paragraph(
			'A geometria reproduz o cálculo salvo, cuja precisão permanece experimental. Graus arredondados apenas na apresentação.',
			label,
			8
		);
		newPage();
	}
	heading('Como percorrer sua leitura', 23);
	paragraph(
		'Comece pela síntese. Leia os capítulos como hipóteses, compare com uma situação concreta e termine com o experimento proposto. Você pode discordar da interpretação.'
	);
	paragraph(r.source, label, 9);
	r.sections.forEach((s, i) =>
		paragraph(`${String(i + 1).padStart(2, '0')} · ${s.title}`, label, 10)
	);
	newPage();
	for (const [i, s] of r.sections.entries()) {
		heading(`${String(i + 1).padStart(2, '0')} · ${s.title}`);
		paragraph(s.text);
	}
	// Keep the brief reflection/practice closing together; avoid a page with only two lines.
	heading(
		'Perguntas para refletir',
		17,
		Math.min(450, 130 + r.questions.join(' ').length * 0.19 + r.practice.length * 0.2)
	);
	r.questions.forEach((q, i) => paragraph(`${i + 1}. ${q}`));
	heading('Experimento prático');
	paragraph(r.practice);
	newPage();
	heading('Apêndice · método e limites', 23);
	r.limits.forEach((l) => paragraph(l, label, 9));
	heading('Dados para conferir', 15);
	const compact = saved.calculation.facts.filter(
		(f) =>
			!/^day-\d+-|series$/.test(f.id) &&
			!/nenhum aspecto/i.test(f.display) &&
			f.display.length <= 650
	);
	compact.forEach((f) => paragraph(`${f.id} · ${f.display}`, label, 8));
	const omitted = saved.calculation.facts.length - compact.length;
	if (omitted)
		paragraph(
			`${omitted} registros extensos, amostras diárias ou pares sem aspecto não foram repetidos neste apêndice. A cópia TXT da mesma leitura preserva todos os fatos completos e suas fontes.`,
			label,
			9
		);
	heading('Fontes e registro da revisão', 15);
	[...new Set(saved.calculation.facts.map((f) => f.source))].forEach((source) =>
		paragraph(source, label, 8)
	);
	paragraph(
		`Conteúdo: ${r.version}\nPolítica: ${saved.approval.policy}\nLeitura: ${saved.id}\nRegistro: ${saved.approval.digest}`,
		label,
		8
	);
	for (const [i, p] of doc.getPages().entries()) {
		p.drawLine({
			start: { x: margin, y: 48 },
			end: { x: width - margin, y: 48 },
			color: gold,
			thickness: 0.5
		});
		p.drawText('A Tua Vida nos Astros · teste privado gratuito', {
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
