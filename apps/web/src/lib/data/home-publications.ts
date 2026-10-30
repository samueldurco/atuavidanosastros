/**
 * Publication records, not a release switch. Catalog eligibility is checked again on each load.
 * Shop dates refer to the published collection presentation, not first sale or stock availability.
 * Record future publications here only after the corresponding release has actually completed.
 */
export interface CatalogPublication {
	kind: 'digital' | 'shop';
	id: string;
	publishedAt: string;
	source: string;
	image?: string;
}

const shopRelease = {
	publishedAt: '2026-10-28T15:42:38.503241Z',
	source:
		'cloudflare-pages:927e9d31-5ec4-40e1-9e3d-f49781da1be9@6b7b1db9e3dbbf34aa809b1d5c665aa53a39b4c3'
};

export const catalogPublications: readonly CatalogPublication[] = [
	{ kind: 'shop', id: 'cropped-aries', image: 'cropped-aries-bone-modelo.webp', ...shopRelease },
	{
		kind: 'shop',
		id: 'camiseta-oversized-taurus',
		image: 'oversized-taurus-bone-modelo.webp',
		...shopRelease
	},
	{ kind: 'shop', id: 'ecobag-aries', image: 'ecobag-aries-natural-produto.webp', ...shopRelease }
];
