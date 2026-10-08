import { longitudePoint } from '../product-cartography';
import { bodyGlyphs, bodyNames, signNames, trialGeometry } from './cartography';
import type { SavedTrial } from './reading';
import {
	calculateCrossAspects,
	type AspectPolicy,
	type AspectPosition,
	type CrossAspectCalculation
} from '@atv/astrology';
import type { WeekContact, WeekDay } from './reconstruction/week-facts';

export const CHART_ENGINE_VERSION = 'AstroChartEngineV2/2.0.0';
type Style = { stroke?: string; fill?: string; width?: number; dash?: number[]; opacity?: number };
type Base = Style & { layer: string; factId?: string };
export type ChartNode = Base &
	(
		| { type: 'circle'; x: number; y: number; r: number }
		| { type: 'line'; x: number; y: number; x2: number; y2: number }
		| { type: 'rect'; x: number; y: number; w: number; h: number; rx?: number }
		| { type: 'path'; x: number; y: number; d: string; scale: number }
		| {
				type: 'text';
				x: number;
				y: number;
				text: string;
				size: number;
				anchor?: 'middle' | 'start';
		  }
	);
export type ChartScene = {
	version: typeof CHART_ENGINE_VERSION;
	width: number;
	height: number;
	title: string;
	nodes: ChartNode[];
	markers: { body: string; longitude: number; x: number; y: number; box: Box }[];
};
type Box = { x: number; y: number; w: number; h: number };
export type ChartOptions = {
	houses?: boolean;
	degrees?: boolean;
	aspects?: 'all' | 'major' | 'harmonious' | 'tensions' | 'none';
	person?: 'first' | 'second';
	selectedFactId?: string;
	mode?: 'natal' | 'cross';
	weekDay?: number;
	solarView?: 'return' | 'natal';
};
export const chartColors = {
	paper: '#faf6ed',
	ink: '#24374b',
	gold: '#967536',
	muted: '#596674',
	blue: '#365d7d',
	red: '#99513d'
};
// Original vector outlines keep zodiac symbols identical in browser, SVG and PDF.
export const zodiacGlyphs = [
	'M 0 10 L 0 -2 C 0 -15 -14 -14 -10 -3 M 0 -2 C 0 -15 14 -14 10 -3',
	'M -8 -11 Q 0 1 8 -11 M 0 -4 A 7 7 0 1 1 0 10 A 7 7 0 1 1 0 -4',
	'M -9 -10 Q 0 -6 9 -10 M -9 10 Q 0 6 9 10 M -5 -8 L -5 8 M 5 -8 L 5 8',
	'M -9 -5 Q 0 -14 9 -5 M 9 5 Q 0 14 -9 5 M -6 -5 A 3 3 0 1 1 -6 1 A 3 3 0 1 1 -6 -5 M 6 -1 A 3 3 0 1 1 6 5 A 3 3 0 1 1 6 -1',
	'M -5 2 A 4 4 0 1 1 -5 10 A 4 4 0 1 1 -5 2 M -3 3 C -14 -10 8 -15 6 -3 C 2 5 3 12 10 8',
	'M -10 -8 L -10 9 M -10 -4 Q -5 -12 -4 -4 L -4 9 M -4 -4 Q 1 -12 2 -4 L 2 8 M 2 -4 Q 11 -11 9 1 Q 7 9 0 10 M 5 -1 L 10 9',
	'M -11 8 L 11 8 M -11 1 L -5 1 A 5 5 0 0 1 5 1 L 11 1',
	'M -11 -8 L -11 9 M -11 -4 Q -6 -12 -5 -4 L -5 9 M -5 -4 Q 0 -12 1 -4 L 1 4 Q 1 10 10 8 M 7 4 L 11 8 L 8 12',
	'M -9 9 L 10 -10 M 2 -10 L 10 -10 L 10 -2 M -6 -5 L 5 6',
	'M -11 -8 L -6 7 L -1 -5 L 4 4 C 14 -10 13 14 4 10 Q -1 9 4 4',
	'M -11 -5 L -7 -9 L -2 -3 L 3 -9 L 8 -3 L 12 -7 M -11 7 L -7 3 L -2 9 L 3 3 L 8 9 L 12 5',
	'M -8 -11 Q 2 0 -8 11 M 8 -11 Q -2 0 8 11 M -11 0 L 11 0'
];

