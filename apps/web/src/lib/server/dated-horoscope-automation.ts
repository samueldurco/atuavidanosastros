import {
	attestationPayload,
	byteDigest,
	canonicalJson,
	digest,
	isImmutableEditorialJson,
	GATE,
	type AutomatedApprovalInput,
	type AutomatedAttestation,
	type EditorialReviewReport
} from './editorial-automation.ts';
import { assertRuntimeComposition } from '../../../../../scripts/lib/public-horoscope-compose.mjs';
import type { PublicHoroscopeSnapshot } from './public-horoscope-facts.ts';

export const DATED_POLICY = 'atvna-horoscope-policy-2026-10-20-v1';
export const DATED_PROTOCOL = 'atv-dated-horoscope-automation-v1';
export const DATED_METHOD = 'atv-solar-symbolic-sectors/1.0.0';
export const DATED_REVIEW_MODE = 'reviewed-corpus-and-runtime-verification';
export const DATED_RISK = 'general-symbolic-dated-horoscope';
export const SIGNS = [
	'aries', 'touro', 'gemeos', 'cancer', 'leao', 'virgem',
	'libra', 'escorpiao', 'sagitario', 'capricornio', 'aquario', 'peixes'
] as const;
export interface HoroscopeComposition {
	corpusVersion: string;
	corpusDigest: string;
	algorithmVersion: string;
	algorithmDigest: string;
	reviewMode: typeof DATED_REVIEW_MODE;
}
export interface HoroscopeCorpusReview {
	schemaVersion: 'atv-horoscope-corpus-review-v1';
	policyVersion: string;
	authoringAgent: string;
	reviewerAgent: string;
	composition: HoroscopeComposition;
	reviewedAt: string;
	decision: string;
	checks: EditorialReviewReport['checks'];
	scores: EditorialReviewReport['scores'];
	corrections: string[];
	publicationGate: string;
}
export interface HoroscopePolicyGrant {
	protocol: 'atv-dated-horoscope-grant-v1';
	keyId: string;
	reviewerId: string;
	policyVersion: string;
	methodVersion: string;
	reviewMode: string;
	composition: HoroscopeComposition;
	ownerDecisionDigest: string;
	corpusReviewDigest: string;
	allowedPeriods: string[];
	validFrom: string;
	validUntil: string;
	coverageFrom: string;
	signature: string;
}
export interface HoroscopeRuntimeReport {
	schemaVersion: 'atv-dated-horoscope-runtime-v1';
	documentId: string;
	documentDigest: string;
	factsDigest: string;
	claimsDigest: string;
	scopeDigest: string;
	composition: HoroscopeComposition;
	verifiedAt: string;
	checks: Record<string, string>;
	decision: string;
}
export interface HoroscopeScope {
	policyVersion: string;
	methodVersion: string;
	keyId: string;
	reviewerId: string;
	period: string;
	startDate: string;
	endDateExclusive: string;
	frozenAt: string;
	factsDigest: string;
	documentDigests: Record<string, string>;
	claimsDigests: Record<string, string>;
	composition: HoroscopeComposition;
}
export interface HoroscopeClaims {
	documentId: string;
	methodVersion: string;
	sign: string;
	factsDigest: string;
	claims: {
		section: number;
		paragraph: number;
		factorIds: string[];
		positionObservations: { at: number; sectors: Record<string, number> }[];
		observedAtByFactor: Record<string, string[]>;
		interpretation: string;
		sampledFactors: unknown[];
	}[];
}
export interface DatedHoroscopePackage {
	scope: HoroscopeScope;
	claims: HoroscopeClaims;
	facts: PublicHoroscopeSnapshot;
	corpusReview: HoroscopeCorpusReview;
	runtimeReport: HoroscopeRuntimeReport;
	grant: HoroscopePolicyGrant;
}
export interface DatedHoroscopeAttestation extends AutomatedAttestation {
	scopeDigest: string;
	claimsDigest: string;
	factsDigest: string;
	corpusReviewDigest: string;
	runtimeReportDigest: string;
	grantDigest: string;
}
export const DATED_INDEX_FIELDS = [
	'id', 'revision', 'state', 'path', 'kind', 'title', 'description', 'author',
	'automationDisclosure', 'publishedAt', 'modifiedAt', 'calculation', 'sources'
] as const;
export type DatedHoroscopeIndexDocument = Pick<
	AutomatedApprovalInput['document'], typeof DATED_INDEX_FIELDS[number]
