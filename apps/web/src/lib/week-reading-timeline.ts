import type { ProductRunView } from './product-run';

const bodies = [
	'sun',
	'moon',
	'mercury',
	'venus',
	'mars',
	'jupiter',
	'saturn',
	'uranus',
	'neptune',
	'pluto'
];
const calculationVersion = 'atv-week-reading-calculation/1.0.0';
export interface WeekSample {
	date: string;
	label: string;
	instant: string;
	href: string;
}

/** Presentation of persisted facts only. This does not validate original geometry or approve a reading. */
export function weekReadingTimeline(run: ProductRunView): WeekSample[] | null {
	if (
		run.productId !== 'week-reading' ||
		!run.released ||
		!run.calculation ||
		!run.editorial ||
		run.calculation.version !== calculationVersion
	)
		return null;
	const facts = run.calculation.facts;
	if (![88, 89].includes(facts.length)) return null;
	const byId = new Map(facts.map((f) => [f.id, f]));
	if (byId.size !== facts.length) return null;
	const natal = bodies.map((body) => `natal-${body}`);
	if (natal.some((id) => byId.get(id)?.kind !== 'calculated')) return null;
	const context = byId.get('personal-context');
	if (
		(facts.length === 89) !== !!context ||
		(context && (context.kind !== 'reported' || context.source !== 'input.context'))
	)
		return null;
	const samples: WeekSample[] = [];
	const dates: string[] = [];
	for (let day = 1; day <= 7; day++) {
		const ids = [...bodies.map((body) => `day-${day}-sample-${body}`), `day-${day}-sample-instant`];
		const instant = byId.get(ids[10]);
		const match =
			/^(\d{4}-\d{2}-\d{2}) · Amostra única em (\d{4}-\d{2}-\d{2}T12:00:00\.000Z); não representa o dia local inteiro\.$/.exec(
				instant?.display ?? ''
			);
		if (
			!match ||
			match[2] !== `${match[1]}T12:00:00.000Z` ||
			!/^(?:19|20)\d{2}-\d{2}-\d{2}$/.test(match[1])
		)
			return null;
		const time = Date.parse(match[2]);
		if (
			!Number.isFinite(time) ||
			new Date(time).toISOString() !== match[2] ||
			(dates.length && time !== Date.parse(`${dates.at(-1)}T12:00:00.000Z`) + 86400000)
		)
			return null;
		if (
			ids.some((id) => {
				const fact = byId.get(id);
				return (
					!fact ||
					fact.kind !== 'calculated' ||
					!fact.display.startsWith(`${match[1]} · `) ||
					!fact.source.endsWith(`;${calculationVersion}`)
				);
			})
		)
			return null;
		const title = `Amostra ${day}: possibilidade simbólica — Hipótese [week-day-${day}]`;
		const sections = run.editorial.sections
			.map((section, index) => ({ section, index }))
			.filter((row) => row.section.title === title);
		if (sections.length !== 1) return null;
		const { section, index } = sections[0];
		const expected = new Set([
			'week-range',
			...natal,
			...ids,
			...(context ? ['personal-context'] : [])
		]);
		if (
			section.evidence.length !== expected.size ||
			new Set(section.evidence).size !== expected.size ||
			section.evidence.some((id) => !expected.has(id)) ||
			!section.text.includes(match[1])
		)
			return null;
		dates.push(match[1]);
		samples.push({
			date: match[1],
			label: new Intl.DateTimeFormat('pt-BR', {
				day: '2-digit',
				month: 'long',
				year: 'numeric',
				timeZone: 'UTC'
			}).format(time),
			instant: match[2],
			href: `#capitulo-${index + 1}`
		});
	}
	const range = byId.get('week-range');
	if (
		range?.kind !== 'calculated' ||
		range.source !== calculationVersion ||
		range.display !==
			`Sete amostras às 12:00 UTC: ${dates[0]} a ${dates[6]}; cobertura dos dias locais não estabelecida.`
	)
		return null;
	return samples;
}
