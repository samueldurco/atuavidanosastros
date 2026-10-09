import { tarotMethodFor, tarotMethodContract, type MethodCard } from '@atv/domain';
import type { ChartNode } from './chart-engine-v2';
import type { SavedTrial } from './reading';

export type TarotScene = {
	version: 'TarotDiagram/1.0.0';
	width: number;
	height: number;
	title: string;
	description: string;
	nodes: ChartNode[];
	cards: MethodCard[];
};
const ink = '#3d3027',
	gold = '#8b673e',
	paper = '#eddbb8';
const wrap = (text: string, limit: number) => {
	const lines: string[] = [];
	for (const word of text.split(/\s+/)) {
		if (!lines.length || `${lines.at(-1)} ${word}`.length > limit) lines.push(word);
		else lines[lines.length - 1] += ` ${word}`;
	}
	return lines;
};
/** Geometry and labels come only from the recorded method and cards. */
export function buildTarotScene(saved: Pick<SavedTrial, 'product_id' | 'calculation'>): TarotScene {
	const method = tarotMethodFor(saved.product_id),
		calculation = saved.calculation;
	if (
		!method ||
		calculation.version !== tarotMethodContract.version ||
		calculation.status !== 'recorded' ||
		calculation.data.methodVersion !== method.version
	)
		throw Error('tarot_diagram_contract');
	const cards = calculation.data.cards as MethodCard[];
	if (
		!Array.isArray(cards) ||
		cards.length !== method.positions.length ||
		new Set(cards.map((c) => c.cardId)).size !== cards.length
	)
		throw Error('tarot_diagram_cards');
	const nodes: ChartNode[] = [];
	const compact = cards.length <= 3;
	const height = compact ? 520 : 900;
	const text = (x: number, y: number, value: string, size: number, fill = ink, factId?: string) =>
		nodes.push({
			type: 'text',
			layer: 'labels',
			x,
			y,
			text: value,
			size,
			fill,
			anchor: 'middle',
			factId
		});
	nodes.push({ type: 'rect', layer: 'paper', x: 0, y: 0, w: 1000, h: height, fill: paper });
	wrap(method.name, 42).forEach((line, i) => text(500, 38 + i * 29, line, 27));
	text(
		500,
		90,
		`${cards.length} ${cards.length === 1 ? 'carta' : 'cartas'} · RWS · posições direitas`,
		17,
		gold
	);
	for (const [i, position] of method.positions.entries()) {
		const card = cards[i];
		if (
			!card ||
			card.position !== i + 1 ||
			card.positionId !== position.id ||
			card.positionName !== position.name ||
			card.orientation !== 'upright'
		)
			throw Error('tarot_diagram_position');
		const x = 60 + position.x * 8.8,
			y = compact ? 280 : 140 + position.y * 6.4,
			factId = `card-${i + 1}`;
		const cardWidth = compact ? 220 : 108,
			cardHeight = compact ? 280 : 136;
		nodes.push({
			type: 'rect',
			layer: 'cards',
			factId,
			x: x - cardWidth / 2,
			y: y - cardHeight / 2,
			w: cardWidth,
			h: cardHeight,
			rx: 8,
			fill: '#fcf8ef',
			stroke: gold,
			width: 1.7
		});
		text(
			x,
			y - (compact ? 92 : 41),
			String(i + 1).padStart(2, '0'),
			compact ? 32 : 23,
			gold,
			factId
		);
		const lines = wrap(card.name, 14);
		lines.forEach((line, j) =>
			text(
				x,
				y - (compact ? 25 : 12) + j * (compact ? 27 : 17),
				line,
				compact ? 22 : 14,
				ink,
				factId
			)
		);
		wrap(position.name, 17)
			.slice(0, 3)
			.forEach((line, j) =>
				text(
					x,
					y + (compact ? 75 : 38) + j * (compact ? 21 : 12),
					line,
					compact ? 18 : 10,
					ink,
					factId
				)
			);
	}
	text(
		500,
		height - 44,
		method.id === 'tarot-astrological-mandala'
			? 'Doze áreas simbólicas e um centro; esta mandala não é um mapa natal.'
			: 'A posição define a função da carta. Leia as relações na síntese.',
		15
	);
	return {
		version: 'TarotDiagram/1.0.0',
		width: 1000,
		height,
		title: method.name,
		description: cards.map((c) => `${c.position}. ${c.positionName}: ${c.name}`).join('; '),
		nodes,
		cards
	};
}
const xml = (value: string) =>
	value.replace(
		/[&<>"']/g,
		(c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!
	);
export function tarotSceneSvg(scene: TarotScene) {
	const nodes = scene.nodes
		.map((n) => {
			const style = `fill="${n.fill ?? 'none'}" stroke="${n.stroke ?? 'none'}" stroke-width="${n.width ?? 0}"`;
			if (n.type === 'rect')
				return `<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="${n.rx ?? 0}" ${style}/>`;
			if (n.type === 'text')
				return `<text x="${n.x}" y="${n.y}" font-size="${n.size}" text-anchor="middle" font-family="Onest, sans-serif" ${style}>${xml(n.text)}</text>`;
			throw Error('tarot_diagram_node');
		})
		.join('');
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${scene.width} ${scene.height}" role="img" aria-labelledby="tarot-title tarot-description"><title id="tarot-title">${xml(scene.title)}</title><desc id="tarot-description">${xml(scene.description)}</desc>${nodes}</svg>`;
}
