import { customerOffers } from '$lib/data/product-copy';
import { shopPreviews } from '$lib/data/shop-products';
import { catalogPublications, type CatalogPublication } from '$lib/data/home-publications';
import { productCovers } from '$lib/components/home/product-covers';
import { mvpArt } from '$lib/data/mvp-visual';
import { selectHomeHighlights, type HomeHighlight } from '$lib/home-highlights';

/** Join real publication records to the current catalog; never infer dates from a build or Git. */
export function homeCatalogHighlights(
	records: readonly CatalogPublication[] = catalogPublications
) {
	const digital: HomeHighlight[] = [];
	const shop: HomeHighlight[] = [];
	for (const record of records) {
		if (!record.source) continue;
		if (record.kind === 'digital') {
			const product = customerOffers.find(
				(item) => item.id === record.id && item.state === 'ACTIVE'
			);
			const cover = productCovers[record.id];
			if (!product || !cover) continue;
			digital.push({
				id: product.id,
				title: product.name,
				href: product.href,
				status: 'PUBLISHED',
				publishedAt: record.publishedAt,
				topicId: product.universe,
				fallbackIllustration: mvpArt(cover[1])
			});
		} else {
			const product = shopPreviews.find((item) => item.slug === record.id);
			const image = product?.colors
				.flatMap((color) => color.images)
				.find((item) => record.image && item.src.endsWith(record.image));
			if (!product || !image) continue;
			shop.push({
				id: product.slug,
				title: product.title,
				href: `/loja/peca/${product.slug}`,
				status: 'PUBLISHED',
				publishedAt: record.publishedAt,
				topicId: 'loja',
				image: image.src
			});
		}
	}
	return {
		digitalHighlights: selectHomeHighlights(digital),
		shopHighlights: selectHomeHighlights(shop)
	};
}
