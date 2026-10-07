// Public evergreen guide admission only. No authority is provisioned by this module.
import { hash } from 'node:crypto';
import type { EditorialDocument } from './editorial';
export interface EvidenceRow {
	id: string;
	reason: string;
	evidence: string[];
}
export interface EditorialReviewReport {
	policyVersion: string;
	documentId: string;
	revision: number;
	digest: string;
	reviewedAt: string;
	reviewMode: string;
	risk: string;
	checks: (EvidenceRow & { status: string })[];
	scores: (EvidenceRow & { points: number })[];
	decision: string;
	corrections: string[];
	publicationGate: string;
}
export interface AutomatedAuthority {
	identityType: string;
	reviewerId: string;
	publicKey: string;
	enabled: boolean;
	revokedAt: string | null;
	policyVersion: string;
	allowedKinds: string[];
	risk: string;
	validFrom: string;
	validUntil: string;
	provisioningEvidence: { id: string; digest: string };
}
export interface AutomatedAttestation {
	protocol: string;
	keyId: string;
	reviewerId: string;
	documentId: string;
	revision: number;
	digest: string;
	policyVersion: string;
	decision: string;
	reviewMode: string;
	risk: string;
	reportDigest: string;
	evidenceManifestDigest: string;
	approvedAt: string;
	expiresAt: string;
	signature: string;
}
export interface EditorialEvidenceManifest {
	schemaVersion: string;
	documentId: string;
	revision: number;
	documentDigest: string;
	files: { path: string; sha256: string }[];
}
export interface AutomatedApprovalInput {
	document: EditorialDocument;
	report: EditorialReviewReport | null;
	evidenceManifest: EditorialEvidenceManifest | null;
	evidenceFiles: ReadonlyMap<string, Uint8Array<ArrayBuffer>>;
	attestation: AutomatedAttestation | null;
	authorities: Readonly<Record<string, AutomatedAuthority>>;
	now: Date;
}
// Trusted, server-owned release record. Never supplied through an HTTP/client endpoint.
// Admission expiry bounds release, not the lifetime of an already published article.
export interface EditorialAdmission {
	acceptedAt: string;
	attestationDigest: string;
	gateEvidenceDigest: string;
}
export type AutomatedPublication = Omit<AutomatedApprovalInput, 'authorities' | 'now'> & {
	admission: EditorialAdmission;
};
export interface AutomatedRegistry {
	packages: readonly AutomatedPublication[];
	authorities: Readonly<Record<string, AutomatedAuthority>>;
}

// Rubrica derivada de atvna-editorial-approval/scripts/validate-report.mjs.
export const POLICY = 'atvna-editorial-policy-2026-10-06-v1';
export const PROTOCOL = 'atv-editorial-automation-v2';
export const GATE = 'PENDING_INTEGRATION_AND_RELEASE_GATES';
const CHECKS = [
	'scope',
	'claims',
	'rights',
	'identity',
	'safety',
	'originality',
	'tools',
	'integrity'
];
const WEIGHTS: Record<string, number> = {
	intent: 20,
	value: 20,
	accuracy: 15,
	trust: 10,
	language: 10,
	journey: 10,
	metadata: 10,
	maintenance: 5
};
const nonempty = (x: unknown): x is string => typeof x === 'string' && x.trim().length > 0;
const hex = (x: unknown) => typeof x === 'string' && /^[0-9a-f]{64}$/.test(x);
const path = (x: unknown) =>
	typeof x === 'string' &&
	/^[A-Za-z0-9_./-]+$/.test(x) &&
	!x.startsWith('/') &&
	!x.split('/').some((p) => p === '..' || p === '.' || !p);
const exactRows = (rows: EvidenceRow[], ids: string[]) =>
	Array.isArray(rows) &&
	rows.length === ids.length &&
	ids.every((id) => rows.filter((r) => r?.id === id).length === 1);
const evidenceRow = (r: EvidenceRow) =>
	nonempty(r?.reason) &&
	Array.isArray(r.evidence) &&
	r.evidence.length > 0 &&
	r.evidence.every(nonempty);

const immutableCanonical = new WeakMap<object, string>();
const immutableBytes = new WeakMap<object, Uint8Array<ArrayBuffer>>();

/** Pre-encode server-owned JSON only after making every nested value immutable. */
export function freezeEditorialJson<T extends object>(value: T): T {
	const freeze = (item: unknown) => {
		if (item === null || typeof item !== 'object') return;
		const prototype = Object.getPrototypeOf(item);
		if (
			(Array.isArray(item) && prototype !== Array.prototype) ||
			(!Array.isArray(item) && prototype !== Object.prototype && prototype !== null)
		)
			throw Error('JSON não simples');
		for (const descriptor of Object.values(Object.getOwnPropertyDescriptors(item))) {
			if (descriptor.get || descriptor.set) throw Error('JSON com accessor');
			freeze(descriptor.value);
		}
		Object.freeze(item);
	};
	freeze(value);
	const canonical = canonicalJson(value);
	immutableCanonical.set(value, canonical);
	immutableBytes.set(value, new TextEncoder().encode(canonical));
	return value;
}

