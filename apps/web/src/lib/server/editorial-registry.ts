import {
	approvedDocuments,
	validDocument,
	type EditorialDocument,
	type EditorialApproval,
	type EditorialAuthority
} from './editorial';
import {
	freezeEditorialJson,
	type AutomatedPublication,
	type AutomatedRegistry
} from './editorial-automation';
import release from './editorial-release/registry.json';

// Server-owned, immutable packages admitted by the release process. Public keys only.
// Exact evidence bytes remain bundled so every read rechecks the signed package.
type StoredRelease = {
	authorities: AutomatedRegistry['authorities'];
	packages: Omit<AutomatedPublication, 'evidenceFiles'>[];
	evidenceByDigest: Record<string, string>;
};
const stored = release as unknown as StoredRelease;
for (const entry of stored.packages) {
	freezeEditorialJson(entry.document);
	if (entry.report) freezeEditorialJson(entry.report);
	if (entry.evidenceManifest) freezeEditorialJson(entry.evidenceManifest);
	if (entry.attestation) freezeEditorialJson(entry.attestation);
	// Prepare immutable content at Worker initialization, outside request handling.
	// Signatures, evidence bytes, revocation and publication dates stay per-read checks.
	validDocument(entry.document, new Date(8640000000000000));
}
const encoder = new TextEncoder();
const bytes = new Map(
	Object.entries(stored.evidenceByDigest).map(([digest, value]) => [digest, encoder.encode(value)])
);
const automated: AutomatedRegistry = {
	authorities: stored.authorities,
	packages: stored.packages.map((entry) => ({
		...entry,
		evidenceFiles: new Map(
			(entry.evidenceManifest?.files ?? []).map((file) => [
				file.path,
				bytes.get(file.sha256) ?? new Uint8Array()
			])
		)
	}))
};
const documents: readonly EditorialDocument[] = automated.packages.map((entry) => entry.document);
const approvals: readonly EditorialApproval[] = [];
const authorities: Readonly<Record<string, EditorialAuthority>> = {};

export function publishedEditorial(now = new Date()): Promise<EditorialDocument[]> {
	return approvedDocuments(documents, approvals, authorities, now, automated);
}
