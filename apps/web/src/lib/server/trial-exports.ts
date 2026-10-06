import { PDFDocument, rgb, type PDFFont } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import type { SavedTrial } from '../trials/reading';
import { longitudePoint } from '../product-cartography';
import bodyData from './pdf-fonts/newsreader-regular.ttf?inline';
import labelData from './pdf-fonts/onest-regular.ttf?inline';

export function trialText(saved: SavedTrial) {
	const r = saved.reading;
	return [
		r.title,
		r.opening,
		r.source,
		...r.sections.flatMap((s) => [s.title, s.text]),
		'Perguntas para refletir',
		...r.questions.map((q, i) => `${i + 1}. ${q}`),
		'Experimento prático',
		r.practice,
		'Limites da leitura',
		...r.limits,
		'Origem dos fatos',
		...saved.calculation.facts.map((f) => `${f.display} — ${f.source}`),
		'Teste privado gratuito - aprovação pessoal separada',
		`Salvo em ${saved.created_at}`,
		`Conteúdo: ${r.version}`,
		`Política: ${saved.approval.policy}`,
		`Revisão: ${saved.approval.digest}`
	].join('\n\n');
}

/** Full saved text, locally embedded fonts and bounded pagination. No provider calls. */
export async function trialPdf(saved: SavedTrial) {
	const deadline = Date.now() + 12000;
	const text = trialText(saved);
	if (text.length > 650000) throw new Error('pdf_too_large');
	const doc = await PDFDocument.create();
	doc.registerFontkit(fontkit);
	const body = await doc.embedFont(bodyData, { subset: true }),
		label = await doc.embedFont(labelData, { subset: true });
	doc.setTitle(saved.reading.title);
	doc.setAuthor('A Tua Vida nos Astros');
	doc.setLanguage('pt-BR');
	doc.setCreationDate(new Date(saved.created_at));
	doc.setCreator('atv-private-trial-pdf/1');
	const width = 595.28,
		height = 841.89,
		margin = 52,
		available = width - margin * 2,
		ink = rgb(0.08, 0.13, 0.22);
	let page = doc.addPage([width, height]),
		y = height - 70;
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
	const line = (value: string, font: PDFFont, size: number) => {
		if (Date.now() > deadline) throw new Error('pdf_deadline');
		if (y < 66) {
			if (doc.getPageCount() >= 160) throw new Error('pdf_page_limit');
			page = doc.addPage([width, height]);
			y = height - 70;
		}
		page.drawText(value, { x: margin, y, font, size, color: ink });
		y -= size * 1.5;
	};
	const paragraph = (value: string, font = body, size = 12) => {
		const measure = (value: string) => {
			const key = `${size}:${value}`;
			const cache = widths.get(font)!;
			let width = cache.get(key);
			if (width === undefined) {
				width = font.widthOfTextAtSize(value, size);
				cache.set(key, width);
			}
			return width;
		};
		const spaceWidth = measure(' ');
		for (const raw of value.replace(/\r\n?/g, '\n').split('\n')) {
			const words = safe(raw, font).split(/\s+/);
			let current = '',
				currentWidth = 0;
			for (const word of words) {
				const wordWidth = measure(word);
				if (wordWidth > available) {
					if (current) {
						line(current, font, size);
						current = '';
						currentWidth = 0;
					}
					for (const char of word) {
						const charWidth = measure(char);
						if (currentWidth + charWidth > available) {
							line(current, font, size);
							current = '';
							currentWidth = 0;
						}
						current += char;
						currentWidth += charWidth;
					}
				} else if (current && currentWidth + spaceWidth + wordWidth > available) {
					line(current, font, size);
					current = word;
					currentWidth = wordWidth;
				} else {
					currentWidth += (current ? spaceWidth : 0) + wordWidth;
					current += (current ? ' ' : '') + word;
				}
			}
			if (current) line(current, font, size);
			else y -= size * 1.5;
		}
		y -= 8;
	};
	const heading = (value: string, size = 15) => {
		if (y < 130) {
			if (doc.getPageCount() >= 160) throw new Error('pdf_page_limit');
			page = doc.addPage([width, height]);
			y = height - 70;
		}
		paragraph(value, label, size);
	};
	const r = saved.reading;
	heading(r.title, 23);
	paragraph(r.opening);
	paragraph(r.source, label, 9);
	for (const s of r.sections) {
		heading(s.title);
		paragraph(s.text);
	}
	heading('Perguntas para refletir');
	r.questions.forEach((q, i) => paragraph(`${i + 1}. ${q}`));
	heading('Experimento prático');
	paragraph(r.practice);
	heading('Limites da leitura');
	r.limits.forEach((l) => paragraph(l));
	heading('Origem dos fatos');
	saved.calculation.facts.forEach((f) => paragraph(`${f.display} — ${f.source}`, label, 9));
	heading('Registro da aprovação');
	paragraph(
		`Salvo em ${saved.created_at}\n${r.version}\n${saved.approval.policy}\n${saved.approval.digest}`,
		label,
		9
	);
	paragraph(
		'Caracteres sem glifo nesta fonte aparecem pelo código U+. O download TXT preserva todos os caracteres originais.',
		label,
		9
	);
	for (const [i, p] of doc.getPages().entries()) {
		p.drawText('ATV - teste privado gratuito', {
			x: margin,
			y: 32,
			font: label,
			size: 8,
			color: ink
		});
		p.drawText(`${i + 1} / ${doc.getPageCount()}`, {
			x: width - 95,
			y: 32,
			font: label,
			size: 8,
			color: ink
		});
	}
	const bytes = await doc.save();
	if (Date.now() > deadline) throw new Error('pdf_deadline');
	if (bytes.length > 8000000) throw new Error('pdf_byte_limit');
	return bytes;
}

