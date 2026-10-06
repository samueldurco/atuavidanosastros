import { SITE, signs } from '$lib/data/site';
import { inspectEditorialStyle } from '@atv/ai/editorial-style';
import { verifyAdmittedApproval, type AutomatedRegistry } from './editorial-automation';
import {
	editorialHubs,
	evergreenGuidePaths,
	safeJsonLd,
	type EditorialHub,
	type PageSeo
} from '$lib/seo';

export type EditorialKind =
	'reporting' | 'column' | 'guide' | 'sign-profile' | 'horoscope' | 'compatibility';
export interface EditorialDocument {
	id: string;
	revision: number;
	state: 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'PUBLISHED';
	path: string;
	kind: EditorialKind;
	title: string;
	description: string;
	author: { id: string; name: string; bio: string; type?: 'Person' | 'Organization' };
	automationDisclosure?: {
		generatedWithAI: true;
		humanReview: false;
		reviewMode: 'separate-pass';
	};
	publishedAt: string;
	modifiedAt: string;
	sections: { heading: string; paragraphs: string[] }[];
	sources: { title: string; url: string }[];
	image?: {
		path: string;
		alt: string;
		width: number;
		height: number;
		credit: string;
		license: string;
	};
	// Required for computed forecasts; no AI-derived astronomical facts.
	calculation?: {
		engine: string;
		version: string;
		factsDigest: string;
		coverageStart: string;
		coverageEnd: string;
	};
}
export interface EditorialApproval {
	keyId: string;
	documentId: string;
	revision: number;
	digest: string;
	reviewerId: string;
	approvedAt: string;
	signature: string;
}
export interface EditorialAuthority {
	reviewerId: string;
	publicKey: string; // Base64, raw Ed25519 public key. Never a private/signing key.
}