/** Round only the displayed degree; carry both sign and zodiac at 30° and 360°. */
export function displayDegree(longitude: number) {
	if (!Number.isFinite(longitude) || longitude < 0 || longitude >= 360)
		throw Error('chart_longitude_invalid');
	const minutes = Math.round(longitude * 60) % 21600;
	return {
		sign: Math.floor(minutes / 1800),
		degree: Math.floor((minutes % 1800) / 60),
		minute: minutes % 60
	};
}
export function chartDegree(longitude: number) {
	const d = displayDegree(longitude);
	return `${d.degree}°${String(d.minute).padStart(2, '0')}′ ${signNames[d.sign]}`;
}
export const boxesOverlap = (a: Box, b: Box) =>
	a.x < b.x + b.w + 4 && a.x + a.w + 4 > b.x && a.y < b.y + b.h + 4 && a.y + a.h + 4 > b.y;

/** Layout never changes a longitude. A leader connects every displaced label to its true point. */
export function placeChartMarkers(
	positions: { body: string; longitude: number }[],
	protectedBoxes: Box[] = [],
	radii: number[] = [225, 160, 95, 30]
) {
	const placed: ChartScene['markers'] = [];
	for (const p of [...positions].sort(
		(a, b) => a.longitude - b.longitude || a.body.localeCompare(b.body)
	)) {
		let chosen: ChartScene['markers'][number] | undefined;
		const candidates: { radius: number; offset: number; cost: number }[] = [];
		for (const radius of radii) {
			for (const offset of [
				0,
				...Array.from({ length: 9 }, (_, i) => (i + 1) * 20).flatMap((a) => [a, -a])
			])
				candidates.push({
					radius,
					offset,
					cost: Math.abs(offset) * 3 + Math.abs(radii[0] - radius)
				});
		}
		for (const candidate of candidates.sort((a, b) => a.cost - b.cost)) {
			const { x, y } = longitudePoint(
				(p.longitude + candidate.offset + 360) % 360,
				candidate.radius,
				450,
				450
			);
			const box = { x: x - 40, y: y - 17, w: 80, h: 59 };
			if (
				placed.every((q) => !boxesOverlap(box, q.box)) &&
				protectedBoxes.every((q) => !boxesOverlap(box, q))
			) {
				chosen = { ...p, x, y, box };
				break;
			}
		}
		if (!chosen) throw Error('chart_label_layout_failed');
		placed.push(chosen);
	}
	return placed;
}