>;
export interface DatedHoroscopeIndex {
	protocol: 'atv-dated-horoscope-index-v1';
	keyId: string;
	reviewerId: string;
	scopeDigest: string;
	grantDigest: string;
	signedAt: string;
	documents: DatedHoroscopeIndexDocument[];
	documentDigests: Record<string, string>;
	signature: string;
}
export interface DatedHoroscopeIndexEntry {
	index: DatedHoroscopeIndex;
	scope: HoroscopeScope;
	grant: HoroscopePolicyGrant;
}
export function datedHoroscopeIndexDocument(document: AutomatedApprovalInput['document']) {
	return Object.fromEntries(DATED_INDEX_FIELDS.map((field) => [field, document[field]])) as DatedHoroscopeIndexDocument;
}
const hex = (value: unknown): value is string =>
	typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const nonempty = (value: unknown): value is string =>
	typeof value === 'string' && value.trim().length > 0;
const same = (a: unknown, b: unknown) => canonicalJson(a) === canonicalJson(b);
const instant = (value: unknown) => {
	if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(value))
		return NaN;
	const parsed = Date.parse(value);
	return Number.isFinite(parsed) && new Date(parsed).toISOString().slice(0, 19) === value.slice(0, 19)
		? parsed : NaN;
};
const compositionValid = (value: HoroscopeComposition) =>
	value?.reviewMode === DATED_REVIEW_MODE && nonempty(value.corpusVersion) &&
	nonempty(value.algorithmVersion) && hex(value.corpusDigest) && hex(value.algorithmDigest);
const weights: Record<string, number> = {
	intent: 20, value: 20, accuracy: 15, trust: 10, language: 10,
	journey: 10, metadata: 10, maintenance: 5
};
const checkIds = ['scope', 'claims', 'rights', 'identity', 'safety', 'originality', 'tools', 'integrity'];
const runtimeChecks = ['facts', 'claims', 'composition', 'coverage', 'disclosure', 'differentiation'];
const exactKeys = (value: object, keys: string[]) =>
	Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
const evidenceRow = (row: { reason: string; evidence: string[] }) =>
	nonempty(row.reason) && Array.isArray(row.evidence) && row.evidence.length > 0 &&
	row.evidence.every(nonempty);

export function assessHoroscopeCorpusReview(review: HoroscopeCorpusReview): boolean {
	try {
		if (review.schemaVersion !== 'atv-horoscope-corpus-review-v1' ||
			review.policyVersion !== DATED_POLICY || !compositionValid(review.composition) ||
			!nonempty(review.authoringAgent) || !nonempty(review.reviewerAgent) ||
			review.authoringAgent === review.reviewerAgent || !Number.isFinite(instant(review.reviewedAt)) ||
			review.decision !== 'APROVADO_AUTOMATICAMENTE' || review.publicationGate !== GATE ||
			!Array.isArray(review.corrections) || review.corrections.length > 0 ||
			!Array.isArray(review.checks) || review.checks.length !== checkIds.length ||
			!Array.isArray(review.scores) || review.scores.length !== Object.keys(weights).length)
			return false;
		if (!checkIds.every((id) => review.checks.filter((row) => row.id === id).length === 1) ||
			review.checks.some((row) => row.status !== 'PASS' || !evidenceRow(row))) return false;
		let points = 0;
		for (const [id, maximum] of Object.entries(weights)) {
			const rows = review.scores.filter((row) => row.id === id);
			if (rows.length !== 1 || !evidenceRow(rows[0]) || !Number.isInteger(rows[0].points) ||
				rows[0].points < Math.ceil(maximum / 2) || rows[0].points > maximum) return false;
			points += rows[0].points;
		}
		return points >= 85;
	} catch { return false; }
}