function canonicalJson(value: unknown): string {
	if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
	if (value !== null && typeof value === 'object') {
		return `{${Object.entries(value)
			.filter(([, item]) => item !== undefined)
			.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
			.map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
			.join(',')}}`;
	}
	return JSON.stringify(value);
}
export async function documentDigest(document: EditorialDocument): Promise<string> {
	const bytes = new TextEncoder().encode(canonicalJson(document));
	const digest = await crypto.subtle.digest('SHA-256', bytes);
	return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
export function approvalPayload(
	approval: Omit<EditorialApproval, 'signature'>
): Uint8Array<ArrayBuffer> {
	return new TextEncoder().encode(
		canonicalJson({ protocol: 'atv-editorial-approval-v1', ...approval })
	);
}
function decodeBase64(value: string): Uint8Array<ArrayBuffer> {
	return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}
function timestamp(value: string): number {
	// Require an actual time zone; reject impossible calendar dates and missing seconds.
	if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value))
		return NaN;
	const [year, month, day] = value.slice(0, 10).split('-').map(Number);
	if (month < 1 || month > 12 || day < 1 || day > new Date(Date.UTC(year, month, 0)).getUTCDate())
		return NaN;
	if (
		Number(value.slice(11, 13)) > 23 ||
		Number(value.slice(14, 16)) > 59 ||
		Number(value.slice(17, 19)) > 59
	)
		return NaN;
	return Date.parse(value);
}
function externalUrl(value: string): boolean {
	try {
		const url = new URL(value);
		return url.protocol === 'https:' && !url.username && !url.password;
	} catch {
		return false;
	}
}
export function canonicalPair(first: string, second: string): string | null {
	const a = signs.findIndex((sign) => sign === first);
	const b = signs.findIndex((sign) => sign === second);
	if (a < 0 || b < 0) return null;
	return `/compatibilidade/${signs[Math.min(a, b)]}-${signs[Math.max(a, b)]}`;
}
function validPath(document: EditorialDocument): boolean {
	if (document.kind === 'guide' && evergreenGuidePaths.some((path) => path === document.path))
		return true;
	const datedForecast = document.path.match(
		/^\/noticias\/horoscopo\/(\d{4})\/(\d{2})\/(\d{2})\/[a-z0-9]+(?:-[a-z0-9]+)*$/
	);
	if (datedForecast) {
		return (
			document.kind === 'horoscope' &&
			Number.isFinite(
				timestamp(`${datedForecast[1]}-${datedForecast[2]}-${datedForecast[3]}T00:00:00Z`)
			)
		);
	}
	if (document.kind === 'sign-profile' || document.kind === 'horoscope') {
		const prefix = document.kind === 'sign-profile' ? '/signos/' : '/horoscopo/';
		return signs.some((sign) => document.path === `${prefix}${sign}`);
	}
	if (document.kind === 'compatibility') {
		const pair = document.path.match(/^\/compatibilidade\/([a-z]+)-([a-z]+)$/);
		return !!pair && canonicalPair(pair[1], pair[2]) === document.path;
	}
	const news = document.path.match(/^\/noticias\/(\d{4})\/(\d{2})\/[a-z0-9]+(?:-[a-z0-9]+)*$/);
	return (
		!!news &&
		['reporting', 'column', 'guide'].includes(document.kind) &&
		Number.isFinite(timestamp(`${news[1]}-${news[2]}-01T00:00:00Z`))
	);
}
export function validDocument(document: EditorialDocument, now: Date): boolean {
	try {
		const published = timestamp(document.publishedAt),
			modified = timestamp(document.modifiedAt);
		if (
			document.state !== 'PUBLISHED' ||
			!validPath(document) ||
			!Number.isSafeInteger(document.revision) ||
			document.revision < 1
		)
			return false;
		if (
			!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(document.id) ||
			!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(document.author.id)
		)
			return false;
		if (
			!document.title.trim() ||
			!document.description.trim() ||
			!document.author.name.trim() ||
			!document.author.bio.trim()
		)
			return false;
		if (document.author.type && !['Person', 'Organization'].includes(document.author.type))
			return false;
		if (
			!Number.isFinite(published) ||
			!Number.isFinite(modified) ||
			published > modified ||
			modified > now.getTime()
		)
			return false;
		if (
			document.sections.length === 0 ||
			document.sections.some(
				(section) =>
					!section.heading.trim() ||
					section.paragraphs.length === 0 ||
					section.paragraphs.some((paragraph) => !paragraph.trim())
			)
		)
			return false;
		if (
			inspectEditorialStyle([
				{ text: document.title, location: 'title' },
				{ text: document.description, location: 'description' },
				...document.sections.flatMap((section, index) => [
					{ text: section.heading, location: `sections.${index}.heading` },
					...section.paragraphs.map((text, paragraph) => ({
						text,
						location: `sections.${index}.${paragraph}`
					}))
				])
			]).length > 0
		)
			return false;
		if (
			document.sources.length === 0 ||
			document.sources.some((source) => !source.title.trim() || !externalUrl(source.url))
		)
			return false;
		if (
			document.image &&
			(!/^\/media\/editorial\/[a-z0-9/-]+\.(?:jpg|jpeg|png|webp)$/.test(document.image.path) ||
				!document.image.alt.trim() ||
				!document.image.credit.trim() ||
				!document.image.license.trim() ||
				!Number.isSafeInteger(document.image.width) ||
				!Number.isSafeInteger(document.image.height) ||
				document.image.width <= 0 ||
				document.image.height <= 0)
		)
			return false;
		if (document.kind === 'horoscope' || document.path.startsWith('/noticias/horoscopo/')) {
			const facts = document.calculation;
			if (
				!facts ||
				!facts.engine.trim() ||
				!facts.version.trim() ||
				!/^[a-f0-9]{64}$/.test(facts.factsDigest)
			)
				return false;
			if (
				!Number.isFinite(timestamp(facts.coverageStart)) ||
				!Number.isFinite(timestamp(facts.coverageEnd)) ||
				timestamp(facts.coverageEnd) <= timestamp(facts.coverageStart)
			)
				return false;
		}
		return true;
	} catch {
		return false;
	}
}

