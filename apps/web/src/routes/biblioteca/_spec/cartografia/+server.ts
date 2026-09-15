import { error } from '@sveltejs/kit';
import { renderProductSvg, SVG_CSP } from '$lib/server/product-svg';
import { svgFixture } from '../../../../../tests/fixtures/product-export';

// Synthetic visual QA only. Never exposes saved records, paid APIs or registry promotion.
export function GET({ url }: { url: URL }) {
	if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) error(404);
	const svg = renderProductSvg(svgFixture(url.searchParams.get('variant') ?? 'birth-chart'))!;
	return new Response(svg.svg, {
		headers: {
			'content-type': 'image/svg+xml; charset=utf-8',
			'cache-control': 'private, no-store',
			'content-security-policy': SVG_CSP,
			'x-robots-tag': 'noindex, nofollow'
		}
	});
}