const immutableDigests = new WeakMap<object, Promise<string>>();
const immutableSignatures = new WeakMap<object, Map<string, Promise<boolean>>>();
async function stableDigest(value: object) {
	if (!isImmutableEditorialJson(value)) return digest(value);
	let cached = immutableDigests.get(value);
	if (!cached) {
		cached = digest(value);
		immutableDigests.set(value, cached);
	}
	return cached;
}
async function signed(value: { signature: string }, publicKey: string) {
	if (!isImmutableEditorialJson(value)) return verifySignature(value, publicKey);
	let cached = immutableSignatures.get(value);
	if (!cached) {
		cached = new Map();
		immutableSignatures.set(value, cached);
	}
	let result = cached.get(publicKey);
	if (!result) {
		result = verifySignature(value, publicKey);
		cached.set(publicKey, result);
	}
	return result;
}
async function verifySignature(value: { signature: string }, publicKey: string) {
	try {
		const decode = (text: string) => {
			if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(text))
				throw Error('base64');
			return Uint8Array.from(atob(text), (character) => character.charCodeAt(0));
		};
		const raw = decode(publicKey), signature = decode(value.signature);
		if (raw.length !== 32 || signature.length !== 64) return false;
		const key = await crypto.subtle.importKey('raw', raw, 'Ed25519', false, ['verify']);
		const { signature: omitted, ...payload } = value;
		void omitted;
		return crypto.subtle.verify('Ed25519', key, signature, attestationPayload(payload));
	} catch { return false; }
}

