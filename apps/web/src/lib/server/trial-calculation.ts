import { calculateAspects, type AspectPolicy, type AspectPosition } from '@atv/astrology';
import {
	calculateDreamRecord,
	calculateTarot,
	calculateTarotMethod,
	tarotMethodFor,
	parseWorkflowInput,
	prepareDreamAtlasFacts,
	type CalculationSnapshot,
	type DreamAtlasFactSource,
	type WorkflowInput
} from '@atv/domain';
import { createProductCalculators } from '../../../../worker/src/product-runtime';
import { modernRulers } from '../trials/reconstruction/canon';

export const trialAspectPolicy: AspectPolicy = {
	id: 'atv-private-test-major-aspects',
	version: '1.0.0',
	aspects: [
		{ kind: 'conjunction', orbDegrees: 6 },
		{ kind: 'sextile', orbDegrees: 4 },
		{ kind: 'square', orbDegrees: 6 },
		{ kind: 'trine', orbDegrees: 6 },
		{ kind: 'opposition', orbDegrees: 6 }
	]
};
const calculators = createProductCalculators({
	experimentalSynastryPolicy: trialAspectPolicy,
	experimentalCoupleDossierPolicy: trialAspectPolicy,
	experimentalHoroscopePolicy: trialAspectPolicy,
	experimentalWeekTransitPolicy: trialAspectPolicy,
	experimentalSolarReturnBase: true,
	experimentalPersonalCalendarBase: true,
	experimentalPurposeCareerBase: true,
	experimentalDirectionJourneyBase: true,
	experimentalLifeAtlasBase: true
});
const labels: Record<string, string> = {
	sun: 'Sol',
	moon: 'Lua',
	mercury: 'Mercúrio',
	venus: 'Vênus',
	mars: 'Marte',
	jupiter: 'Júpiter',
	saturn: 'Saturno',
	uranus: 'Urano',
	neptune: 'Netuno',
	pluto: 'Plutão'
};
const aspectLabels: Record<string, string> = {
	conjunction: 'conjunção',
	sextile: 'sextil',
	square: 'quadratura',
	trine: 'trígono',
	opposition: 'oposição'
};
const dateAt = (date: string, days: number) =>
	new Date(Date.parse(date + 'T12:00:00Z') + days * 86400000).toISOString().slice(0, 10);

/** Angle policy is deterministic; unavailable angles produce no contacts. */
export function calculateTrialAngleContacts(
	positions: AspectPosition[],
	angles: { ascendant: number | null; midheaven: number | null }
) {
	return positions.flatMap((p) =>
		(['ascendant', 'midheaven'] as const).flatMap((angle) => {
			const value = angles[angle];
			if (typeof value !== 'number' || !Number.isFinite(value)) return [];
			const distance = Math.abs(p.longitude - value),
				separation = Math.min(distance, 360 - distance);
			return (
				[
					['conjunction', 0],
					['sextile', 60],
					['square', 90],
					['trine', 120],
					['opposition', 180]
				] as const
			).flatMap(([kind, exact]) =>
				Math.abs(separation - exact) <= 3
					? [{ body: p.body, angle, kind, orb: Math.abs(separation - exact) }]
					: []
			);
		})
	);
}

