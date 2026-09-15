import { productCatalog } from '@atv/domain';
import { parseProductRun } from '../product-run';
import type { CartographyBody } from '../product-cartography';
import displayData from '../../../static/brand/fonts/bodoni-moda-variable.woff2?inline';
import bodyData from '../../../static/brand/fonts/newsreader-variable.woff2?inline';
import labelData from '../../../static/brand/fonts/onest-variable.woff2?inline';

export const SVG_EXPORT_VERSION = 'atv-svg-export/1.0.0';
export const SVG_CSP =
	"default-src 'none'; style-src 'unsafe-inline'; font-src data:; base-uri 'none'; form-action 'none'";
const escape = (value: string) =>
	value.replace(
		/[&<>"']/g,
		(c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
	);
const labels: Record<CartographyBody, string> = {
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
const pos = (longitude: number) =>
	`${(Math.floor((longitude % 30) * 1e6) / 1e6).toFixed(6)}° ${signs[Math.floor(longitude / 30)]}`;
/** Zero Aries at left, increasing longitudes counterclockwise. Radius is a layout track, not distance. */
export function longitudePoint(longitude: number, radius: number) {
	const radians = (longitude * Math.PI) / 180;
	return { x: 500 - radius * Math.cos(radians), y: 430 + radius * Math.sin(radians) };
}
const line = (longitude: number, r1: number, r2: number, css = '') => {
	const a = longitudePoint(longitude, r1),
		b = longitudePoint(longitude, r2);
	return `<line class="${css}" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/>`;
};
const text = (x: number, y: number, value: string, css = '', anchor = 'start') =>
	`<text x="${x}" y="${y}" class="${css}" text-anchor="${anchor}">${escape(value)}</text>`;

/** Geometry is copied from the gated saved projection. No ephemeris, AI, house fallback or display-text parsing. */
export function renderProductSvg(value: unknown) {
	const run = parseProductRun(value),
		product = productCatalog.find((p) => p.id === run?.productId);
	const geo = run?.cartography;
	if (
		!run?.released ||
		!run.editorial ||
		!run.calculation ||
		!geo ||
		!product?.delivery.includes('svg')
	)
		return null;
	const pieces: string[] = [];
	for (let i = 0; i < 360; i += 5)
		pieces.push(line(i, i % 30 === 0 ? 272 : i % 10 === 0 ? 281 : 286, 290, 'tick'));
	for (let i = 0; i < 12; i++) {
		const point = longitudePoint(i * 30 + 15, 328);
		pieces.push(text(point.x, point.y + 6, signs[i], 'sign', 'middle'));
	}
	geo.houses.cusps.forEach((cusp, i) =>
		pieces.push(
			`<g data-house="${i + 1}" data-longitude="${cusp}">${line(cusp, 85, 272, 'cusp')}</g>`
		)
	);
	for (const [name, angle] of Object.entries(geo.angles))
		if (angle !== null) {
			pieces.push(
				`<g data-angle="${name}" data-longitude="${angle}">${line(angle, 85, 303, name === 'midheaven' ? 'angle mc' : 'angle')}</g>`
			);
		}
	geo.positions.forEach((p, i) => {
		const point = longitudePoint(p.longitude, 270 - i * 19);
		pieces.push(
			`<g data-body="${p.body}" data-longitude="${p.longitude}" data-radius="${270 - i * 19}"><title>${escape(`${labels[p.body]}: ${pos(p.longitude)}`)}</title><circle cx="${point.x}" cy="${point.y}" r="9" class="body"/>${text(point.x, point.y + 4, String(i + 1), 'body-number', 'middle')}</g>`
		);
	});
	const legend: string[] = [];
	geo.positions.forEach((p, i) =>
		legend.push(
			text(
				64 + Math.floor(i / 5) * 450,
				835 + (i % 5) * 29,
				`${i + 1}. ${labels[p.body]} · ${pos(p.longitude)}`,
				'legend'
			)
		)
	);
	const row = 1002;
	legend.push(
		text(
			64,
			row,
			`ASC: ${geo.angles.ascendant === null ? 'não disponibilizado' : pos(geo.angles.ascendant)}   |   MC: ${geo.angles.midheaven === null ? 'não solicitado' : pos(geo.angles.midheaven)}`,
			'note'
		)
	);
	if (geo.houses.status === 'ok') {
		for (let i = 0; i < 12; i++)
			legend.push(
				text(
					64 + Math.floor(i / 4) * 304,
					row + 36 + (i % 4) * 25,
					`Casa ${i + 1}: ${pos(geo.houses.cusps[i])}`,
					'house-label'
				)
			);
	} else
		legend.push(
			text(
				64,
				row + 36,
				geo.houses.status === 'not-applicable'
					? 'Casas e ASC indisponíveis no contrato; nenhum sistema substituto.'
					: 'Casas não solicitadas neste produto; nenhum sistema substituto.',
				'note'
			)
		);
	const metadata = {
		exporter: SVG_EXPORT_VERSION,
		runId: run.id,
		revision: run.revision,
		reviewDigest: run.editorial.reviewDigest,
		geometry: geo
	};
	const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1360" viewBox="0 0 1000 1360" role="img" aria-labelledby="chart-title chart-desc" lang="pt-BR">
<title id="chart-title">${escape(product.name)} — cartografia de posições</title>
<desc id="chart-desc">Posições tropicais geocêntricas preservadas do cálculo experimental. Zero de Áries à esquerda; longitudes crescem no sentido anti-horário. Trilhas radiais separam os corpos, não representam distância. Linhas de casas e ângulos não são aspectos. Coordenadas também constam na legenda. Esta cartografia não é uma interpretação ou homologação.</desc>
<metadata>${escape(JSON.stringify(metadata))}</metadata>
<style>@font-face{font-family:ATVDisplay;src:url('${displayData}') format('woff2')}@font-face{font-family:ATVBody;src:url('${bodyData}') format('woff2')}@font-face{font-family:ATVLabel;src:url('${labelData}') format('woff2')}
text{fill:#142139;font-family:ATVLabel,sans-serif;font-size:16px}.title{font-family:ATVDisplay,serif;font-size:42px}.sign{font-family:ATVBody,serif;font-size:21px}.label{font-size:13px;letter-spacing:2px;fill:#826124}.note,.house-label{font-size:15px;fill:#45516a}.legend{font-size:17px}.tick{stroke:#8791a2;stroke-width:1}.cusp{stroke:#abb2bd;stroke-width:1;stroke-dasharray:3 5}.angle{stroke:#95702b;stroke-width:1.6}.mc{stroke-dasharray:7 4}.body{fill:#142139;stroke:#fffdf7;stroke-width:2}.body-number{fill:#fffdf7;font-size:11px}.center{font-family:ATVBody,serif;font-size:22px}</style>
<rect width="1000" height="1360" fill="#fcfbf8"/>
${text(64, 47, 'A TUA VIDA NOS ASTROS · CARTOGRAFIA', 'label')}
${text(64, 96, product.name, 'title')}
${text(936, 47, `Revisão ${run.revision}`, 'note', 'end')}
<circle cx="500" cy="430" r="290" fill="none" stroke="#95702b" stroke-width="1.2"/>
${pieces.join('')}
${text(500, 424, 'Base preservada', 'center', 'middle')}${text(500, 450, 'experimental', 'note', 'middle')}
${text(64, 785, 'POSIÇÕES · GRAUS DE EXIBIÇÃO NÃO GARANTEM PRECISÃO', 'label')}
${legend.join('')}
<path d="M64 1157H936" fill="none" stroke="#c5b58f"/>
${text(64, 1188, 'Zero de Áries à esquerda; longitudes em sentido anti-horário.', 'note')}
${text(64, 1213, 'Trilhas separam os corpos; raio não representa distância. MC tracejado; ASC contínuo.', 'note')}
${text(64, 1238, 'Cópia pessoal: excluir na Biblioteca não apaga arquivos já baixados.', 'note')}
${text(64, 1275, `Registro ${run.id} · r${run.revision}`, 'note')}
${text(64, 1300, `${SVG_EXPORT_VERSION} · ${geo.sourceVersion}`, 'note')}
${text(64, 1325, 'Consulte a leitura na Biblioteca para proveniência, limites completos e histórico.', 'note')}
</svg>`;
	const bytes = new TextEncoder().encode(svg);
	if (bytes.length > 2_000_000) return null;
	return { svg, filename: `atv-${product.id}-${run.id}-r${run.revision}.svg` };
}