/** Compact signed discovery; full article admission and reads still verify the full package. */
export async function verifyDatedHoroscopeIndex(input: {
	indexEntry: DatedHoroscopeIndexEntry;
	authorities: AutomatedApprovalInput['authorities'];
	now: Date;
	admittedAt?: string;
}) {
	const reject = (reason: string) => ({ approved: false, reason, publicationGate: GATE });
	try {
		const { index: i, scope: s, grant: g } = input.indexEntry;
		const authority = input.authorities[i.keyId];
		if (!authority || authority.identityType !== 'automated-service' || !authority.enabled ||
			authority.revokedAt !== null || authority.reviewerId !== i.reviewerId ||
			!nonempty(authority.provisioningEvidence?.id) || !hex(authority.provisioningEvidence?.digest))
			return reject('DATED_INDEX_AUTHORITY');
		if (i.protocol !== 'atv-dated-horoscope-index-v1' ||
			i.keyId !== s.keyId || i.keyId !== g.keyId || i.reviewerId !== s.reviewerId ||
			i.reviewerId !== g.reviewerId || g.protocol !== 'atv-dated-horoscope-grant-v1' ||
			g.policyVersion !== DATED_POLICY || s.policyVersion !== DATED_POLICY ||
			g.methodVersion !== DATED_METHOD || s.methodVersion !== DATED_METHOD ||
			g.reviewMode !== DATED_REVIEW_MODE || !compositionValid(g.composition) ||
			!same(g.composition, s.composition) || !hex(g.ownerDecisionDigest) ||
			!hex(g.corpusReviewDigest) || !Array.isArray(g.allowedPeriods) ||
			new Set(g.allowedPeriods).size !== g.allowedPeriods.length ||
			g.allowedPeriods.some((period) => !['daily', 'weekly', 'monthly'].includes(period)) ||
			!g.allowedPeriods.includes(s.period)) return reject('DATED_INDEX_GRANT');
		const start = instant(`${s.startDate}T00:00:00.000Z`);
		const end = instant(`${s.endDateExclusive}T00:00:00.000Z`);
		const expectedEnd = new Date(start);
		if (s.period === 'daily') expectedEnd.setUTCDate(expectedEnd.getUTCDate() + 1);
		else if (s.period === 'weekly' && expectedEnd.getUTCDay() === 1) expectedEnd.setUTCDate(expectedEnd.getUTCDate() + 7);
		else if (s.period === 'monthly' && expectedEnd.getUTCDate() === 1) expectedEnd.setUTCMonth(expectedEnd.getUTCMonth() + 1);
		else return reject('DATED_INDEX_COVERAGE');
		const times = [
			i.signedAt, s.frozenAt, g.validFrom, g.validUntil, authority.validFrom,
			authority.validUntil, `${g.coverageFrom}T00:00:00.000Z`
		].map(instant);
		const [signedAt, frozen, from, until, keyFrom, keyUntil, coverageFrom] = times;
		const observed = input.now.getTime();
		const admitted = input.admittedAt === undefined ? observed : instant(input.admittedAt);
		if (![start, end, observed, admitted, ...times].every(Number.isFinite) ||
			end !== expectedEnd.getTime() || frozen > signedAt || signedAt > admitted ||
			admitted > observed || admitted - signedAt >= 86_400_000 ||
			from > signedAt || until <= admitted || keyFrom > from || until > keyUntil ||
			start < coverageFrom || end > until) return reject('DATED_INDEX_CHRONOLOGY');
		const ids = SIGNS.map((sign) => `horoscopo-${sign}-${s.period}-${s.startDate}`);
		if (!exactKeys(s.documentDigests, ids) || !exactKeys(s.claimsDigests, ids) ||
			!Object.values(s.documentDigests).every(hex) || !Object.values(s.claimsDigests).every(hex) ||
			new Set(Object.values(s.documentDigests)).size !== 12 || !hex(s.factsDigest) ||
			!same(i.documentDigests, s.documentDigests) || !Array.isArray(i.documents) ||
			i.documents.length !== 12 || new Set(i.documents.map((d) => d.id)).size !== 12 ||
			i.scopeDigest !== await stableDigest(s) || i.grantDigest !== await stableDigest(g))
			return reject('DATED_INDEX_BINDING');
		for (const sign of SIGNS) {
			const d = i.documents.find((document) => document.id === `horoscopo-${sign}-${s.period}-${s.startDate}`);
			if (!d || !exactKeys(d, [...DATED_INDEX_FIELDS]) ||
				d.path !== `/horoscopo/${sign}/${s.period}/${s.startDate}` || d.kind !== 'horoscope' ||
				!['APPROVED', 'PUBLISHED'].includes(d.state) || !Number.isSafeInteger(d.revision) ||
				d.revision < 1 || !nonempty(d.title) || !nonempty(d.description) ||
				d.author?.type !== 'Organization' || !nonempty(d.author.id) || d.author.id === i.reviewerId ||
				d.automationDisclosure?.generatedWithAI !== true ||
				d.automationDisclosure?.humanReview !== false ||
				d.automationDisclosure?.reviewMode !== DATED_REVIEW_MODE ||
				d.calculation?.factsDigest !== s.factsDigest ||
				d.calculation?.coverageStart !== `${s.startDate}T00:00:00.000Z` ||
				d.calculation?.coverageEnd !== `${s.endDateExclusive}T00:00:00.000Z` ||
				!Array.isArray(d.sources) || !d.sources.length ||
				!Number.isFinite(instant(d.publishedAt)) || !Number.isFinite(instant(d.modifiedAt)) ||
				instant(d.publishedAt) > instant(d.modifiedAt) || instant(d.modifiedAt) > frozen)
				return reject('DATED_INDEX_DOCUMENT');
		}
		if (!await signed(g, authority.publicKey)) return reject('DATED_INDEX_GRANT_SIGNATURE');
		if (!await signed(i, authority.publicKey)) return reject('DATED_INDEX_SIGNATURE');
		return { approved: true, scopeDigest: i.scopeDigest, publicationGate: GATE };
	} catch { return reject('DATED_INDEX_MALFORMED'); }
}

