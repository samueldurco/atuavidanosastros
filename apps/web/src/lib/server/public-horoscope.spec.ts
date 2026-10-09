import { beforeAll, describe, expect, it } from 'vitest';
import { CaelusEphemerisProvider, type EphemerisProvider } from '@atv/astrology';
import {
	assertPublicHoroscopeSnapshot,
	calculatePublicHoroscope,
	publicHoroscopeBounds,
	type PublicHoroscopeSnapshot
} from '../../../../worker/src/public-horoscope-calculation';
import { publicHoroscopeDigest, verifiedPublicHoroscopeFacts } from './public-horoscope-facts';
import {
	approvalPayload,
	approvedDocuments,
	documentDigest,
	type EditorialDocument,
	type EditorialApproval
} from './editorial';

let daily: PublicHoroscopeSnapshot;
const signal = () => new AbortController().signal;
beforeAll(async () => {
	daily = await calculatePublicHoroscope('2026-10-08', 'daily', signal());
});

describe('public horoscope observations and relevance', () => {
	it('uses UTC days, Monday weeks and complete calendar months including leap years', () => {
		expect(publicHoroscopeBounds('2026-10-11', 'weekly')).toEqual({
			startDate: '2026-10-05',
			endDateExclusive: '2026-10-12'
		});
		expect(publicHoroscopeBounds('2024-02-29', 'monthly')).toEqual({
			startDate: '2024-02-01',
			endDateExclusive: '2024-03-01'
		});
		expect(publicHoroscopeBounds('2099-12-31', 'daily').endDateExclusive).toBe('2100-01-01');
	});
	it('rejects impossible dates, unsupported cadence and weeks outside the engine domain', () => {
		for (const date of ['2026-02-29', '1899-12-31', '2100-01-01', '2026-1-01'])
			expect(() => publicHoroscopeBounds(date, 'daily')).toThrow();
		expect(() => publicHoroscopeBounds('2099-12-31', 'weekly')).toThrow();
		expect(() => publicHoroscopeBounds('2026-10-08', 'annual' as 'daily')).toThrow();
	});
	it('retains four real ten-body observations, all 45 pairs and finite experimental provenance', () => {
		expect(daily.rows).toHaveLength(4);
		expect(daily.rows.map((row) => row[0])).toEqual(
			[0, 6, 12, 18].map((hour) => Date.UTC(2026, 9, 8, hour))
		);
		expect(daily.rows.every((row) => row.length === 12)).toBe(true);
		expect(daily.provenance.provider).toBe('caelus');
		expect(daily.provenance.accuracyStatus).toBe('experimental');
		expect(daily.pairsEvaluatedPerSample).toBe(45);
		expect(daily.selectedIds.length).toBeGreaterThanOrEqual(3);
		expect(daily.selectedIds.length).toBeLessThanOrEqual(6);
		expect(new Set(daily.selectedIds).size).toBe(daily.selectedIds.length);
		expect(daily).not.toHaveProperty('natal');
		expect(daily).not.toHaveProperty('houses');
	});
	it('retains 28 weekly and 124 monthly observations from the actual candidate engine', async () => {
		const weekly = await calculatePublicHoroscope('2026-10-08', 'weekly', signal());
		const monthly = await calculatePublicHoroscope('2026-10-08', 'monthly', signal());
		expect(weekly.rows).toHaveLength(28);
		expect(monthly.rows).toHaveLength(124);
		assertPublicHoroscopeSnapshot(weekly);
		assertPublicHoroscopeSnapshot(monthly);
		expect(monthly.candidates.length).toBeGreaterThan(daily.candidates.length);
	});
	it('lets every reported aspect be independently recomputed at its representative sample', () => {
		const targets = { conjunction: 0, sextile: 60, square: 90, trine: 120, opposition: 180 };
		for (const movement of daily.candidates) {
			if (!movement.aspect) continue;
			const row = daily.rows.find((row) => row[0] === Date.parse(movement.representativeAt))!;
			const [a, b] = movement.bodies.map((body) => row[daily.bodies.indexOf(body) + 1]);
			const separation = Math.min(Math.abs(a - b), 360 - Math.abs(a - b));
			expect(movement.aspect.separationDegrees).toBe(separation);
			expect(movement.aspect.orbDegrees).toBe(Math.abs(separation - targets[movement.aspect.kind]));
			expect(movement.aspect.orbDegrees).toBeLessThanOrEqual(2);
		}
	});
	it('reserves an observed fast and background candidate when both exist', () => {
		for (const category of ['fast', 'background']) {
			if (!daily.candidates.some((movement) => movement.category === category)) continue;
			expect(
				daily.candidates.some(
					(movement) => movement.category === category && daily.selectedIds.includes(movement.id)
				)
			).toBe(true);
		}
	});
	it.each([
		['missing sample', (v: PublicHoroscopeSnapshot) => v.rows.pop()],
		['moved sample', (v: PublicHoroscopeSnapshot) => (v.rows[1][0] += 1)],
		['invalid coordinate', (v: PublicHoroscopeSnapshot) => (v.rows[1][1] = 360)],
		['invalid retrograde mask', (v: PublicHoroscopeSnapshot) => (v.rows[1][11] = 1024)],
		['false selection', (v: PublicHoroscopeSnapshot) => (v.selectedIds[0] = 'invented')],
		['suppressed candidate', (v: PublicHoroscopeSnapshot) => v.candidates.pop()],
		['false coverage', (v: PublicHoroscopeSnapshot) => (v.endDateExclusive = '2026-10-10')],
		['false origin', (v: PublicHoroscopeSnapshot) => (v.provenance.provider = 'invented')],
		['false certainty', (v: PublicHoroscopeSnapshot) => (v.limits = [])]
	])('rejects %s', (_, mutate) => {
		const copy = structuredClone(daily);
		mutate(copy);
		expect(() => assertPublicHoroscopeSnapshot(copy)).toThrow();
	});
	it('rejects a provider whose temporal identity changes and honors cancellation', async () => {
		const real = new CaelusEphemerisProvider();
		const provider: EphemerisProvider = {
			name: real.name,
			version: real.version,
			async calculate(input) {
				const chart = await real.calculate(input);
				chart.provenance.temporal.utcInstant = '2026-10-08T00:00:00.000Z';
				return chart;
			}
		};
		await expect(
			calculatePublicHoroscope('2026-10-08', 'daily', signal(), provider)
		).rejects.toThrow('Instante');
		const controller = new AbortController();
		controller.abort();
		await expect(
			calculatePublicHoroscope('2026-10-08', 'daily', controller.signal)
		).rejects.toThrow();
	});
});

