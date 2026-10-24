import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import AstrologicalChart from './AstrologicalChart.svelte';
import { chartImageSource, chartWheelSvg } from '$lib/astrological-chart-presentation';

const svg =
	'<svg data-engine="AstroChartEngineV2/test" viewBox="0 0 900 1160"><text data-layer="heading">Mapa &amp; posições</text><path data-layer="signs" d="M 598.5000000000001 192.79045507602177" data-longitude="29.99999" /><text data-layer="legend">Sol</text></svg>';

describe('astrological chart SSR', () => {
	it('sends one wheel while the enlargement is closed and keeps its keyboard controls ready for hydration', () => {
		const body = render(AstrologicalChart, { props: { svg } }).body;
		expect(body.match(/<img\b/g)).toHaveLength(1);
		expect(body).toContain(`src="${chartImageSource(chartWheelSvg(svg))}"`);
		expect(body).not.toContain('alt="Seu mapa astral ampliado."');
		expect(body).toMatch(/<button[^>]*disabled[^>]*aria-haspopup="dialog"/);
		expect(body).toContain('aria-label="Mapa ampliado; use a rolagem para explorar" tabindex="0"');
		expect(body).toContain('Fechar');
	});

	it('preserves the complete original SVG download without JavaScript and the calculated position table', () => {
		const body = render(AstrologicalChart, {
			props: {
				svg,
				downloadName: 'mapa-original.svg',
				positions: [{ body: 'sun', name: 'Sol', longitude: 29.99999 }],
				ascendant: 350,
				midheaven: 260,
				cusps: Array.from({ length: 12 }, (_, i) => (350 + i * 30) % 360)
			}
		}).body;
		expect(body).toContain(`href="${chartImageSource(svg)}" download="mapa-original.svg"`);
		expect(body.match(/<img\b/g)).toHaveLength(1);
		expect(body).toContain('Touro');
		expect(body).toContain('0°00′');
		expect(body).toContain('Ascendente');
		expect(body).toContain('Meio do Céu');
		expect(body).toContain('Casa');
	});
});
