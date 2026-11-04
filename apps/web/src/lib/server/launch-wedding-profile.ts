import {
	bodies,
	calculateAspects,
	engineContract,
	validateCalculationInput,
	type AspectCalculation,
	type AspectPolicy,
	type CelestialBody,
	type CalculationInput,
	type MajorAspect,
	type NatalChart
} from '@atv/astrology';
import type { LaunchCeremonyOption } from '@atv/domain';

/** Original, restricted symbolic convention. Neither accuracy certification nor commercial approval. */
export const WEDDING_PROFILE_VERSION = 'atv-wedding-declared-profile/1.0.0' as const;
export const WEDDING_ANGULAR_POLICY_VERSION = 'atv-wedding-ecliptic-angle-proximity/1.0.0' as const;
export const weddingProfileAspectPolicy: AspectPolicy = Object.freeze({
	id: 'atv-launch-event-major-aspects',
	version: '1.0.0',
	aspects: (['conjunction', 'sextile', 'square', 'trine', 'opposition'] as const).map((kind) => ({
		kind,
		orbDegrees: 3
	}))
});
export const weddingProfileSources = Object.freeze([
	{
		id: 'chani-electional-practice',
		url: 'https://www.chani.com/astro-education/what-is-electional-astrology-how-do-astrologers-pick-key-dates-for-the-year-and-how-can-i-use-astrology-to-plan-for-the-future'
	},
	{ id: 'gillman-marriage-elections', url: 'https://www.skyscript.co.uk/marriage.html' },
	{ id: 'atv-wedding-original-restricted-method', url: null }
]);
const notEvaluated = [
	'rulership-and-dignities',
	'house-occupancy',
	'reception',
	'application-and-separation',
	'void-of-course',
	'lunar-phase',
	'combustion-and-cazimi',
	'eclipses',
	'participant-natal-charts'
] as const;
const targets: Record<MajorAspect, number> = {
	conjunction: 0,
	sextile: 60,
	square: 90,
	trine: 120,
	opposition: 180
};
const supportive = new Set<MajorAspect>(['conjunction', 'sextile', 'trine']);
const cautionary = new Set<MajorAspect>(['conjunction', 'square', 'opposition']);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const digestPattern = /^[0-9a-f]{64}$/;
const sort = (values: readonly string[]) => [...values].sort();
const canonical = (value: unknown): string => {
	if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
	if (value && typeof value === 'object')
		return `{${Object.keys(value)
			.sort()
			.map((key) => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`)
			.join(',')}}`;
	return JSON.stringify(value) ?? 'null';
};
const digest = async (value: unknown): Promise<string> =>
	Array.from(
		new Uint8Array(
			await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical(value)))
		),
		(byte) => byte.toString(16).padStart(2, '0')
	).join('');
const longitude = (value: unknown): value is number =>
	typeof value === 'number' && Number.isFinite(value) && value >= 0 && value < 360;
const distance = (first: number, second: number) =>
	Math.min(Math.abs(first - second), 360 - Math.abs(first - second));
const record = (value: unknown): value is Record<string, unknown> =>
	Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const normalizedInput = (option: LaunchCeremonyOption): CalculationInput => ({
	localDateTime:
		option.localDateTime.length === 16 ? `${option.localDateTime}:00` : option.localDateTime,
	utcInstant: option.utcInstant,
	timezone: option.timezone,
	latitude: option.latitude,
	longitude: option.longitude,
	locationSource: option.locationSource
});

export type WeddingProfileEvent = {
	label: string;
	city: string;
	chart: NatalChart;
	aspects: AspectCalculation;
};
export type WeddingProfileInput = {
	executionId: string;
	inputDigest: string;
	options: readonly LaunchCeremonyOption[];
	events: readonly WeddingProfileEvent[];
};
export type WeddingProfileEvidence = {
	id: string;
	criterionId: string;
	family: 'moon-support' | 'moon-caution' | 'venus-caution' | 'angular-support' | 'angular-caution';
	evidenceIds: string[];
	sourceIds: string[];
	geometry: Record<string, string | number>;
};
export type WeddingProfileFact = {
	id: string;
	kind: 'calculated';
	display: string;
	source: string;
};
export type WeddingCandidateProfile = {
	optionId: string;
	inputOptionDigest: string;
	label: string;
	city: string;
	localDateTime: string;
	utcInstant: string;
	timezone: string;
	coverage: 'COMPLETE' | 'INCOMPLETE';
	reasons: string[];
	supports: { moon: string[]; angularMoonVenus: string[] };
	cautions: { moon: string[]; venus: string[]; angularMarsSaturn: string[] };
	evidence: WeddingProfileEvidence[];
	notEvaluated: string[];
};
export type WeddingProfileComparison = {
	methodVersion: typeof WEDDING_PROFILE_VERSION;
	executionId: string;
	productId: 'wedding-date-map';
	inputDigest: string;
	geometryPolicyId: string;
	geometryPolicyVersion: string;
	angularPolicyVersion: typeof WEDDING_ANGULAR_POLICY_VERSION;
	profiles: WeddingCandidateProfile[];
	dominates: { optionId: string; otherOptionId: string; criterionIds: string[] }[];
	frontier: string[];
	outcome:
		| 'PREFERENCE_IN_DECLARED_PROFILE'
		| 'TRADEOFF_NO_SINGLE_PREFERENCE'
		| 'TIED_IN_DECLARED_PROFILE'
		| 'UNASSESSABLE';
	preferredOptionId: string | null;
	reasons: string[];
	derivedFacts: WeddingProfileFact[];
	provenance: {
		scope: 'private-symbolic-profile';
		precision: 'experimental-not-certified';
		comparison: 'original-partial-order-without-weights';
		angularDistance: 'ecliptic-longitude-within-3-degrees-inclusive';
		commercialPrecisionApproved: false;
		commercialReleaseApproved: false;
		externalModelCalled: false;
		sources: typeof weddingProfileSources;
	};
};

const orderedGeometry = (value: AspectCalculation) => ({
	...value,
	inputPositions: [...value.inputPositions].sort((a, b) => a.body.localeCompare(b.body, 'en')),
	policy: {
		...value.policy,
		aspects: [...value.policy.aspects].sort((a, b) => targets[a.kind] - targets[b.kind])
	},
	aspects: [...value.aspects].sort((a, b) => canonical(a).localeCompare(canonical(b), 'en'))
});

/** Structural/projection checks do not authenticate origin; caller must supply server-persisted facts. */
function inspectEvent(option: LaunchCeremonyOption, event: WeddingProfileEvent): string[] {
	try {
		const reasons: string[] = [];
		const input = normalizedInput(option);
		const time = validateCalculationInput(input);
		const chart = event.chart;
		if (
			event.label !== option.label ||
			event.city !== option.city ||
			canonical(chart.input) !== canonical(input)
		)
			reasons.push('option-chart-input-binding-mismatch');
		if (
			!Array.isArray(chart.positions) ||
			chart.positions.length !== bodies.length ||
			new Set(chart.positions.map((item) => item.body)).size !== bodies.length ||
			chart.positions.some(
				(item) =>
					!bodies.includes(item.body) ||
					!longitude(item.longitude) ||
					!Number.isFinite(item.latitude) ||
					Math.abs(item.latitude) > 90 ||
					!Number.isFinite(item.distanceAu) ||
					item.distanceAu <= 0 ||
					typeof item.retrograde !== 'boolean'
			)
		)
			reasons.push('incomplete-or-invalid-positions');
		const houses = chart.houses;
		if (
			!houses ||
			houses.system !== 'placidus' ||
			houses.status !== 'ok' ||
			Math.abs(input.latitude) >= engineContract.placidusAbsoluteLatitudeExclusive ||
			!longitude(houses.ascendant) ||
			!longitude(houses.midheaven) ||
			!Array.isArray(houses.cusps) ||
			houses.cusps.length !== 12 ||
			houses.cusps.some((value) => !longitude(value))
		)
			reasons.push('angles-or-house-coverage-unavailable');
		const p = chart.provenance;
		if (
			!p ||
			p.provider !== 'caelus' ||
			p.providerVersion !== '0.24.1' ||
			p.algorithmVersion !== 'atv-caelus-adapter-v3' ||
			p.zodiac !== 'tropical' ||
			p.houseSystem !== 'placidus' ||
			p.referenceFrame !== 'geocentric-apparent-ecliptic-of-date' ||
			p.accuracyStatus !== 'experimental' ||
			canonical(p.contract) !== canonical(engineContract) ||
			!record(p.dataManifest) ||
			!Object.keys(p.dataManifest).length ||
			!Number.isFinite(Date.parse(p.calculatedAt)) ||
			!Array.isArray(p.warnings) ||
			!p.warnings.length ||
			p.warnings.some((warning) => typeof warning !== 'string' || !warning.trim()) ||
			p.temporal?.utcInstant !== time.instant.toISOString() ||
			p.temporal.offsetSeconds !== time.offsetSeconds ||
			p.temporal.timezoneMode !== time.timezoneMode ||
			p.temporal.timezoneRules !== time.timezoneRules ||
			p.temporal.inputScale !== 'UTC' ||
			p.temporal.engineScale !== 'UT1-approximated-by-UTC' ||
			p.temporal.dut1Seconds !== null ||
			!Number.isFinite(p.temporal.deltaTSeconds) ||
			p.temporal.julianDayUt1Approx !== time.instant.valueOf() / 86400000 + 2440587.5
		)
			reasons.push('unsupported-or-incomplete-provenance');
		const expected = calculateAspects(chart.positions, weddingProfileAspectPolicy);
		if (canonical(orderedGeometry(event.aspects)) !== canonical(orderedGeometry(expected)))
			reasons.push('aspect-geometry-or-policy-mismatch');
		return reasons;
	} catch {
		return ['invalid-option-or-calculation-structure'];
	}
}

const signatures = (profile: WeddingCandidateProfile): readonly string[][] => [
	profile.supports.moon,
	profile.supports.angularMoonVenus,
	profile.cautions.moon,
	profile.cautions.venus,
	profile.cautions.angularMarsSaturn
];
const subset = (first: readonly string[], second: readonly string[]) =>
	first.every((item) => second.includes(item));
function dominance(
	first: WeddingCandidateProfile,
	second: WeddingCandidateProfile
): string[] | null {
	const a = signatures(first),
		b = signatures(second);
	if (!a.every((items, index) => (index < 2 ? subset(b[index]!, items) : subset(items, b[index]!))))
		return null;
	const differences = a.flatMap((items, index) =>
		index < 2
			? items
					.filter((item) => !b[index]!.includes(item))
					.map((item) => `additional-support:${item}`)
			: b[index]!.filter((item) => !items.includes(item)).map((item) => `absent-caution:${item}`)
	);
	return differences.length ? sort(differences) : null;
}

/** Pure geometry projection plus deterministic digests; no ephemeris request, score or text interpretation. */
export async function buildLaunchWeddingProfile(
	input: WeddingProfileInput
): Promise<WeddingProfileComparison> {
	const reasons: string[] = [];
	const profiles: WeddingCandidateProfile[] = [];
	const derivedFacts: WeddingProfileFact[] = [];
	if (!uuid.test(input.executionId) || !digestPattern.test(input.inputDigest))
		reasons.push('invalid-execution-or-input-digest');
	if (
		!Array.isArray(input.options) ||
		input.options.length < 2 ||
		input.options.length > 3 ||
		!Array.isArray(input.events) ||
		input.events.length !== input.options.length
	)
		reasons.push('comparison-requires-two-or-three-bound-events');
	const options: readonly LaunchCeremonyOption[] = Array.isArray(input.options)
		? input.options
		: [];
	const events: readonly WeddingProfileEvent[] = Array.isArray(input.events) ? input.events : [];
	const labels = options.map((option) =>
		option.label?.normalize('NFKC').trim().toLocaleLowerCase('pt-BR')
	);
	if (new Set(labels).size !== labels.length) reasons.push('duplicate-option-label');
	const optionGeometry = options.map(
		(option) => `${Date.parse(option.utcInstant)}|${option.latitude}|${option.longitude}`
	);
	if (new Set(optionGeometry).size !== optionGeometry.length)
		reasons.push('duplicate-option-instant-and-location');
	const usedEvents = new Set<WeddingProfileEvent>();
	let commonProvenance: string | null = null;
	for (const option of options) {
		const inputOptionDigest = await digest(option);
		const optionId = `ceremony-${inputOptionDigest}`;
		const matching = events.filter(
			(event) => event.label === option.label && event.city === option.city
		);
		const event = matching.length === 1 ? matching[0] : undefined;
		const profile: WeddingCandidateProfile = {
			optionId,
			inputOptionDigest,
			label: option.label,
			city: option.city,
			localDateTime: option.localDateTime,
			utcInstant: option.utcInstant,
			timezone: option.timezone,
			coverage: 'INCOMPLETE',
			reasons: [],
			supports: { moon: [], angularMoonVenus: [] },
			cautions: { moon: [], venus: [], angularMarsSaturn: [] },
			evidence: [],
			notEvaluated: [...notEvaluated]
		};
		profiles.push(profile);
		if (!event || usedEvents.has(event)) {
			profile.reasons.push('missing-or-ambiguous-bound-event');
			continue;
		}
		usedEvents.add(event);
		profile.reasons.push(...inspectEvent(option, event));
		if (profile.reasons.length) continue;
		const p = event.chart.provenance;
		const comparable = canonical({
			provider: p.provider,
			providerVersion: p.providerVersion,
			algorithmVersion: p.algorithmVersion,
			dataManifest: p.dataManifest,
			contract: p.contract,
			zodiac: p.zodiac,
			referenceFrame: p.referenceFrame
		});
		if (commonProvenance !== null && commonProvenance !== comparable) {
			profile.reasons.push('incompatible-candidate-provenance');
			continue;
		}
		commonProvenance = comparable;
		profile.coverage = 'COMPLETE';
		const source = `${p.provider}@${p.providerVersion};${p.algorithmVersion};${WEDDING_PROFILE_VERSION}`;
		for (const aspect of event.aspects.aspects) {
			const has = (body: CelestialBody) => aspect.first === body || aspect.second === body;
			const other = (body: CelestialBody) => (aspect.first === body ? aspect.second : aspect.first);
			let family: WeddingProfileEvidence['family'] | null = null;
			let criterionId = '';
			if (
				has('moon') &&
				['venus', 'jupiter'].includes(other('moon')) &&
				supportive.has(aspect.kind)
			) {
				family = 'moon-support';
				criterionId = `moon-${other('moon')}`;
				profile.supports.moon.push(criterionId);
			} else if (
				has('moon') &&
				['mars', 'saturn'].includes(other('moon')) &&
				cautionary.has(aspect.kind)
			) {
				family = 'moon-caution';
				criterionId = `moon-${other('moon')}`;
				profile.cautions.moon.push(criterionId);
			} else if (
				has('venus') &&
				['mars', 'saturn'].includes(other('venus')) &&
				cautionary.has(aspect.kind)
			) {
				family = 'venus-caution';
				criterionId = `venus-${other('venus')}`;
				profile.cautions.venus.push(criterionId);
			}
			if (!family) continue;
			const factId = `${optionId}-${family}-${criterionId}-${aspect.kind}`;
			derivedFacts.push({
				id: factId,
				kind: 'calculated',
				source,
				display: `${profile.label}: ${aspect.first} ${aspect.kind} ${aspect.second}; separação ${aspect.separationDegrees}°; orbe ${aspect.orbDegrees}°; geometria sem avaliação de movimento.`
			});
			profile.evidence.push({
				id: `${factId}-evidence`,
				criterionId,
				family,
				evidenceIds: [factId],
				sourceIds:
					family === 'venus-caution'
						? ['atv-wedding-original-restricted-method']
						: ['chani-electional-practice', 'atv-wedding-original-restricted-method'],
				geometry: {
					first: aspect.first,
					second: aspect.second,
					kind: aspect.kind,
					separationDegrees: aspect.separationDegrees,
					orbDegrees: aspect.orbDegrees
				}
			});
		}
		const angles = {
			ascendant: event.chart.houses.ascendant,
			midheaven: event.chart.houses.midheaven,
			descendant: (event.chart.houses.ascendant + 180) % 360,
			imumCoeli: (event.chart.houses.midheaven + 180) % 360
		};
		for (const body of ['moon', 'venus', 'mars', 'saturn'] as const) {
			const position = event.chart.positions.find((item) => item.body === body)!;
			for (const [angle, value] of Object.entries(angles)) {
				const distanceDegrees = distance(position.longitude, value);
				if (distanceDegrees > 3) continue;
				const support = body === 'moon' || body === 'venus';
				const criterionId = `angular-${body}`;
				const family = support ? 'angular-support' : 'angular-caution';
				(support ? profile.supports.angularMoonVenus : profile.cautions.angularMarsSaturn).push(
					criterionId
				);
				const factId = `${optionId}-${criterionId}-${angle}`;
				derivedFacts.push({
					id: factId,
					kind: 'calculated',
					source: `${source};${WEDDING_ANGULAR_POLICY_VERSION}`,
					display: `${profile.label}: ${body} a ${distanceDegrees}° eclípticos de ${angle} (${value}°); convenção inclusiva de 3°, sem classificar casa ocupada.`
				});
				profile.evidence.push({
					id: `${factId}-evidence`,
					criterionId,
					family,
					evidenceIds: [factId],
					sourceIds: ['chani-electional-practice', 'atv-wedding-original-restricted-method'],
					geometry: {
						body,
						longitude: position.longitude,
						angle,
						angleLongitude: value,
						distanceDegrees,
						angleOrigin:
							angle === 'descendant' || angle === 'imumCoeli'
								? 'derived-opposition'
								: 'calculated-angle'
					}
				});
			}
		}
		for (const items of signatures(profile))
			items.splice(0, items.length, ...sort([...new Set(items)]));
		profile.evidence.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
	}
	if (usedEvents.size !== events.length) reasons.push('unbound-or-duplicate-event');
	profiles.sort((a, b) => (a.optionId < b.optionId ? -1 : a.optionId > b.optionId ? 1 : 0));
	derivedFacts.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
	const complete =
		reasons.length === 0 && profiles.every((profile) => profile.coverage === 'COMPLETE');
	const dominates: WeddingProfileComparison['dominates'] = [];
	if (complete)
		for (const first of profiles)
			for (const second of profiles) {
				if (first === second) continue;
				const criterionIds = dominance(first, second);
				if (criterionIds)
					dominates.push({
						optionId: first.optionId,
						otherOptionId: second.optionId,
						criterionIds
					});
			}
	const frontier = complete
		? profiles
				.filter(
					(profile) => !dominates.some((relation) => relation.otherOptionId === profile.optionId)
				)
				.map((profile) => profile.optionId)
		: [];
	const preferred = complete
		? profiles.find((profile) =>
				profiles.every(
					(other) =>
						other === profile ||
						dominates.some(
							(relation) =>
								relation.optionId === profile.optionId && relation.otherOptionId === other.optionId
						)
				)
			)
		: undefined;
	const finalists = profiles.filter((profile) => frontier.includes(profile.optionId));
	const tied =
		complete &&
		finalists.length > 1 &&
		finalists.every(
			(profile) => canonical(signatures(profile)) === canonical(signatures(finalists[0]!))
		);
	const outcome: WeddingProfileComparison['outcome'] = !complete
		? 'UNASSESSABLE'
		: preferred
			? 'PREFERENCE_IN_DECLARED_PROFILE'
			: tied
				? 'TIED_IN_DECLARED_PROFILE'
				: 'TRADEOFF_NO_SINGLE_PREFERENCE';
	return {
		methodVersion: WEDDING_PROFILE_VERSION,
		executionId: input.executionId,
		productId: 'wedding-date-map',
		inputDigest: input.inputDigest,
		geometryPolicyId: weddingProfileAspectPolicy.id,
		geometryPolicyVersion: weddingProfileAspectPolicy.version,
		angularPolicyVersion: WEDDING_ANGULAR_POLICY_VERSION,
		profiles,
		dominates,
		frontier,
		outcome,
		preferredOptionId: preferred?.optionId ?? null,
		reasons: sort([
			...reasons,
			...profiles.flatMap((profile) =>
				profile.reasons.map((reason) => `${profile.optionId}:${reason}`)
			)
		]),
		derivedFacts,
		provenance: {
			scope: 'private-symbolic-profile',
			precision: 'experimental-not-certified',
			comparison: 'original-partial-order-without-weights',
			angularDistance: 'ecliptic-longitude-within-3-degrees-inclusive',
			commercialPrecisionApproved: false,
			commercialReleaseApproved: false,
			externalModelCalled: false,
			sources: weddingProfileSources
		}
	};
}

/** Rebuild from trusted input/facts; client-authored preferences or evidence are never approval authority. */
export async function verifyLaunchWeddingProfile(
	input: WeddingProfileInput,
	candidate: unknown
): Promise<boolean> {
	try {
		const expected = await buildLaunchWeddingProfile(input);
		return expected.outcome !== 'UNASSESSABLE' && canonical(expected) === canonical(candidate);
	} catch {
		return false;
	}
}