async function forecast(): Promise<EditorialDocument> {
	return {
		id: 'synthetic-forecast',
		revision: 1,
		state: 'PUBLISHED',
		path: '/horoscopo/aries',
		kind: 'horoscope',
		title: 'Horóscopo sintético para teste local',
		description: 'Documento sintético de teste; não é publicação.',
		author: {
			id: 'synthetic-author',
			name: 'Autor de teste',
			bio: 'Identidade exclusiva dos testes.'
		},
		publishedAt: '2026-10-08T00:00:00.000Z',
		modifiedAt: '2026-10-08T00:00:00.000Z',
		sections: [{ heading: 'Teste', paragraphs: ['Texto exclusivo do teste automatizado.'] }],
		sources: [{ title: 'Fonte sintética', url: 'https://example.org/test' }],
		calculation: {
			engine: daily.engine,
			version: daily.version,
			factsDigest: await publicHoroscopeDigest(daily),
			coverageStart: `${daily.startDate}T00:00:00.000Z`,
			coverageEnd: `${daily.endDateExclusive}T00:00:00.000Z`
		}
	};
}
describe('exact facts binding before public editorial approval', () => {
	it('binds dated archives to the exact sample cadence and start date, retaining legacy paths', async () => {
		const doc = await forecast();
		expect(
			await verifiedPublicHoroscopeFacts({ ...doc, path: '/horoscopo/aries/daily/2026-10-08' }, [
				daily
			])
		).toBe(true);
		for (const path of ['/horoscopo/aries/weekly/2026-10-08', '/horoscopo/aries/daily/2026-10-09'])
			expect(await verifiedPublicHoroscopeFacts({ ...doc, path }, [daily])).toBe(false);
	});
	it('requires one exact full snapshot, including engine and coverage', async () => {
		const doc = await forecast();
		expect(await verifiedPublicHoroscopeFacts(doc, [daily])).toBe(true);
		expect(await verifiedPublicHoroscopeFacts(doc, [])).toBe(false);
		expect(await verifiedPublicHoroscopeFacts(doc, [daily, daily])).toBe(false);
		for (const patch of [
			{ factsDigest: 'f'.repeat(64) },
			{ coverageEnd: '2026-10-10T00:00:00.000Z' },
			{ engine: 'another-engine' },
			{ version: 'previous-version' }
		]) {
			expect(
				await verifiedPublicHoroscopeFacts(
					{ ...doc, calculation: { ...doc.calculation!, ...patch } },
					[daily]
				)
			).toBe(false);
		}
	});
	it('checks frozen and mutable bytes afresh and fails closed on corrupted geometry', async () => {
		const doc = await forecast();
		const mutated = structuredClone(daily);
		mutated.rows[1][2] += 0.001;
		expect(await verifiedPublicHoroscopeFacts(doc, [mutated])).toBe(false);
		expect(
			await verifiedPublicHoroscopeFacts(doc, [null as unknown as PublicHoroscopeSnapshot])
		).toBe(false);
	});
	it('still requires independent authority; a valid synthetic signature alone cannot admit missing facts', async () => {
		const doc = await forecast();
		const keys = (await crypto.subtle.generateKey('Ed25519', true, [
			'sign',
			'verify'
		])) as CryptoKeyPair;
		const base64 = (bytes: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(bytes)));
		const authorities = {
			'synthetic-key': {
				reviewerId: 'synthetic-reviewer',
				publicKey: base64(await crypto.subtle.exportKey('raw', keys.publicKey))
			}
		};
		const payload = {
			keyId: 'synthetic-key',
			documentId: doc.id,
			revision: 1,
			digest: await documentDigest(doc),
			reviewerId: 'synthetic-reviewer',
			approvedAt: '2026-10-08T00:00:00.000Z'
		};
		const receipt: EditorialApproval = {
			...payload,
			signature: base64(
				await crypto.subtle.sign('Ed25519', keys.privateKey, approvalPayload(payload))
			)
		};
		const now = new Date('2026-10-08T12:00:00.000Z');
		expect(await approvedDocuments([doc], [receipt], authorities, now)).toEqual([]);
		expect(await approvedDocuments([doc], [], authorities, now, undefined, [daily])).toEqual([]);
		expect(await approvedDocuments([doc], [receipt], authorities, now, undefined, [daily])).toEqual(
			[doc]
		);
	});
});
