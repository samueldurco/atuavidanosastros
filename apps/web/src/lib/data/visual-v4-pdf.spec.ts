import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import designs from './mvp-product-design.json';
import covers from './visual-v4-pdf.generated.json';
import { pdfBrandMark, pdfCoverFor } from './visual-v4-pdf';

describe('approved PDF artwork', () => {
	it('embeds every current individual product cover as a bounded, distinct PNG', async () => {
		const document = await PDFDocument.create();
		expect(Object.keys(covers.products).sort()).toEqual(Object.keys(designs).sort());
		const artwork = Object.keys(designs).map(pdfCoverFor);
		expect(new Set(artwork).size).toBe(artwork.length);
		for (const encoded of artwork) {
			const bytes = Buffer.from(encoded, 'base64');
			expect(bytes.length).toBeLessThanOrEqual(100000);
			const image = await document.embedPng(bytes);
			expect([image.width, image.height]).toEqual([480, 352]);
		}
		expect(Buffer.byteLength(JSON.stringify(covers))).toBeLessThan(2000000);
		const brand = await document.embedPng(pdfBrandMark());
		expect([brand.width, brand.height]).toEqual([100, 100]);
	});

	it('retains a valid cover for historical editions and refuses unknown products', async () => {
		const document = await PDFDocument.create();
		for (const product of ['ascendant', 'midheaven']) {
			const image = await document.embedPng(pdfCoverFor(product));
			expect(image.width).toBeGreaterThan(0);
		}
		expect(() => pdfCoverFor('unknown-product')).toThrow('pdf_cover_unavailable');
	});
});
