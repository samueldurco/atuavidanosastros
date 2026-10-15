import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { trialIdentity } from './private-trials';
import { trialAtlasSelection } from './private-dream-atlas';

vi.mock('./private-trials', () => ({
	trialIdentity: vi.fn(),
	validTrialId: (id: unknown) => typeof id === 'string' && /^[a-f0-9-]{36}$/.test(id)
}));
const ownerId = '00000000-0000-4000-8000-000000000001';
const cycleId = '00000000-0000-4000-8000-000000000002';
const entryId = '00000000-0000-4000-8000-000000000003';
const eq = vi.fn();
let readyAt = '2026-10-01T12:00:00Z';
let finalId: string | null = null;
let included = true;
let cycleExists = true;
const from = vi.fn((table: string) => {
	const builder = {
		select: vi.fn(() => builder),
		eq: vi.fn((...args: unknown[]) => {
			eq(...args);
			return builder;
		}),
		maybeSingle: vi.fn(async () => ({
			error: null,
			data:
				table === 'atv_trial_dream_cycles'
					? cycleExists
						? {
								id: cycleId,
								started_at: '2026-09-01T12:00:00Z',
								ready_at: readyAt,
								start_date: '2026-09-01'
							}
						: null
					: finalId
						? { id: finalId }
						: null
		})),
		order: vi.fn(async () => ({
			error: null,
			data: [
				{
					id: entryId,
					revision: 2,
					created_at: '2026-09-02T12:00:00Z',
					updated_at: '2026-09-03T12:00:00Z',
					data: {
						version: 'atv-dream-atlas-entry/1',
						dreamDate: '2026-09-02',
						narrative: 'Relato sintético: uma ponte na cidade.',
						emotions: ['curiosidade'],
						associations: ['viagem'],
						includeInSynthesis: included
					}
				}
			]
		}))
	};
	return builder;
});
beforeEach(() => {
	vi.clearAllMocks();
	vi.useFakeTimers();
	vi.setSystemTime(new Date('2026-10-01T12:00:00Z'));
	readyAt = '2026-10-01T12:00:00Z';
	finalId = null;
	included = true;
	cycleExists = true;
	vi.mocked(trialIdentity).mockResolvedValue({ ownerId, supabase: { from } } as never);
});
afterEach(() => vi.useRealTimers());
describe('server selection of saved dream cycles', () => {
	it('refuses completion one millisecond early and accepts the exact server boundary', async () => {
		vi.setSystemTime(new Date('2026-10-01T11:59:59.999Z'));
		await expect(
			trialAtlasSelection({} as App.Locals, cycleId, '2026-09-01')
		).rejects.toMatchObject({ status: 409 });
		vi.setSystemTime(new Date('2026-10-01T12:00:00Z'));
		expect(await trialAtlasSelection({} as App.Locals, cycleId, '2026-09-01')).toMatchObject([
			{ id: entryId, revision: 2 }
		]);
		expect(eq).toHaveBeenCalledWith('owner_id', ownerId);
		expect(eq).toHaveBeenCalledWith('cycle_id', cycleId);
	});
	it('refuses a changed start, excluded sources, a previous final result and an unavailable cycle', async () => {
		await expect(
			trialAtlasSelection({} as App.Locals, cycleId, '2026-08-31')
		).rejects.toMatchObject({ status: 400 });
		included = false;
		await expect(
			trialAtlasSelection({} as App.Locals, cycleId, '2026-09-01')
		).rejects.toMatchObject({ status: 400 });
		included = true;
		finalId = entryId;
		await expect(
			trialAtlasSelection({} as App.Locals, cycleId, '2026-09-01')
		).rejects.toMatchObject({ status: 409 });
		cycleExists = false;
		await expect(
			trialAtlasSelection({} as App.Locals, cycleId, '2026-09-01')
		).rejects.toMatchObject({ status: 404 });
	});
	it('fails before reading private records when access is revoked or the cycle id is invalid', async () => {
		vi.mocked(trialIdentity).mockRejectedValueOnce({ status: 403 });
		await expect(
			trialAtlasSelection({} as App.Locals, cycleId, '2026-09-01')
		).rejects.toMatchObject({ status: 403 });
		await expect(
			trialAtlasSelection({} as App.Locals, 'invalid', '2026-09-01')
		).rejects.toMatchObject({ status: 400 });
		expect(from).not.toHaveBeenCalled();
	});
});