export function buildChartScene(saved: SavedTrial, options: ChartOptions = {}): ChartScene {
	if (saved.calculation.version === 'atv-private-solar-synthesis/4.0.0') {
		const natalView = options.solarView === 'natal' || options.person === 'second';
		const data = saved.calculation.data;
		const houses = data.returnHouses as { ascendant: number | null; midheaven: number | null };
		const native = {
			...saved,
			product_id: 'birth-chart',
			calculation: natalView
				? (data.natal as SavedTrial['calculation'])
				: {
						...saved.calculation,
						version: 'atv-solar-chart/1.0.0',
						data: {
							positions: data.returnPositions,
							houses: data.returnHouses,
							angles: { ascendant: houses.ascendant, midheaven: houses.midheaven },
							privateAspects: data.annualGeometry
						}
					}
		};
		const mapFact = (id: string) =>
			natalView ? id : id.replace(/^position-/, 'return-').replace(/^angle-/, 'return-');
		const selectedFactId = natalView
			? options.selectedFactId
			: options.selectedFactId
					?.replace(/^return-(ascendant|midheaven)$/, 'angle-$1')
					.replace(/^return-/, 'position-');
		const scene = buildChartScene(native, {
			...options,
			person: undefined,
			selectedFactId,
			mode: 'natal'
		});
		scene.title = natalView ? 'Mapa natal · referência do ciclo' : 'Revolução Solar · carta anual';
		for (const node of scene.nodes) {
			if (node.factId) node.factId = mapFact(node.factId);
			if (node.type === 'text' && node.layer === 'heading') {
				if (node.size === 24) node.text = scene.title;
				else if (!natalView)
					node.text = `Retorno em ${String(data.returnInstant).replace('T', ' ').replace('Z', ' UTC')}`;
			}
		}
		return scene;
	}
	const synastry = [
		'atv-private-synastry-synthesis/4.0.0',
		'atv-private-couple-dossier-synthesis/4.0.0'
	].includes(saved.calculation.version);
	if (synastry && options.mode !== 'natal' && !options.person)
		return buildDateChartScene(saved, options, true);
	if (synastry && options.person) {
		const i = options.person === 'first' ? 0 : 1;
		const native = {
			...saved,
			product_id: 'birth-chart',
			calculation: (saved.calculation.data.sources as SavedTrial['calculation'][])[i]
		};
		const scene = buildChartScene(native, { ...options, person: undefined, mode: 'natal' });
		scene.title = `Mapa da pessoa ${i === 0 ? 'A' : 'B'}`;
		for (const node of scene.nodes) {
			if (node.factId) node.factId = `person-${i === 0 ? 'a' : 'b'}-${node.factId}`;
			if (node.type === 'text' && node.layer === 'heading' && node.size === 24)
				node.text = scene.title;
		}
		return scene;
	}
	if (
		['atv-private-date-synthesis/4.0.0', 'atv-private-horoscope-synthesis/4.0.0'].includes(
			saved.calculation.version
		) &&
		options.mode !== 'natal' &&
		!options.person
	)
		return buildDateChartScene(saved, options);
	if (
		saved.calculation.version === 'atv-private-week-synthesis/4.0.0' &&
		options.mode !== 'natal'
	) {
		const days = saved.calculation.data.days as WeekDay[];
		const index = options.weekDay ?? 0;
		if (!Number.isInteger(index) || !days[index]) throw Error('week_chart_day_invalid');
		const base = saved.calculation.data.base as SavedTrial['calculation'];
		const geometry = calculateCrossAspects(
			days[index].positions,
			saved.calculation.data.positions as AspectPosition[],
			base.data.policy as AspectPolicy
		);
		return buildDateChartScene(saved, options, false, { geometry, day: days[index], index });
	}
	const g = trialGeometry(saved, options.person);
	const { paper, ink, gold, muted, blue, red } = chartColors;
	const career = ['career-compass', 'purpose-career', 'midheaven', 'direction-journey'].includes(
		saved.product_id
	);
	const scene: ChartScene = {
		version: CHART_ENGINE_VERSION,
		width: 900,
		height: 1100,
		title: options.person
			? `Mapa individual · ${options.person === 'first' ? 'Pessoa A' : 'Pessoa B'}`
			: career
				? 'Seu mapa · contribuição e trabalho'
				: 'Seu mapa natal',
		nodes: [],
		markers: []
	};
	const add = (node: ChartNode) => scene.nodes.push(node);
	const line = (a: number, r1: number, r2: number, layer: string, stroke = gold, width = 0.7) => {
		const p = longitudePoint(a, r1, 450, 450),
			q = longitudePoint(a, r2, 450, 450);
		add({ type: 'line', ...p, x2: q.x, y2: q.y, stroke, width, layer });
	};
	const text = (
		x: number,
		y: number,
		value: string,
		size = 14,
		layer = 'labels',
		fill = ink,
		anchor: 'middle' | 'start' = 'middle'
	) => add({ type: 'text', x, y, text: value, size, layer, fill, anchor });
	add({
		type: 'rect',
		x: 18,
		y: 18,
		w: 864,
		h: 1064,
		rx: 26,
		fill: paper,
		stroke: gold,
		width: 1,
		layer: 'paper'
	});
	text(450, 62, scene.title, 24, 'heading');
	text(450, 87, 'Zodíaco tropical · posições do cálculo salvo', 12, 'heading', muted);
	for (const r of [280, 297, 337])
		add({
			type: 'circle',
			x: 450,
			y: 450,
			r,
			stroke: gold,
			fill: 'none',
			width: r === 280 ? 1.3 : 0.65,
			layer: 'zodiac'
		});
	for (let a = 0; a < 360; a++)
		line(
			a,
			a % 30 === 0 ? 280 : a % 5 === 0 ? 286 : 292,
			297,
			'degrees',
			gold,
			a % 30 === 0 ? 1.2 : 0.65
		);
	signNames.forEach((name, i) => {
		line(i * 30, 297, 337, 'zodiac');
		const p = longitudePoint(i * 30 + 15, 316, 450, 450),
			q = longitudePoint(i * 30 + 15, 358, 450, 450);
		add({
			type: 'path',
			...p,
			d: zodiacGlyphs[i],
			scale: 1.2,
			stroke: ink,
			width: 1.4,
			layer: 'zodiac'
		});
		text(q.x, q.y + 4, name, 13, 'zodiac');
	});
	if (options.houses !== false && g.houses.status === 'ok')
		g.houses.cusps.forEach((a, i) => {
			line(a, 35, 279, 'houses', gold, 0.6);
			const next = g.houses.cusps[(i + 1) % 12],
				p = longitudePoint((a + ((next - a + 360) % 360) / 2) % 360, 265, 450, 450);
			text(p.x, p.y + 4, String(i + 1), 12, 'houses', muted);
		});
	const filter = options.aspects ?? 'major';
	g.aspects
		.filter(
			(a) =>
				filter !== 'none' &&
				(filter === 'all' ||
					filter === 'major' ||
					(filter === 'tensions'
						? ['square', 'opposition'].includes(a.kind)
						: ['sextile', 'trine'].includes(a.kind)))
		)
		.forEach((a) => {
			const p = g.positions.find((p) => p.body === a.first)!,
				q = g.positions.find((p) => p.body === a.second)!;
			const start = longitudePoint(p.longitude, 278, 450, 450),
				end = longitudePoint(q.longitude, 278, 450, 450);
			const tense = ['square', 'opposition'].includes(a.kind);
			add({
				type: 'line',
				...start,
				x2: end.x,
				y2: end.y,
				stroke: tense ? red : a.kind === 'conjunction' ? gold : blue,
				width: 0.9,
				dash: tense ? [5, 4] : undefined,
				opacity: 0.62,
				layer: 'aspects'
			});
		});
	const axes: { name: string; longitude: number; factId: string }[] = [];
	if (g.angles.ascendant !== null)
		axes.push(
			{ name: 'ASC', longitude: g.angles.ascendant, factId: 'angle-ascendant' },
			{ name: 'DSC', longitude: (g.angles.ascendant + 180) % 360, factId: 'angle-ascendant' }
		);
	if (g.angles.midheaven !== null)
		axes.push(
			{ name: 'MC', longitude: g.angles.midheaven, factId: 'angle-midheaven' },
			{ name: 'IC', longitude: (g.angles.midheaven + 180) % 360, factId: 'angle-midheaven' }
		);
	axes.forEach((a) => {
		line(a.longitude, 0, 280, 'angles', gold, a.name === 'MC' && career ? 2 : 1.3);
		const p = longitudePoint(a.longitude, 255, 450, 450);
		add({
			type: 'rect',
			x: p.x - 18,
			y: p.y - 9,
			w: 36,
			h: 18,
			rx: 4,
			fill: paper,
			layer: 'angles'
		});
		text(p.x, p.y + 4, a.name, 12, 'angles', ink);
	});
	const protectedBoxes = scene.nodes.flatMap((n): Box[] =>
		n.type === 'rect' && n.layer === 'angles' ? [{ x: n.x, y: n.y, w: n.w, h: n.h }] : []
	);
	if (g.houses.status === 'ok')
		g.houses.cusps.forEach((a, i) => {
			const next = g.houses.cusps[(i + 1) % 12],
				p = longitudePoint((a + ((next - a + 360) % 360) / 2) % 360, 265, 450, 450);
			protectedBoxes.push({ x: p.x - 8, y: p.y - 9, w: 16, h: 18 });
		});
	scene.markers = placeChartMarkers(g.positions, protectedBoxes);
	for (const p of scene.markers) {
		const truePoint = longitudePoint(p.longitude, 280, 450, 450),
			factId = `position-${p.body}`;
		add({
			type: 'line',
			...truePoint,
			x2: p.x,
			y2: p.y,
			stroke: gold,
			width: 0.85,
			layer: 'leaders',
			factId
		});
		add({ type: 'circle', ...truePoint, r: 2.6, fill: ink, layer: 'positions', factId });
		add({
			type: 'rect',
			...p.box,
			rx: 9,
			fill: paper,
			stroke: options.selectedFactId === factId ? ink : gold,
			width: options.selectedFactId === factId ? 2 : 0.5,
			layer: 'markers',
			factId
		});
		add({
			type: 'path',
			x: p.x,
			y: p.y,
			d: bodyGlyphs[p.body],
			scale: 0.8,
			stroke: ink,
			width: 1.6,
			layer: 'markers',
			factId
		});
		text(p.x, p.y + 22, bodyNames[p.body], 11, 'markers');
		if (options.degrees !== false) {
			const d = displayDegree(p.longitude);
			text(
				p.x,
				p.y + 36,
				`${d.degree}°${String(d.minute).padStart(2, '0')}′`,
				10,
				'markers',
				muted
			);
		}
	}
	text(450, 835, 'Posições e referências', 18, 'legend');
	g.positions.forEach((p, i) => {
		const x = i % 2 === 0 ? 76 : 466,
			y = 867 + Math.floor(i / 2) * 29;
		add({
			type: 'path',
			x: x + 9,
			y: y - 5,
			d: bodyGlyphs[p.body],
			scale: 0.6,
			stroke: ink,
			width: 1.5,
			layer: 'legend'
		});
		const retro = (p as { retrograde?: boolean }).retrograde ? ' · retrógrado' : '';
		text(
			x + 28,
			y,
			`${bodyNames[p.body]} · ${chartDegree(p.longitude)}${retro}`,
			13,
			'legend',
			ink,
			'start'
		);
	});
	const y = 867 + Math.ceil(g.positions.length / 2) * 29;
	if (g.angles.ascendant !== null)
		text(76, y, `ASC · ${chartDegree(g.angles.ascendant)}`, 12, 'legend', ink, 'start');
	if (g.angles.midheaven !== null)
		text(466, y, `MC · ${chartDegree(g.angles.midheaven)}`, 12, 'legend', ink, 'start');
	text(
		450,
		1030,
		'Azul: sextil / trígono · tracejado terracota: quadratura / oposição · ouro: conjunção',
		11,
		'legend',
		muted
	);
	text(
		450,
		1050,
		'Os traços-guia preservam a posição real quando os símbolos precisam ser afastados.',
		11,
		'legend',
		muted
	);
	text(
		450,
		1068,
		'Graus arredondados só na apresentação. Precisão do cálculo ainda experimental.',
		10,
		'legend',
		muted
	);
	return scene;
}

