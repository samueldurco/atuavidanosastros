import fontkit, { type Font } from '@pdf-lib/fontkit';
import { productCatalog } from '@atv/domain';
import { parseProductRun } from '../product-run';
import displayData from './pdf-fonts/bodoni-moda-regular.ttf?inline';
import bodyData from './pdf-fonts/newsreader-regular.ttf?inline';
import labelData from './pdf-fonts/onest-regular.ttf?inline';

export const CARD_EXPORT_VERSION = 'atv-reading-card/1.0.0';
export const CARD_CSP =
	"default-src 'none'; style-src 'unsafe-inline'; font-src data:; base-uri 'none'; form-action 'none'";
export const CARD_LIMITS = Object.freeze({
	characters: 24000,
	height: 8192,
	bytes: 2000000,
	milliseconds: 5000
});
const escape = (value: string) =>
	value.replace(
		/[&<>"']/g,
		(c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
	);
const decode = (data: string) =>
	Uint8Array.from(atob(data.slice(data.indexOf(',') + 1)), (c) => c.charCodeAt(0));
class CardUnavailable extends Error {}

/** One complete approved section with its bases and all limitations. No extractive summary or new interpretation. */
export function renderProductCard(value: unknown, sectionIndex: number) {
	const run = parseProductRun(value);
	const product = productCatalog.find((p) => p.id === run?.productId);
	if (
		!run?.released ||
		!run.editorial ||
		!run.calculation ||
		!product?.delivery.includes('web') ||
		!Number.isInteger(sectionIndex) ||
		sectionIndex < 0 ||
		sectionIndex >= run.editorial.sections.length
	)
		return null;
	const section = run.editorial.sections[sectionIndex];
	const facts = run.calculation.facts.filter((f) => section.evidence.includes(f.id));
	const limits = [...run.calculation.limits, ...run.editorial.limits];
	if (
		JSON.stringify({ title: run.editorial.title, section, facts, limits }).length >
		CARD_LIMITS.characters
	)
		return null;
	const started = performance.now();
	try {
		const fonts = {
			display: fontkit.create(decode(displayData)),
			body: fontkit.create(decode(bodyData)),
			label: fontkit.create(decode(labelData))
		};
		let y = 80;
		const elements: string[] = [];
		const check = () => {
			if (y > CARD_LIMITS.height - 80 || performance.now() - started > CARD_LIMITS.milliseconds)
				throw new CardUnavailable();
		};
		const width = (text: string, font: Font, size: number) =>
			(font.layout(text).advanceWidth * size) / font.unitsPerEm;
		const paragraph = (
			value: string,
			style: keyof typeof fonts = 'body',
			size = 34,
			leading = 48,
			gap = 24
		) => {
			const font = fonts[style];
			for (const c of value) {
				if ('\r\n\t'.includes(c)) continue;
				const cp = c.codePointAt(0)!;
				if (cp < 32 || cp === 127 || !font.hasGlyphForCodePoint(cp)) throw new CardUnavailable();
			}
			const line = (s: string) => {
				check();
				if (width(s, font, size) > 920.01) throw new CardUnavailable();
				elements.push(
					`<text x="80" y="${y}" dominant-baseline="text-before-edge" class="${style}" font-size="${size}">${escape(s)}</text>`
				);
				y += Math.max(
					leading,
					Math.ceil(((font.ascent - font.descent + font.lineGap) * size) / font.unitsPerEm) + 8
				);
			};
			for (const part of value.replace(/\r\n?/g, '\n').split('\n')) {
				let pending = '';
				for (const word of part.trim().split(/[ \t]+/)) {
					check();
					const next = pending ? `${pending} ${word}` : word;
					if (width(next, font, size) <= 920) {
						pending = next;
						continue;
					}
					if (pending) line(pending);
					pending = '';
					for (const char of word) {
						if (width(pending + char, font, size) > 920) {
							line(pending);
							pending = '';
						}
						pending += char;
					}
				}
				line(pending);
			}
			y += gap;
		};
		paragraph('A TUA VIDA NOS ASTROS · CARD DE LEITURA', 'label', 22, 32, 32);
		paragraph(product.name, 'label', 24, 34, 18);
		paragraph(run.editorial.title, 'display', 52, 64, 26);
		paragraph(
			`Seção ${sectionIndex + 1} de ${run.editorial.sections.length} · revisão ${run.revision}`,
			'label',
			22,
			32,
			32
		);
		paragraph(section.title, 'display', 42, 54, 24);
		paragraph(section.text);
		elements.push(`<path d="M80 ${y}H1000" stroke="#c5b58f"/>`);
		y += 50;
		paragraph('BASES DESTA SEÇÃO', 'label', 22, 32, 12);
		for (const fact of facts) {
			paragraph(
				`${fact.id} · ${fact.kind === 'reported' ? 'Relatado' : fact.kind === 'drawn' ? 'Sorteado' : 'Calculado'}`,
				'label',
				22,
				32,
				8
			);
			paragraph(fact.display, 'body', 26, 38, 8);
			paragraph(fact.source, 'label', 20, 30, 20);
		}
		paragraph('LIMITES PRESERVADOS', 'label', 22, 32, 12);
		for (const limit of limits) paragraph(limit, 'body', 26, 38, 14);
		paragraph(
			'Esta leitura é simbólica e não determina suas escolhas. Não substitui orientação profissional.',
			'label',
			22,
			32,
			24
		);
		paragraph(
			'Cópia privada de uma seção, não da leitura completa. Consulte as demais seções e o histórico na Biblioteca. Não compartilhe dados de outras pessoas.',
			'label',
			22,
			32,
			18
		);
		paragraph('Excluir ou revogar o registro não apaga cópias já baixadas.', 'label', 22, 32, 18);
		paragraph(`Registro ${run.id} · r${run.revision}`, 'label', 18, 28, 8);
		paragraph(
			`Método: ${run.calculation.version} · Edição: ${run.editorial.version}`,
			'label',
			18,
			28,
			8
		);
		paragraph(CARD_EXPORT_VERSION, 'label', 18, 28, 0);
		check();
		const height = Math.max(1350, y + 60);
		const metadata = {
			exporter: CARD_EXPORT_VERSION,
			runId: run.id,
			revision: run.revision,
			sectionIndex,
			reviewDigest: run.editorial.reviewDigest
		};
		const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="${height}" viewBox="0 0 1080 ${height}" role="img" aria-labelledby="card-title card-desc" lang="pt-BR">
<title id="card-title">${escape(section.title)} — card de leitura</title><desc id="card-desc">Seção integral com bases e limites preservados. Cópia privada; não é a leitura completa.</desc>
<metadata>${escape(JSON.stringify(metadata))}</metadata>
<style>@font-face{font-family:ATVDisplay;src:url('${displayData}') format('truetype')}@font-face{font-family:ATVBody;src:url('${bodyData}') format('truetype')}@font-face{font-family:ATVLabel;src:url('${labelData}') format('truetype')}
text{fill:#142139;font-kerning:normal;font-variant-ligatures:normal}.display{font-family:ATVDisplay,serif}.body{font-family:ATVBody,serif}.label{font-family:ATVLabel,sans-serif;fill:#45516a}</style>
<rect width="1080" height="${height}" fill="#fcfbf8"/><path d="M80 28H1000" stroke="#95702b"/>
${elements.join('')}</svg>`;
		if (new TextEncoder().encode(svg).length > CARD_LIMITS.bytes) return null;
		return {
			svg,
			height,
			filename: `atv-${product.id}-${run.id}-r${run.revision}-card-${sectionIndex + 1}.svg`
		};
	} catch {
		return null;
	}
}
