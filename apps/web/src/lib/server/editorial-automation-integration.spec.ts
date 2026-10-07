import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import EditorialArticle from '$lib/components/EditorialArticle.svelte';
import { approvedDocuments, articleSeo, validDocument, type EditorialDocument } from './editorial';
import { editorialSitemap, newsSitemap, recentNews } from './editorial-feeds';
import {
	attestationPayload,
	byteDigest,
	digest,
	freezeEditorialJson,
	GATE,
	POLICY,
	PROTOCOL,
	type AutomatedRegistry,
	type AutomatedAttestation,
	type EditorialReviewReport
} from './editorial-automation';

// Fixtures and ephemeral keys only; no authority or content enters the real registry.
const now = new Date('2026-10-06T13:00:00Z');
const b64 = (buffer: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buffer)));
async function fixture() {
	const keys = (await crypto.subtle.generateKey('Ed25519', true, [
		'sign',
		'verify'
	])) as CryptoKeyPair;
	const document: EditorialDocument = {
		id: 'synthetic-automated-guide',
		revision: 1,
		state: 'PUBLISHED',
		kind: 'guide',
		path: '/mapa-astral',
		title: 'Guia sintético de testes',
		description: 'Descrição exclusiva dos testes locais.',
		author: {
			id: 'synthetic-organization',
			type: 'Organization',
			name: 'Organização sintética',
			bio: 'Identidade exclusiva dos testes locais.'
		},
		automationDisclosure: {
			generatedWithAI: true,
			humanReview: false,
			reviewMode: 'separate-pass'
		},
		publishedAt: '2026-10-06T12:00:00Z',
		modifiedAt: '2026-10-06T12:00:00Z',
		sections: [
			{ heading: 'Contexto', paragraphs: ['Texto sintético; não é uma publicação real.'] }
		],
		sources: [{ title: 'Fonte sintética', url: 'https://example.org/fixture' }]
	};
	const documentDigest = await digest(document);
	const content = new TextEncoder().encode('{"fixtureOnly":true}');
	const report: EditorialReviewReport = {
		policyVersion: POLICY,
		documentId: document.id,
		revision: 1,
		digest: documentDigest,
		reviewedAt: '2026-10-06T12:01:00Z',
		reviewMode: 'separate-pass',
		risk: 'low-educational-evergreen',
		checks: [
			'scope',
			'claims',
			'rights',
			'identity',
			'safety',
			'originality',
			'tools',
			'integrity'
		].map((id) => ({
			id,
			status: 'PASS',
			reason: 'Fixture sintética.',
			evidence: ['fixture.json']
		})),
		scores: Object.entries({
			intent: 20,
			value: 20,
			accuracy: 15,
			trust: 10,
			language: 10,
			journey: 10,
			metadata: 10,
			maintenance: 5
		}).map(([id, points]) => ({
			id,
			points,
			reason: 'Fixture sintética.',
			evidence: ['fixture.json']
		})),
		decision: 'APROVADO_AUTOMATICAMENTE',
		corrections: [],
		publicationGate: GATE
	};
	const evidenceManifest = {
		schemaVersion: 'atv-editorial-evidence-manifest-v1',
		documentId: document.id,
		revision: 1,
		documentDigest,
		files: [{ path: 'fixture.json', sha256: await byteDigest(content) }]
	};
	const payload = {
		protocol: PROTOCOL,
		keyId: 'synthetic-service-key',
		reviewerId: 'synthetic-service',
		documentId: document.id,
		revision: 1,
		digest: documentDigest,
		policyVersion: POLICY,
		decision: report.decision,
		reviewMode: report.reviewMode,
		risk: report.risk,
		reportDigest: await digest(report),
		evidenceManifestDigest: await digest(evidenceManifest),
		approvedAt: '2026-10-06T12:02:00Z',
		expiresAt: '2026-10-06T14:00:00Z'
	};
	const attestation: AutomatedAttestation = {
		...payload,
		signature: b64(
			await crypto.subtle.sign('Ed25519', keys.privateKey, attestationPayload(payload))
		)
	};
	const registry: AutomatedRegistry = {
		packages: [
			{
				document,
				report,
				evidenceManifest,
				evidenceFiles: new Map([['fixture.json', content]]),
				attestation,
				admission: {
					acceptedAt: now.toISOString(),
					attestationDigest: await digest(attestation),
					gateEvidenceDigest: 'a'.repeat(64)
				}
			}
		],
		authorities: {
			'synthetic-service-key': {
				identityType: 'automated-service',
				reviewerId: 'synthetic-service',
				publicKey: b64(await crypto.subtle.exportKey('raw', keys.publicKey)),
				enabled: true,
				revokedAt: null,
				policyVersion: POLICY,
				allowedKinds: ['guide'],
				risk: 'low-educational-evergreen',
				validFrom: '2026-10-06T11:00:00Z',
				validUntil: '2026-10-07T13:00:00Z',
				provisioningEvidence: { id: 'FIXTURE_ONLY', digest: 'b'.repeat(64) }
			}
		}
	};
	return { document, registry };
}