/** Directed contacts use each source's actual longitude; houses belong only to the natal map. */
function buildDateChartScene(
	saved: SavedTrial,
	options: ChartOptions,
	relationship = false,
	week?: { geometry: CrossAspectCalculation; day: WeekDay; index: number }
): ChartScene {
	const geometry =
		week?.geometry ??
		(saved.calculation.data[
			relationship ? 'relationshipGeometry' : 'transitGeometry'
		] as CrossAspectCalculation);
	if (
		!geometry ||
		geometry.pairsEvaluated !== 100 ||
		geometry.inputPositions.first.length !== 10 ||
		geometry.inputPositions.second.length !== 10
	)
		throw Error('date_chart_geometry_invalid');
	const scene = buildChartScene(saved, {
		...options,
		mode: 'natal',
		aspects: 'none',
		person: relationship ? 'second' : undefined
	});
	scene.title = week
		? 'Sua semana · céu da data e mapa natal'
		: relationship
			? `${saved.product_id === 'couple-dossier' ? 'Dossiê do Casal' : 'Sinastria'} · mapas em relação`
			: saved.product_id === 'horoscope'
				? 'Seu horóscopo · céu da data e mapa natal'
				: 'Céu da data e mapa natal';
	scene.height = 1280;
	scene.nodes = scene.nodes.filter(
		(n) => !['heading', 'positions', 'markers', 'leaders', 'legend'].includes(n.layer)
	);
	const paper = scene.nodes.find((n) => n.type === 'rect' && n.layer === 'paper');
	if (paper?.type === 'rect') paper.h = 1244;
	const { ink, gold, muted, blue, red } = chartColors;
	const add = (n: ChartNode) => scene.nodes.push(n);
	const text = (
		x: number,
		y: number,
		value: string,
		size = 13,
		layer = 'legend',
		fill = ink,
		anchor: 'middle' | 'start' = 'middle'
	) => add({ type: 'text', x, y, text: value, size, layer, fill, anchor });
	text(450, 61, scene.title, 24, 'heading');
	text(
		450,
		85,
		week
			? `${week.day.date} · amostra às 12h UTC · sete datas preservadas`
			: relationship
				? 'Pessoa A no anel externo · pessoa B no anel interno'
				: `${saved.input.targetDate} · amostra às 12h UTC`,
		13,
		'heading',
		muted
	);
	for (const [r, stroke] of [
		[230, blue],
		[274, gold]
	] as const)
		add({
			type: 'circle',
			x: 450,
			y: 450,
			r,
			stroke,
			width: 1,
			fill: 'none',
			layer: 'comparison-rings'
		});
	const selected = new Set(saved.reading.editorial?.selection.map((s) => s.factId) ?? []);
	geometry.aspects.forEach((a, i) => {
		const aspectFactId = week
			? ((saved.calculation.data.contacts as WeekContact[]).find(
					(c) => c.transit === a.first && c.natal === a.second && c.aspect === a.kind
				)?.id ?? `week-day-${week.index + 1}`)
			: relationship
				? `cross-${a.first}-${a.second}`
				: `${saved.product_id === 'horoscope' ? 'horoscope' : 'date'}-transit-${i}`;
		const filter = options.aspects ?? 'major';
		const tense = ['square', 'opposition'].includes(a.kind);
		if (
			filter === 'none' ||
			(filter === 'major' && selected.size && !selected.has(aspectFactId)) ||
			(filter === 'tensions' && !tense) ||
			(filter === 'harmonious' && !['sextile', 'trine'].includes(a.kind))
		)
			return;
		const from = geometry.inputPositions.first.find((p) => p.body === a.first)!;
		const to = geometry.inputPositions.second.find((p) => p.body === a.second)!;
		const p = longitudePoint(from.longitude, 274, 450, 450),
			q = longitudePoint(to.longitude, 230, 450, 450);
		add({
			type: 'line',
			...p,
			x2: q.x,
			y2: q.y,
			stroke: tense ? red : a.kind === 'conjunction' ? gold : blue,
			width: 1.5,
			dash: tense ? [5, 4] : undefined,
			opacity: 0.8,
			layer: 'aspects',
			factId: aspectFactId
		});
	});
	const protectedBoxes: Box[] = [
		{ x: 150, y: 31, w: 600, h: 65 },
		{ x: 40, y: 842, w: 820, h: 50 }
	];
	const natal = placeChartMarkers(
		geometry.inputPositions.second.map((p) => ({ ...p, body: `natal:${p.body}` })),
		[],
		[190, 130, 70]
	);
	const sample = placeChartMarkers(
		geometry.inputPositions.first.map((p) => ({ ...p, body: `sample:${p.body}` })),
		protectedBoxes,
		[392, 410]
	);
	scene.markers = [...natal, ...sample];
	for (const marker of scene.markers) {
		const [role, body] = marker.body.split(':');
		const isNatal = role === 'natal',
			color = isNatal ? blue : gold,
			factId = week
				? isNatal
					? `position-${body}`
					: `week-day-${week.index + 1}`
				: relationship
					? `person-${isNatal ? 'b' : 'a'}-position-${body}`
					: `${isNatal ? 'position' : 'sample'}-${body}`;
		const p = longitudePoint(marker.longitude, isNatal ? 230 : 274, 450, 450);
		add({
			type: 'line',
			...p,
			x2: marker.x,
			y2: marker.y,
			stroke: color,
			width: 0.8,
			layer: 'leaders',
			factId
		});
		add({ type: 'circle', ...p, r: 3, fill: color, layer: 'positions', factId });
		add({
			type: 'rect',
			...marker.box,
			rx: 9,
			fill: chartColors.paper,
			stroke: color,
			width: options.selectedFactId === factId ? 2 : 0.65,
			layer: 'markers',
			factId
		});
		add({
			type: 'path',
			x: marker.x,
			y: marker.y,
			d: bodyGlyphs[body],
			scale: 0.8,
			stroke: color,
			width: 1.6,
			layer: 'markers',
			factId
		});
		text(
			marker.x,
			marker.y + 22,
			`${bodyNames[body]} · ${relationship ? (isNatal ? 'B' : 'A') : isNatal ? 'natal' : 'data'}`,
			10,
			'markers',
			color
		);
		if (options.degrees !== false) {
			const d = displayDegree(marker.longitude);
			text(
				marker.x,
				marker.y + 36,
				`${d.degree}°${String(d.minute).padStart(2, '0')}′`,
				10,
				'markers',
				muted
			);
		}
	}
	text(
		450,
		865,
		relationship ? 'Azul: pessoa B · ouro: pessoa A' : 'Azul: mapa natal · ouro: céu da data',
		16
	);
	text(
		450,
		887,
		relationship
			? 'Casas e eixos desenhados pertencem à pessoa B, quando disponíveis.'
			: 'Casas e eixos pertencem ao natal; a amostra da data não calcula casas próprias.',
		11,
		'legend',
		muted
	);
	text(80, 925, relationship ? 'PESSOA B' : 'MAPA NATAL', 12, 'legend', blue, 'start');
	text(470, 925, relationship ? 'PESSOA A' : 'CÉU DA DATA', 12, 'legend', gold, 'start');
	for (const [j, list] of [geometry.inputPositions.second, geometry.inputPositions.first].entries())
		list.forEach((p, i) =>
			text(
				j ? 470 : 80,
				950 + i * 24,
				`${bodyNames[p.body]} · ${chartDegree(p.longitude)}`,
				12,
				'legend',
				ink,
				'start'
			)
		);
	text(
		450,
		1215,
		'Contatos principais: seleção da leitura · demais filtros: contatos do cálculo salvo.',
		11,
		'legend',
		muted
	);
	text(
		450,
		1236,
		'Traços-guia preservam as posições; graus arredondados só na apresentação.',
		11,
		'legend',
		muted
	);
	return scene;
}

