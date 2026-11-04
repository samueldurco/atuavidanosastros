import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
	LAUNCH_INPUT_VERSION,
	parseLaunchInput,
	prepareLaunchEvidence,
	type LaunchInput
} from '@atv/domain';
import {
	setupProductDatabase,
	owner,
	other,
	file
} from '../../../../../scripts/helpers/product-database.mjs';
import { asRole } from '../../../../../scripts/helpers/artifact-fixture.mjs';
import { calculateLaunchFacts, type LaunchFactCalculation } from './launch-calculation';
import type { LaunchPreparation } from './launch-preparations';
import type { SavedLaunchReading } from './launch-readings';
import {
	composeLaunchReading,
	evaluateLaunchReading,
	launchReadingDigest
} from '../trials/launch-reading';

// Real local SQL, RLS, calculations and editorial policy. Auth claims are synthetic;
// this does not certify hosted JWT/PostgREST, independent connections or owner E5.
let db: Awaited<ReturnType<typeof setupProductDatabase>>;
const writer = <T>(run: () => Promise<T>) => asRole(db, 'service_role', null, run);
const asOwner = <T>(run: () => Promise<T>) => asRole(db, 'authenticated', owner, run);
const consent = { storage: true, policyVersion: 'atv-launch-consent/1' } as const;
const inputs: LaunchInput[] = [
	{
		version: LAUNCH_INPUT_VERSION,
		productId: 'ex-tarot',
		consent,
		answers: {
			episode: 'Uma mensagem chegou depois de meses sem contato.',
			observedActions: 'Perguntou como estou e propôs conversar durante o dia.',
			question: 'Quero responder sem antecipar uma retomada?',
			boundaries: 'Posso conversar durante o dia; não aceito insistência.'
		}
	},
	{
		version: LAUNCH_INPUT_VERSION,
		productId: 'love-restart-map',
		consent,
		birth: {
			localDateTime: '1990-05-10T10:30:00',
			utcInstant: '1990-05-10T13:30:00Z',
			timezone: 'America/Sao_Paulo',
			latitude: -23.55,
			longitude: -46.63,
			locationSource: 'synthetic'
		},
		answers: {
			startDate: '2026-11-01',
			situation: 'Quero conhecer novas pessoas depois de uma separação.',
			desiredChange: 'Experimentar um encontro sem apressar compromisso.',
			boundaries: 'Preservar minhas noites de descanso.'
		}
	}
];

beforeAll(async () => {
	db = await setupProductDatabase({ privateOnly: true });
	for (const migration of [
		'20261006140000_private_product_trials.sql',
		'20261104102635_p02_launch_preparations.sql',
		'20261104103423_p02_launch_readings.sql'
	])
		await db.exec(await file(`supabase/migrations/${migration}`));
	await writer(() =>
		db.query('insert into atv_trial_grants(owner_id) values($1),($2)', [owner, other])
	);
}, 20000);

beforeEach(async () => {
	await db.query('update atv_trial_grants set revoked_at=null,expires_at=null where owner_id=$1', [
		owner
	]);
});

afterAll(async () => {
	await db?.close();
});