export const isImmutableEditorialJson = (value: object) => immutableCanonical.has(value);

export function canonicalJson(value: unknown): string {
	if (value !== null && typeof value === 'object') {
		const cached = immutableCanonical.get(value);
		if (cached !== undefined) return cached;
	}
	if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']';
	if (value !== null && typeof value === 'object') {
		if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)
			throw Error('JSON não simples');
		return (
			'{' +
			Object.entries(value)
				.filter(([, v]) => v !== undefined)
				.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
				.map(([k, v]) => JSON.stringify(k) + ':' + canonicalJson(v))
				.join(',') +
			'}'
		);
	}
	if (typeof value === 'number' && !Number.isFinite(value)) throw Error('Número não finito');
	const s = JSON.stringify(value);
	if (s === undefined) throw Error('Valor fora de JSON');
	return s;
}
const bytes = (value: unknown) =>
	(value !== null && typeof value === 'object' ? immutableBytes.get(value) : undefined) ??
	new TextEncoder().encode(canonicalJson(value));
export async function byteDigest(value: Uint8Array) {
	// Native one-shot SHA-256 avoids buffer copies and JS hex conversion. Every
	// invocation still hashes the actual bytes; no digest survives a registry read.
	return hash('sha256', value, 'hex');
}
export const digest = (value: unknown) => byteDigest(bytes(value));
export const attestationPayload = (value: unknown) => new Uint8Array(bytes(value));

// One read only: shared evidence is hashed once, then discarded. A later read
// rechecks every byte and signature, including changes to revocation or packages.
function verificationDigests() {
	const evidence = new WeakMap<Uint8Array, Promise<string>>();
	const keys = new Map<string, Promise<CryptoKey>>();
	return {
		key(publicKey: string) {
			let key = keys.get(publicKey);
			if (!key) {
				key = crypto.subtle.importKey('raw', base64(publicKey), { name: 'Ed25519' }, false, [
					'verify'
				]);
				keys.set(publicKey, key);
			}
			return key;
		},
		bytes(value: Uint8Array) {
			let result = evidence.get(value);
			if (!result) {
				result = byteDigest(value);
				evidence.set(value, result);
			}
			return result;
		}
	};
}
type VerificationDigests = ReturnType<typeof verificationDigests>;

const parsedInstants = new Map<string, number>();
function instant(value: unknown): number {
	if (typeof value !== 'string') return NaN;
	const cached = parsedInstants.get(value);
	if (cached !== undefined) return cached;
	const result = parseInstant(value);
	if (parsedInstants.size < 256) parsedInstants.set(value, result);
	return result;
}
function parseInstant(value: string): number {
	const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{3})?(Z|[+-]\d{2}:\d{2})$/.exec(
		value
	);
	if (!m) return NaN;
	const [year, month, day, hour, minute, second] = m.slice(1, 7).map(Number);
	const d = new Date(0);
	d.setUTCFullYear(year, month - 1, day);
	if (
		d.getUTCFullYear() !== year ||
		d.getUTCMonth() !== month - 1 ||
		d.getUTCDate() !== day ||
		hour > 23 ||
		minute > 59 ||
		second > 59
	)
		return NaN;
	return Date.parse(value);
}
function base64(value: unknown): Uint8Array<ArrayBuffer> {
	if (
		typeof value !== 'string' ||
		!value.length ||
		value.length % 4 !== 0 ||
		!/^[A-Za-z0-9+/]+={0,2}$/.test(value)
	)
		throw Error('Base64 inválido');
	return Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
}
export async function assessReport(
	document: EditorialDocument,
	report: EditorialReviewReport | null,
	now: Date
) {
	return assessReportDigest(document, report, now, await digest(document));
}

