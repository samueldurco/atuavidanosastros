import { error, redirect } from '@sveltejs/kit';
import { SITE, signs, signNames, type SignSlug } from '$lib/data/site';
import { customerProduct } from '$lib/data/product-copy';
import {
	horoscopeIndexPath,
	horoscopePeriods,
	parseHoroscopeArchivePath,
	type HoroscopeEntry,
	type PublicPeriod
} from '$lib/public-horoscope';
import type { PageSeo } from '$lib/seo';
import type { EditorialSummary } from './editorial';
import { createEditorialRead, readLiveHoroscopes } from './editorial-registry';
import { horoscopeDay, horoscopePeriodStart } from './live-horoscope';
import type { EditorialAssetFetch } from './dated-horoscope-archive';

const guidePaths = ['/noticias/2026/10/fases-da-lua', '/mercurio-retrogrado'];

// Call only with the admitted registry. This projection never grants publication.
export function publicHoroscopeIndex(
	documents: readonly EditorialSummary[],
	url: URL,
	sign: SignSlug | null,
	now = new Date(),
	liveDocuments: readonly EditorialSummary[] = []
) {
	const periodValue = url.searchParams.get('period') ?? 'daily';
	if (!horoscopePeriods.includes(periodValue as PublicPeriod)) error(400, 'Período inválido.');
	const period = periodValue as PublicPeriod;
	const today = horoscopeDay(now);
	const yearValue = url.searchParams.get('year') ?? today.slice(0, 4);
	if (!/^\d{4}$/.test(yearValue) || Number(yearValue) < 1900 || Number(yearValue) > 2099)
		error(400, 'Ano inválido.');
	const year = Number(yearValue);
	const entries: HoroscopeEntry[] = [];
	const historicalPaths = new Set(documents.map((document) => document.path));
	for (const document of [
		...documents,
		...liveDocuments.filter((item) => !historicalPaths.has(item.path))
	]) {
		const archive = parseHoroscopeArchivePath(document.path);
		if (document.kind !== 'horoscope' || !archive || !document.calculation) continue;
		entries.push({
			...archive,
			id: document.id,
			revision: document.revision,
			path: document.path,
			title: document.title,
			description: document.description,
			endDateExclusive: document.calculation.coverageEnd.slice(0, 10),
			publishedAt: document.publishedAt,
			modifiedAt: document.modifiedAt
		});
	}
	entries.sort((a, b) => b.startDate.localeCompare(a.startDate) || a.path.localeCompare(b.path));
	const own = entries.filter((entry) => !sign || entry.sign === sign);
	const history = own.filter(
		(entry) =>
			historicalPaths.has(entry.path) &&
			entry.period === period &&
			entry.startDate.startsWith(`${year}-`)
	);
	const inPeriod = (entry: HoroscopeEntry) =>
		entry.startDate <= today && today < entry.endDateExclusive;
	const signReadings = signs.map((sign) => {
		const editions = entries.filter((entry) => entry.sign === sign);
		return {
			sign,
			current: editions.find((entry) => entry.period === period && inPeriod(entry)) ?? null,
			lastDaily:
				period === 'daily'
					? (editions.find(
							(entry) =>
								historicalPaths.has(entry.path) &&
								entry.period === 'daily' &&
								entry.endDateExclusive <= today
						) ?? null)
					: null,
			currentWeek:
				period === 'daily'
					? (editions.find((entry) => entry.period === 'weekly' && inPeriod(entry)) ?? null)
					: null
		};
	});
	const selected = signReadings.find((reading) => reading.sign === sign);
	const currentSigns = signReadings
		.filter((reading) => reading.current)
		.map((reading) => reading.sign);
	// Supporting guides retain their own editorial identity and never stand in for a dated reading.
	const supportingGuides = guidePaths.flatMap((guidePath) => {
		const guide = documents.find(
			(document) => document.kind === 'guide' && document.path === guidePath
		);
		return guide ? [{ path: guide.path, title: guide.title, description: guide.description }] : [];
	});
	const path = horoscopeIndexPath(sign);
	const seo: PageSeo = {
		path,
		title: `${sign ? `Horóscopo de ${signNames[sign]} hoje` : 'Horóscopo dos 12 signos'} — ${SITE.name}`,
		description: sign
			? `Leia o horóscopo de ${signNames[sign]} de hoje e consulte as previsões da semana e do mês.`
			: 'Escolha entre os 12 signos para consultar o horóscopo do dia, da semana ou do mês. Confira a data de cada leitura e explore as edições anteriores.',
		indexable: own.length > 0,
		managePrimary: true
	};
	return {
		sign,
		period,
		year,
		archiveYear: url.searchParams.has('year') ? year : undefined,
		today,
		serverNow: now.toISOString(),
		entries,
		history,
		current: selected?.current ?? null,
		lastDaily: selected?.lastDaily ?? null,
		currentWeek: selected?.currentWeek ?? null,
		signReadings,
		currentSigns,
		supportingGuides,
		weekReadingHref: customerProduct('week-reading')?.href,
		seo
	};
}
export type PublicHoroscopeIndex = Awaited<ReturnType<typeof readPublicHoroscope>>;

