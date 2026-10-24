import { describe, expect, it, vi } from 'vitest';
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as nodeCrypto from 'node:crypto';
import { render } from 'svelte/server';
import EditorialArticle from '$lib/components/EditorialArticle.svelte';
import { articleSeo, validDocument, type EditorialDocument } from './editorial';
import { editorialSitemap, newsSitemap, recentNews } from './editorial-feeds';
import { createEditorialRead, publishedEditorial } from './editorial-registry';
import {
	verifyAutomatedApproval,
	type AutomatedAttestation,
	type EditorialReviewReport,
	type EditorialEvidenceManifest,
	type AutomatedAuthority
} from './editorial-automation';

vi.mock('node:crypto', { spy: true });

// Real, externally signed release candidates. These tests never admit a publication.
const root = resolve('../../docs/editorial/release-2026-10-06');
const json = <T>(file: string): T => JSON.parse(readFileSync(file, 'utf8'));
const authorities = json<Record<string, AutomatedAuthority>>(resolve(root, 'authorities.json'));
const codes = readdirSync(root)
	.filter((code) => /^P\d{2}$/.test(code))
	.sort();

describe('externally signed finite editorial release', () => {
	it('shares admission within one request and rechecks every evergreen signature on the next read', async () => {
		const release = json<{
			evidenceByDigest: Record<string, string>;
			packages: { document: EditorialDocument; attestation: AutomatedAttestation }[];
		}>(resolve('src/lib/server/editorial-release/registry.json'));
		const evergreenSignatures = new Set(
			release.packages.map((entry) => entry.attestation.signature)
		);
		const largestEvidence = Math.max(
			...Object.values(release.evidenceByDigest).map(
				(value) => new TextEncoder().encode(value).length
			)
		);
		const hashes = vi.spyOn(nodeCrypto, 'hash');
		const signatures = vi.spyOn(nodeCrypto, 'verify');
		try {
			for (let read = 1; read <= 2; read++) {
				const request = createEditorialRead();
				const documents = await request.summaries();
				for (const entry of release.packages) {
					expect(documents.filter((document) => document.id === entry.document.id)).toHaveLength(1);
				}
				expect(await request.document(release.packages[0].document.path)).toEqual(
					release.packages[0].document
				);
				expect(await request.summaries()).toBe(documents);
				expect(
					hashes.mock.calls.filter(
						([, value]) => value instanceof Uint8Array && value.byteLength === largestEvidence
					)
				).toHaveLength(read);
				expect(
					signatures.mock.calls.filter(([, , , signature]) =>
						evergreenSignatures.has(Buffer.from(signature as Uint8Array).toString('base64'))
					)
				).toHaveLength(read * release.packages.length);
			}
		} finally {
			hashes.mockRestore();
			signatures.mockRestore();
		}
	});
	it('exposes only the exact currently admitted paths in the runtime registry', async () => {
		const release = json<{ packages: { document: EditorialDocument }[] }>(
			resolve('src/lib/server/editorial-release/registry.json')
		);
		const archive = json<{
			entries: {
				index: { documents: Pick<EditorialDocument, 'path' | 'publishedAt' | 'modifiedAt'>[] };
			}[];
		}>(resolve('src/lib/server/editorial-release/dated-index.json'));
		const now = new Date();
		const datedPaths = archive.entries.flatMap((entry) =>
			entry.index.documents
				.filter(
					(document) =>
						new Date(document.publishedAt) <= now && new Date(document.modifiedAt) <= now
				)
				.map((document) => document.path)
		);
		expect((await publishedEditorial(now)).map((document) => document.path).sort()).toEqual(
			[...release.packages.map((entry) => entry.document.path), ...datedPaths].sort()
		);
	});
	it('validates all twelve exact packages and renders their full bodies and Article metadata', async () => {
		const documents: EditorialDocument[] = [];
		for (const code of codes) {
			const directory = resolve(root, code);
			const document = json<EditorialDocument>(resolve(directory, 'document.json'));
			const report = json<EditorialReviewReport>(resolve(directory, 'report.json'));
			const evidenceManifest = json<EditorialEvidenceManifest>(resolve(directory, 'manifest.json'));
			const attestation = json<AutomatedAttestation>(resolve(directory, 'attestation.json'));
			const evidenceFiles = new Map(
				evidenceManifest.files.map((file) => [
					file.path,
					new Uint8Array(readFileSync(resolve(directory, file.path)))
				])
			);
			const now = new Date(attestation.approvedAt);
			expect(validDocument(document, now), code).toBe(true);
			expect(
				(
					await verifyAutomatedApproval({
						document,
						report,
						evidenceManifest,
						evidenceFiles,
						attestation,
						authorities,
						now
					})
				).approved,
				code
			).toBe(true);
			const html = render(EditorialArticle, { props: { document } }).body;
			expect(html, code).toContain(document.title);
			expect(html, code).toContain('ATVNA');
			expect(document.automationDisclosure?.humanReview, code).toBe(false);
			expect(html, code).not.toContain('revisão humana independente');
			expect((html.match(/<h1\b/g) || []).length, code).toBe(1);
			for (const source of document.sources) expect(html, code).toContain(source.url);
			const seo = articleSeo(document);
			expect(JSON.stringify(seo), code).toContain('Article');
			expect(JSON.stringify(seo), code).not.toContain('NewsArticle');
			mkdirSync(resolve('../../test-results/editorial-gate-b'), { recursive: true });
			writeFileSync(resolve('../../test-results/editorial-gate-b', `${code}.html`), html);
			documents.push(document);
		}
		expect(documents).toHaveLength(12);
		const sitemap = editorialSitemap(documents);
		for (const document of documents) expect(sitemap).toContain(document.path);
		expect(newsSitemap(recentNews(documents, new Date()))).not.toContain('<url>');
	});
	it('rejects an altered body against the actual remote signature', async () => {
		const directory = resolve(root, codes[0]);
		const document = json<EditorialDocument>(resolve(directory, 'document.json'));
		document.sections[0].paragraphs[0] += ' Texto adulterado.';
		const report = json<EditorialReviewReport>(resolve(directory, 'report.json'));
		const evidenceManifest = json<EditorialEvidenceManifest>(resolve(directory, 'manifest.json'));
		const attestation = json<AutomatedAttestation>(resolve(directory, 'attestation.json'));
		const evidenceFiles = new Map(
			evidenceManifest.files.map((file) => [
				file.path,
				new Uint8Array(readFileSync(resolve(directory, file.path)))
			])
		);
		expect(
			(
				await verifyAutomatedApproval({
					document,
					report,
					evidenceManifest,
					evidenceFiles,
					attestation,
					authorities,
					now: new Date(attestation.approvedAt)
				})
			).approved
		).toBe(false);
	});
});