function assessReportDigest(
	document: EditorialDocument,
	report: EditorialReviewReport | null,
	now: Date,
	documentDigest: string
) {
	const errors = [];
	if (!report || typeof report !== 'object' || Array.isArray(report))
		return { valid: false, decision: 'BLOQUEADO', errors: ['Relatório ausente'] };
	if (report.policyVersion !== POLICY) errors.push('Política desconhecida');
	if (
		report.documentId !== document.id ||
		report.revision !== document.revision ||
		report.digest !== documentDigest
	)
		errors.push('Documento/revisão/digest divergentes');
	if (!Number.isFinite(instant(report.reviewedAt)) || instant(report.reviewedAt) > now.getTime())
		errors.push('Data de revisão inválida');
	if (report.reviewMode !== 'separate-pass' || report.publicationGate !== GATE)
		errors.push('Passagem/gate inválidos');
	if (!Array.isArray(report.corrections) || !report.corrections.every(nonempty))
		errors.push('Correções inválidas');
	const checks =
		exactRows(report.checks, CHECKS) &&
		report.checks.every((r) => evidenceRow(r) && ['PASS', 'FAIL', 'UNKNOWN'].includes(r.status));
	const scores =
		exactRows(report.scores, Object.keys(WEIGHTS)) &&
		report.scores.every(
			(r) =>
				evidenceRow(r) && Number.isInteger(r.points) && r.points >= 0 && r.points <= WEIGHTS[r.id]
		);
	if (!checks) errors.push('Bloqueadores incompletos');
	if (!scores) errors.push('Rubrica inválida');
	const total = scores ? report.scores.reduce((n, r) => n + r.points, 0) : null;
	let decision = 'BLOQUEADO';
	if (
		!errors.length &&
		report.risk === 'low-educational-evergreen' &&
		report.checks.every((r) => r.status === 'PASS')
	) {
		decision =
			total !== null &&
			total >= 85 &&
			report.scores.every((r) => r.points >= Math.ceil(WEIGHTS[r.id] / 2))
				? 'APROVADO_AUTOMATICAMENTE'
				: 'CORRIGIR';
	}
	if (report.decision !== decision) errors.push('Decisão divergente');
	if (decision === 'APROVADO_AUTOMATICAMENTE' && report.corrections.length)
		errors.push('Aprovação com correções pendentes');
	if (decision !== 'APROVADO_AUTOMATICAMENTE' && !report.corrections.length)
		errors.push('Informar correções ou ação de bloqueio');
	return {
		valid: !errors.length,
		decision: errors.length ? 'BLOQUEADO' : decision,
		score: total,
		errors
	};
}

/**
 * Verifica somente a atestação editorial. O chamador ainda deve aplicar validDocument,
 * unicidade, render/SSR, Gate B, CI e release existentes. Falha jamais autoriza v1.
 * evidenceFiles é Map<caminho, Uint8Array> de bytes efetivamente carregados.
 */
export async function verifyAutomatedApproval(input: AutomatedApprovalInput) {
	return verifyAutomatedApprovalWithDigests(input, verificationDigests());
}

