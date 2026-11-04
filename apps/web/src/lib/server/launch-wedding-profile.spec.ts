import { beforeAll, describe, expect, it } from 'vitest';
import { CaelusEphemerisProvider, calculateAspects, type NatalChart } from '@atv/astrology';
import type { LaunchCeremonyOption } from '@atv/domain';
import {
	buildLaunchWeddingProfile,
	verifyLaunchWeddingProfile,
	weddingProfileAspectPolicy,
	WEDDING_PROFILE_VERSION,
	type WeddingProfileEvent,
	type WeddingProfileInput
} from './launch-wedding-profile';

const executionId = '8c6d9da2-d296-4b63-a30c-42ec8762f48f';
const inputDigest = 'a'.repeat(64);
const option = (index: number): LaunchCeremonyOption => ({
	label: `Candidata sintética ${index}`,
	city: 'Local sintético',
	localDateTime: `2027-05-0${index}T10:30:00`,
	utcInstant: `2027-05-0${index}T13:30:00Z`,
	timezone: 'America/Sao_Paulo',
	latitude: -23.55,
	longitude: -46.63,
	locationSource: 'synthetic-test-fixture'
});
let template: NatalChart;
beforeAll(async () => {
	const { label: _label, city: _city, ...input } = option(1);
	template = await new CaelusEphemerisProvider({ requestCache: true }).calculate(input);
}, 30000);

/** Invented geometry exercises the declared rule; these are not calculated event charts or precision evidence. */
function fixture(
	index: number,
	overrides: Partial<Record<'moon' | 'venus' | 'mars' | 'jupiter' | 'saturn', number>> = {},
	angles = [150, 240]
): WeddingProfileEvent {
	const candidate = option(index);
	const { label: _label, city: _city, ...input } = candidate;
	const chart = structuredClone(template);
	chart.input = input;
	const positions = { moon: 10, venus: 27, jupiter: 49, mars: 180, saturn: 113, ...overrides };
	chart.positions = chart.positions.map((position) => ({
		...position,
		longitude: positions[position.body as keyof typeof positions] ?? 0
	}));
	chart.houses = {
		system: 'placidus',
		status: 'ok',
		ascendant: angles[0]!,
		midheaven: angles[1]!,
		cusps: Array.from({ length: 12 }, (_, index) => (angles[0]! + index * 30) % 360)
	};
	chart.provenance.warnings = [
		'Geometria sintética de teste; não representa mapa calculado ou evidência de precisão.'
	];
	chart.provenance.temporal.utcInstant = new Date(input.utcInstant).toISOString();
	chart.provenance.temporal.julianDayUt1Approx =
		Date.parse(input.utcInstant) / 86400000 + 2440587.5;
	return {
		label: candidate.label,
		city: candidate.city,
		chart,
		aspects: calculateAspects(chart.positions, weddingProfileAspectPolicy)
	};
}
const request = (...events: WeddingProfileEvent[]): WeddingProfileInput => ({
	executionId,
	inputDigest,
	options: events.map((_, index) => option(index + 1)),
	events
});
const candidateByLabel = (
	result: Awaited<ReturnType<typeof buildLaunchWeddingProfile>>,
	index: number
) => result.profiles.find((profile) => profile.label === option(index).label)!;

