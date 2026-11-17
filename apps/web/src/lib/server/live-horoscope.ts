import {
	datedHoroscopeIndexDocument,
	verifyDatedHoroscopeIndex,
	type DatedHoroscopeIndexEntry
} from './dated-horoscope-automation';
import { canonicalJson, digest, type AutomatedRegistry } from './editorial-automation';
import { validDocument, type EditorialDocument } from './editorial';
import type { PublicPeriod } from '$lib/public-horoscope';

const source = 'https://raw.githubusercontent.com/samueldurco/atuavidanosastros/horoscope-content';
const brazilDate = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' });

export function horoscopeDay(now: Date) {
	return brazilDate.format(now);
}

export function horoscopePeriodStart(day: string, period: PublicPeriod) {
	const date = new Date(day + 'T00:00:00.000Z');
	if (period === 'weekly') date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
	if (period === 'monthly') date.setUTCDate(1);
	return date.toISOString().slice(0, 10);
}

type LiveIndex = DatedHoroscopeIndexEntry & { admission: { acceptedAt: string } };

export function createLiveHoroscopeRead(
	now: Date,
	authorities: AutomatedRegistry['authorities'],
	fetcher: typeof fetch
) {
	const indexes = new Map<string, Promise<LiveIndex | undefined>>();
	let unavailable = false;
	async function load<T>(path: string): Promise<T | undefined> {
		try {
			const response = await fetcher(source + path, {
				signal: AbortSignal.timeout(2500),
				credentials: 'omit'
			});
			if (response.ok) return (await response.json()) as T;
			if (response.status !== 404) unavailable = true;
		} catch {
			unavailable = true;
		}
	}
	function index(period: PublicPeriod, start: string) {
		const key = '/' + period + '/' + start;
		let result = indexes.get(key);
		if (!result) {
			result = (async () => {
				const entry = await load<LiveIndex>(key + '/index.json');
				if (!entry) return;
				if (
					entry.scope?.period !== period ||
					entry.scope.startDate !== start ||
					typeof entry.admission?.acceptedAt !== 'string' ||
					!(
						await verifyDatedHoroscopeIndex({
							indexEntry: entry,
							authorities,
							now,
							admittedAt: entry.admission.acceptedAt
						})
					).approved
				) {
					unavailable = true;
					return;
				}
				return entry;
			})();
			indexes.set(key, result);
		}
		return result;
	}
	return {
		get unavailable() {
			return unavailable;
		},
		async summaries(period: PublicPeriod, start: string) {
			const entry = await index(period, start);
			return (
				entry?.index.documents.filter(
					(document) =>
						Date.parse(document.publishedAt) <= now.getTime() &&
						Date.parse(document.modifiedAt) <= now.getTime()
				) ?? []
			);
		},
		async document(path: string, sign: string, period: PublicPeriod, start: string) {
			const entry = await index(period, start);
			const summary = entry?.index.documents.find((document) => document.path === path);
			if (!entry || !summary) return;
			const document = await load<EditorialDocument>(
				'/' + period + '/' + start + '/' + sign + '.json'
			);
			try {
				if (
					document &&
					validDocument(document, now) &&
					(await digest(document)) === entry.index.documentDigests[summary.id] &&
					canonicalJson(datedHoroscopeIndexDocument(document)) === canonicalJson(summary)
				)
					return document;
			} catch {
				// Malformed content never reaches the reading page.
			}
			unavailable = true;
		}
	};
}