const xml = (s: string) =>
	s.replace(
		/[&<>"']/g,
		(c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
	);
export function chartSceneSvg(scene: ChartScene) {
	const nodes = scene.nodes
		.map((n) => {
			const style = `fill="${n.fill ?? 'none'}" stroke="${n.stroke ?? 'none'}" stroke-width="${n.width ?? 1}"${n.dash ? ` stroke-dasharray="${n.dash.join(' ')}"` : ''}${n.opacity ? ` opacity="${n.opacity}"` : ''} data-layer="${n.layer}"${n.factId ? ` data-fact-id="${xml(n.factId)}"` : ''}`;
			if (n.type === 'circle') return `<circle cx="${n.x}" cy="${n.y}" r="${n.r}" ${style}/>`;
			if (n.type === 'line')
				return `<line x1="${n.x}" y1="${n.y}" x2="${n.x2}" y2="${n.y2}" ${style}/>`;
			if (n.type === 'rect')
				return `<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="${n.rx ?? 0}" ${style}/>`;
			if (n.type === 'path')
				return `<path d="${n.d}" transform="translate(${n.x} ${n.y}) scale(${n.scale})" stroke-linecap="round" stroke-linejoin="round" ${style}/>`;
			return `<text x="${n.x}" y="${n.y}" font-size="${n.size}" text-anchor="${n.anchor ?? 'middle'}" ${style}>${xml(n.text)}</text>`;
		})
		.join('');
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${scene.width} ${scene.height}" role="img" aria-labelledby="chart-title chart-description" data-engine="${scene.version}" style="font-family:Onest,Arial,sans-serif"><title id="chart-title">${xml(scene.title)}</title><desc id="chart-description">Zodíaco tropical com zero de Áries à esquerda. Planetas quando disponíveis, signos e graus. As posições constam também na legenda textual. Linhas tracejadas distinguem tensões sem depender da cor.</desc>${nodes}</svg>`;
}
