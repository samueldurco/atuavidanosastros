import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { synastryReaderFixture } from '../../../tests/fixtures/synastry-reader';
import { parseProductRun } from '../product-run';
import { productFactLabel } from '../product-fact-label';
import { renderProductPdf, PDF_LIMITS } from './product-pdf';
describe('synthetic Sinastry web/PDF contract without approval', () => {
	it('recovers every fact and source, with scoped transport limits and labels', async () => {
		const fixture = await synastryReaderFixture('ready'),
			run = parseProductRun(fixture.run);
		expect(run).not.toBeNull();
		expect(run!.calculation!.facts).toHaveLength(121);
		expect(run!.editorial!.sections).toHaveLength(33);
		expect(run!.editorial!.sections.at(-1)!.evidence).toHaveLength(121);
		expect(productFactLabel('synastry', 'cross-mercury-moon')).toBe(
			'Mercúrio de A × Lua de B (cross-mercury-moon)'
		);
		expect(productFactLabel('synastry', 'person-b-pluto')).toBe(
			'Pessoa B · Plutão (person-b-pluto)'
		);
		const extended = structuredClone(fixture.run);
		extended.calculation!.facts[0].source = 's'.repeat(300);
		expect(parseProductRun(extended)).not.toBeNull();
		extended.calculation!.facts[0].source += 's';
		expect(parseProductRun(extended)).toBeNull();
		extended.calculation!.facts[0].source = 's'.repeat(201);
		extended.productId = 'pair-preview';
		expect(parseProductRun(extended)).toBeNull();
		const broken = structuredClone(fixture.run);
		broken.editorial!.sections.at(-1)!.evidence.push('absent');
		expect(parseProductRun(broken)).toBeNull();
	});
	it('renders a bounded recoverable PDF with all recorded pairs and hypotheses', async () => {
		const fixture = await synastryReaderFixture('ready');
		const result = await renderProductPdf(fixture.run);
		expect(result).not.toBeNull();
		const doc = await PDFDocument.load(result!.bytes);
		expect(doc.getTitle()).toBe(fixture.run.editorial!.title);
		expect(doc.getPageCount()).toBeGreaterThan(5);
		expect(doc.getPageCount()).toBeLessThanOrEqual(PDF_LIMITS.pages);
		expect(result!.filename).toContain('atv-synastry-');
		expect(result!.bytes).toEqual((await renderProductPdf(fixture.run))!.bytes);
	}, 15000);
	it('hides content and PDF for pending, revoked and failed states, keeping missing context explicit', async () => {
		for (const state of [null, 'revoked', 'failed']) {
			const run = parseProductRun((await synastryReaderFixture(state)).run);
			expect(run).not.toBeNull();
			expect(run!.released).toBe(false);
			expect(run!.calculation).toBeNull();
			expect(run!.editorial).toBeNull();
			expect(await renderProductPdf(run)).toBeNull();
		}
		const run = parseProductRun((await synastryReaderFixture('ready', false)).run)!;
		expect(run.calculation!.facts).toHaveLength(120);
		expect(run.editorial!.sections.at(-1)!.evidence).toHaveLength(120);
		expect(run.editorial!.limits.join(' ')).toContain('Nenhum contexto adicional');
	});
});
