import { describe, expect, it } from 'vitest';
import { exportFixture } from '../../../tests/fixtures/product-export';
import { renderProductWebExport, WEB_EXPORT_VERSION } from './product-export';

function careerRun() {
	const run = exportFixture();
	run.productId = 'career-compass';
	run.calculation!.facts = [
		{
			id: 'angle-midheaven',
			kind: 'calculated',
			display: 'Meio do Céu: 12.000000° de Touro',
			source: 'Cálculo sintético da revisão exata'
		}
	];
	run.editorial!.title = 'Bússola de Carreira · Meio do Céu em Touro';
	run.editorial!.sections = [
		{
			title: 'Direção pública possível',
			text: 'Conferir esta hipótese com a experiência vivida.',
			evidence: ['angle-midheaven']
		}
	];
	run.calculation!.limits.push(
		'UTC aproxima UT1; ΔT usa o modelo da candidata, sem correção IERS de DUT1.'
	);
	return run;
}

describe('career compass standalone web export', () => {
	it('uses the approved MVP composition with sourced copy and print layout', () => {
		const run = careerRun();
		const result = renderProductWebExport(run);
		expect(result?.filename).toBe('atv-bussola-de-carreira-2026-09-14-rev-4.html');
		const html = result!.html;
		expect(html).toContain(`content="${WEB_EXPORT_VERSION}"`);
		expect(html).toContain('<body class="career-compass-export">');
		expect(html).toContain('font-family:CareerDisplay,Georgia,serif');
		expect(html).toContain('font-family:CareerLabel,Arial,sans-serif');
		for (const token of [
			'#f6efdf',
			'#183746',
			'#385240',
			'#95a244',
			'#e7ebcf',
			'max-width:68ch',
			'@media print'
		])
			expect(html).toContain(token);
		for (const value of [
			run.editorial!.title,
			run.editorial!.sections[0].title,
			run.editorial!.sections[0].text,
			'12,0° de Touro',
			...run.editorial!.limits
		])
			expect(html).toContain(value);
		expect(html).not.toContain(run.calculation!.facts[0].display);
		expect(html).toContain(
			'Pequenas diferenças na referência de tempo podem alterar os graus exatos.'
		);
		expect(html).not.toContain('UTC aproxima UT1');
		expect(html).toContain('href="#origem"');
		expect(html).toContain('href="#historico"');
		expect(html).toContain('<h2 id="reading-title">Sua Bússola de Carreira</h2>');
		expect(html).toContain('<h2 id="source-title">O que esta leitura considera</h2>');
		expect(html).toContain('Base desta parte: Meio do Céu');
		expect(html).toContain('href="#capitulo-1"');
		expect(html).toContain('id="capitulo-1"');
		expect(html).toContain('Capítulo 01');
		expect(html).toContain('product-art-compass product-art-card');
		expect(html).toContain('21 / ATVNA');
		expect(html).toContain('href="data:image/webp;base64,');
		expect(html).toContain('header .career-cover>p:nth-of-type(2)');
		const art = html.match(/<image[^>]+href="data:image\/webp;base64,([^"]+)"/);
		expect(art).not.toBeNull();
		expect(Buffer.byteLength(art![1], 'base64')).toBeLessThan(400_000);
		expect(html).not.toContain('href="/brand/mvp/');
		expect(html).not.toContain(run.id);
		expect(html).not.toContain(run.calculation!.version);
		expect(html).not.toContain(run.editorial!.reviewDigest);
		expect(html).not.toContain(run.calculation!.facts[0].source);
		expect(html).not.toContain('Demonstração local');
		expect(html).not.toContain('<script');
	});

	it('keeps the career styling isolated and still requires a released run', () => {
		const other = renderProductWebExport(exportFixture());
		expect(other?.html).not.toContain('career-compass-export');
		expect(renderProductWebExport({ ...careerRun(), released: false })).toBeNull();
	});
});
