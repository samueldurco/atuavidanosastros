import { approvedDocuments, type EditorialDocument, type EditorialSummary } from './editorial';
import {
	byteDigest,
	canonicalJson,
	digest,
	freezeEditorialJson,
	type AutomatedPublication,
	type AutomatedRegistry
} from './editorial-automation';
import {
	datedHoroscopeIndexDocument,
	verifyDatedHoroscopeIndex,
	type DatedHoroscopeIndexEntry
} from './dated-horoscope-automation';

export interface DatedArchiveEntry extends DatedHoroscopeIndexEntry {
	asset: { path: string; sha256: string };
	admission: { acceptedAt: string; gateEvidenceDigest: string };
}
export interface DatedArchiveRelease {
	schemaVersion: 'atv-dated-horoscope-index-release-v1';
	entries: DatedArchiveEntry[];
}
interface ArchiveAsset {
	schemaVersion: 'atv-dated-horoscope-archive-v1';
	packages: Omit<AutomatedPublication, 'evidenceFiles'>[];
	evidenceByDigest: Record<string, string>;
}
export type EditorialAssetFetch = (path: string) => Promise<Response>;
type IndexAdmission = (entry: DatedArchiveEntry) => Promise<boolean>;
const hex = (value: unknown): value is string =>
	typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);

async function admittedIndex(
	entry: DatedArchiveEntry,
	authorities: AutomatedRegistry['authorities'],
	now: Date
) {
	if (
		!entry.asset ||
		!hex(entry.asset.sha256) ||
		entry.asset.path !== `/_editorial/dated/${entry.asset.sha256}.json` ||
		!hex(entry.admission?.gateEvidenceDigest)
	)
		return false;
	return (
		await verifyDatedHoroscopeIndex({
			indexEntry: entry,
			authorities,
			now,
			admittedAt: entry.admission.acceptedAt
		})
	).approved;
}

/** Listings verify signed metadata; historical text and ephemerides stay in static assets. */
async function readSummaries(
	release: DatedArchiveRelease,
	now: Date,
	admit: IndexAdmission
): Promise<EditorialSummary[]> {
	if (release.schemaVersion !== 'atv-dated-horoscope-index-release-v1') return [];
	const ids = new Map<string, number>();
	const paths = new Map<string, number>();
	// Count before validation: an invalid competing entry still makes the address ambiguous.
	for (const entry of release.entries) {
		for (const document of entry.index.documents) {
			ids.set(document.id, (ids.get(document.id) ?? 0) + 1);
			paths.set(document.path, (paths.get(document.path) ?? 0) + 1);
		}
	}
	const documents: EditorialSummary[] = [];
	for (const entry of release.entries) {
		if (!(await admit(entry))) continue;
		documents.push(
			...entry.index.documents.filter(
				(d) =>
					ids.get(d.id) === 1 &&
					paths.get(d.path) === 1 &&
					Date.parse(d.publishedAt) <= now.getTime() &&
					Date.parse(d.modifiedAt) <= now.getTime()
			)
		);
	}
	return documents;
}

/** Fetch only the requested interval. A content hash is not a substitute for approval. */
async function readDocument(
	path: string,
	release: DatedArchiveRelease,
	authorities: AutomatedRegistry['authorities'],
	fetchAsset: EditorialAssetFetch,
	now: Date,
	admit: IndexAdmission
): Promise<EditorialDocument | undefined> {
	try {
		if (release.schemaVersion !== 'atv-dated-horoscope-index-release-v1') return;
		const matches = release.entries.filter((entry) =>
			entry.index.documents.some((document) => document.path === path)
		);
		if (matches.length !== 1) return;
		const entry = matches[0];
		if (!(await admit(entry))) return;
		const summary = entry.index.documents.find((document) => document.path === path)!;
		if (
			Date.parse(summary.publishedAt) > now.getTime() ||
			Date.parse(summary.modifiedAt) > now.getTime()
		)
			return;
		const response = await fetchAsset(entry.asset.path);
		if (!response.ok) return;
		const bytes = new Uint8Array(await response.arrayBuffer());
		if ((await byteDigest(bytes)) !== entry.asset.sha256) return;
		const asset = JSON.parse(new TextDecoder().decode(bytes)) as ArchiveAsset;
		if (
			asset.schemaVersion !== 'atv-dated-horoscope-archive-v1' ||
			!Array.isArray(asset.packages) ||
			asset.packages.length !== 12
		)
			return;
		const candidates = asset.packages.filter((item) => item.document.id === summary.id);
		if (candidates.length !== 1) return;
		const item = candidates[0];
		if (
			canonicalJson(datedHoroscopeIndexDocument(item.document)) !== canonicalJson(summary) ||
			(await digest(item.document)) !== entry.index.documentDigests[summary.id] ||
			!item.dated ||
			canonicalJson(item.dated.scope) !== canonicalJson(entry.scope) ||
			canonicalJson(item.dated.grant) !== canonicalJson(entry.grant) ||
			item.admission.acceptedAt !== entry.admission.acceptedAt ||
			item.admission.gateEvidenceDigest !== entry.admission.gateEvidenceDigest
		)
			return;
		const evidenceFiles = new Map(
			(item.evidenceManifest?.files ?? []).map((file) => [
				file.path,
				new TextEncoder().encode(asset.evidenceByDigest[file.sha256] ?? '')
			])
		);
		freezeEditorialJson(item);
		const packages = [{ ...item, evidenceFiles }];
		return (
			await approvedDocuments([item.document], [], {}, now, { authorities, packages }, [
				item.dated.facts
			])
		)[0];
	} catch {
		// Unavailable assets, malformed packages and failed verification never become readings.
		return;
	}
}

/** Share admission only within one request, bound to its release, authorities and clock. */
export function createDatedArchiveRead(
	release: DatedArchiveRelease,
	authorities: AutomatedRegistry['authorities'],
	now: Date
) {
	const readAt = new Date(now.getTime());
	const admitted = new Map<DatedArchiveEntry, Promise<boolean>>();
	const admit: IndexAdmission = (entry) => {
		let result = admitted.get(entry);
		if (!result) {
			result = admittedIndex(entry, authorities, readAt);
			admitted.set(entry, result);
		}
		return result;
	};
	return {
		summaries: () => readSummaries(release, readAt, admit),
		document: (path: string, fetchAsset: EditorialAssetFetch) =>
			readDocument(path, release, authorities, fetchAsset, readAt, admit)
	};
}

export function archivedEditorialSummaries(
	release: DatedArchiveRelease,
	authorities: AutomatedRegistry['authorities'],
	now: Date
): Promise<EditorialSummary[]> {
	return createDatedArchiveRead(release, authorities, now).summaries();
}

export function archivedEditorialDocument(
	path: string,
	release: DatedArchiveRelease,
	authorities: AutomatedRegistry['authorities'],
	fetchAsset: EditorialAssetFetch,
	now: Date
): Promise<EditorialDocument | undefined> {
	return createDatedArchiveRead(release, authorities, now).document(path, fetchAsset);
}
