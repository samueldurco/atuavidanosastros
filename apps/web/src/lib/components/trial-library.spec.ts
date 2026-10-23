import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import { offeredProductIds } from '@atv/domain';
import TrialLibrary from './TrialLibrary.svelte';
import { latestReadingVersion, CONTENT_VERSION } from '$lib/trials/versions';
import type { TrialLibraryData } from '$lib/trials/library';

const edition = (productId: string, version?: string) => ({
	id: `synthetic-${productId}`,
	product_id: productId,
	created_at: '2026-10-23T12:00:00Z',
	version
});
const renderLibrary = (readings: TrialLibraryData['readings']) =>
	render(TrialLibrary, { props: { library: { readings, unavailable: false } } }).body;

describe('trial library edition labels', () => {
	it('recognizes the latest edition of every current catalog product', () => {
		const body = renderLibrary(
			offeredProductIds.map((id) => edition(id, latestReadingVersion(id)))
		);
		expect(body).not.toContain('Edição anterior preservada');
		expect(body.match(/Continuar leitura/g)).toHaveLength(offeredProductIds.length);
	});

	it('preserves an earlier edition and offers a separate new edition', () => {
		const body = renderLibrary([edition('birth-chart', CONTENT_VERSION)]);
		expect(body).toContain('Edição anterior preservada');
		expect(body).toContain('/testar-produtos/leituras/synthetic-birth-chart');
		expect(body).toContain('/testar-produtos/birth-chart?from=synthetic-birth-chart');
	});

	it('does not infer that a versionless historical reading is outdated', () => {
		expect(renderLibrary([edition('birth-chart')])).not.toContain('Edição anterior preservada');
	});
});
