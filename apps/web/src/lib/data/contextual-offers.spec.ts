import { describe, expect, it } from 'vitest';
import { customerOffers } from './product-copy';
import { contextualOfferForSlug, contextualOfferPresentations } from './contextual-offers';
import { robotsPolicy, type PageSeo } from '../seo';
import { pagesSitemap } from '../server/editorial-feeds';
import { load } from '../../routes/ofertas/[offerSlug]/+page';

const retainedEdges = {
	'upsell-birth-chart-life-atlas-post-purchase': [
		'birth-chart',
		'life-atlas',
		'upsell',
		'post-purchase',
		'DECIDED_PREPARING'
	],
	'upsell-birth-chart-life-atlas-after-reading-or-theme-choice': [
		'birth-chart',
		'life-atlas',
		'upsell',
		'after-reading-or-theme-choice',
		'HISTORICAL_CANDIDATE'
	],
	'upsell-three-pillars-birth-chart-after-short-reading': [
		'three-pillars',
		'birth-chart',
		'upsell',
		'after-short-reading',
		'HISTORICAL_CANDIDATE'
	],
	'upsell-week-reading-solar-return-near-birthday': [
		'week-reading',
		'solar-return',
		'upsell',
		'near-birthday',
		'HISTORICAL_CANDIDATE'
	],
	'upsell-synastry-couple-dossier-after-reading-with-consent': [
		'synastry',
		'couple-dossier',
		'upsell',
		'after-reading-with-consent',
		'HISTORICAL_CANDIDATE'
	],
	'upsell-dream-reading-dream-dossier-after-important-dream-marked': [
		'dream-reading',
		'dream-dossier',
		'upsell',
		'after-important-dream-marked',
		'HISTORICAL_CANDIDATE'
	],
	'upsell-dream-dossier-dream-atlas-after-two-or-three-records': [
		'dream-dossier',
		'dream-atlas',
		'upsell',
		'after-two-or-three-records',
		'HISTORICAL_CANDIDATE'
	],
	'downsell-birth-chart-three-pillars-after-public-offer-declined': [
		'birth-chart',
		'three-pillars',
		'downsell',
		'after-public-offer-declined',
		'HISTORICAL_CANDIDATE'
	],
	'downsell-dream-dossier-dream-reading-after-public-offer-declined': [
		'dream-dossier',
		'dream-reading',
		'downsell',
		'after-public-offer-declined',
		'HISTORICAL_CANDIDATE'
	]
} as const;

describe('contextual offer presentation contract', () => {
	it('has exactly one slug for each retained edge and keeps candidates separate from the owner decision', () => {
		expect(Object.keys(contextualOfferPresentations).sort()).toEqual(
			Object.keys(retainedEdges).sort()
		);
		const publicProductIds = new Set(customerOffers.map((offer) => offer.id));
		for (const [slug, [sourceId, targetId, kind, moment, status]] of Object.entries(
			retainedEdges
		)) {
			const presentation = contextualOfferForSlug(slug);
			expect(presentation).toMatchObject({ sourceId, targetId, kind, moment, status });
			expect(publicProductIds.has(sourceId)).toBe(true);
			expect(publicProductIds.has(targetId)).toBe(true);
		}
		expect(contextualOfferForSlug('__proto__')).toBeUndefined();
	});

	it('uses different copy for the two life-atlas moments without claiming that a new buyer opened the map', () => {
		const justBought = contextualOfferForSlug('upsell-birth-chart-life-atlas-post-purchase')!;
		const later = contextualOfferForSlug(
			'upsell-birth-chart-life-atlas-after-reading-or-theme-choice'
		)!;
		expect(justBought.headline).not.toBe(later.headline);
		expect(justBought.opening).not.toBe(later.opening);
		expect(justBought.decision).not.toBe(later.decision);
		expect(justBought.opening).not.toMatch(/você já (?:leu|abriu|explorou)/i);
		expect(later.opening).toMatch(/depois de explorar/i);
	});

	it('keeps every contextual route out of search indexing and the public sitemap', async () => {
		const sitemap = pagesSitemap([]);
		for (const slug of Object.keys(retainedEdges)) {
			const path = `/ofertas/${slug}`;
			const result = (await load({ params: { offerSlug: slug } } as Parameters<
				typeof load
			>[0])) as {
				seo: PageSeo;
			};
			expect(result.seo).toMatchObject({ path, indexable: false });
			expect(robotsPolicy(result.seo, new URL(`https://atuavidanosastros.com.br${path}`))).toBe(
				'noindex, nofollow'
			);
			expect(sitemap).not.toContain(`${path}</loc>`);
		}
	});
});
