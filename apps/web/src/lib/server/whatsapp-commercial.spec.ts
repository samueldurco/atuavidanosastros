import { describe, expect, it, vi } from 'vitest';
import { createConsultationCatalogue } from './whatsapp-consultation';
import {
	consultationSubjectKey,
	createCloudApiConsultationSender,
	handleConsultationMessage,
	type ConsultationStore,
	type ConsultationSender
} from './whatsapp-commercial';

const secret = 'synthetic-subject-secret-not-a-real-secret';
const phoneNumberId = '100000000000002';
const now = Date.parse('2026-11-04T11:00:00Z');
const message = {
	externalEventId: 'a'.repeat(64),
	from: '15550000001',
	timestamp: now / 1000,
	text: 'Qual é meu ascendente?'
};
const catalogue = createConsultationCatalogue({ verifiedFreeToolIds: ['ascendente'] });

function fixture() {
	const claims = new Set<string>();
	const complete = vi.fn<ConsultationStore['complete']>(async () => undefined);
	const store: ConsultationStore = {
		claim: vi.fn<ConsultationStore['claim']>(async (id) => {
			if (claims.has(id)) return { result: 'duplicate' };
			claims.add(id);
			return { result: 'claimed', state: { step: 'menu' } };
		}),
		complete
	};
	const send = vi.fn<ConsultationSender['send']>(async () => ({
		outcome: 'SENT' as const,
		providerMessageHash: 'b'.repeat(64)
	}));
	return {
		store,
		send,
		complete,
		input: {
			message,
			subjectSecret: secret,
			phoneNumberId,
			store,
			sender: { send },
			catalogue,
			now
		}
	};
}

it('replayed/concurrent event causes a single reply and only bounded state is persisted', async () => {
	const { input, send, complete } = fixture();
	expect(
		(await Promise.all([handleConsultationMessage(input), handleConsultationMessage(input)])).sort()
	).toEqual(['duplicate', 'sent']);
	expect(send).toHaveBeenCalledTimes(1);
	expect(send.mock.calls[0]?.[0]).toBe(message.from);
	const durable = JSON.stringify(complete.mock.calls);
	expect(durable).not.toContain(message.from);
	expect(durable).not.toContain(message.text);
	expect(durable).not.toContain('https://');
});

it.each([-86_401, 61])('does not send outside service window (%is)', async (offset) => {
	const { input, send } = fixture();
	input.message = { ...message, timestamp: now / 1000 + offset };
	expect(await handleConsultationMessage(input)).toBe('skipped');
	expect(send).not.toHaveBeenCalled();
});

it('returns busy without replying when another inbound owns the conversation', async () => {
	const { input, store, send } = fixture();
	vi.mocked(store.claim).mockResolvedValue({ result: 'busy' });
	expect(await handleConsultationMessage(input)).toBe('busy');
	expect(send).not.toHaveBeenCalled();
});

it('uncertain send is quarantined and is never automatically sent again', async () => {
	const { input, send, complete } = fixture();
	send.mockRejectedValueOnce(new Error('synthetic connection reset'));
	expect(await handleConsultationMessage(input)).toBe('needs_reconciliation');
	expect(await handleConsultationMessage(input)).toBe('duplicate');
	expect(send).toHaveBeenCalledTimes(1);
	expect(complete).toHaveBeenCalledWith(
		expect.objectContaining({ outcome: 'NEEDS_RECONCILIATION' })
	);
});

it('subject keys are keyed and namespaced rather than plaintext or unkeyed phone hashes', async () => {
	const one = await consultationSubjectKey(secret, phoneNumberId, message.from);
	expect(one).toMatch(/^[a-f0-9]{64}$/);
	expect(await consultationSubjectKey(secret, phoneNumberId, message.from)).toBe(one);
	expect(await consultationSubjectKey(secret + '2', phoneNumberId, message.from)).not.toBe(one);
	expect(await consultationSubjectKey(secret, phoneNumberId + '3', message.from)).not.toBe(one);
	await expect(consultationSubjectKey('short', phoneNumberId, message.from)).rejects.toThrow();
});

describe('Cloud API text adapter', () => {
	const config = { accessToken: 'synthetic-access-token', phoneNumberId, graphVersion: 'v24.0' };
	it('sends text only, rejects redirects and keeps only a provider ID hash', async () => {
		const request = vi.fn(async () =>
			Response.json({ messages: [{ id: 'wamid.synthetic.response' }] })
		);
		const result = await createCloudApiConsultationSender({ ...config, fetch: request }).send(
			message.from,
			'Texto sintético'
		);
		expect(result).toEqual({
			outcome: 'SENT',
			providerMessageHash: expect.stringMatching(/^[a-f0-9]{64}$/)
		});
		expect(request).toHaveBeenCalledTimes(1);
		const [url, options] = request.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toBe(`https://graph.facebook.com/v24.0/${phoneNumberId}/messages`);
		expect(options.redirect).toBe('error');
		expect(JSON.parse(String(options.body))).toEqual({
			messaging_product: 'whatsapp',
			recipient_type: 'individual',
			to: message.from,
			type: 'text',
			text: { preview_url: false, body: 'Texto sintético' }
		});
	});
	it.each([429, 500])('does not retry HTTP %s', async (status) => {
		const request = vi.fn(async () => new Response('synthetic private error', { status }));
		const result = await createCloudApiConsultationSender({ ...config, fetch: request }).send(
			message.from,
			'Texto'
		);
		expect(result.outcome).toBe(status === 429 ? 'FAILED' : 'NEEDS_RECONCILIATION');
		expect(request).toHaveBeenCalledTimes(1);
	});
	it('treats timeout or malformed accepted response as ambiguous', async () => {
		for (const request of [
			vi.fn(async () => {
				throw new Error('synthetic timeout');
			}),
			vi.fn(async () => Response.json({}))
		]) {
			expect(
				await createCloudApiConsultationSender({ ...config, fetch: request }).send(
					message.from,
					'Texto'
				)
			).toEqual({ outcome: 'NEEDS_RECONCILIATION' });
			expect(request).toHaveBeenCalledTimes(1);
		}
	});
});
