import { error } from '@sveltejs/kit';
import { SITE, signs, signNames, type SignSlug } from '$lib/data/site';
import {
	horoscopePeriods,
	parseHoroscopeArchivePath,
	type HoroscopeEntry,
	type PublicPeriod
} from '$lib/public-horoscope';
import type { PageSeo } from '$lib/seo';
import type { EditorialDocument } from './editorial';
import { publishedEditorial } from './editorial-registry';

// Call only with the admitted registry. This projection never grants publication.
export function publicHoroscopeIndex(
	documents: readonly EditorialDocument[],
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
	const current = sign
		? (own.find(
				(entry) =>
					entry.period === period && entry.startDate <= today && today < entry.endDateExclusive
			) ?? null)
		: null;
	const path = sign ? `/horoscopo/${sign}` : '/horoscopo';
	const seo: PageSeo = {
		path,
		title: `${sign ? `Horóscopo de ${signNames[sign]}` : 'Horóscopo dos 12 signos'} — ${SITE.name}`,
		description:
			'Leituras gerais por signo, com períodos de dia, semana e mês e histórico de publicações.',
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
		current,
		seo
	};
}
export type PublicHoroscopeIndex = ReturnType<typeof publicHoroscopeIndex>;
export async function loadPublicHoroscopeIndex(url: URL, rawSign?: string) {
	const sign = rawSign === undefined ? null : signs.find((value) => value === rawSign);
	if (sign === undefined) error(404, 'Signo não encontrado.');
	return publicHoroscopeIndex(await publishedEditorial(), url, sign);
}