export async function readPublicHoroscope(
	url: URL,
	sign: SignSlug | null,
	fetchAsset: EditorialAssetFetch,
	now = new Date()
) {
	const day = horoscopeDay(now);
	const period = (url.searchParams.get('period') ?? 'daily') as PublicPeriod;
	if (!horoscopePeriods.includes(period)) error(400, 'Período inválido.');
	const start = horoscopePeriodStart(day, period);
	const read = createEditorialRead(now);
	const live = readLiveHoroscopes(now);
	const [documents, editions] = await Promise.all([
		read.summaries(
			(document) => document.kind === 'horoscope' || guidePaths.includes(document.path)
		),
		live.summaries(period, start)
	]);
	const index = publicHoroscopeIndex(documents, url, sign, now, editions);
	const load = async (entry: HoroscopeEntry | null) => {
		if (!entry) return;
		if (documents.some((document) => document.path === entry.path))
			return read.document(entry.path, fetchAsset);
		return live.document(entry.path, entry.sign, entry.period, entry.startDate);
	};
	const reading = await load(index.current);
	const previousDay = new Date(Date.parse(day + 'T00:00:00Z') - 86_400_000)
		.toISOString()
		.slice(0, 10);
	const hasDailyGap = period === 'daily' && (sign ? !reading : !index.currentSigns.length);
	const previousPath = sign && hasDailyGap ? '/horoscopo/' + sign + '/daily/' + previousDay : null;
	const [previousLive, weekly] = await Promise.all([
		previousPath && sign && !documents.some(({ path }) => path === previousPath)
			? live.document(previousPath, sign, 'daily', previousDay)
			: undefined,
		hasDailyGap && (sign ? !index.currentWeek : !index.currentSigns.length)
			? live.summaries('weekly', horoscopePeriodStart(day, 'weekly'))
			: []
	]);
	const result = weekly.length
		? publicHoroscopeIndex(documents, url, sign, now, [...editions, ...weekly])
		: index;
	const previous = previousLive ?? (sign && hasDailyGap ? await load(result.lastDaily) : undefined);
	const previousRange = previousLive
		? { startDate: previousDay, endDateExclusive: day }
		: result.lastDaily;
	return {
		...result,
		current: reading ? result.current : sign ? null : result.current,
		reading: reading ? { sections: reading.sections } : null,
		previousReading:
			previous && previousRange
				? {
						range: previousRange,
						title: previous.title,
						description: previous.description,
						sections: previous.sections
					}
				: null,
		lastDaily: reading || previousLive ? null : result.lastDaily,
		temporarilyUnavailable: !reading && live.unavailable
	};
}

export async function loadPublicHoroscopeIndex(
	url: URL,
	fetchAsset: EditorialAssetFetch,
	rawSign?: string
) {
	const sign = rawSign === undefined ? null : signs.find((value) => value === rawSign);
	if (sign === undefined) error(404, 'Signo não encontrado.');
	if (
		url.searchParams.get('period') === 'daily' &&
		url.searchParams.getAll('period').length === 1
	) {
		const filters = new URLSearchParams(url.searchParams);
		filters.delete('period');
		redirect(
			308,
			filters.size ? horoscopeIndexPath(sign) + '?' + filters : horoscopeIndexPath(sign)
		);
	}
	return readPublicHoroscope(url, sign, fetchAsset);
}
