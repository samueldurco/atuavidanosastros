import { createHmac } from 'node:crypto';
import { atvPlusCommercialOffers } from '@atv/domain';
import { afterEach, expect, it, vi } from 'vitest';
import { POST } from './+server';

const mocks = vi.hoisted(() => ({
	env: {} as Record<string, string>,
	publicEnv: {} as Record<string, string>,
	createClient: vi.fn()
}));

vi.mock('$env/dynamic/private', () => ({ env: mocks.env }));
vi.mock('$env/dynamic/public', () => ({ env: mocks.publicEnv }));
vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.createClient }));

afterEach(() => vi.unstubAllGlobals());

it('keeps signed webhook menus, navigation and Ascendant requests paid-only across live catalogue changes', async () => {
	Object.assign(mocks.env, {
		FEATURE_WHATSAPP_WEBHOOK: 'true',
		FEATURE_WHATSAPP_CONSULTATION: 'true',
		FEATURE_HOTMART_LIVE: 'true',
		FEATURE_ATV_PLUS_COMMERCIAL: 'true',
		AUTOMATIC_SPEND_CAP_BRL: '0',
		WHATSAPP_APP_SECRET: 'synthetic-app-secret-never-a-real-credential',
		WHATSAPP_WABA_ID: '100000000000001',
		WHATSAPP_PHONE_NUMBER_ID: '100000000000002',
		WHATSAPP_CONSULTATION_FREE_REPLY_VERIFIED: 'true',
		WHATSAPP_CONSULTATION_VERIFIED_AT: new Date().toISOString(),
		WHATSAPP_CONSULTATION_SUBJECT_SECRET: 'synthetic-subject-secret-not-a-real-credential',
		WHATSAPP_ACCESS_TOKEN: 'synthetic-access-token-not-a-real-credential',
		WHATSAPP_GRAPH_VERSION: 'v24.0',
		SUPABASE_SERVICE_ROLE_KEY: 'synthetic-role'
	});
	mocks.publicEnv.PUBLIC_SUPABASE_URL = 'https://synthetic.example';
	const definition = atvPlusCommercialOffers[0];
	const offer = {
		id: definition.id,
		plan_id: definition.planId,
		term_months: definition.termMonths,
		commercial_enabled: true,
		currency: 'BRL',
		total_minor: 12_345
	};
	const inbox = new Map<string, Record<string, unknown>>();
	const states = new Map<string, unknown>();
	const claimed = new Set<string>();
	let selectedKey = '';
	const query = {
		eq: vi.fn((column: string, value: string) => {
			if (column === 'external_event_id') selectedKey = value;
			return query;
		}),
		single: vi.fn(async () => ({ data: inbox.get(selectedKey), error: null }))
	};
	const from = vi.fn(() => ({
		upsert: vi.fn(async (row: Record<string, unknown>) => {
			if (!inbox.has(String(row.external_event_id))) inbox.set(String(row.external_event_id), row);
			return { error: null };
		}),
		select: vi.fn(() => query)
	}));
	const abortSignal = vi.fn(async () => ({ data: [offer], error: null }));
	const rpc = vi.fn((name: string, args: Record<string, unknown> = {}) => {
		if (name === 'atv_plus_public_offers') return { abortSignal };
		if (name === 'claim_whatsapp_consultation') {
			expect(inbox.has(String(args.p_event_id))).toBe(true);
			if (claimed.has(String(args.p_event_id)))
				return Promise.resolve({ data: { result: 'duplicate' }, error: null });
			claimed.add(String(args.p_event_id));
			return Promise.resolve({
				data: {
					result: 'claimed',
					state: states.get(String(args.p_subject_key)) ?? { step: 'menu' }
				},
				error: null
			});
		}
		if (name === 'complete_whatsapp_consultation') {
			states.set(String(args.p_subject_key), args.p_state);
			return Promise.resolve({ data: null, error: null });
		}
		throw new Error(`Unexpected synthetic RPC: ${name}`);
	});
	mocks.createClient.mockReturnValue({ from, rpc });
	const sent: string[] = [];
	const graph = vi.fn(async (url: string, options: RequestInit) => {
		expect(url).toBe('https://graph.facebook.com/v24.0/100000000000002/messages');
		const payload = JSON.parse(String(options.body));
		expect(payload.type).toBe('text');
		sent.push(payload.text.body);
		return Response.json({ messages: [{ id: `wamid.synthetic.reply.${sent.length}` }] });
	});
	vi.stubGlobal('fetch', graph);
	let sequence = 0;
	async function inbound(text: string, signed = true) {
		const raw = JSON.stringify({
			object: 'whatsapp_business_account',
			entry: [
				{
					id: mocks.env.WHATSAPP_WABA_ID,
					changes: [
						{
							field: 'messages',
							value: {
								messaging_product: 'whatsapp',
								metadata: { phone_number_id: mocks.env.WHATSAPP_PHONE_NUMBER_ID },
								messages: [
									{
										id: `wamid.synthetic.paid.${++sequence}`,
										from: '15550000001',
										timestamp: String(Math.floor(Date.now() / 1000) + sequence),
										type: 'text',
										text: { body: text }
									}
								]
							}
						}
					]
				}
			]
		});
		const headers: Record<string, string> = { 'content-type': 'application/json' };
		if (signed)
			headers['x-hub-signature-256'] =
				`sha256=${createHmac('sha256', mocks.env.WHATSAPP_APP_SECRET).update(raw).digest('hex')}`;
		return POST({
			request: new Request('https://synthetic.example/api/webhooks/whatsapp', {
				method: 'POST',
				headers,
				body: raw
			})
		} as Parameters<typeof POST>[0]);
	}
	async function reply(text: string) {
		const previous = sent.length;
		expect((await inbound(text)).status).toBe(200);
		expect(sent).toHaveLength(previous + 1);
		return sent.at(-1)!;
	}

	// Neither catalogue nor storage nor outbound transport is reached without a signature.
	expect((await inbound('oi', false)).status).toBe(401);
	expect(mocks.createClient).not.toHaveBeenCalled();
	expect(rpc).not.toHaveBeenCalled();
	expect(graph).not.toHaveBeenCalled();

	expect(await reply('oi')).toContain('produtos digitais pagos');
	expect(await reply('1')).toContain('Qual assunto');
	expect(await reply('previsões')).toContain('ATV+');
	const paidReply = await reply('1');
	expect(paidReply).toContain('https://atuavidanosastros.com.br/atv-mais');
	expect(paidReply.replaceAll('\u00a0', ' ')).toContain('R$ 123,45');

	// A formerly selected offer cannot survive a fresh authoritative zero-price snapshot.
	offer.total_minor = 0;
	const staleChoice = await reply('abrir ficha');
	expect(staleChoice).toContain('não está disponível para compra');
	expect(staleChoice).not.toContain('https://');
	expect(await reply('menu')).toContain('produtos digitais pagos');
	await reply('1');
	expect(await reply('previsões')).toContain('Não há um produto digital pago disponível');
	expect(await reply('Quero receber previsões regularmente')).not.toContain('https://');
	const ascendantReply = await reply('Qual é meu ascendente?');
	expect(ascendantReply).toContain('não está disponível para compra');
	expect(ascendantReply).not.toContain('https://');

	for (const body of sent) {
		expect(body).not.toMatch(/\/ferramentas\/|calculadora|gratuit|grátis|free-/i);
		expect(body.replaceAll('\u00a0', ' ')).not.toContain('R$ 0,00');
	}
	expect(abortSignal).toHaveBeenCalledTimes(sent.length);
	const completions = rpc.mock.calls.filter(([name]) => name === 'complete_whatsapp_consultation');
	expect(completions).toHaveLength(sent.length);
	for (const [, args = {}] of completions) {
		expect(args.p_outcome).toBe('SENT');
		expect([null, 'atv-plus']).toContain(args.p_product_id);
		expect(JSON.stringify(args.p_state)).not.toMatch(/free-|ascendente|ferramenta/);
	}
});
