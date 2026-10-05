import { beforeEach, expect, it, vi } from 'vitest';
import { sha256Hex } from '@atv/integrations';
import { POST } from './+server';

const mocks = vi.hoisted(() => ({
	upsert: vi.fn(),
	single: vi.fn(),
	from: vi.fn()
}));

vi.mock('$env/dynamic/private', () => ({
	env: {
		FEATURE_HOTMART_LIVE: 'true',
		HOTMART_HOTTOK: 'segredo',
		SUPABASE_SERVICE_ROLE_KEY: 'role'
	}
}));
vi.mock('$env/dynamic/public', () => ({ env: { PUBLIC_SUPABASE_URL: 'https://local.example' } }));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ from: mocks.from }) }));

const notification = { id: 'evt-1', event: 'PURCHASE_APPROVED', data: { test: true } };

function event(body: unknown) {
	return {
		request: new Request('https://local.example/api/webhooks/hotmart', {
			method: 'POST',
			headers: { 'x-hotmart-hottok': 'segredo', 'content-type': 'application/json' },
			body: JSON.stringify(body)
		})
	} as Parameters<typeof POST>[0];
}

beforeEach(() => {
	vi.clearAllMocks();
	mocks.upsert.mockResolvedValue({ error: null });
	const query = { eq: vi.fn().mockReturnThis(), single: mocks.single };
	mocks.from.mockReturnValue({ upsert: mocks.upsert, select: vi.fn(() => query) });
});

it('keeps an identical replay in the inbox without replacing its state', async () => {
	mocks.single.mockResolvedValue({
		data: {
			event_type: notification.event,
			payload_hash: await sha256Hex(JSON.stringify(notification))
		},
		error: null
	});
	const response = await POST(event(notification));
	expect(response.status).toBe(202);
	expect(mocks.upsert).toHaveBeenCalledWith(
		expect.objectContaining({ processing_state: 'RECEIVED' }),
		{ onConflict: 'provider,external_event_id', ignoreDuplicates: true }
	);
});

it('rejects an event ID reused with different content', async () => {
	mocks.single.mockResolvedValue({
		data: { event_type: notification.event, payload_hash: 'different' },
		error: null
	});
	const response = await POST(event(notification));
	expect(response.status).toBe(409);
	expect(await response.json()).toEqual({ accepted: false, code: 'event_id_conflict' });
});

it.each([
	{ ...notification, id: '  ' },
	{ ...notification, event: '' },
	{ ...notification, data: [] }
])('refuses a notification without a usable identity or object data', async (body) => {
	const response = await POST(event(body));
	expect(response.status).toBe(400);
	expect(mocks.from).not.toHaveBeenCalled();
});