/** Semantic composition is reviewed once; every generated byte and factual projection is bound per run. */
export async function validateDatedHoroscopePackage(input: AutomatedApprovalInput) {
	const reject = (reason: string) => ({ approved: false, reason, publicationGate: GATE });
	try {
		const { document: d, dated: p, evidenceFiles, evidenceManifest: manifest } = input;
		if (!p || d.kind !== 'horoscope' || !['APPROVED', 'PUBLISHED'].includes(d.state) ||
			!Number.isSafeInteger(d.revision) || d.revision < 1) return reject('DATED_SCOPE');
		const { scope: s, claims: c, facts: f, corpusReview: cr, runtimeReport: r } = p;
		assertRuntimeComposition({ document: d, claims: c, facts: f, scope: s });
		const signIndex = SIGNS.indexOf(c.sign as typeof SIGNS[number]);
		if (signIndex < 0 || s.policyVersion !== DATED_POLICY || s.methodVersion !== DATED_METHOD ||
			c.methodVersion !== DATED_METHOD || !compositionValid(s.composition) ||
			!same(s.composition, cr.composition) || !same(s.composition, r.composition) ||
			!assessHoroscopeCorpusReview(cr)) return reject('DATED_COMPOSITION');
		if (d.author?.type !== 'Organization' || !nonempty(d.author.id) ||
			d.automationDisclosure?.generatedWithAI !== true ||
			d.automationDisclosure?.humanReview !== false ||
			d.automationDisclosure?.reviewMode !== DATED_REVIEW_MODE) return reject('DATED_DISCLOSURE');
		const start = instant(`${s.startDate}T00:00:00.000Z`);
		const end = instant(`${s.endDateExclusive}T00:00:00.000Z`);
		const expectedEnd = new Date(start);
		if (s.period === 'daily') expectedEnd.setUTCDate(expectedEnd.getUTCDate() + 1);
		else if (s.period === 'weekly' && expectedEnd.getUTCDay() === 1) expectedEnd.setUTCDate(expectedEnd.getUTCDate() + 7);
		else if (s.period === 'monthly' && expectedEnd.getUTCDate() === 1) expectedEnd.setUTCMonth(expectedEnd.getUTCMonth() + 1);
		else return reject('DATED_COVERAGE');
		if (!Number.isFinite(start) || end !== expectedEnd.getTime() ||
			f.period !== s.period || f.startDate !== s.startDate || f.endDateExclusive !== s.endDateExclusive ||
			f.timezone !== 'UTC' || f.stepHours !== 6 || d.path !== `/horoscopo/${c.sign}/${s.period}/${s.startDate}` ||
			d.id !== `horoscopo-${c.sign}-${s.period}-${s.startDate}` ||
			d.calculation?.coverageStart !== `${s.startDate}T00:00:00.000Z` ||
			d.calculation?.coverageEnd !== `${s.endDateExclusive}T00:00:00.000Z` ||
			d.calculation?.engine !== f.engine || d.calculation?.version !== f.version)
			return reject('DATED_COVERAGE');
		const [dd, fd, cd, sd] = await Promise.all([digest(d), digest(f), digest(c), digest(s)]);
		const ids = SIGNS.map((sign) => `horoscopo-${sign}-${s.period}-${s.startDate}`);
		if (!exactKeys(s.documentDigests, ids) || !exactKeys(s.claimsDigests, ids) ||
			!Object.values(s.documentDigests).every(hex) || !Object.values(s.claimsDigests).every(hex) ||
			new Set(Object.values(s.documentDigests)).size !== 12 || c.documentId !== d.id ||
			d.calculation.factsDigest !== fd || s.factsDigest !== fd || c.factsDigest !== fd ||
			s.documentDigests[d.id] !== dd || s.claimsDigests[d.id] !== cd ||
			r.schemaVersion !== 'atv-dated-horoscope-runtime-v1' || r.documentId !== d.id ||
			r.documentDigest !== dd || r.factsDigest !== fd || r.claimsDigest !== cd || r.scopeDigest !== sd ||
			r.decision !== 'PASS' || !exactKeys(r.checks, runtimeChecks) ||
			runtimeChecks.some((key) => r.checks[key] !== 'PASS')) return reject('DATED_BINDING');
		if (!Array.isArray(c.claims) || c.claims.length < 2 || !Array.isArray(f.rows) ||
			f.rows.length !== (end - start) / 21_600_000 || !Array.isArray(f.bodies) ||
			new Set(f.bodies).size !== f.bodies.length) return reject('DATED_CLAIMS');
		for (let i = 0; i < f.rows.length; i++) {
			if (f.rows[i][0] !== start + i * 21_600_000 ||
				f.rows[i].slice(1, 1 + f.bodies.length).some((v) => !Number.isFinite(v) || v < 0 || v >= 360))
				return reject('DATED_OBSERVATIONS');
		}
		const covered = new Set<string>(), factors = new Set<string>();
		for (const claim of c.claims) {
			if (!Array.isArray(claim.factorIds) || !claim.factorIds.length ||
				new Set(claim.factorIds).size !== claim.factorIds.length) return reject('DATED_CLAIMS');
			const selected = claim.factorIds.map((id) => f.candidates.find((candidate) => candidate.id === id));
			if (selected.some((factor) => !factor) || claim.factorIds.some((id) => !f.selectedIds.includes(id)) ||
				!same(selected, claim.sampledFactors) ||
				!Number.isInteger(claim.section) || !Number.isInteger(claim.paragraph) ||
				d.sections[claim.section]?.paragraphs[claim.paragraph] !== claim.interpretation ||
				!nonempty(claim.interpretation) || covered.has(`${claim.section}:${claim.paragraph}`) ||
				!Array.isArray(claim.positionObservations) || claim.positionObservations.length !== f.rows.length)
				return reject('DATED_CLAIMS');
			covered.add(`${claim.section}:${claim.paragraph}`);
			for (const id of claim.factorIds) factors.add(id);
			const bodies = [...new Set(selected.flatMap((factor) => factor?.bodies ?? []))];
			for (let i = 0; i < f.rows.length; i++) {
				const observation = claim.positionObservations[i], row = f.rows[i];
				if (observation.at !== row[0] || !exactKeys(observation.sectors, bodies))
					return reject('DATED_SECTORS');
				for (const body of bodies) {
					const index = f.bodies.indexOf(body);
					if (index < 0 || observation.sectors[body] !== 1 + ((Math.floor(row[index + 1] / 30) - signIndex + 12) % 12))
						return reject('DATED_SECTORS');
				}
			}
		}
		if (factors.size < 2 || d.sections[0].paragraphs.some((_, i) => !covered.has(`0:${i}`)))
			return reject('DATED_CLAIM_COVERAGE');
		if (!manifest || manifest.schemaVersion !== 'atv-editorial-evidence-manifest-v1' ||
			manifest.documentId !== d.id || manifest.revision !== d.revision || manifest.documentDigest !== dd ||
			!Array.isArray(manifest.files) || !(evidenceFiles instanceof Map)) return reject('DATED_EVIDENCE');
		const paths = new Set<string>();
		for (const file of manifest.files) {
			if (!/^[A-Za-z0-9_./-]+$/.test(file.path) || file.path.startsWith('/') ||
				file.path.split('/').some((part) => !part || part === '.' || part === '..') ||
				!hex(file.sha256) || paths.has(file.path)) return reject('DATED_EVIDENCE');
			paths.add(file.path);
			const bytes = evidenceFiles.get(file.path);
			if (!(bytes instanceof Uint8Array) || await byteDigest(bytes) !== file.sha256)
				return reject('DATED_EVIDENCE_BYTES');
		}
		for (const row of [...cr.checks, ...cr.scores])
			for (const ref of row.evidence) {
				const parts = ref.split('#');
				if (!paths.has(parts[0]) || parts.length > 2 || (parts.length === 2 && !nonempty(parts[1])))
					return reject('DATED_EVIDENCE_REFERENCE');
			}
		return { approved: true, documentDigest: dd, publicationGate: GATE };
	} catch { return reject('DATED_MALFORMED'); }
}