async function verifyAutomatedApprovalWithDigests(
	input: AutomatedApprovalInput,
	digests: VerificationDigests
) {
	const reject = (reason: string) => ({ approved: false, reason, publicationGate: GATE });
	try {
		const {
			document: d,
			report: r,
			evidenceManifest: e,
			evidenceFiles,
			attestation: a,
			authorities,
			now
		} = input;
		if (!(now instanceof Date) || !Number.isFinite(now.getTime())) return reject('CLOCK');
		if (
			!d ||
			!nonempty(d.id) ||
			!Number.isSafeInteger(d.revision) ||
			d.revision < 1 ||
			d.kind !== 'guide' ||
			d.calculation ||
			!['APPROVED', 'PUBLISHED'].includes(d.state)
		)
			return reject('SCOPE');
		if (
			d.author?.type !== 'Organization' ||
			!nonempty(d.author.id) ||
			!nonempty(d.author.name) ||
			!nonempty(d.author.bio) ||
			d.automationDisclosure?.generatedWithAI !== true ||
			d.automationDisclosure?.humanReview !== false ||
			d.automationDisclosure?.reviewMode !== 'separate-pass'
		)
			return reject('IDENTITY_DISCLOSURE');
		if (
			a?.protocol !== PROTOCOL ||
			a.policyVersion !== POLICY ||
			a.decision !== 'APROVADO_AUTOMATICAMENTE' ||
			a.risk !== 'low-educational-evergreen' ||
			a.reviewMode !== 'separate-pass'
		)
			return reject('PROTOCOL');
		const authority = authorities?.[a.keyId];
		if (
			!authority ||
			authority.identityType !== 'automated-service' ||
			authority.reviewerId !== a.reviewerId ||
			authority.reviewerId === d.author.id ||
			authority.enabled !== true ||
			authority.revokedAt !== null ||
			authority.policyVersion !== POLICY ||
			authority.allowedKinds?.length !== 1 ||
			authority.allowedKinds[0] !== 'guide' ||
			authority.risk !== 'low-educational-evergreen' ||
			!nonempty(authority.provisioningEvidence?.id) ||
			!hex(authority.provisioningEvidence?.digest)
		)
			return reject('AUTHORITY');
		const times = [
			d.publishedAt,
			d.modifiedAt,
			r?.reviewedAt,
			a.approvedAt,
			a.expiresAt,
			authority.validFrom,
			authority.validUntil
		].map(instant);
		if (times.some((x) => !Number.isFinite(x))) return reject('DATES');
		const [published, modified, reviewed, approved, expires, from, until] = times;
		if (!a || !r || !e) return reject('MISSING_PACKAGE');
		if (
			published > modified ||
			modified > reviewed ||
			reviewed > approved ||
			approved > now.getTime() ||
			expires <= now.getTime() ||
			expires <= approved ||
			expires - approved > 24 * 60 * 60 * 1000 ||
			from > approved ||
			until <= now.getTime() ||
			expires > until
		)
			return reject('CHRONOLOGY');
		const documentDigest = await digest(d);
		if (
			a.documentId !== d.id ||
			a.revision !== d.revision ||
			a.digest !== documentDigest ||
			!hex(a.digest) ||
			a.reportDigest !== (await digest(r)) ||
			a.evidenceManifestDigest !== (await digest(e))
		)
			return reject('BINDING');
		const assessment = assessReportDigest(d, r, now, documentDigest);
		if (!assessment.valid || assessment.decision !== 'APROVADO_AUTOMATICAMENTE')
			return reject('REPORT');
		if (
			e?.schemaVersion !== 'atv-editorial-evidence-manifest-v1' ||
			e.documentId !== d.id ||
			e.revision !== d.revision ||
			e.documentDigest !== documentDigest ||
			!Array.isArray(e.files) ||
			!e.files.length ||
			!(evidenceFiles instanceof Map)
		)
			return reject('EVIDENCE');
		const files = new Set<string>();
		for (const f of e.files) {
			if (!path(f.path) || !hex(f.sha256) || files.has(f.path)) return reject('EVIDENCE_MANIFEST');
			files.add(f.path);
			const content = evidenceFiles.get(f.path);
			if (!(content instanceof Uint8Array) || (await digests.bytes(content)) !== f.sha256)
				return reject('EVIDENCE_BYTES');
		}
		// Referências da rubrica precisam resolver a arquivos incluídos e íntegros.
		for (const row of [...r.checks, ...r.scores]) {
			for (const ref of row.evidence) {
				const [file, ...locator] = ref.split('#');
				if (
					!files.has(file) ||
					locator.length > 1 ||
					(locator.length === 1 && !nonempty(locator[0]))
				)
					return reject('EVIDENCE_REFERENCE');
			}
		}
		const rawKey = base64(authority.publicKey),
			signature = base64(a.signature);
		if (rawKey.length !== 32 || signature.length !== 64) return reject('SIGNATURE_FORMAT');
		const key = await digests.key(authority.publicKey);
		const payload = { ...a };
		delete (payload as Partial<AutomatedAttestation>).signature;
		if (!(await crypto.subtle.verify('Ed25519', key, signature, attestationPayload(payload))))
			return reject('SIGNATURE');
		return {
			approved: true,
			documentDigest,
			reportDigest: a.reportDigest,
			evidenceManifestDigest: a.evidenceManifestDigest,
			reviewerId: a.reviewerId,
			publicationGate: GATE
		};
	} catch {
		return reject('MALFORMED_OR_UNSUPPORTED');
	}
}

/** Read an admitted immutable package; recheck signature, bytes and current revocation. */
export async function verifyAdmittedApproval(
	input: AutomatedApprovalInput & { admission: EditorialAdmission }
) {
	return verifyAdmittedApprovalWithDigests(input, verificationDigests());
}

/** Batch immutable server-owned packages without retaining trust across reads. */
export async function verifyAdmittedApprovals(registry: AutomatedRegistry, now: Date) {
	const digests = verificationDigests();
	const results = new Map<AutomatedPublication, boolean>();
	for (const item of registry.packages) {
		const result = await verifyAdmittedApprovalWithDigests(
			{ ...item, authorities: registry.authorities, now },
			digests
		);
		results.set(item, result.approved);
	}
	return results;
}

async function verifyAdmittedApprovalWithDigests(
	input: AutomatedApprovalInput & { admission: EditorialAdmission },
	digests: VerificationDigests
) {
	try {
		const { admission, now, attestation } = input;
		const accepted = instant(admission?.acceptedAt);
		if (
			!Number.isFinite(now.getTime()) ||
			!Number.isFinite(accepted) ||
			accepted > now.getTime() ||
			!hex(admission.gateEvidenceDigest) ||
			!attestation ||
			admission.attestationDigest !== (await digest(attestation))
		)
			return { approved: false, reason: 'ADMISSION', publicationGate: GATE };
		return verifyAutomatedApprovalWithDigests({ ...input, now: new Date(accepted) }, digests);
	} catch {
		return { approved: false, reason: 'ADMISSION', publicationGate: GATE };
	}
}
