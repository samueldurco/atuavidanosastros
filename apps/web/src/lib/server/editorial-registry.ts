import {
	approvedDocuments,
	type EditorialDocument,
	type EditorialApproval,
	type EditorialAuthority
} from './editorial';

// No approved public author, content, or independent signing authority has been supplied.
// Do not import fixtures, accept HTTP approvals, or install a signing key in this app.
// Pin public reviewer keys only after owner-approved authority onboarding. The external
// reviewer signs approvalPayload() after reviewing the exact documentDigest().
const documents: readonly EditorialDocument[] = [];
const approvals: readonly EditorialApproval[] = [];
const authorities: Readonly<Record<string, EditorialAuthority>> = {};

export function publishedEditorial(now = new Date()): Promise<EditorialDocument[]> {
	return approvedDocuments(documents, approvals, authorities, now);
}