describe('automated public guide integration', () => {
	it('prepares only immutable plain JSON and keeps publication dates live', async () => {
		const { document, registry } = await fixture();
		const expectedDigest = await digest(document);
		freezeEditorialJson(document);
		expect(Object.isFrozen(document.sections[0].paragraphs)).toBe(true);
		expect(() => document.sections[0].paragraphs.push('Alteração')).toThrow();
		const exposedBytes = attestationPayload(document);
		exposedBytes[0] ^= 1;
		expect(await digest(document)).toBe(expectedDigest);
		expect(validDocument(document, now)).toBe(true);
		expect(validDocument(document, new Date('2026-10-06T11:00:00Z'))).toBe(false);
		expect(await approvedDocuments([document], [], {}, now, registry)).toEqual([document]);
		registry.authorities['synthetic-service-key'].revokedAt = '2026-10-06T12:30:00Z';
		expect(await approvedDocuments([document], [], {}, now, registry)).toEqual([]);
		expect(() =>
			freezeEditorialJson({
				get value() {
					return Math.random();
				}
			})
		).toThrow();
		expect(() => freezeEditorialJson({ value: new Date() })).toThrow();
	});
	it('admits an exact package and renders truthful organization/automation metadata', async () => {
		const { document, registry } = await fixture();
		const docs = await approvedDocuments([document], [], {}, now, registry);
		expect(docs).toEqual([document]);
		const schema = JSON.parse(articleSeo(docs[0]).jsonLd!);
		expect(schema['@type']).toBe('Article');
		expect(schema.author['@type']).toBe('Organization');
		const { body } = render(EditorialArticle, { props: { document: docs[0] } });
		expect(body).toContain('Sem revisão humana independente');
		expect(body).toContain('Organização sintética');
		expect(editorialSitemap(docs)).toContain('/mapa-astral');
		expect(recentNews(docs, now)).toEqual([]);
		expect(newsSitemap(recentNews(docs, now))).not.toContain('/mapa-astral');
	});
	it('keeps expired admissions readable, while respecting later revocation', async () => {
		const { document, registry } = await fixture();
		const later = new Date('2026-11-06T13:00:00Z');
		expect(await approvedDocuments([document], [], {}, later, registry)).toEqual([document]);
		registry.authorities['synthetic-service-key'].revokedAt = '2026-11-06T12:00:00Z';
		expect(await approvedDocuments([document], [], {}, later, registry)).toEqual([]);
	});
	it('rechecks changed evidence bytes and signatures after a successful read', async () => {
		for (const change of ['evidence', 'signature']) {
			const { document, registry } = await fixture();
			expect(await approvedDocuments([document], [], {}, now, registry)).toEqual([document]);
			const item = registry.packages[0];
			if (change === 'evidence') item.evidenceFiles.get('fixture.json')![0] ^= 1;
			else {
				item.attestation!.signature = 'A'.repeat(88);
				item.admission.attestationDigest = await digest(item.attestation);
			}
			expect(await approvedDocuments([document], [], {}, now, registry)).toEqual([]);
		}
	});
	it('rejects changed body, mismatched revision, duplicate packages and missing authority', async () => {
		const { document, registry } = await fixture();
		const changed = {
			...document,
			sections: [{ heading: 'Contexto', paragraphs: ['Texto alterado após o aceite.'] }]
		};
		expect(await approvedDocuments([changed], [], {}, now, registry)).toEqual([]);
		expect(await approvedDocuments([{ ...document, revision: 2 }], [], {}, now, registry)).toEqual(
			[]
		);
		expect(
			await approvedDocuments([document], [], {}, now, {
				...registry,
				packages: [...registry.packages, ...registry.packages]
			})
		).toEqual([]);
		expect(
			await approvedDocuments([document], [], {}, now, { ...registry, authorities: {} })
		).toEqual([]);
	});
	it('applies public date, path, source and language validation before admission', async () => {
		for (const patch of [
			{ path: '/rota-inexistente' },
			{ sources: [] },
			{ publishedAt: '2026-10-07T12:00:00Z' },
			{ title: 'Cartografia celeste' }
		]) {
			const { document, registry } = await fixture();
			Object.assign(document, patch);
			expect(await approvedDocuments([document], [], {}, now, registry)).toEqual([]);
		}
	});
	it('keeps drafts and missing attestations out of all publication surfaces', async () => {
		const { document, registry } = await fixture();
		for (const state of ['DRAFT', 'IN_REVIEW', 'APPROVED'] as const) {
			expect(await approvedDocuments([{ ...document, state }], [], {}, now, registry)).toEqual([]);
		}
		registry.packages[0].attestation = null;
		const docs = await approvedDocuments([document], [], {}, now, registry);
		expect(docs).toEqual([]);
		expect(editorialSitemap(docs)).not.toContain('/mapa-astral');
		expect(recentNews(docs, now)).toEqual([]);
	});
});
