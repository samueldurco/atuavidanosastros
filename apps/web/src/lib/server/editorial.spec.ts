import { beforeAll, describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import EditorialArticle from '$lib/components/EditorialArticle.svelte';
import { SITE } from '$lib/data/site';
import { legacySeo, robotsPolicy, safeJsonLd } from '$lib/seo';
import {
	approvalPayload,
	approvedDocuments,
	articleSeo,
	canonicalPair,
	documentDigest,
	hubSeo,
	validDocument,
	type EditorialApproval,
	type EditorialAuthority,
	type EditorialDocument
} from './editorial';
import {
	editorialRss,
	editorialSitemap,
	newsChunks,
	newsSitemap,
	pagesSitemap,
	recentNews,
	sitemapIndex,
	xml
} from './editorial-feeds';
import { publishedEditorial } from './editorial-registry';

// Synthetic test-only author/reviewer, never imported by the runtime registry.
const now = new Date('2026-10-05T12:00:00Z');
function fixture(patch: Partial<EditorialDocument> = {}): EditorialDocument {
	return {
		id: 'synthetic-article',
		revision: 1,
		state: 'PUBLISHED',
		path: '/noticias/2026/10/teste-editorial',
		kind: 'reporting',
		title: 'Teste & revisão <segura>',
		description: 'Descrição de uma reportagem sintética.',
		author: {
			id: 'autor-sintetico',
			name: 'Autor sintético',
			bio: 'Perfil exclusivo dos testes locais.'
		},
		publishedAt: '2026-10-04T12:00:00Z',
		modifiedAt: '2026-10-04T12:00:00Z',
		sections: [
			{ heading: 'Contexto', paragraphs: ['Texto sintético; não é uma publicação real.'] }
		],
		sources: [{ title: 'Fonte de referência', url: 'https://example.org/referencia' }],
		...patch
	};
}
function base64(buffer: ArrayBuffer): string {
	return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}
let keys: CryptoKeyPair;
let authorities: Record<string, EditorialAuthority>;
beforeAll(async () => {
	keys = (await crypto.subtle.generateKey('Ed25519', true, ['sign', 'verify'])) as CryptoKeyPair;
	authorities = {
		'synthetic-review-key': {
			reviewerId: 'revisor-sintetico',
			publicKey: base64(await crypto.subtle.exportKey('raw', keys.publicKey))
		}
	};
});
async function sign(
	document: EditorialDocument,
	patch: Partial<Omit<EditorialApproval, 'signature'>> = {}
): Promise<EditorialApproval> {
	const payload = {
		keyId: 'synthetic-review-key',
		documentId: document.id,
		revision: document.revision,
		digest: await documentDigest(document),
		reviewerId: 'revisor-sintetico',
		approvedAt: '2026-10-04T11:00:00Z',
		...patch
	};
	return {
		...payload,
		signature: base64(
			await crypto.subtle.sign('Ed25519', keys.privateKey, approvalPayload(payload))
		)
	};
}
describe('independent editorial authority', () => {
	it('keeps the live registry empty without approved authors, content and keys', async () => {
		expect(await publishedEditorial(now)).toEqual([]);
	});
	it('accepts a signed, exact published revision', async () => {
		const doc = fixture();
		expect(await approvedDocuments([doc], [await sign(doc)], authorities, now)).toEqual([doc]);
	});
	it.each(['DRAFT', 'IN_REVIEW', 'APPROVED'] as const)(
		'does not publish state %s',
		async (state) => {
			const doc = fixture({ state });
			expect(await approvedDocuments([doc], [await sign(doc)], authorities, now)).toEqual([]);
		}
	);
	it('rejects changed text, author, dates, image and calculated facts', async () => {
		const original = fixture(),
			receipt = await sign(original);
		const patches: Partial<EditorialDocument>[] = [
			{ title: 'Mudou' },
			{ description: 'Mudou' },
			{ sections: [{ heading: 'Outro', paragraphs: ['Alterado'] }] },
			{ author: { ...original.author, name: 'Outra pessoa' } },
			{ modifiedAt: '2026-10-05T10:00:00Z' },
			{
				image: {
					path: '/media/editorial/teste.jpg',
					alt: 'Teste',
					width: 1200,
					height: 630,
					credit: 'Teste',
					license: 'Teste'
				}
			},
			{
				calculation: {
					engine: 'synthetic',
					version: '1',
					factsDigest: 'a'.repeat(64),
					coverageStart: '2026-10-04T00:00:00Z',
					coverageEnd: '2026-10-05T00:00:00Z'
				}
			}
		];
		for (const patch of patches)
			expect(await approvedDocuments([fixture(patch)], [receipt], authorities, now)).toEqual([]);
	});
	it('rejects changed revision, removed/unknown authority, tampered signature and wrong reviewer', async () => {
		const doc = fixture(),
			receipt = await sign(doc);
		for (const patch of [
			{ revision: 2 },
			{ keyId: 'unknown' },
			{ signature: 'AAAA' },
			{ reviewerId: 'another-reviewer' }
		])
			expect(await approvedDocuments([doc], [{ ...receipt, ...patch }], authorities, now)).toEqual(
				[]
			);
		expect(await approvedDocuments([doc], [receipt], {}, now)).toEqual([]);
	});
	it('rejects self review even with a valid signature', async () => {
		const doc = fixture();
		expect(
			await approvedDocuments(
				[doc],
				[await sign(doc, { reviewerId: doc.author.id })],
				{
					'synthetic-review-key': {
						...authorities['synthetic-review-key'],
						reviewerId: doc.author.id
					}
				},
				now
			)
		).toEqual([]);
	});
	it('rejects future approval and approval after the modification timestamp', async () => {
		const doc = fixture();
		expect(
			await approvedDocuments(
				[doc],
				[await sign(doc, { approvedAt: '2026-10-05T13:00:00Z' })],
				authorities,
				now
			)
		).toEqual([]);
	});
	it('rejects duplicate identities, paths and conflicting author bios', async () => {
		const doc = fixture(),
			receipt = await sign(doc);
		for (const other of [
			fixture(),
			fixture({ id: 'another-id' }),
			fixture({
				id: 'another-id',
				path: '/noticias/2026/10/outro',
				author: { ...doc.author, bio: 'Biografia conflitante' }
			})
		])
			expect(await approvedDocuments([doc, other], [receipt], authorities, now)).toEqual([]);
	});
});
describe('public content integrity', () => {
	it('allows only planned public evergreen guides, never private calendar routes', () => {
		expect(validDocument(fixture({ kind: 'guide', path: '/calendario-astral' }), now)).toBe(true);
		expect(validDocument(fixture({ kind: 'reporting', path: '/calendario-astral' }), now)).toBe(
			false
		);
		expect(validDocument(fixture({ kind: 'guide', path: '/calendario-pessoal' }), now)).toBe(false);
	});
	it('renders article text, original dates, sources and author on the server without executing body markup', () => {
		const document = fixture({
			sections: [{ heading: 'Contexto', paragraphs: ['<script>alert(1)</script>'] }]
		});
		const { body } = render(EditorialArticle, { props: { document } });
		expect(body).toContain('/pessoas/autor-sintetico');
		expect(body).toContain('datetime="2026-10-04T12:00:00Z"');
		expect(body).toContain('https://example.org/referencia');
		expect(body).toContain('&lt;script>');
		expect(body).not.toContain('<script>alert');
	});
	it('requires a real calendar date and horoscope classification for dated forecasts', () => {
		const calculation = {
			engine: 'synthetic',
			version: '1',
			factsDigest: 'a'.repeat(64),
			coverageStart: '2026-10-04T00:00:00Z',
			coverageEnd: '2026-10-05T00:00:00Z'
		};
		expect(
			validDocument(
				fixture({ kind: 'horoscope', path: '/noticias/horoscopo/2026/10/04/aries', calculation }),
				now
			)
		).toBe(true);
		expect(
			validDocument(
				fixture({ kind: 'horoscope', path: '/noticias/horoscopo/2026/02/30/aries', calculation }),
				now
			)
		).toBe(false);
		expect(
			validDocument(fixture({ path: '/noticias/horoscopo/2026/10/04/aries', calculation }), now)
		).toBe(false);
		expect(validDocument(fixture({ path: '/noticias/2026/99/teste' }), now)).toBe(false);
	});
	it('rejects non-finite or fractional editorial image dimensions', () => {
		for (const width of [NaN, Infinity, 1200.5]) {
			expect(
				validDocument(
					fixture({
						image: {
							path: '/media/editorial/teste.jpg',
							alt: 'Teste',
							width,
							height: 630,
							credit: 'Teste',
							license: 'Teste'
						}
					}),
					now
				)
			).toBe(false);
		}
	});
	it.each([
		'/admin/teste',
		'/biblioteca/teste',
		'/noticias/teste?x=1',
		'//example.org',
		'/noticias/2026/10/../../../admin'
	])('rejects unsafe or non-editorial paths: %s', (path) => {
		expect(validDocument(fixture({ path }), now)).toBe(false);
	});
	it.each(['2026-02-30T00:00:00Z', '2026-10-04T24:00:00Z', '2026-10-04', '2026-10-06T00:00:00Z'])(
		'rejects invalid/future dates: %s',
		(publishedAt) => {
			expect(validDocument(fixture({ publishedAt, modifiedAt: publishedAt }), now)).toBe(false);
		}
	);
	it('requires sources, author biography and body, and rejects script links', () => {
		expect(validDocument(fixture({ sources: [] }), now)).toBe(false);
		expect(validDocument(fixture({ sections: [] }), now)).toBe(false);
		expect(validDocument(fixture({ author: { id: 'autor', name: 'Autor', bio: '' } }), now)).toBe(
			false
		);
		expect(
			validDocument(fixture({ sources: [{ title: 'Ruim', url: 'javascript:alert(1)' }] }), now)
		).toBe(false);
	});
	it('requires versioned facts and explicit coverage for a horoscope', () => {
		const doc = fixture({ kind: 'horoscope', path: '/horoscopo/aries' });
		expect(validDocument(doc, now)).toBe(false);
		expect(
			validDocument(
				{
					...doc,
					calculation: {
						engine: 'synthetic',
						version: '1',
						factsDigest: 'a'.repeat(64),
						coverageStart: '2026-10-04T00:00:00Z',
						coverageEnd: '2026-10-05T00:00:00Z'
					}
				},
				now
			)
		).toBe(true);
	});
	it('normalizes pairs in zodiac order, including same-sign pairs', () => {
		expect(canonicalPair('touro', 'aries')).toBe('/compatibilidade/aries-touro');
		expect(canonicalPair('aries', 'aries')).toBe('/compatibilidade/aries-aries');
		expect(canonicalPair('unknown', 'aries')).toBeNull();
		expect(
			validDocument(fixture({ kind: 'compatibility', path: '/compatibilidade/touro-aries' }), now)
		).toBe(false);
	});
	it('escapes JSON-LD without changing its data and classifies columns as Article', () => {
		const unsafe = { text: '</script><script>alert(1)</script>&\u2028' },
			safe = safeJsonLd(unsafe);
		expect(safe).not.toContain('</script>');
		expect(JSON.parse(safe)).toEqual(unsafe);
		expect(JSON.parse(articleSeo(fixture({ kind: 'column' })).jsonLd!)['@type']).toBe('Article');
	});
	it('uses NewsArticle only for reporting and no invented image', () => {
		const seo = articleSeo(fixture());
		expect(JSON.parse(seo.jsonLd!)['@type']).toBe('NewsArticle');
		expect(seo.image).toBeUndefined();
	});
	it('permits large previews only for a real, sufficiently large editorial image', () => {
		const doc = fixture({
			image: {
				path: '/media/editorial/teste.jpg',
				alt: 'Teste',
				width: 1200,
				height: 630,
				credit: 'Crédito sintético',
				license: 'Licença sintética'
			}
		});
		expect(robotsPolicy(articleSeo(doc), new URL(SITE.url))).toContain('max-image-preview:large');
		expect(robotsPolicy(legacySeo('/'), new URL(SITE.url))).not.toContain(
			'max-image-preview:large'
		);
	});
});
describe('feeds and search surfaces', () => {
	it('keeps exactly the 14 previous sitemap pages, excluding candidate and empty hubs', () => {
		const body = pagesSitemap([]);
		expect(body.match(/<url>/g)).toHaveLength(14);
		expect(body).not.toContain('/signos');
		expect(body).not.toContain('/noticias');
	});
	it('only indexes nonempty approved hubs', () => {
		expect(hubSeo('/noticias', []).indexable).toBe(false);
		expect(hubSeo('/noticias', [fixture()]).indexable).toBe(true);
		expect(pagesSitemap([fixture()])).toContain('/noticias');
	});
	it('uses original publication within an exclusive 48-hour window, not modifiedAt', () => {
		const old = fixture({
				publishedAt: '2026-10-03T11:59:59Z',
				modifiedAt: '2026-10-05T11:00:00Z'
			}),
			edge = fixture({ publishedAt: '2026-10-03T12:00:00Z' }),
			recent = fixture({ publishedAt: '2026-10-03T12:00:01Z' }),
			future = fixture({ publishedAt: '2026-10-05T13:00:00Z' });
		expect(recentNews([old, edge, recent, future, fixture({ kind: 'column' })], now)).toEqual([
			recent
		]);
		expect(editorialSitemap([old])).toContain(old.path);
	});
	it('chunks over 1000 news entries without silently dropping items', () => {
		const docs = Array.from({ length: 1001 }, (_, index) =>
			fixture({ id: `doc-${index}`, path: `/noticias/2026/10/doc-${index}` })
		);
		const chunks = newsChunks(docs, now);
		expect(chunks.map((chunk) => chunk.length)).toEqual([1000, 1]);
		expect(sitemapIndex(docs, now)).toContain('/news-sitemap/2.xml');
		expect(() => newsSitemap(docs)).toThrow('chunking');
	});
	it('produces escaped News XML with the correct language, title and original date', () => {
		const doc = fixture(),
			body = newsSitemap([doc]);
		expect(body).toContain('<news:language>pt</news:language>');
		expect(body).toContain(xml(doc.title));
		expect(body).toContain(doc.publishedAt);
		expect(body).not.toContain('changefreq');
	});
	it('produces RSS with stable canonical GUID, UTC date and no fake updated date', () => {
		const doc = fixture(),
			body = editorialRss([doc]);
		expect(body).toContain(`<guid isPermaLink="true">${SITE.url}${doc.path}</guid>`);
		expect(body).toContain('<pubDate>Sun, 04 Oct 2026 12:00:00 GMT</pubDate>');
		expect(body).toContain('Teste &amp; revisão &lt;segura&gt;');
	});
	it('protects staging, private routes, unknown pages and errors from indexing', () => {
		expect(robotsPolicy(legacySeo('/'), new URL('https://preview.example.org'))).toBe(
			'noindex, nofollow'
		);
		for (const path of [
			'/dashboard',
			'/api/test',
			'/not-found',
			'/toString',
			'/constructor',
			'/loja/signo/aries'
		])
			expect(robotsPolicy(legacySeo(path), new URL(SITE.url + path))).toBe('noindex, nofollow');
		expect(robotsPolicy(legacySeo('/'), new URL(SITE.url), 404)).toBe('noindex, nofollow');
		expect(robotsPolicy(legacySeo('/'), new URL(SITE.url + '/?utm_source=test'))).toBe(
			'index, follow'
		);
	});
});
