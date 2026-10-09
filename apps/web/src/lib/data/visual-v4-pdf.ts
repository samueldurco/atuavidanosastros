import { productDefinitionFor } from '@atv/domain';
import coverArt from './visual-v4-pdf.generated.json';

/** Resolve current and historical products through their functional universe contract. */
export function pdfCoverFor(productId: string): string {
	const universe = productDefinitionFor(productId)?.universe;
	if (!universe || !Object.hasOwn(coverArt.themes, universe)) throw Error('pdf_cover_unavailable');
	return coverArt.themes[universe as keyof typeof coverArt.themes];
}
