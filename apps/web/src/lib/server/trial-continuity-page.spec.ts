import { describe, expect, it, vi } from 'vitest';
import { load } from '../../routes/testar-produtos/atv-plus/+page.server';
import { trialIdentity } from './private-trials';
import { trialContinuity } from './trial-continuity';
vi.mock('./private-trials', () => ({ trialIdentity: vi.fn() }));
vi.mock('./trial-continuity', () => ({ trialContinuity: vi.fn() }));
describe('ATV+ continuity account management', () => {
	it('keeps consent management reachable without opening readings when the grant is revoked', async () => {
		const continuity = {
			state: { revision: 1, granted: true, available: false, items: [] },
			preparation: { status: 'blocked', code: 'unavailable' }
		};
		vi.mocked(trialContinuity).mockResolvedValue(continuity as never);
		const result = await load({
			locals: {},
			parent: async () => ({ user: { id: 'owner' }, trialAccess: false })
		} as never);
		expect(result).toEqual({
			products: [],
			readings: [],
			feedback: null,
			continuity,
			continuityReadings: []
		});
		expect(trialIdentity).not.toHaveBeenCalled();
	});
});