describe.each(inputs)('P02 real E3 delivery $productId', (originalInput) => {
	it('persists actual facts and approved content, reopens the exact edition, then enforces revocation and immutability', async () => {
		const input = parseLaunchInput(originalInput);
		expect(input).not.toBeNull();
		if (!input) throw new Error('invalid_synthetic_input');
		const id = randomUUID(),
			requestKey = randomUUID();
		const evidence = await prepareLaunchEvidence(input, id);
		await writer(() =>
			db.query(
				`insert into atv_launch_preparations
			(id,owner_id,request_key,product_id,input,input_digest,evidence)
			values($1,$2,$3,$4,$5,$6,$7)`,
				[
					id,
					owner,
					requestKey,
					input.productId,
					JSON.stringify(input),
					evidence.inputDigest,
					JSON.stringify(evidence)
				]
			)
		);

		const calculation = await calculateLaunchFacts(input, id);
		expect(calculation.state).toBe('FACTS_READY_AWAITING_REVIEW');
		expect(calculation.inputDigest).toBe(evidence.inputDigest);
		expect(
			(
				await writer(() =>
					db.query<{ id: string }>(
						`update atv_launch_preparations
			set status='FACTS_READY_AWAITING_REVIEW',evidence=$3
			where id=$1 and owner_id=$2 and status='AWAITING_CALCULATION' returning id`,
						[id, owner, JSON.stringify(calculation)]
					)
				)
			).rows
		).toEqual([{ id }]);

		// Compose from the owner-visible database result, never the in-memory calculation.
		const persistedPreparation = (
			await asOwner(() =>
				db.query<LaunchPreparation>(
					'select * from atv_launch_preparations where id=$1 and owner_id=$2',
					[id, owner]
				)
			)
		).rows[0];
		expect(persistedPreparation.status).toBe('FACTS_READY_AWAITING_REVIEW');
		const persistedInput = parseLaunchInput(persistedPreparation.input);
		expect(persistedInput).toEqual(input);
		if (!persistedInput) throw new Error('persisted_input_parse_failed');
		const persistedFacts = persistedPreparation.evidence as LaunchFactCalculation;
		expect(persistedFacts).toEqual(calculation);
		const reading = await composeLaunchReading(persistedInput, persistedFacts);
		const review = await evaluateLaunchReading(persistedInput, persistedFacts, reading);
		expect(review.status, JSON.stringify(review.reasons)).toBe('APPROVED_FOR_PRIVATE_TEST');
		expect(review.checks.every((check) => check.passed)).toBe(true);
		const calculationDigest = await launchReadingDigest(persistedFacts);
		const readingDigest = await launchReadingDigest(reading);
		expect(review.digest).toBe(readingDigest);
		const parameters = [
			id,
			owner,
			input.productId,
			evidence.inputDigest,
			calculationDigest,
			readingDigest,
			JSON.stringify(reading),
			JSON.stringify(review)
		];
		const insertReading = () =>
			writer(() =>
				db.query<{ preparation_id: string }>(
					`insert into atv_launch_readings
			(preparation_id,owner_id,product_id,input_digest,calculation_digest,reading_digest,reading,review)
			values($1,$2,$3,$4,$5,$6,$7,$8) on conflict(preparation_id) do nothing returning preparation_id`,
					parameters
				)
			);
		expect((await insertReading()).rows).toEqual([{ preparation_id: id }]);
		expect((await insertReading()).rows).toEqual([]);

		const selectOwnerReading = () =>
			asOwner(() =>
				db.query<SavedLaunchReading>(
					'select * from atv_launch_readings where preparation_id=$1 and owner_id=$2',
					[id, owner]
				)
			);
		const reopened = (await selectOwnerReading()).rows[0];
		expect(reopened.reading).toEqual(reading);
		expect(reopened.review).toEqual(review);
		expect(reopened.product_id).toBe(persistedInput.productId);
		expect(reopened.input_digest).toBe(persistedPreparation.input_digest);
		expect(reopened.calculation_digest).toBe(await launchReadingDigest(persistedFacts));
		expect(reopened.reading_digest).toBe(await launchReadingDigest(reopened.reading));
		const reopenedReview = await evaluateLaunchReading(
			persistedInput,
			persistedFacts,
			reopened.reading
		);
		expect(reopenedReview.status).toBe('APPROVED_FOR_PRIVATE_TEST');
		expect(reopenedReview.digest).toBe(reopened.review.digest);
		expect(reopenedReview.policyVersion).toBe(reopened.review.policyVersion);
		expect(reopenedReview.provenance).toMatchObject({
			commercialPrecisionApproved: false,
			commercialReleaseApproved: false
		});

		expect(
			(
				await asRole(db, 'authenticated', other, () =>
					db.query('select * from atv_launch_readings where preparation_id=$1', [id])
				)
			).rows
		).toEqual([]);
		await expect(
			asRole(db, 'anon', null, () =>
				db.query('select * from atv_launch_readings where preparation_id=$1', [id])
			)
		).rejects.toThrow(/permission denied/);
		await expect(
			writer(() =>
				db.query('update atv_launch_readings set reading=$2 where preparation_id=$1', [
					id,
					JSON.stringify({ ...reading, summary: 'Tentativa de substituição.' })
				])
			)
		).rejects.toThrow(/permission denied/);
		await expect(
			db.query('update atv_launch_readings set reading=reading where preparation_id=$1', [id])
		).rejects.toThrow(/launch_reading_immutable/);
		expect((await selectOwnerReading()).rows[0].reading).toEqual(reading);

		await db.query('update atv_trial_grants set revoked_at=now() where owner_id=$1', [owner]);
		expect((await selectOwnerReading()).rows).toEqual([]);
		expect(
			(await asOwner(() => db.query('select * from atv_launch_preparations where id=$1', [id])))
				.rows
		).toEqual([]);
		await expect(insertReading()).rejects.toThrow(/trial_access_revoked/);
		// Revocation hides access without replacing or deleting the original edition.
		expect(
			(
				await db.query<SavedLaunchReading>(
					'select * from atv_launch_readings where preparation_id=$1',
					[id]
				)
			).rows[0].reading
		).toEqual(reading);
	}, 30000);
});
