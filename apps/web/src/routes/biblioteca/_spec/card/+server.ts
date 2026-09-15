import { error } from '@sveltejs/kit';
import { renderProductCard, CARD_CSP } from '$lib/server/product-card';
import { cardFixture } from '../../../../../tests/fixtures/product-export';

// Local synthetic visual QA only; no saved record, provider or promotion.
export function GET({ url }: { url: URL }) {
	if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) error(404);
	const card = renderProductCard(cardFixture(url.searchParams.get('variant') ?? 'standard'), 0);
	if (!card) error(409);
	return new Response(card.svg, {
		headers: {
			'content-type': 'image/svg+xml; charset=utf-8',
			'cache-control': 'private, no-store',
			'content-security-policy': CARD_CSP,
			'x-robots-tag': 'noindex, nofollow'
		}
	});
}
