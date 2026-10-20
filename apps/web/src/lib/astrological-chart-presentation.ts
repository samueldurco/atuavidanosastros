import { displayDegree } from '$lib/trials/chart-engine-v2';
import { signNames } from '$lib/trials/cartography';

/** The downloadable scene is a poster. Web readers display its wheel and HTML data separately. */
export function chartWheelSvg(svg: string): string {
	if (!svg.includes('data-engine="AstroChartEngineV2/')) return svg;
	// The natal wheel fits in this square; comparison cards can extend beyond it.
	// Use the exported card bounds, including their stroke, rather than cropping
	// them to the natal dimensions. Keep the square centered on the actual wheel.
	let radius = 410;
	for (const [rect] of svg.matchAll(/<rect\b[^>]*\bdata-layer="markers"[^>]*\/?\s*>/g)) {
		const attribute = (name: string) => {
			const value = rect.match(new RegExp(`(?:^|\\s)${name}="([^"]*)"`))?.[1];
			return value === undefined ? NaN : Number(value);
		};
		const x = attribute('x'),
			y = attribute('y'),
			width = attribute('width'),
			height = attribute('height'),
			stroke = attribute('stroke-width');
		if (![x, y, width, height].every(Number.isFinite)) continue;
		const padding = 4 + (Number.isFinite(stroke) ? stroke / 2 : 0);
		radius = Math.max(
			radius,
			450 - x + padding,
			x + width - 450 + padding,
			450 - y + padding,
			y + height - 450 + padding
		);
	}
	radius = Math.ceil(radius);
	const viewBox = `${450 - radius} ${450 - radius} ${radius * 2} ${radius * 2}`;
	return (
		svg
			.replace(/viewBox="[^"]*"/, `viewBox="${viewBox}"`)
			.replace(
				/<(rect|path|circle|line|text)\b[^>]*\bdata-layer="(?:paper|heading|legend)"[^>]*(?:\/>|>[^<]*<\/\1>)/g,
				''
			)
			.replace(
				'As posições constam também na legenda textual.',
				'As posições estão na tabela junto ao mapa.'
			)
			// Path coordinates are display geometry. Stable precision avoids SSR/client
			// trigonometric rounding differences without changing calculated longitudes.
			.replace(
				/\bd="([^"]*)"/g,
				(_, path: string) =>
					`d="${path.replace(/[-+]?(?:\d*\.)?\d+(?:[eE][-+]?\d+)?/g, (coordinate) =>
						String(Math.round(Number(coordinate) * 1000) / 1000)
					)}"`
			)
	);
}

export function chartImageSource(svg: string): string {
	return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function chartPosition(longitude: number, cusps: number[] = []) {
	const degree = displayDegree(longitude);
	const house =
		cusps.length === 12
			? cusps.findIndex(
					(cusp, index) =>
						(longitude - cusp + 360) % 360 < (cusps[(index + 1) % 12] - cusp + 360) % 360
				) + 1
			: 0;
	return {
		sign: signNames[degree.sign],
		degree: `${degree.degree}°${String(degree.minute).padStart(2, '0')}′`,
		house: house || null
	};
}
