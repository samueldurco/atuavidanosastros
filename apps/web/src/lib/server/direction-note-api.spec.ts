import { describe, expect, it, vi, beforeEach } from 'vitest';
import { POST } from '../../routes/api/private-trials/[id]/+server';
import { DIRECTION_VERSION } from '../trials/reconstruction/direction-facts';
import { DIRECTION_NOTE_VERSION } from '../trials/reconstruction/direction-check-ins';
import { privateTrial, trialIdentity, trialJson } from './private-trials';
vi.mock('./private-trials', () => ({
	privateTrial: vi.fn(),
	trialIdentity: vi.fn(),
	trialJson: vi.fn()
}));
const owner = '00000000-0000-4000-8000-000000000031',
	reading = '00000000-0000-4000-8000-000000000032';
const upsert = vi.fn(),
	from = vi.fn(() => ({ upsert }));
const body = (step = 0) => ({
	action: 'note',
	step,
	text: JSON.stringify({
		version: DIRECTION_NOTE_VERSION,
		step,
		observation: 'Observei uma tarefa.',
		conditions: 'Vinte minutos disponíveis.',
		counterevidence: 'Preciso comparar outra amostra.',
		next: 'Reduzir o escopo.',
		decision: step === 30 ? 'pause' : 'undecided'
	})
});
beforeEach(() => {
	vi.clearAllMocks();
	vi.mocked(trialIdentity).mockResolvedValue({ ownerId: owner, supabase: { from } } as never);
	vi.mocked(privateTrial).mockResolvedValue({
		id: reading,
		product_id: 'direction-journey',
		calculation: { version: DIRECTION_VERSION }
	} as never);
	upsert.mockResolvedValue({ error: null });
});
describe('Jornada private note endpoint', () => {
	it('persists a structured note with verified owner, reading and real server timestamp', async () => {
		vi.mocked(trialJson).mockResolvedValue(body(30));
		const response = await POST({ locals: {}, params: { id: reading } } as never);
		expect(response.status).toBe(200);
		expect(from).toHaveBeenCalledWith('atv_trial_notes');
		const [row, options] = upsert.mock.calls[0];
		expect(row).toMatchObject({
			owner_id: owner,
			reading_id: reading,
			step: 30,
			text: body(30).text
		});
		expect(Math.abs(Date.parse(row.updated_at) - Date.now())).toBeLessThan(10000);
		expect(options).toEqual({ onConflict: 'owner_id,reading_id,step' });
	});
	it.each([
		{ action: 'note', step: 7, text: 'raw forged prose' },
		body(1),
		{ ...body(7), text: body(14).text }
	])('rejects incompatible notes before a database write', async (payload) => {
		vi.mocked(trialJson).mockResolvedValue(payload);
		await expect(POST({ locals: {}, params: { id: reading } } as never)).rejects.toMatchObject({
			status: 400
		});
		expect(upsert).not.toHaveBeenCalled();
	});
	it('keeps legacy plain notes editable and reports storage failures', async () => {
		vi.mocked(privateTrial).mockResolvedValue({
			id: reading,
			product_id: 'direction-journey',
			calculation: { version: 'atv-direction-journey-calculation/1.0.0' }
		} as never);
		vi.mocked(trialJson).mockResolvedValue({
			action: 'note',
			step: 7,
			text: 'Anotação histórica.'
		});
		upsert.mockResolvedValue({ error: { message: 'unavailable' } });
		await expect(POST({ locals: {}, params: { id: reading } } as never)).rejects.toMatchObject({
			status: 503
		});
		expect(upsert).toHaveBeenCalledOnce();
	});
});