export async function approvedDocuments(
	documents: readonly EditorialDocument[],
	approvals: readonly EditorialApproval[],
	authorities: Readonly<Record<string, EditorialAuthority>>,
	now: Date,
	automated?: AutomatedRegistry
): Promise<EditorialDocument[]> {
	const published: EditorialDocument[] = [];
	for (const document of documents) {
		if (!validDocument(document, now)) continue;
		// Ambiguous identity/path or conflicting author biographies fails closed.
		if (
			documents.filter((other) => other.id === document.id || other.path === document.path)
				.length !== 1
		)
			continue;
		if (
			documents.some(
				(other) =>
					other.author.id === document.author.id &&
					canonicalJson(other.author) !== canonicalJson(document.author)
			)
		)
			continue;
		if (document.automationDisclosure) {
			const packages = automated?.packages.filter((item) => item.document.id === document.id);
			if (packages?.length === 1) {
				const item = packages[0];
				if (
					canonicalJson(item.document) === canonicalJson(document) &&
					(await verifyAdmittedApproval({ ...item, authorities: automated!.authorities, now }))
						.approved
				)
					published.push(document);
			}
			continue; // Automated packages never fall back to the human v1 protocol.
		}
		const digest = await documentDigest(document);
		for (const approval of approvals) {
			const authority = authorities[approval.keyId];
			if (
				!authority ||
				authority.reviewerId !== approval.reviewerId ||
				approval.reviewerId === document.author.id
			)
				continue;
			if (
				approval.documentId !== document.id ||
				approval.revision !== document.revision ||
				approval.digest !== digest
			)
				continue;
			const reviewed = timestamp(approval.approvedAt);
			if (
				!Number.isFinite(reviewed) ||
				reviewed > timestamp(document.modifiedAt) ||
				reviewed > now.getTime()
			)
				continue;
			try {
				const key = await crypto.subtle.importKey(
					'raw',
					decodeBase64(authority.publicKey),
					{ name: 'Ed25519' },
					false,
					['verify']
				);
				const { signature, ...payload } = approval;
				if (
					await crypto.subtle.verify(
						'Ed25519',
						key,
						decodeBase64(signature),
						approvalPayload(payload)
					)
				) {
					published.push(document);
					break;
				}
			} catch {
				/* Invalid signature or unsupported runtime: never publish. */
			}
		}
	}
	return published.sort(
		(a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt) || a.path.localeCompare(b.path)
	);
}
export function hubDocuments(
	documents: readonly EditorialDocument[],
	path: EditorialHub
): EditorialDocument[] {
	return documents.filter((document) =>
		editorialHubs[path].kind === 'news'
			? document.path.startsWith('/noticias/')
			: document.kind === editorialHubs[path].kind
	);
}
export function hubSeo(path: EditorialHub, documents: readonly EditorialDocument[]): PageSeo {
	const hub = editorialHubs[path];
	return {
		title: `${hub.title} — ${SITE.name}`,
		description: hub.description,
		path,
		indexable: hubDocuments(documents, path).length > 0,
		managePrimary: true
	};
}
export function articleSeo(document: EditorialDocument): PageSeo {
	const image = document.image;
	return {
		title: `${document.title} — ${SITE.name}`,
		description: document.description,
		path: document.path,
		indexable: true,
		managePrimary: true,
		article: { publishedAt: document.publishedAt, modifiedAt: document.modifiedAt },
		image: image
			? {
					url: `${SITE.url}${image.path}`,
					alt: image.alt,
					large: image.width >= 1200 && image.width * image.height >= 300000
				}
			: undefined,
		jsonLd: safeJsonLd({
			'@context': 'https://schema.org',
			'@type': document.kind === 'reporting' ? 'NewsArticle' : 'Article',
			headline: document.title,
			description: document.description,
			mainEntityOfPage: `${SITE.url}${document.path}`,
			datePublished: document.publishedAt,
			dateModified: document.modifiedAt,
			inLanguage: 'pt-BR',
			author: {
				'@type': document.author.type ?? 'Person',
				name: document.author.name,
				url: `${SITE.url}/pessoas/${document.author.id}`
			},
			publisher: { '@type': 'Organization', name: SITE.name, url: SITE.url },
			...(image ? { image: [`${SITE.url}${image.path}`] } : {})
		})
	};
}
