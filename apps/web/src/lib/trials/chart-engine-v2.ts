import { longitudePoint } from '../product-cartography';
import { mvpThemes } from '../data/mvp-visual';
import { bodyGlyphs, bodyNames, signNames, trialGeometry } from './cartography';
import type { SavedTrial } from './reading';
import {
	calculateCrossAspects,
	type AspectPolicy,
	type AspectPosition,
	type CrossAspectCalculation
} from '@atv/astrology';
import type { WeekContact, WeekDay } from './reconstruction/week-facts';
import type { CalendarDay, CalendarWindow, CalendarEvent } from './reconstruction/calendar-facts';

export const CHART_ENGINE_VERSION = 'AstroChartEngineV2/2.1.0';
export const NATAL_ASPECT_RADIUS = 152;
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
	paper: '#f6efdf',
	ink: '#183746',
	gold: '#a36632',
	muted: '#596674',
	blue: '#174c69',
	red: '#99513d'
};
// Career readings retain the shared factual geometry and the approved universe palette.
// Thin chart lines use a darker ochre for legibility on paper; the frame uses the approved accent.
export const careerChartColors = {
	...chartColors,
	ink: mvpThemes.proposito.ink,
	paper: '#f6efdf',
	accent: mvpThemes.proposito.accent,
	gold: '#a77c2e',
	muted: '#596365'
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
	radii: number[] = [225, 160, 95, 30],
	compact = false
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
				...Array.from({ length: compact ? 36 : 9 }, (_, i) => (i + 1) * (compact ? 5 : 20)).flatMap(
					(a) => [a, -a]
				)
			])
				candidates.push({
					radius,
					offset,
					cost: Math.abs(offset) * (compact ? 8 : 3) + Math.abs(radii[0] - radius)
				});
		}
		for (const candidate of candidates.sort((a, b) => a.cost - b.cost)) {
			const { x, y } = longitudePoint(
				(p.longitude + candidate.offset + 360) % 360,
				candidate.radius,
				450,
				450
			);
			const box = compact
				? { x: x - 23, y: y - 17, w: 46, h: 43 }
				: { x: x - 40, y: y - 17, w: 80, h: 59 };
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
				if (node.size === 25) node.text = scene.title;
				else if (!natalView && node.y === 84)
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
			if (node.type === 'text' && node.layer === 'heading' && node.size === 25)
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
		[
			'atv-private-week-synthesis/4.0.0',
			'atv-private-calendar-synthesis/4.0.0',
			'atv-private-thirty-day-synthesis/1.0.0'
		].includes(saved.calculation.version) &&
		options.mode !== 'natal'
	) {
		const days = saved.calculation.data.days as WeekDay[];
		const index = options.weekDay ?? 0;
		if (!Number.isInteger(index) || !days[index]) throw Error('week_chart_day_invalid');
		const base = saved.calculation.data.base as SavedTrial['calculation'];
		const calendar = [
			'atv-private-calendar-synthesis/4.0.0',
			'atv-private-thirty-day-synthesis/1.0.0'
		].includes(saved.calculation.version);
		const policy: AspectPolicy = calendar
			? {
					id: 'atv-calendar-observed-major-aspects',
					version: '1.0.0',
					aspects: (['conjunction', 'sextile', 'square', 'trine', 'opposition'] as const).map(
						(kind) => ({ kind, orbDegrees: 2 })
					)
				}
			: (base.data.policy as AspectPolicy);
		const geometry = calculateCrossAspects(
			days[index].positions,
			saved.calculation.data.positions as AspectPosition[],
			policy
		);
		return buildDateChartScene(saved, options, false, {
			geometry,
			day: days[index],
			index,
			calendar
		});
	}
	const g = trialGeometry(saved, options.person);
	const career = [
		'career-compass',
		'purpose-career',
		'midheaven',
		'direction-journey',
		'career-forecast-30d'
	].includes(saved.product_id);
	return buildNatalChartScene(g, options, {
		career,
		title: options.person
			? `Mapa individual · ${options.person === 'first' ? 'Pessoa A' : 'Pessoa B'}`
			: career
				? 'Seu mapa · contribuição e trabalho'
				: 'Seu mapa natal'
	});
}

