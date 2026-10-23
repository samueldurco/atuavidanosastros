import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '../../routes/api/private-trials/[id]/+server';
import { ATLAS_VERSION, atlasMethod } from '../trials/reconstruction/atlas-facts';
import { privateTrial, trialIdentity, trialJson } from './private-trials';

vi.mock('./private-trials', () => ({
	privateTrial: vi.fn(),
	trialIdentity: vi.fn(),
	trialJson: vi.fn()
}));

const owner = '00000000-0000-4000-8000-000000000041';
const reading = '00000000-0000-4000-8000-000000000042';
const upsert = vi.fn();
const from = vi.fn(() => ({ upsert }));
const event = { locals: {}, params: { id: reading } } as never;

beforeEach(() => {
	vi.clearAllMocks();
	vi.mocked(trialIdentity).mockResolvedValue({ ownerId: owner, supabase: { from } } as never);
	vi.mocked(privateTrial).mockResolvedValue({
		id: reading,
		product_id: 'life-atlas',
		calculation: { version: ATLAS_VERSION }
	} as never);
	upsert.mockResolvedValue({ error: null });
});

describe('Atlas private note endpoint', () => {
	it.each([0, ...atlasMethod.path])(
		'saves the offered day %s against the verified owner and edition',
		async (step) => {
			const text = `Anotação sintética da etapa ${step}.`;
			vi.mocked(trialJson).mockResolvedValue({
				action: 'note',
				step,
				text,
				owner_id: 'forged-owner',
				reading_id: 'forged-reading'
			});
			const response = await POST(event);
			expect(response.status).toBe(200);
			expect(response.headers.get('cache-control')).toBe('private, no-store');
			expect(from).toHaveBeenCalledWith('atv_trial_notes');
			expect(upsert).toHaveBeenCalledWith(
				expect.objectContaining({ owner_id: owner, reading_id: reading, step, text }),
				{ onConflict: 'owner_id,reading_id,step' }
			);
		}
	);

	it.each([
		{ step: 1, text: 'Uma etapa que o Atlas não oferece.' },
		{ step: '21', text: 'Uma etapa enviada como texto.' },
		{ step: 21, text: '   ' },
		{ step: 21, text: 'a'.repeat(3001) }
	])('rejects invalid notes without writing', async (payload) => {
		vi.mocked(trialJson).mockResolvedValue({ action: 'note', ...payload });
		await expect(POST(event)).rejects.toMatchObject({ status: 400 });
		expect(upsert).not.toHaveBeenCalled();
	});

	it('does not accept an Atlas day for an ordinary product', async () => {
		vi.mocked(privateTrial).mockResolvedValue({
			id: reading,
			product_id: 'birth-chart',
			calculation: { version: ATLAS_VERSION }
		} as never);
		vi.mocked(trialJson).mockResolvedValue({
			action: 'note',
			step: 21,
			text: 'Anotação sintética.'
		});
		await expect(POST(event)).rejects.toMatchObject({ status: 400 });
		expect(upsert).not.toHaveBeenCalled();
	});

	it('reports a storage failure instead of claiming that a check-in was saved', async () => {
		vi.mocked(trialJson).mockResolvedValue({
			action: 'note',
			step: 21,
			text: 'Anotação sintética.'
		});
		upsert.mockResolvedValue({ error: { message: 'unavailable' } });
		await expect(POST(event)).rejects.toMatchObject({ status: 503 });
		expect(upsert).toHaveBeenCalledOnce();
	});
});
