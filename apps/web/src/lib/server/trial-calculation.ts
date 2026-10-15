import { calculateDreamDossier } from '../trials/dream-interpretation';
import { calculateDreamAtlasSnapshot } from '../trials/dream-atlas-reading';
import { projectMidheavenReading } from '../trials/reconstruction/midheaven-facts';
import { calculateAspects, type AspectPolicy, type AspectPosition } from '@atv/astrology';
import {
	calculateTarot,
	calculateTarotMethod,
	tarotMethodFor,
	parseWorkflowInput,
	type CalculationSnapshot,
	type DreamAtlasFactSource,
	type WorkflowInput
} from '@atv/domain';
import { createProductCalculators } from '../../../../worker/src/product-runtime';
import { projectDateReading } from '../trials/reconstruction/date-facts';
import { projectSynastry } from '../trials/reconstruction/synastry-facts';
import { projectDossier } from '../trials/reconstruction/dossier-facts';
import { projectPairPreview } from '../trials/reconstruction/pair-facts';
import { projectHoroscopeReading } from '../trials/reconstruction/horoscope-facts';
import { projectWeekReading, weekAspectPolicy } from '../trials/reconstruction/week-facts';
import { projectSolarReading } from '../trials/reconstruction/solar-facts';
import { calculateSolarYearSamples } from '../../../../worker/src/solar-year-samples';
import { calculateCalendarSamples } from '../../../../worker/src/personal-calendar-samples';
import { projectCalendarReading } from '../trials/reconstruction/calendar-facts';
import { projectDirectionReading } from '../trials/reconstruction/direction-facts';
import { projectAtlasReading } from '../trials/reconstruction/atlas-facts';
import { projectPurposeReading } from '../trials/reconstruction/purpose-facts';
import { projectCompassReading } from '../trials/reconstruction/compass-facts';
import { projectAscendantReading } from '../trials/reconstruction/ascendant-facts';
import { projectPillarsReading } from '../trials/reconstruction/pillars-facts';
import { projectBirthReading } from '../trials/reconstruction/birth-facts';

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
	experimentalWeekTemporalPolicy: weekAspectPolicy,
	experimentalSolarReturnBase: true,
	experimentalPersonalCalendarBase: true,
	experimentalCareerForecastBase: true,
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
	if (['pair-preview', 'synastry', 'couple-dossier'].includes(input.productId)) {
		const birthInputs = [input.birth!, input.partner!] as const;
		const sources = await Promise.all(
			birthInputs.map((birth) =>
				calculators['birth-chart']!(
					{
						version: input.version,
						productId: 'birth-chart',
						birth,
						consent: { ...input.consent, partner: false }
					},
					context
				)
			)
		);
		return (
			input.productId === 'couple-dossier'
				? projectDossier
				: input.productId === 'synastry'
					? projectSynastry
					: projectPairPreview
		)(input, sources as [CalculationSnapshot, CalculationSnapshot], [...birthInputs]);
	}
	if (input.productId === 'purpose-career' || input.productId === 'career-compass') {
		const natal = (await calculators['birth-chart']!(
			{ ...input, productId: 'birth-chart' },
			context
		)) as CalculationSnapshot;
		return (input.productId === 'career-compass' ? projectCompassReading : projectPurposeReading)(
			input,
			natal
		);
	}
	if (['three-pillars', 'birth-chart', 'ascendant', 'midheaven'].includes(input.productId)) {
		// Modern, tropical private edition. Stored older calculations stay immutable.
		const natal = (await calculators['birth-chart']!(
			{ ...input, productId: 'birth-chart' },
			context
		)) as CalculationSnapshot;
		if (input.productId === 'ascendant') return projectAscendantReading(input, natal);
		if (input.productId === 'three-pillars') return projectPillarsReading(input, natal);
		if (input.productId === 'birth-chart') return projectBirthReading(input, natal);
		return projectMidheavenReading(input, natal);
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
	if (input.productId === 'dream-atlas')
		return calculateDreamAtlasSnapshot(input.dreamAtlas!.startDate, sources);
	if (input.productId === 'dream-dossier') return calculateDreamDossier(input, sources);
	const calculate = calculators[input.productId];
	if (!calculate) throw new Error('Produto sem método de teste.');
	const base = (await calculate(input, context)) as CalculationSnapshot;
	if (input.productId === 'direction-journey') return projectDirectionReading(input, base);
	if (input.productId === 'solar-return') {
		const natal = (await calculators['birth-chart']!(
			{
				version: input.version,
				productId: 'birth-chart',
				birth: input.birth,
				consent: input.consent,
				context: input.context
			},
			context
		)) as CalculationSnapshot;
		const calendar = base.data.calendarScaffold as { startDate: string; endDateExclusive: string };
		const samples = await calculateSolarYearSamples(
			calendar.startDate,
			calendar.endDateExclusive,
			signal
		);
		return projectSolarReading(input, base, natal, samples);
	}
	if (input.productId === 'week-reading') {
		const natal = (await calculators['birth-chart']!(
			{
				version: input.version,
				productId: 'birth-chart',
				birth: input.birth,
				consent: input.consent,
				context: input.context
			},
			context
		)) as CalculationSnapshot;
		return projectWeekReading(input, base, natal);
	}
	if (input.productId === 'date-reading' || input.productId === 'horoscope') {
		const natal = await calculators['birth-chart']!(
			{
				version: input.version,
				productId: 'birth-chart',
				birth: input.birth,
				consent: input.consent,
				context: input.context
			},
			context
		);
		return input.productId === 'horoscope'
			? projectHoroscopeReading(input, base, natal as CalculationSnapshot)
			: projectDateReading(input, base, natal as CalculationSnapshot);
	}
	if (['personal-calendar', 'career-forecast-30d'].includes(input.productId)) {
		const natal = (await calculators['birth-chart']!(
			{
				version: input.version,
				productId: 'birth-chart',
				consent: input.consent,
				birth: input.birth,
				context: input.context
			},
			context
		)) as CalculationSnapshot;
		const samples = await calculateCalendarSamples(
			input.targetDate!,
			signal,
			undefined,
			input.forecastPeriod === 'rolling-30-days'
		);
		return projectCalendarReading(input, base, natal, samples);
	}

	if (input.productId === 'life-atlas') return projectAtlasReading(input, base);
	const natalData = base.data;
	if (
		input.productId === 'birth-chart' &&
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
