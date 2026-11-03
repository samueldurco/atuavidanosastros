import { error } from '@sveltejs/kit';
import { SITE, signs, signNames, type SignSlug } from '$lib/data/site';
import { customerProduct } from '$lib/data/product-copy';
import {
	horoscopePeriods,
	parseHoroscopeArchivePath,
	type HoroscopeEntry,
	type PublicPeriod
} from '$lib/public-horoscope';
import type { PageSeo } from '$lib/seo';
import type { EditorialSummary } from './editorial';
import { createEditorialRead } from './editorial-registry';

const guidePaths = ['/noticias/2026/10/fases-da-lua', '/mercurio-retrogrado'];

// Call only with the admitted registry. This projection never grants publication.
export function publicHoroscopeIndex(
	documents: readonly EditorialSummary[],
	url: URL,
	sign: SignSlug | null,
	now = new Date()
) {
	const periodValue = url.searchParams.get('period') ?? 'daily';
	if (!horoscopePeriods.includes(periodValue as PublicPeriod)) error(400, 'Período inválido.');
	const period = periodValue as PublicPeriod;
	const yearValue = url.searchParams.get('year') ?? String(now.getUTCFullYear());
	if (!/^\d{4}$/.test(yearValue) || Number(yearValue) < 1900 || Number(yearValue) > 2099)
		error(400, 'Ano inválido.');
	const year = Number(yearValue);
	const entries: HoroscopeEntry[] = [];
	for (const document of documents) {
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
		(entry) => entry.period === period && entry.startDate.startsWith(`${year}-`)
	);
	const today = now.toISOString().slice(0, 10);
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
							(entry) => entry.period === 'daily' && entry.endDateExclusive <= today
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
	const path = sign ? `/horoscopo/${sign}` : '/horoscopo';
	const seo: PageSeo = {
		path,
		title: `${sign ? `Horóscopo de ${signNames[sign]}` : 'Horóscopo dos 12 signos'} — ${SITE.name}`,
		description: sign
			? `Consulte o horóscopo de ${signNames[sign]} para o dia, a semana e o mês. Confira as datas das leituras disponíveis e explore as edições anteriores do seu signo.`
			: 'Escolha entre os 12 signos para consultar o horóscopo do dia, da semana ou do mês. Confira a data de cada leitura e explore as edições anteriores.',
		indexable: own.length > 0,
		managePrimary: true
	};
	return {
		sign,
		period,
		year,
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
export type PublicHoroscopeIndex = ReturnType<typeof publicHoroscopeIndex>;
export async function loadPublicHoroscopeIndex(url: URL, rawSign?: string) {
	const sign = rawSign === undefined ? null : signs.find((value) => value === rawSign);
	if (sign === undefined) error(404, 'Signo não encontrado.');
	const documents = await createEditorialRead().summaries(
		(document) => document.kind === 'horoscope' || guidePaths.includes(document.path)
	);
	return publicHoroscopeIndex(documents, url, sign);
}
