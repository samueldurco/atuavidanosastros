import { describe, expect, it, vi } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { mkdir, writeFile } from 'node:fs/promises';
import { productCatalog } from '@atv/domain';
import { pdfFixture } from '../../../tests/fixtures/product-export';
import { renderProductPdf, PDF_LIMITS, PDF_EXPORT_VERSION } from './product-pdf';

describe('private PDF renderer', () => {
	it('embeds brand fonts in a real, deterministic PDF with revision metadata', async () => {
		const run = pdfFixture();
		const first = await renderProductPdf(run);
		expect(first).not.toBeNull();
		expect(new TextDecoder().decode(first!.bytes.slice(0, 8))).toBe('%PDF-1.7');
		const doc = await PDFDocument.load(first!.bytes, { updateMetadata: false });
		expect(doc.getTitle()).toBe(run.editorial!.title);
		expect(doc.getCreator()).toBe(PDF_EXPORT_VERSION);
		expect(doc.getModificationDate()?.toISOString()).toBe(new Date(run.updatedAt).toISOString());
		expect(doc.getPageCount()).toBeGreaterThan(0);
		expect(doc.getPageCount()).toBeLessThan(5);
		expect(first!.bytes).toEqual((await renderProductPdf(run))!.bytes);
		expect(first!.filename).toMatch(/^atv-birth-chart-[a-f0-9-]+-r4\.pdf$/);
	});
	it('rejects unsupported glyphs rather than silently replacing approved content', async () => {
		for (const text of ['Texto com emoji 🌙', '漢字', 'controle\u0000inválido']) {
			const run = pdfFixture();
			run.editorial!.sections[0].text = text;
			expect(await renderProductPdf(run)).toBeNull();
		}
	});
	it('bounds input and elapsed work without emitting a truncated report', async () => {
		const run = pdfFixture();
		run.editorial!.sections = Array.from({ length: 10 }, () => ({
			title: 'Limite',
			text: 'a'.repeat(20_000),
			evidence: ['card-0']
		}));
		expect(JSON.stringify(run).length).toBeGreaterThan(PDF_LIMITS.characters);
		expect(await renderProductPdf(run)).toBeNull();
		let time = 0;
		const clock = vi.spyOn(performance, 'now').mockImplementation(() => (time += 6000));
		try {
			expect(await renderProductPdf(pdfFixture())).toBeNull();
		} finally {
			clock.mockRestore();
		}
	});
	it('honors catalog PDF eligibility and requires the current released projection', async () => {
		for (const product of productCatalog.filter((entry) => !entry.delivery.includes('pdf'))) {
			expect(await renderProductPdf({ ...pdfFixture(), productId: product.id })).toBeNull();
		}
		expect(await renderProductPdf({ ...pdfFixture(), released: false })).toBeNull();
		expect(await renderProductPdf({ ...pdfFixture(), editorial: null })).toBeNull();
		expect(await renderProductPdf(null)).toBeNull();
	});
	it('paginates a long synthetic report with long identifiers and inert markup for visual QA', async () => {
		const run = pdfFixture();
		run.editorial!.sections = Array.from({ length: 6 }, (_, i) => ({
			title: `Seção ${i + 1}: interpretação e limites`,
			text: `${'Precisão, vínculo e propósito não determinam suas escolhas. Esta amostra confere apenas a legibilidade do relatório. '.repeat(6)}\n${i === 2 ? 'Identificador:' + 'x'.repeat(500) : 'Uma nova linha preserva a pausa editorial.'}`,
			evidence: ['card-0']
		}));
		run.calculation!.facts[0].source = '<script>conteúdo inerte</script> https://untrusted.example';
		const artifact = await renderProductPdf({ ...run, input: { secret: 'RAW_INPUT_SECRET' } });
		expect(artifact).not.toBeNull();
		const doc = await PDFDocument.load(artifact!.bytes);
		expect(doc.getPageCount()).toBeGreaterThan(3);
		expect(doc.getPageCount()).toBeLessThanOrEqual(PDF_LIMITS.pages);
		if (process.env.ATV_PDF_QA === '1') {
			await mkdir('../../test-results/pdf', { recursive: true });
			await writeFile('../../test-results/pdf/atv-synthetic-report.pdf', artifact!.bytes);
			await writeFile('../../test-results/pdf/atv-synthetic-report.json', JSON.stringify(run));
		}
	});
});
