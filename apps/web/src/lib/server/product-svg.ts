import { productDefinitionFor } from '@atv/domain';
import { mvpTheme, mvpThemes } from '../data/mvp-visual';
import { parseProductRun } from '../product-run';
import { buildNatalChartScene, chartSceneSvg } from '../trials/chart-engine-v2';
export { longitudePoint } from '../product-cartography';
import bodyData from '../../../static/brand/fonts/newsreader-variable.woff2?inline';
import labelData from '../../../static/brand/fonts/onest-variable.woff2?inline';

export const SVG_EXPORT_VERSION = 'atv-svg-export/1.3.0';
export const SVG_CSP =
	"default-src 'none'; style-src 'unsafe-inline'; font-src data:; base-uri 'none'; form-action 'none'";
const escape = (value: string) =>
	value.replace(
		/[&<>"']/g,
		(c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
	);
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
const text = (x: number, y: number, value: string, attrs = '') =>
	`<text x="${x}" y="${y}" font-size="12" fill="#183746" ${attrs}>${escape(value)}</text>`;

/** The released, saved projection supplies all geometry. Missing aspects stay absent. */
export function renderProductSvg(value: unknown) {
	const run = parseProductRun(value),
		product = productDefinitionFor(run?.productId ?? '');
	const geo = run?.cartography;
	if (
		!run?.released ||
		!run.editorial ||
		!run.calculation ||
		!geo ||
		!product?.delivery.includes('svg')
	)
		return null;
	const theme = mvpThemes[mvpTheme(product.universe)];
	const scene = buildNatalChartScene(
		{
			positions: geo.positions,
			angles: geo.angles,
			houses: geo.houses,
			aspects: [],
			tracks: new Map()
		},
		{ aspects: 'none' },
		{ title: product.name, subtitle: 'Posições preservadas do cálculo salvo · zodíaco tropical' }
	);
	// This saved contract does not carry aspects; adapt the explanatory caption without deriving any.
	for (const node of scene.nodes) {
		if (node.type !== 'text' || node.layer !== 'legend') continue;
		if (node.y === 1072)
			node.text =
				'Este registro não inclui aspectos; o desenho preserva posições, eixos e casas disponíveis.';
		if (node.y === 1110 && geo.houses.status === 'not-requested')
			node.text = 'Casas não solicitadas neste produto; nenhum sistema substituto.';
	}
	if (!geo.positions.length) {
		scene.nodes = scene.nodes.filter(
			(node) => !(node.layer === 'legend' && node.type === 'text' && node.y >= 849 && node.y < 1044)
		);
		scene.nodes.push({
			type: 'text',
			x: 64,
			y: 864,
			text: 'O desenho deste produto destaca o Ascendente calculado.',
			size: 14,
			anchor: 'start',
			fill: '#183746',
			layer: 'legend'
		});
	}
	const drawing = chartSceneSvg(scene)
		.replace(/^<svg[^>]*><title[^>]*>[\s\S]*?<\/title><desc[^>]*>[\s\S]*?<\/desc>/, '')
		.replace(/<\/svg>$/, '');
	const houses =
		geo.houses.status === 'ok'
			? geo.houses.cusps
					.map((cusp, i) =>
						text(
							64 + Math.floor(i / 4) * 267,
							1214 + (i % 4) * 23,
							`Casa ${i + 1}: ${pos(cusp)}`,
							`data-house="${i + 1}" data-longitude="${cusp}"`
						)
					)
					.join('')
			: text(
					64,
					1214,
					geo.houses.status === 'not-applicable'
						? 'Casas e ASC indisponíveis no contrato; nenhum sistema substituto.'
						: 'Casas não solicitadas neste produto; nenhum sistema substituto.'
				);
	const metadata = {
		exporter: SVG_EXPORT_VERSION,
		runId: run.id,
		revision: run.revision,
		reviewDigest: run.editorial.reviewDigest,
		geometry: geo
	};
	const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1450" viewBox="0 0 900 1450" fill="none" role="img" aria-labelledby="chart-title chart-desc" lang="pt-BR" data-engine="${scene.version}">
<title id="chart-title">${escape(product.name)} — posições no mapa astral</title>
<desc id="chart-desc">Posições tropicais geocêntricas preservadas do cálculo experimental. Zero de Áries à esquerda; longitudes crescem no sentido anti-horário. Traços-guia ligam os glifos às posições reais quando precisam ser afastados. Linhas de casas e ângulos não são aspectos; este registro não inclui aspectos. Coordenadas completas preservadas nos metadados, com posições e cúspides nas legendas.</desc>
<metadata>${escape(JSON.stringify(metadata))}</metadata>
<style>@font-face{font-family:ATVEditorial;src:url('${bodyData}') format('woff2')}@font-face{font-family:ATVLabel;src:url('${labelData}') format('woff2')}text{font-family:ATVLabel,sans-serif}[data-layer="heading"]{font-family:ATVEditorial,serif}.export-rule{stroke:${theme.ink}}</style>
<rect width="900" height="1450" fill="#f6efdf"/>
${drawing}
<rect x="22" y="18" width="856" height="1414" fill="none" stroke="${theme.accent}" stroke-width="1"/>
<path d="M64 1165H836" class="export-rule" fill="none" stroke-width="1"/>
${text(64, 1190, 'CÚSPIDES · COORDENADAS DO REGISTRO')}
${houses}
${text(64, 1320, 'Cópia pessoal: excluir na Biblioteca não apaga arquivos já baixados.')}
${text(64, 1350, `Registro ${run.id} · r${run.revision}`)}
${text(64, 1374, `${SVG_EXPORT_VERSION} · ${geo.sourceVersion}`)}
${text(64, 1398, 'Consulte a leitura na Biblioteca para proveniência, limites completos e histórico.')}
</svg>`;
	if (new TextEncoder().encode(svg).length > 2_000_000) return null;
	return { svg, filename: `atv-${product.id}-${run.id}-r${run.revision}.svg` };
}