/** One calculated scene for the reader, free tools, SVG and PDF. */
export function buildNatalChartScene(
	g: ReturnType<typeof trialGeometry>,
	options: ChartOptions = {},
	presentation: { career?: boolean; title?: string; subtitle?: string } = {}
): ChartScene {
	const career = presentation.career ?? false;
	const { paper, ink, gold, muted, blue, red } = career ? careerChartColors : chartColors;
	const light = '#fff8e9';
	const rule = '#c7bfac';
	const scene: ChartScene = {
		version: CHART_ENGINE_VERSION,
		width: 900,
		height: 1160,
		title: presentation.title ?? 'Seu mapa astral',
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
		h: 1124,
		rx: 8,
		fill: paper,
		stroke: career ? careerChartColors.accent : gold,
		width: career ? 2 : 1,
		layer: 'paper'
	});
	text(450, 37, 'ATVNA  ·  A TUA VIDA NOS ASTROS', 10, 'heading', '#815027');
	text(450, 64, scene.title, 25, 'heading');
	text(
		450,
		84,
		presentation.subtitle ?? 'Zodíaco tropical · posições do cálculo salvo',
		11,
		'heading',
		muted
	);
	add({ type: 'circle', x: 450, y: 450, r: 337, fill: light, layer: 'zodiac' });
	for (let i = 0; i < 12; i++) {
		const outerA = longitudePoint(i * 30, 337, 450, 450);
		const outerB = longitudePoint((i + 1) * 30, 337, 450, 450);
		const innerA = longitudePoint(i * 30, 297, 450, 450);
		const innerB = longitudePoint((i + 1) * 30, 297, 450, 450);
		add({
			type: 'path',
			x: 0,
			y: 0,
			scale: 1,
			d: `M ${outerA.x} ${outerA.y} A 337 337 0 0 0 ${outerB.x} ${outerB.y} L ${innerB.x} ${innerB.y} A 297 297 0 0 1 ${innerA.x} ${innerA.y} Z`,
			fill: i % 2 ? '#eee4d0' : '#f4ead6',
			layer: 'zodiac'
		});
	}
	for (const r of [NATAL_ASPECT_RADIUS, 280, 297, 337, 342])
		add({
			type: 'circle',
			x: 450,
			y: 450,
			r,
			stroke: r === NATAL_ASPECT_RADIUS ? rule : gold,
			fill: 'none',
			width: r === 297 ? 1.4 : 0.65,
			layer: 'zodiac'
		});
	for (let a = 0; a < 360; a++)
		line(
			a,
			a % 30 === 0 ? 280 : a % 10 === 0 ? 283 : a % 5 === 0 ? 287 : 293,
			297,
			'degrees',
			gold,
			a % 30 === 0 ? 1.4 : a % 5 === 0 ? 0.8 : 0.45
		);
	signNames.forEach((name, i) => {
		line(i * 30, 297, 337, 'zodiac');
		const p = longitudePoint(i * 30 + 15, 316, 450, 450),
			q = longitudePoint(i * 30 + 15, 362, 450, 450);
		add({
			type: 'path',
			...p,
			d: zodiacGlyphs[i],
			scale: 1.2,
			stroke: career ? ink : blue,
			width: 1.65,
			layer: 'zodiac'
		});
		text(q.x, q.y + 4, name, 13, 'zodiac');
	});
	if (options.houses !== false && g.houses.status === 'ok')
		g.houses.cusps.forEach((a, i) => {
			line(a, NATAL_ASPECT_RADIUS, 279, 'houses', rule, 0.75);
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
			const start = longitudePoint(p.longitude, NATAL_ASPECT_RADIUS, 450, 450),
				end = longitudePoint(q.longitude, NATAL_ASPECT_RADIUS, 450, 450);
			const tense = ['square', 'opposition'].includes(a.kind);
			add({
				type: 'line',
				...start,
				x2: end.x,
				y2: end.y,
				stroke: tense ? red : a.kind === 'conjunction' ? gold : blue,
				width: tense ? 1 : 1.2,
				dash: tense ? [5, 4] : undefined,
				opacity: 0.65,
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
		line(
			a.longitude,
			NATAL_ASPECT_RADIUS,
			297,
			'angles',
			gold,
			a.name === 'ASC' || a.name === 'MC' ? 1.8 : 0.9
		);
		const p = longitudePoint(a.longitude, 255, 450, 450);
		add({
			type: 'rect',
			x: p.x - 18,
			y: p.y - 9,
			w: 36,
			h: 18,
			rx: 4,
			fill: ink,
			layer: 'angles'
		});
		text(p.x, p.y + 4, a.name, 11, 'angles', light);
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
	scene.markers = placeChartMarkers(g.positions, protectedBoxes, [232, 190], true);
	for (const p of scene.markers) {
		const truePoint = longitudePoint(p.longitude, 280, 450, 450),
			factId = `position-${p.body}`;
		add({
			type: 'line',
			...truePoint,
			x2: p.x,
			y2: p.y,
			stroke: muted,
			width: 0.65,
			layer: 'leaders',
			factId
		});
		add({ type: 'circle', ...truePoint, r: 3, fill: ink, layer: 'positions', factId });
		add({
			type: 'rect',
			...p.box,
			rx: 5,
			fill: light,
			stroke: options.selectedFactId === factId ? ink : undefined,
			width: options.selectedFactId === factId ? 2 : undefined,
			layer: 'markers',
			factId
		});
		add({
			type: 'path',
			x: p.x,
			y: p.y,
			d: bodyGlyphs[p.body],
			scale: 0.9,
			stroke: ink,
			width: 1.6,
			layer: 'markers',
			factId
		});
		if (options.degrees !== false) {
			const d = displayDegree(p.longitude);
			text(
				p.x,
				p.y + 22,
				`${d.degree}°${String(d.minute).padStart(2, '0')}′`,
				10,
				'markers',
				muted
			);
		}
	}
	add({ type: 'line', x: 64, y: 822, x2: 836, y2: 822, stroke: gold, width: 1, layer: 'legend' });
	text(64, 849, 'POSIÇÕES DO SEU MAPA', 12, 'legend', ink, 'start');
	text(64, 870, 'Planeta', 10, 'legend', muted, 'start');
	text(199, 870, 'Signo · grau', 10, 'legend', muted, 'start');
	text(403, 870, 'Casa', 10, 'legend', muted);
	text(468, 870, 'Planeta', 10, 'legend', muted, 'start');
	text(603, 870, 'Signo · grau', 10, 'legend', muted, 'start');
	text(807, 870, 'Casa', 10, 'legend', muted);
	g.positions.forEach((p, i) => {
		const x = i < 5 ? 64 : 468,
			y = 896 + (i % 5) * 30;
		add({
			type: 'line',
			x,
			y: y + 9,
			x2: x + 368,
			y2: y + 9,
			stroke: rule,
			width: 0.4,
			layer: 'legend'
		});
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
		const retro = (p as { retrograde?: boolean }).retrograde ? ' R' : '';
		const d = displayDegree(p.longitude);
		text(x + 27, y, `${bodyNames[p.body]}${retro}`, 12, 'legend', ink, 'start');
		text(
			x + 135,
			y,
			`${signNames[d.sign]} · ${d.degree}°${String(d.minute).padStart(2, '0')}′`,
			12,
			'legend',
			ink,
			'start'
		);
		const house =
			g.houses.status === 'ok'
				? g.houses.cusps.findIndex(
						(cusp, index) =>
							(p.longitude - cusp + 360) % 360 <
							(g.houses.cusps[(index + 1) % 12] - cusp + 360) % 360
					) + 1
				: 0;
		text(x + 339, y, house ? String(house) : '—', 12, 'legend');
	});
	const y = 1044;
	if (g.angles.ascendant !== null)
		text(76, y, `ASC · ${chartDegree(g.angles.ascendant)}`, 12, 'legend', ink, 'start');
	if (g.angles.midheaven !== null)
		text(466, y, `MC · ${chartDegree(g.angles.midheaven)}`, 12, 'legend', ink, 'start');
	text(
		450,
		1072,
		'Azul: sextil / trígono · tracejado terracota: quadratura / oposição · ouro: conjunção',
		11,
		'legend',
		muted
	);
	text(
		450,
		1092,
		'Os traços-guia preservam a posição real quando os símbolos precisam ser afastados.',
		11,
		'legend',
		muted
	);
	text(
		450,
		1126,
		'Graus arredondados só na apresentação. Precisão do cálculo ainda experimental.',
		10,
		'legend',
		muted
	);
	text(
		450,
		1110,
		g.houses.status === 'ok'
			? 'Casas Placidus · números no anel interno e na tabela · R: retrógrado.'
			: 'Casas indisponíveis · nenhum sistema substituto.',
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
	week?: {
		geometry: CrossAspectCalculation;
		day: WeekDay | CalendarDay;
		index: number;
		calendar?: boolean;
	}
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
		? week.calendar
			? 'Seu calendário · céu da data e mapa natal'
			: 'Sua semana · céu da data e mapa natal'
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
			? `${week.day.date} · amostra às 12h UTC · ${week.calendar ? 'grade de seis horas na leitura' : 'sete datas preservadas'}`
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
	if (week?.calendar) {
		const eventIds = new Set(selected);
		selected.clear();
		for (const event of saved.calculation.data.events as CalendarEvent[])
			if (event.date === week.day.date && eventIds.has(event.id)) selected.add(event.windowId);
	}
	geometry.aspects.forEach((a, i) => {
		const aspectFactId = week?.calendar
			? ((saved.calculation.data.windows as CalendarWindow[]).find(
					(w) =>
						w.transit === a.first &&
						w.natal === a.second &&
						w.aspect === a.kind &&
						w.firstInstant <= week.day.sampleInstant &&
						w.lastInstant >= week.day.sampleInstant
				)?.id ?? `calendar-day-${week.day.date}`)
			: week
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
			(filter === 'major' && (week?.calendar || selected.size) && !selected.has(aspectFactId)) ||
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
					: week.calendar
						? `calendar-position-${week.day.date}-${body}`
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
	// Round only drawing coordinates, never saved longitudes or calculation facts.
	const coordinate = (value: number) => Math.round(value * 1000) / 1000;
	const drawingNodes: ChartNode[] = [];
	// Consecutive graduation strokes share paths so a detailed map still fits saved-result budgets.
	for (let i = 0; i < scene.nodes.length; i++) {
		const n = scene.nodes[i];
		if (n.type !== 'line' || n.layer !== 'degrees') {
			drawingNodes.push(n);
			continue;
		}
		const groups = new Map<string, ChartNode & { type: 'path' }>();
		for (; i < scene.nodes.length; i++) {
			const tick = scene.nodes[i];
			if (tick.type !== 'line' || tick.layer !== 'degrees') {
				i--;
				break;
			}
			const key = JSON.stringify([tick.stroke, tick.width, tick.opacity, tick.dash]);
			const path = groups.get(key) ?? { ...tick, type: 'path', x: 0, y: 0, scale: 1, d: '' };
			path.d += `M${coordinate(tick.x)} ${coordinate(tick.y)}L${coordinate(tick.x2)} ${coordinate(tick.y2)}`;
			groups.set(key, path);
		}
		drawingNodes.push(...groups.values());
	}
	const nodes = drawingNodes
		.map((n) => {
			const position =
				n.layer === 'positions'
					? scene.markers.find((p) => n.factId === `position-${p.body}`)
					: undefined;
			const style = `${n.fill ? `fill="${n.fill}" ` : ''}${n.stroke ? `stroke="${n.stroke}" ` : ''}${n.width !== undefined ? `stroke-width="${n.width}" ` : ''}${n.dash ? `stroke-dasharray="${n.dash.join(' ')}" ` : ''}${n.opacity !== undefined ? `opacity="${n.opacity}" ` : ''}data-layer="${n.layer}"${n.factId ? ` data-fact-id="${xml(n.factId)}"` : ''}${position ? ` data-body="${xml(position.body)}" data-longitude="${position.longitude}"` : ''}`;
			const x = coordinate(n.x),
				y = coordinate(n.y);
			if (n.type === 'circle') return `<circle cx="${x}" cy="${y}" r="${n.r}" ${style}/>`;
			if (n.type === 'line')
				return `<line x1="${x}" y1="${y}" x2="${coordinate(n.x2)}" y2="${coordinate(n.y2)}" ${style}/>`;
			if (n.type === 'rect')
				return `<rect x="${x}" y="${y}" width="${n.w}" height="${n.h}" rx="${n.rx ?? 0}" ${style}/>`;
			if (n.type === 'path')
				return `<path d="${n.d}" transform="translate(${x} ${y}) scale(${n.scale})" stroke-linecap="round" stroke-linejoin="round" ${style}/>`;
			return `<text x="${x}" y="${y}" font-size="${n.size}" text-anchor="${n.anchor ?? 'middle'}" ${style}>${xml(n.text)}</text>`;
		})
		.join('');
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${scene.width} ${scene.height}" fill="none" role="img" aria-labelledby="chart-title chart-description" data-engine="${scene.version}" style="font-family:Onest,Arial,sans-serif"><title id="chart-title">${xml(scene.title)}</title><desc id="chart-description">Zodíaco tropical. Zero de Áries à esquerda; longitudes crescem em sentido anti-horário. Planetas quando disponíveis, signos e graus. As posições constam também na legenda textual. Linhas tracejadas distinguem tensões sem depender da cor. Traços-guia unem os glifos à sua longitude real.</desc>${nodes}</svg>`;
}
