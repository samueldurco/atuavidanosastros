import { rgb, type PDFPage, type PDFFont } from 'pdf-lib';
import type { ChartScene } from './chart-engine-v2';

const color = (value?: string) =>
	!value || value === 'none'
		? undefined
		: rgb(
				parseInt(value.slice(1, 3), 16) / 255,
				parseInt(value.slice(3, 5), 16) / 255,
				parseInt(value.slice(5, 7), 16) / 255
			);
/** Render the same scene used by SVG. Only page coordinates and font metrics differ. */
export function drawChartScenePdf(
	page: PDFPage,
	scene: ChartScene,
	font: PDFFont,
	x: number,
	top: number,
	width: number
) {
	const scale = width / scene.width;
	for (const n of scene.nodes) {
		const px = x + n.x * scale,
			py = top - n.y * scale;
		const common = {
			color: color(n.fill),
			borderColor: color(n.stroke),
			borderWidth: (n.stroke ? (n.width ?? 1) : 0) * scale,
			opacity: n.opacity ?? 1
		};
		if (n.type === 'line')
			page.drawLine({
				start: { x: px, y: py },
				end: { x: x + n.x2 * scale, y: top - n.y2 * scale },
				color: color(n.stroke),
				thickness: (n.width ?? 1) * scale,
				dashArray: n.dash?.map((d) => d * scale),
				opacity: n.opacity ?? 1
			});
		else if (n.type === 'circle') page.drawCircle({ x: px, y: py, size: n.r * scale, ...common });
		else if (n.type === 'rect') {
			const r = n.rx ?? 0,
				w = n.w,
				h = n.h;
			const d = `M ${r} 0 L ${w - r} 0 Q ${w} 0 ${w} ${r} L ${w} ${h - r} Q ${w} ${h} ${w - r} ${h} L ${r} ${h} Q 0 ${h} 0 ${h - r} L 0 ${r} Q 0 0 ${r} 0 Z`;
			page.drawSvgPath(d, { x: px, y: py, scale, ...common });
		} else if (n.type === 'path')
			page.drawSvgPath(n.d, { x: px, y: py, scale: n.scale * scale, ...common });
		else {
			const size = n.size * scale;
			const text = n.text.replace(/′/g, "'");
			page.drawText(text, {
				x: px - (n.anchor === 'start' ? 0 : font.widthOfTextAtSize(text, size) / 2),
				y: py,
				font,
				size,
				color: color(n.fill),
				opacity: n.opacity ?? 1
			});
		}
	}
	return scene.height * scale;
}