const xml = (s: string) =>
	s.replace(
		/[&<>"']/g,
		(c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
	);
const finiteAngle = (n: unknown): n is number =>
	typeof n === 'number' && Number.isFinite(n) && n >= 0 && n < 360;
const names: Record<string, string> = {
	sun: 'Sol',
	moon: 'Lua',
	mercury: 'Mercúrio',
	venus: 'Vênus',
	mars: 'Marte',
	jupiter: 'Júpiter',
	saturn: 'Saturno',
	uranus: 'Urano',
	neptune: 'Netuno',
	pluto: 'Plutão'
};
const signs = [
	'Áries',
	'Touro',
	'Gêmeos',
	'Câncer',
	'Leão',
	'Virgem',
	'Libra',
	'Escorpião',
	'Sagitário',
	'Capricórnio',
	'Aquário',
	'Peixes'
];
export function trialSvg(saved: SavedTrial) {
	const root = saved.calculation.data;
	const natal = (root.natal as { data?: Record<string, unknown> } | undefined)?.data;
	const data = saved.product_id === 'life-atlas' ? natal : root;
	if (!data) throw new Error('geometry_missing');
	const positions = (data.positions ?? []) as { body: string; longitude: number }[];
	const angles = data.angles as { ascendant: number | null; midheaven: number | null };
	const houses = data.houses as { status: string; cusps: number[] };
	if (
		!Array.isArray(positions) ||
		positions.length !== (saved.product_id === 'ascendant' ? 0 : 10) ||
		(saved.product_id === 'ascendant' && !finiteAngle(angles?.ascendant)) ||
		positions.some((p) => !names[p.body] || !finiteAngle(p.longitude)) ||
		new Set(positions.map((p) => p.body)).size !== positions.length ||
		!angles ||
		![angles.ascendant, angles.midheaven].every((a) => a === null || finiteAngle(a)) ||
		!houses ||
		!Array.isArray(houses.cusps) ||
		![0, 12].includes(houses.cusps.length) ||
		houses.cusps.some((c) => !finiteAngle(c))
	)
		throw new Error('geometry_invalid');
	const lines: string[] = [],
		legend: string[] = [];
	const text = (x: number, y: number, value: string, size = 15) =>
		`<text x="${x}" y="${y}" font-size="${size}">${xml(value)}</text>`;
	const radial = (a: number, r1: number, r2: number, stroke: string) => {
		const p = longitudePoint(a, r1),
			q = longitudePoint(a, r2);
		return `<line x1="${p.x}" y1="${p.y}" x2="${q.x}" y2="${q.y}" stroke="${stroke}"/>`;
	};
	const degree = (a: number) => `${(a % 30).toFixed(4)}° ${signs[Math.floor(a / 30)]}`;
	for (let a = 0; a < 360; a += 5) lines.push(radial(a, a % 30 === 0 ? 268 : 283, 290, '#637083'));
	signs.forEach((s, i) => {
		const p = longitudePoint(i * 30 + 15, 326);
		lines.push(`<text x="${p.x}" y="${p.y}" text-anchor="middle" font-size="16">${xml(s)}</text>`);
	});
	houses.cusps.forEach((a) => lines.push(radial(a, 75, 268, '#bbc3cc')));
	positions.forEach((p, i) => {
		const point = longitudePoint(p.longitude, 265 - i * 18);
		lines.push(
			`<g data-body="${p.body}" data-longitude="${p.longitude}"><circle cx="${point.x}" cy="${point.y}" r="10" fill="#122237"/><text x="${point.x}" y="${point.y + 4}" text-anchor="middle" fill="white" font-size="12">${i + 1}</text></g>`
		);
		legend.push(text(65, 815 + i * 25, `${i + 1}. ${names[p.body]}: ${degree(p.longitude)}`));
	});
	Object.entries(angles).forEach(([name, a]) => {
		if (a === null) return;
		lines.push(radial(a, 65, 307, '#967340'));
		legend.push(
			text(
				520,
				815 + legend.filter((l) => l.includes('x="520"')).length * 28,
				`${name === 'ascendant' ? 'ASC' : 'MC'}: ${degree(a)}`
			)
		);
	});
	houses.cusps.forEach((a, i) =>
		legend.push(
			text(65 + Math.floor(i / 6) * 470, 1120 + (i % 6) * 25, `Casa ${i + 1}: ${degree(a)}`, 14)
		)
	);
	return `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1410" viewBox="0 0 1000 1410" role="img" aria-labelledby="title desc" lang="pt-BR"><title id="title">${xml(saved.reading.title)} - cartografia</title><desc id="desc">Projeção dos valores salvos; zero de Áries à esquerda, longitudes no sentido anti-horário. Precisão experimental.</desc><rect width="1000" height="1410" fill="#faf7f2"/><g font-family="Georgia,serif" fill="#122237">${text(65, 62, saved.reading.title, 27)}${text(65, 95, 'Teste privado gratuito - geometria salva, precisão experimental', 15)}<circle cx="500" cy="430" r="290" fill="none" stroke="#122237"/>${lines.join('')}${legend.join('')}${text(65, 1305, houses.cusps.length ? 'Casas Placidus conforme cálculo salvo.' : 'Casas não disponíveis neste cálculo; nenhuma casa foi inventada.', 14)}${text(65, 1335, 'Fonte e limites completos acompanham a leitura web e o TXT.', 14)}${text(65, 1365, `Leitura ${saved.id}`, 12)}</g></svg>`;
}