/** Only server-owned, RLS-authorized diary sources enter this calculation. Never accepts client facts. */
export async function calculateTrial(
	value: unknown,
	runId: string,
	sources: DreamAtlasFactSource[] = []
): Promise<CalculationSnapshot> {
	const input = parseWorkflowInput(value);
	if (!input) throw new Error('Confira os dados e consentimentos antes de gerar.');
	const signal = AbortSignal.timeout(25000);
	if (tarotMethodFor(input.productId)) return calculateTarotMethod(input, runId, signal);
	const context = { runId, signal };
	if (
		[
			'career-compass',
			'purpose-career',
			'three-pillars',
			'birth-chart',
			'ascendant',
			'midheaven'
		].includes(input.productId)
	) {
		// Modern, tropical private edition. Stored older calculations stay immutable.
		const natal = (await calculators['birth-chart']!(
			{ ...input, productId: 'birth-chart' },
			context
		)) as CalculationSnapshot;
		const positions = natal.data.positions as AspectPosition[];
		const aspects = calculateAspects(positions, trialAspectPolicy);
		const isCareer = ['career-compass', 'purpose-career'].includes(input.productId);
		const mc = natal.data.angles as { midheaven: number | null; ascendant: number | null };
		const ruler = mc.midheaven === null ? null : modernRulers[Math.floor(mc.midheaven / 30)];
		const ascRuler = mc.ascendant === null ? null : modernRulers[Math.floor(mc.ascendant / 30)];
		// Fixed three-degree angle policy. Geometry comes from the deterministic calculator.
		const angleContacts = calculateTrialAngleContacts(positions, mc);
		return {
			...natal,
			version: isCareer
				? 'atv-private-career-synthesis/4.0.0'
				: 'atv-private-natal-synthesis/4.0.0',
			kind: isCareer ? 'purpose' : natal.kind,
			facts: [
				...natal.facts,
				...(ascRuler
					? [
							{
								id: 'natal-asc-ruler',
								kind: 'calculated' as const,
								display: `Regente moderno do Ascendente: ${labels[ascRuler]}`,
								source: 'atv-humanistic-modern/1.0.0; natal.angles.ascendant'
							}
						]
					: []),
				...(ruler
					? [
							{
								id: 'career-mc-ruler',
								kind: 'calculated' as const,
								display: `Regente moderno do Meio do Céu: ${labels[ruler]}`,
								source: 'atv-humanistic-modern/1.0.0; natal.angles.midheaven'
							}
						]
					: []),
				...angleContacts.map((a, i) => ({
					id: `private-angle-contact-${i}`,
					kind: 'calculated' as const,
					display: `${labels[a.body]} — ${a.angle === 'ascendant' ? 'Ascendente' : 'Meio do Céu'}: ${aspectLabels[a.kind]}; orbe ${a.orb.toFixed(3)}°`,
					source: 'atv-private-angle-contacts/1.0.0; nominal 3°'
				})),
				...aspects.aspects.map((a, i) => ({
					id: `private-natal-aspect-${i}`,
					kind: 'calculated' as const,
					display: `${labels[a.first]} — ${labels[a.second]}: ${aspectLabels[a.kind]}; orbe ${a.orbDegrees.toFixed(3)}°`,
					source: `${aspects.algorithmVersion};${trialAspectPolicy.id}@${trialAspectPolicy.version}`
				}))
			],
			data: {
				...natal.data,
				productId: input.productId,
				privateAspects: aspects,
				angleContacts,
				natalSynthesis: { version: '4.0.0', ascRuler, rulership: 'modern', angleOrb: 3 },
				career: {
					version: '4.0.0',
					mcRuler: ruler,
					rulership: 'modern',
					houses: [2, 6, 10],
					factors: ['sun', 'mercury', 'mars', 'jupiter', 'saturn']
				}
			},
			limits: [
				...natal.limits.filter((limit) => !limit.startsWith('Aspectos, síntese interpretativa')),
				'Regência moderna tropical; casas Placidus somente quando calculáveis. A leitura não determina profissão nem renda.',
				'Aspectos maiores nominais com orbes de teste; sem certificação de aplicação/separação.'
			]
		};
	}
	if (input.productId === 'tarot-journey') {
		const goal = input.tarotJourney!.goal;
		const questions = [
			'O que observar agora?',
			'Que recurso posso experimentar?',
			'Qual pequeno passo posso testar?'
		].map((q) => `${q} ${goal}`.slice(0, 400));
		const adapted: WorkflowInput = {
			version: input.version,
			productId: 'three-questions',
			consent: input.consent,
			questions,
			...(input.context ? { context: input.context } : {})
		};
		const base = await calculateTarot(adapted, runId, signal);
		return {
			...base,
			version: 'atv-private-tarot-journey/1.0.0',
			facts: [
				...base.facts,
				{ id: 'journey-goal', kind: 'reported', display: goal, source: 'input.tarotJourney.goal' }
			],
			data: {
				...base.data,
				productId: input.productId,
				positions: ['situação', 'recurso', 'experimento'],
				checkIns: [1, 7, 14]
			},
			limits: [
				...base.limits,
				'Três cartas sem reposição, posições fixas; acompanhamento depende das suas anotações.'
			]
		};
	}
	if (input.productId === 'dream-atlas') {
		const atlas = prepareDreamAtlasFacts(input.dreamAtlas!.startDate, sources);
		if (!atlas || !atlas.recordedCount)
			throw new Error('Salve e selecione ao menos um sonho do período no Registro de Sonhos.');
		const facts: CalculationSnapshot['facts'] = [
			{
				id: 'atlas-period',
				kind: 'reported',
				display: `Período escolhido: ${atlas.period.startDate} a ${atlas.period.endDate}`,
				source: 'input.dreamAtlas.startDate'
			},
			{
				id: 'atlas-count',
				kind: 'calculated',
				display: `${atlas.recordedCount} sonhos selecionados; ${atlas.excludedCount} registros excluídos do período`,
				source: atlas.version
			},
			...atlas.windows.map((w) => ({
				id: `atlas-window-${w.index}`,
				kind: 'calculated' as const,
				display: `Janela ${w.startDate} a ${w.endDate}: ${w.includedEntryIds.length} sonhos`,
				source: atlas.version
			})),
			...atlas.recurrences.map((r, i) => ({
				id: `recurrence-${i}`,
				kind: 'reported' as const,
				display: `${r.label}: informado em ${r.entryIds.length} registros selecionados`,
				source: `${r.source};${r.entryIds.join(',')}`
			}))
		];
		for (const entry of sources.filter((e) => atlas.includedEntryIds.includes(e.id)))
			facts.push({
				id: `entry-${entry.id}`,
				kind: 'reported',
				display: `${entry.dreamDate}: ${entry.narrative}`,
				source: `private-diary:${entry.id}@${entry.revision}`
			});
		return {
			version: 'atv-private-dream-atlas/1.0.0',
			kind: 'dream',
			status: 'recorded',
			facts,
			data: { atlas, sourceIds: atlas.includedEntryIds },
			limits: [
				'Síntese de 30 dias civis com registros selecionados de sua própria biblioteca.',
				'Repetições usam somente emoções e associações declaradas; nenhuma imagem foi interpretada como significado universal.',
				'Dias sem registros são lacunas; não representam ausência de sonhos.'
			]
		};
	}
	if (input.productId === 'dream-dossier') {
		if (!sources.length)
			throw new Error('Salve e selecione ao menos um registro anterior para o dossiê.');
		if (sources.length && !input.consent.continuity)
			throw new Error('Autorize o uso dos registros selecionados.');
		const base = calculateDreamRecord({ ...input, productId: 'dream-reading' });
		const facts = [...base.facts];
		for (const entry of sources)
			facts.push({
				id: `history-${entry.id}`,
				kind: 'reported',
				display: `${entry.dreamDate}: ${entry.narrative}; emoções: ${entry.emotions.join(', ') || 'não informadas'}; associações: ${entry.associations.join(', ') || 'não informadas'}`,
				source: `private-diary:${entry.id}@${entry.revision}`
			});
		const reported = new Map<string, Set<string>>();
		for (const entry of sources)
			for (const label of [...entry.emotions, ...entry.associations]) {
				const key = label.trim().normalize('NFKC').toLocaleLowerCase('pt-BR');
				const set = reported.get(key) ?? new Set<string>();
				set.add(entry.id);
				reported.set(key, set);
			}
		for (const [label, ids] of reported)
			if (ids.size > 1)
				facts.push({
					id: `dossier-recurrence-${facts.length}`,
					kind: 'reported',
					display: `${label}: informado em ${ids.size} registros históricos selecionados`,
					source: [...ids].join(',')
				});
		return {
			...base,
			version: 'atv-private-dream-dossier/1.0.0',
			facts,
			data: {
				...base.data,
				sourceIds: sources.map((e) => e.id),
				continuity: {
					consent: input.consent.continuity,
					historyLoaded: sources.length > 0,
					recurrenceAssessed: true
				}
			},
			limits: [
				...base.limits.filter((l) => !l.includes('Nenhum histórico')),
				`Histórico: ${sources.length} registros selecionados; recorrências literais de emoções e associações, sem inferência clínica.`
			]
		};
	}
	const calculate = calculators[input.productId];
	if (!calculate) throw new Error('Produto sem método de teste.');
	const base = (await calculate(input, context)) as CalculationSnapshot;
	if (input.productId === 'personal-calendar') {
		const count = new Date(
			Date.UTC(Number(input.targetDate!.slice(0, 4)), Number(input.targetDate!.slice(5, 7)), 0)
		).getUTCDate();
		const days = [];
		for (let day = 0; day < count; day++) {
			signal.throwIfAborted();
			const date = dateAt(input.targetDate!, day);
			const sample = (await calculators.horoscope!(
				{
					version: input.version,
					productId: 'horoscope',
					consent: input.consent,
					birth: input.birth,
					targetDate: date
				},
				context
			)) as CalculationSnapshot;
			const geometry = (
				sample.data.crossAspectStability as {
					calculation: {
						aspects: { first: string; second: string; kind: string; orbDegrees: number }[];
						algorithmVersion: string;
					};
				}
			).calculation;
			const data = sample.data.base as CalculationSnapshot;
			const summary = geometry.aspects
				.map(
					(a) =>
						`${labels[a.first]} em trânsito / ${labels[a.second]} natal: ${aspectLabels[a.kind]}, orbe ${a.orbDegrees.toFixed(3)}°`
				)
				.join('; ');
			base.facts.push({
				id: `day-${day + 1}-aspects`,
				kind: 'calculated',
				display: `${date} — ${summary || 'Nenhum aspecto maior dentro dos orbes desta política.'}`,
				source: `${geometry.algorithmVersion};${trialAspectPolicy.id}@${trialAspectPolicy.version};12:00UTC`
			});
			days.push({
				date,
				positions: (data.data.second as { positions: AspectPosition[] }).positions,
				aspects: geometry.aspects
			});
		}
		const natal = (await calculators['date-reading']!(
			{
				version: input.version,
				productId: 'date-reading',
				consent: input.consent,
				birth: input.birth,
				targetDate: input.targetDate
			},
			context
		)) as CalculationSnapshot;
		base.version = 'atv-private-personal-calendar/1.0.0';
		base.data = {
			...base.data,
			days,
			natalPositions: (natal.data.first as { positions: AspectPosition[] }).positions,
			aspectPolicy: trialAspectPolicy,
			dailyEvents: 'nominal-aspect-samples'
		};
		base.limits = [
			...base.limits.filter(
				(l) => !l.includes('apenas dias civis') && !l.includes('Nenhum trânsito diário')
			),
			'Uma amostra às 12h UTC por dia com aspectos nominais entre longitudes tropicais de datas distintas; precisão não certificada. Não indica eventos exatos, horas locais favoráveis ou estações.'
		];
	}
	const natalData =
		input.productId === 'life-atlas' ? (base.data.natal as CalculationSnapshot).data : base.data;
	if (
		['birth-chart', 'life-atlas'].includes(input.productId) &&
		Array.isArray(natalData.positions) &&
		natalData.positions.length === 10
	) {
		const aspects = calculateAspects(natalData.positions as AspectPosition[], trialAspectPolicy);
		base.facts.push(
			...aspects.aspects.map((a, i) => ({
				id: `private-natal-aspect-${i}`,
				kind: 'calculated' as const,
				display: `${labels[a.first]} — ${labels[a.second]}: ${aspectLabels[a.kind]}; orbe ${a.orbDegrees.toFixed(3)}°`,
				source: `${aspects.algorithmVersion};${trialAspectPolicy.id}@${trialAspectPolicy.version}`
			}))
		);
		base.data = { ...base.data, privateAspects: aspects };
		base.version += ';private-aspects/1';
		base.limits.push(
			'Aspectos maiores com orbes explícitos de teste; aplicação/separação e precisão integral ainda não certificadas.'
		);
	}
	return base;
}
