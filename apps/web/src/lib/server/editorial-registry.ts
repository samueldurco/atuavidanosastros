import {
	approvedDocuments,
	validDocument,
	type EditorialDocument,
	type EditorialSummary,
	type EditorialApproval,
	type EditorialAuthority
} from './editorial';
import {
	freezeEditorialJson,
	type AutomatedPublication,
	type AutomatedRegistry
} from './editorial-automation';
import release from './editorial-release/registry.json';
import storedHoroscopeFacts from './editorial-release/horoscope-facts.json';
import type { PublicHoroscopeSnapshot } from './public-horoscope-facts';
import storedDatedIndex from './editorial-release/dated-index.json';
import {
	createDatedArchiveRead,
	type DatedArchiveRelease,
	type EditorialAssetFetch
} from './dated-horoscope-archive';

// Server-owned, immutable packages admitted by the release process. Public keys only.
// Exact evidence bytes remain bundled so every read rechecks the signed package.
type StoredRelease = {
	authorities: AutomatedRegistry['authorities'];
	packages: Omit<AutomatedPublication, 'evidenceFiles'>[];
	evidenceByDigest: Record<string, string>;
};
const stored = release as unknown as StoredRelease;
const datedIndex = freezeEditorialJson(storedDatedIndex, false) as unknown as DatedArchiveRelease;
for (const entry of datedIndex.entries) {
	freezeEditorialJson(entry.index);
	freezeEditorialJson(entry.scope);
	freezeEditorialJson(entry.grant);
}
const horoscopeFacts = storedHoroscopeFacts as unknown as PublicHoroscopeSnapshot[];
freezeEditorialJson(horoscopeFacts);
for (const entry of stored.packages) {
	freezeEditorialJson(entry.document);
	freezeEditorialJson(entry.document.author);
	if (entry.report) freezeEditorialJson(entry.report);
	if (entry.evidenceManifest) freezeEditorialJson(entry.evidenceManifest);
	if (entry.attestation) freezeEditorialJson(entry.attestation);
	if (entry.dated) freezeEditorialJson(entry.dated);
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
type Select = (document: EditorialSummary) => boolean;

// Only narrow a read when doing so cannot hide a competing identity or author.
// An ambiguous release uses the original full verification and collision rules.
const identities = [...documents, ...datedIndex.entries.flatMap((entry) => entry.index.documents)];
const authorIdentities = new Map<string, string>();
const canNarrow =
	new Set(identities.map((item) => item.id)).size === identities.length &&
	new Set(identities.map((item) => item.path)).size === identities.length &&
	identities.every(({ author }) => {
		const identity = JSON.stringify(author);
		const previous = authorIdentities.get(author.id);
		authorIdentities.set(author.id, identity);
		return previous === undefined || previous === identity;
	});

async function readPublishedEditorial(
	now: Date,
	archive: ReturnType<typeof createDatedArchiveRead>,
	select?: Select
): Promise<EditorialSummary[]> {
	const selection = canNarrow ? select : undefined;
	const candidates = selection ? documents.filter(selection) : documents;
	const registry = selection
		? {
				authorities: automated.authorities,
				packages: automated.packages.filter((item) => selection(item.document))
			}
		: automated;
	const combined = [
		...(await approvedDocuments(candidates, approvals, authorities, now, registry, horoscopeFacts)),
		...(await archive.summaries(selection))
	];
	const ids = new Map<string, number>(),
		paths = new Map<string, number>();
	const authors = new Map<string, Set<string>>();
	for (const document of combined) {
		ids.set(document.id, (ids.get(document.id) ?? 0) + 1);
		paths.set(document.path, (paths.get(document.path) ?? 0) + 1);
		const signatures = authors.get(document.author.id) ?? new Set<string>();
		signatures.add(JSON.stringify(document.author));
		authors.set(document.author.id, signatures);
	}
	return combined
		.filter(
			(document) =>
				ids.get(document.id) === 1 &&
				paths.get(document.path) === 1 &&
				authors.get(document.author.id)?.size === 1
		)
		.filter((document) => !select || select(document))
		.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
}

/** One request shares verification, while the next request rechecks admission and evidence. */
export function createEditorialRead(now = new Date()) {
	const readAt = new Date(now.getTime());
	const archive = createDatedArchiveRead(datedIndex, stored.authorities, readAt);
	let summaries: Promise<EditorialSummary[]> | undefined;
	const readSummaries = (select?: Select) => {
		if (select && !summaries) return readPublishedEditorial(readAt, archive, select);
		const all = (summaries ??= readPublishedEditorial(readAt, archive));
		return select ? all.then((items) => items.filter(select)) : all;
	};
	return {
		summaries: readSummaries,
		async document(path: string, fetchAsset?: EditorialAssetFetch) {
			const [summary] = await readSummaries((document) => document.path === path);
			if (!summary) return;
			if (summary.sections) return summary as EditorialDocument;
			if (fetchAsset) return archive.document(path, fetchAsset);
		}
	};
}

export async function publishedEditorial(now = new Date()): Promise<EditorialSummary[]> {
	return createEditorialRead(now).summaries();
}

export async function publishedEditorialDocument(
	path: string,
	fetchAsset?: EditorialAssetFetch,
	now = new Date()
): Promise<EditorialDocument | undefined> {
	return createEditorialRead(now).document(path, fetchAsset);
}
