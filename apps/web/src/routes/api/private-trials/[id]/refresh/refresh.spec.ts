import { beforeEach, expect, it, vi } from 'vitest';
import { error } from '@sveltejs/kit';
import { POST } from './+server';

const mocks = vi.hoisted(() => ({
	privateTrial: vi.fn(),
	trialIdentity: vi.fn(),
	trialJson: vi.fn(),
	trialWriter: vi.fn(),
	reissueTrial: vi.fn()
}));
vi.mock('$lib/server/private-trials', () => ({
	...mocks,
	validTrialId: (v: unknown) => typeof v === 'string' && /^[0-9a-f-]{36}$/.test(v)
}));
vi.mock('$lib/trials/reading', () => ({ ...mocks, canonical: JSON.stringify }));
vi.mock('$lib/server/trial-runtime', () => mocks);
const requestKey = '00000000-0000-4000-8000-000000000001';
const original = {
	product_id: 'tarot-focus',
	input: { question: 'synthetic' },
	calculation: { cards: ['one', 'two'] },
	reading: { version: 'old' },
	approval: { digest: 'old' },
	source_ids: ['source']
};
const revised = { version: 'new' },
	approval = { digest: 'new' };
let inserted: Record<string, unknown>[], insertResult: unknown, retryResult: unknown;
const event = { locals: {}, params: { id: requestKey } } as unknown as Parameters<typeof POST>[0];
beforeEach(() => {
	vi.resetAllMocks();
	inserted = [];
	insertResult = { data: { id: 'new-id' }, error: null };
	retryResult = { data: { ...original, reading: revised, approval, id: 'retry-id' }, error: null };
	mocks.trialJson.mockResolvedValue({ requestKey });
	mocks.privateTrial.mockResolvedValue(original);
	mocks.reissueTrial.mockResolvedValue({
		calculation: original.calculation,
		reading: revised,
		approval
	});
	const query = { select: () => query, eq: () => query, single: async () => retryResult };
	mocks.trialIdentity.mockResolvedValue({
		ownerId: 'verified-owner',
		supabase: { from: () => query }
	});
	mocks.trialWriter.mockReturnValue({
		from: () => ({
			insert: (row: Record<string, unknown>) => {
				inserted.push(row);
				return { select: () => ({ single: async () => insertResult }) };
			}
		})
	});
});
it('cria nova edição com o dono verificado, sem alterar o cálculo, fontes, cartas ou avaliação anterior', async () => {
	const response = await POST(event);
	expect(response.status).toBe(201);
	expect(await response.json()).toEqual({ id: 'new-id' });
	expect(response.headers.get('cache-control')).toBe('private, no-store');
	expect(inserted[0]).toMatchObject({
		owner_id: 'verified-owner',
		input: original.input,
		calculation: original.calculation,
		source_ids: original.source_ids,
		reading: revised,
		approval
	});
	expect(inserted[0].id).not.toBe(event.params.id);
	expect(inserted[0]).not.toHaveProperty('feedback');
	expect(mocks.reissueTrial).toHaveBeenCalledWith(event, original);
});
it('bloqueia leitura adulterada antes de compor ou gravar', async () => {
	mocks.reissueTrial.mockResolvedValue(null);
	await expect(POST(event)).rejects.toMatchObject({ status: 422 });
	expect(inserted).toHaveLength(0);
});
it('reverifica a concessão e interrompe a escrita quando ela foi revogada', async () => {
	mocks.trialIdentity.mockImplementation(async () => error(403, 'revoked'));
	await expect(POST(event)).rejects.toMatchObject({ status: 403 });
	expect(inserted).toHaveLength(0);
});
it('retorna a mesma edição para repetição idêntica, sem sobrescrever a anterior', async () => {
	insertResult = { error: { code: '23505' } };
	expect(await (await POST(event)).json()).toEqual({ id: 'retry-id' });
	expect(inserted).toHaveLength(1);
});
it.each(['source_ids', 'calculation', 'input', 'approval'])(
	'recusa requestKey reutilizada com %s diferente',
	async (field) => {
		insertResult = { error: { code: '23505' } };
		retryResult = {
			data: {
				...original,
				reading: revised,
				approval,
				[field]: field === 'approval' ? { digest: 'other' } : ['different']
			},
			error: null
		};
		await expect(POST(event)).rejects.toMatchObject({ status: 409 });
	}
);