export async function verifyDatedHoroscopeApproval(input: AutomatedApprovalInput) {
	const reject = (reason: string) => ({ approved: false, reason, publicationGate: GATE });
	try {
		const validation = await validateDatedHoroscopePackage(input);
		if (!validation.approved) return validation;
		const { dated: p, attestation, authorities, document: d, now } = input;
		if (!p || !attestation || !(now instanceof Date) || !Number.isFinite(now.getTime()))
			return reject('DATED_PACKAGE');
		const a = attestation as DatedHoroscopeAttestation, g = p.grant;
		const authority = authorities[a.keyId];
		if (!authority || authority.identityType !== 'automated-service' || !authority.enabled ||
			authority.revokedAt !== null || authority.reviewerId !== a.reviewerId ||
			d.author.id === a.reviewerId || !nonempty(authority.provisioningEvidence?.id) ||
			!hex(authority.provisioningEvidence?.digest)) return reject('DATED_AUTHORITY');
		if (a.protocol !== DATED_PROTOCOL || a.policyVersion !== DATED_POLICY ||
			a.reviewMode !== DATED_REVIEW_MODE || a.risk !== DATED_RISK ||
			a.decision !== 'APROVADO_AUTOMATICAMENTE' || g.protocol !== 'atv-dated-horoscope-grant-v1' ||
			g.keyId !== a.keyId || g.reviewerId !== a.reviewerId || g.policyVersion !== DATED_POLICY ||
			g.methodVersion !== DATED_METHOD || g.reviewMode !== DATED_REVIEW_MODE ||
			!same(g.composition, p.scope.composition) || !hex(g.ownerDecisionDigest) ||
			!Number.isFinite(instant(`${g.coverageFrom}T00:00:00.000Z`)) ||
			!Array.isArray(g.allowedPeriods) || new Set(g.allowedPeriods).size !== g.allowedPeriods.length ||
			g.allowedPeriods.some((period) => !['daily', 'weekly', 'monthly'].includes(period)) ||
			!g.allowedPeriods.includes(p.scope.period) || p.scope.keyId !== a.keyId ||
			p.scope.reviewerId !== a.reviewerId) return reject('DATED_GRANT');
		const times = [d.publishedAt, d.modifiedAt, p.scope.frozenAt, p.corpusReview.reviewedAt,
			p.runtimeReport.verifiedAt, a.approvedAt, a.expiresAt, g.validFrom, g.validUntil,
			authority.validFrom, authority.validUntil].map(instant);
		if (times.some((time) => !Number.isFinite(time))) return reject('DATED_DATES');
		const [published, modified, frozen, reviewed, verified, approved, expires, from, until, keyFrom, keyUntil] = times;
		if (published > modified || modified > frozen || reviewed > verified || frozen > verified ||
			verified > approved || approved > now.getTime() || expires <= now.getTime() ||
			expires <= approved || expires - approved > 86_400_000 || from > approved ||
			until <= now.getTime() || expires > until || keyFrom > from || until > keyUntil ||
			p.scope.startDate < g.coverageFrom ||
			`${p.scope.endDateExclusive}T00:00:00.000Z` > new Date(until).toISOString())
			return reject('DATED_CHRONOLOGY');
		if (a.documentId !== d.id || a.revision !== d.revision || a.digest !== await digest(d) ||
			a.scopeDigest !== await digest(p.scope) || a.claimsDigest !== await digest(p.claims) ||
			a.factsDigest !== await digest(p.facts) || a.corpusReviewDigest !== await digest(p.corpusReview) ||
			g.corpusReviewDigest !== a.corpusReviewDigest || a.runtimeReportDigest !== await digest(p.runtimeReport) ||
			a.reportDigest !== a.runtimeReportDigest || a.grantDigest !== await digest(g) ||
			a.evidenceManifestDigest !== await digest(input.evidenceManifest))
			return reject('DATED_ATTESTATION_BINDING');
		if (!await signed(g, authority.publicKey)) return reject('DATED_GRANT_SIGNATURE');
		if (!await signed(a, authority.publicKey)) return reject('DATED_SIGNATURE');
		return { approved: true, documentDigest: a.digest, publicationGate: GATE };
	} catch { return reject('DATED_MALFORMED'); }
}