describe('original restricted wedding profile, not commercial electional certification', () => {
	it('prefers a candidate only when all supports are retained and a named caution disappears', async () => {
		const input = request(fixture(1, { venus: 70 }), fixture(2, { venus: 70, mars: 100 }));
		const result = await buildLaunchWeddingProfile(input);
		const first = candidateByLabel(result, 1),
			second = candidateByLabel(result, 2);
		expect(result.outcome).toBe('PREFERENCE_IN_DECLARED_PROFILE');
		expect(result.preferredOptionId).toBe(first.optionId);
		expect(first.supports.moon).toEqual(['moon-venus']);
		expect(second.cautions.moon).toEqual(['moon-mars']);
		expect(result.dominates).toEqual([
			{
				optionId: first.optionId,
				otherOptionId: second.optionId,
				criterionIds: ['absent-caution:moon-mars']
			}
		]);
		expect(result).not.toHaveProperty('score');
		expect(await verifyLaunchWeddingProfile(input, result)).toBe(true);
	});

	it('preserves a tradeoff when an additional support introduces a caution', async () => {
		const result = await buildLaunchWeddingProfile(
			request(fixture(1, { venus: 70, mars: 100 }), fixture(2))
		);
		expect(result.outcome).toBe('TRADEOFF_NO_SINGLE_PREFERENCE');
		expect(result.preferredOptionId).toBeNull();
		expect(result.dominates).toEqual([]);
		expect(result.frontier).toHaveLength(2);
	});

	it('ties when no listed criterion is present, without claiming the events are free of all problems', async () => {
		const result = await buildLaunchWeddingProfile(request(fixture(1), fixture(2)));
		expect(result.outcome).toBe('TIED_IN_DECLARED_PROFILE');
		expect(result.preferredOptionId).toBeNull();
		expect(result.profiles.every((profile) => profile.evidence.length === 0)).toBe(true);
		expect(result.profiles[0]!.notEvaluated).toContain('void-of-course');
		expect(result.provenance.commercialPrecisionApproved).toBe(false);
	});

	it('retains the two non-dominated alternatives among three candidates', async () => {
		const result = await buildLaunchWeddingProfile(
			request(fixture(1, { venus: 70, mars: 100 }), fixture(2), fixture(3, { mars: 100 }))
		);
		expect(result.outcome).toBe('TRADEOFF_NO_SINGLE_PREFERENCE');
		expect(result.frontier).toEqual(
			[candidateByLabel(result, 1).optionId, candidateByLabel(result, 2).optionId].sort()
		);
		expect(
			result.dominates.every(
				(relation) => relation.otherOptionId === candidateByLabel(result, 3).optionId
			)
		).toBe(true);
		expect(result.preferredOptionId).toBeNull();
	});

	it('reports a tie between identical frontier profiles even when both dominate a third', async () => {
		const result = await buildLaunchWeddingProfile(
			request(fixture(1, { venus: 70 }), fixture(2, { venus: 70 }), fixture(3))
		);
		expect(result.outcome).toBe('TIED_IN_DECLARED_PROFILE');
		expect(result.frontier).toHaveLength(2);
		expect(result.dominates).toHaveLength(2);
		expect(result.preferredOptionId).toBeNull();
	});

	it('does not break a profile tie using a smaller orb or aspect kind strength', async () => {
		const result = await buildLaunchWeddingProfile(
			request(fixture(1, { venus: 69 }), fixture(2, { venus: 132 }))
		);
		expect(candidateByLabel(result, 1).supports.moon).toEqual(['moon-venus']);
		expect(candidateByLabel(result, 2).supports.moon).toEqual(['moon-venus']);
		expect(result.outcome).toBe('TIED_IN_DECLARED_PROFILE');
		expect(result.preferredOptionId).toBeNull();
	});

	it('uses circular ecliptic angular distance and includes precisely the declared 3 degree boundary', async () => {
		const result = await buildLaunchWeddingProfile(
			request(
				fixture(1, { moon: 359 }, [1, 240]),
				fixture(2, { moon: 4 }, [1, 240]),
				fixture(3, { moon: 4.000001 }, [1, 240])
			)
		);
		const angular = (index: number) =>
			candidateByLabel(result, index).evidence.find(
				(evidence) => evidence.geometry.body === 'moon' && evidence.geometry.angle === 'ascendant'
			);
		expect(angular(1)!.geometry.distanceDegrees).toBe(2);
		expect(angular(2)!.geometry.distanceDegrees).toBe(3);
		expect(angular(3)).toBeUndefined();
		expect(
			result.derivedFacts.some((fact) =>
				fact.source.includes('atv-wedding-ecliptic-angle-proximity/1.0.0')
			)
		).toBe(true);
	});

	it('rejects relabelled, displaced-time or altered aspect geometry and policies', async () => {
		const input = request(fixture(1), fixture(2));
		input.events[0]!.chart.input.utcInstant = option(2).utcInstant;
		expect((await buildLaunchWeddingProfile(input)).outcome).toBe('UNASSESSABLE');
		const relabelled = request(fixture(1), fixture(2));
		relabelled.events[0]!.label = 'Outra opção';
		expect((await buildLaunchWeddingProfile(relabelled)).outcome).toBe('UNASSESSABLE');
		const changed = request(fixture(1, { venus: 70 }), fixture(2));
		changed.events[0]!.aspects = { ...changed.events[0]!.aspects, aspects: [] };
		expect((await buildLaunchWeddingProfile(changed)).outcome).toBe('UNASSESSABLE');
		const policy = request(fixture(1), fixture(2));
		policy.events[0]!.aspects = {
			...policy.events[0]!.aspects,
			policy: { ...weddingProfileAspectPolicy, version: '2.0.0' }
		};
		expect((await buildLaunchWeddingProfile(policy)).outcome).toBe('UNASSESSABLE');
	});

	it('fails closed for unavailable angles, missing positions, incompatible or forged provenance', async () => {
		const missing = request(fixture(1), fixture(2));
		missing.events[0]!.chart.houses = {
			...missing.events[0]!.chart.houses,
			status: 'not-applicable',
			cusps: [],
			code: 'PLACIDUS_UNAVAILABLE',
			warning: 'Indisponível'
		};
		const result = await buildLaunchWeddingProfile(missing);
		expect(result.outcome).toBe('UNASSESSABLE');
		expect(result.frontier).toEqual([]);
		expect(await verifyLaunchWeddingProfile(missing, result)).toBe(false);
		const absent = request(fixture(1), fixture(2));
		absent.events[0]!.chart.positions = absent.events[0]!.chart.positions.filter(
			(position) => position.body !== 'moon'
		);
		expect((await buildLaunchWeddingProfile(absent)).outcome).toBe('UNASSESSABLE');
		const incompatible = request(fixture(1), fixture(2));
		incompatible.events[0]!.chart.provenance.provider = 'client-invented';
		expect((await buildLaunchWeddingProfile(incompatible)).outcome).toBe('UNASSESSABLE');
		const manifest = request(fixture(1), fixture(2));
		manifest.events[1]!.chart.provenance.dataManifest = {
			...manifest.events[1]!.chart.provenance.dataManifest,
			version: 'different'
		} as typeof template.provenance.dataManifest;
		expect((await buildLaunchWeddingProfile(manifest)).outcome).toBe('UNASSESSABLE');
	});

	it('keeps option identities, evidence and relations stable when arrays are reordered', async () => {
		const input = request(fixture(1, { venus: 70 }), fixture(2, { venus: 70, mars: 100 }));
		const expected = await buildLaunchWeddingProfile(input);
		const shuffled = structuredClone(input);
		shuffled.options = [...shuffled.options].reverse();
		shuffled.events = [...shuffled.events]
			.reverse()
			.map((event) => ({
				...event,
				chart: { ...event.chart, positions: [...event.chart.positions].reverse() },
				aspects: {
					...event.aspects,
					aspects: [...event.aspects.aspects].reverse(),
					inputPositions: [...event.aspects.inputPositions].reverse()
				}
			}));
		expect(await buildLaunchWeddingProfile(shuffled)).toEqual(expected);
	});

	it('independently rejects invented preference, missing evidence, invented fields and omitted caution', async () => {
		const input = request(fixture(1, { venus: 70, mars: 100 }), fixture(2));
		const original = await buildLaunchWeddingProfile(input);
		const winner = {
			...original,
			preferredOptionId: original.profiles[0]!.optionId,
			outcome: 'PREFERENCE_IN_DECLARED_PROFILE'
		};
		expect(await verifyLaunchWeddingProfile(input, winner)).toBe(false);
		const omitted = structuredClone(original);
		candidateByLabel(omitted, 1).evidence = [];
		expect(await verifyLaunchWeddingProfile(input, omitted)).toBe(false);
		expect(await verifyLaunchWeddingProfile(input, { ...original, reception: 'approved' })).toBe(
			false
		);
		const noCaution = structuredClone(original);
		candidateByLabel(noCaution, 1).cautions.moon = [];
		expect(await verifyLaunchWeddingProfile(input, noCaution)).toBe(false);
	});

	it('keeps geometry independent of narrative context, while retaining the outer input binding', async () => {
		const input = request(fixture(1, { venus: 70 }), fixture(2));
		const first = await buildLaunchWeddingProfile(input);
		const changedContext = await buildLaunchWeddingProfile({
			...input,
			inputDigest: 'b'.repeat(64)
		});
		expect(changedContext.profiles).toEqual(first.profiles);
		expect(changedContext.outcome).toBe(first.outcome);
		expect(changedContext.preferredOptionId).toBe(first.preferredOptionId);
		expect(changedContext.inputDigest).not.toBe(first.inputDigest);
	});

	it('projects real local Caelus event facts without claiming independent precision, persistence or approval', async () => {
		const options = [option(1), option(2)];
		const provider = new CaelusEphemerisProvider({ requestCache: true });
		const events: WeddingProfileEvent[] = [];
		for (const candidate of options) {
			const { label, city, ...input } = candidate;
			const chart = await provider.calculate(input);
			events.push({
				label,
				city,
				chart,
				aspects: calculateAspects(chart.positions, weddingProfileAspectPolicy)
			});
		}
		const input = { executionId, inputDigest, options, events };
		const result = await buildLaunchWeddingProfile(input);
		expect(result.methodVersion).toBe(WEDDING_PROFILE_VERSION);
		expect(result.outcome).not.toBe('UNASSESSABLE');
		expect(result.profiles.every((profile) => profile.coverage === 'COMPLETE')).toBe(true);
		expect(
			result.profiles
				.flatMap((profile) => profile.evidence)
				.every((evidence) =>
					evidence.evidenceIds.every((id) => result.derivedFacts.some((fact) => fact.id === id))
				)
		).toBe(true);
		expect(result.provenance).toMatchObject({
			precision: 'experimental-not-certified',
			commercialPrecisionApproved: false,
			commercialReleaseApproved: false,
			externalModelCalled: false
		});
		expect(result).not.toHaveProperty('approval');
		expect(result).not.toHaveProperty('persistence');
		expect(await verifyLaunchWeddingProfile(input, result)).toBe(true);
	}, 30000);
});
