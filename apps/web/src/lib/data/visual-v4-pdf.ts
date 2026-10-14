import { productDefinitionFor } from '@atv/domain';
import coverArt from './visual-v4-pdf.generated.json';

/** Individual approved cover; historical editions retain a functional-universe fallback. */
export function pdfCoverFor(productId: string): string {
	if (Object.hasOwn(coverArt.products, productId))
		return coverArt.products[productId as keyof typeof coverArt.products];
	const universe = productDefinitionFor(productId)?.universe;
	if (!universe || !Object.hasOwn(coverArt.themes, universe)) throw Error('pdf_cover_unavailable');
	const fallback = coverArt.themes[universe as keyof typeof coverArt.themes];
	return coverArt.products[fallback as keyof typeof coverArt.products];
}

export function pdfBrandMark(): string {
	return coverArt.brand;
}
