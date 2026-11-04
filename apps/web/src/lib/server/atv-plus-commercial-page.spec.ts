import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthSessionMissingError } from '@supabase/supabase-js';
import {
	commercialCheckoutEnabled,
	commercialPageState,
	completeCommercialOnboarding,
	startCommercialCheckout
} from './atv-plus-commercial-page';
import { actions } from '../../routes/atv-mais/+page.server';

vi.mock('$env/dynamic/private', () => ({ env: {} }));

const owner = '00000000-0000-4000-8000-000000000001';
const membershipId = '00000000-0000-4000-8000-000000000002';
const profileId = '00000000-0000-4000-8000-000000000003';
const intentId = '00000000-0000-4000-8000-000000000004';
const deliveryId = '00000000-0000-4000-8000-000000000005';
const offerId = 'atv-plus-essencial-3m';
const checkoutUrl = `https://pay.hotmart.com/P01TEST?off=test&sck=${intentId}`;
const offer = {
	id: offerId,
	commercial_enabled: true,
	total_minor: 10000
};
const membership = {
	id: membershipId,
	profile_id: profileId,
	plan_id: 'essencial',
	term_months: 3,
	status: 'ACTIVE',
	starts_at: '2026-11-04T12:00:00Z',
	ends_at: '2027-02-04T12:00:00Z',
	onboarded_at: null
};
const delivery = {
	id: deliveryId,
	membership_id: membershipId,
	kind: 'solar-return',
	due_at: '2026-11-04T12:00:00Z',
	period_start: '2027-04-01T12:00:00Z',
	period_end: '2028-04-01T12:00:00Z',
	state: 'WAITING_INPUT',
	gate_code: null,
	delivered_at: null
};
const contact = { whatsapp_masked: '•••• 0000', consented: true, verified: false };
const location = {
	label: 'São Paulo, Brasil',
	countryCode: 'BR',
	timezone: 'America/Sao_Paulo',
	latitude: -23.55,
	longitude: -46.63
};

const getClaims = vi.fn();
const rpc = vi.fn();
const from = vi.fn();
const profileQuery: Record<string, ReturnType<typeof vi.fn>> = {};
let publicResult: { data: unknown; error: unknown };
let membershipResult: { data: unknown; error: unknown };
let profileResult: { data: unknown; error: unknown };
let writeResult: { data: unknown; error: unknown };
const locals = () => ({ supabase: { auth: { getClaims }, rpc, from } }) as never;
const fields = () => {
	const form = new FormData();
	form.set('membershipId', membershipId);
	form.set('profileId', profileId);
	form.set('whatsapp', '+55 (11) 90000-0000');
	form.set('whatsappConsent', 'yes');
	form.set('solarLocation', JSON.stringify(location));
	return form;
};

beforeEach(() => {
	vi.clearAllMocks();
	getClaims.mockResolvedValue({ data: { claims: { sub: owner } }, error: null });
	publicResult = { data: [offer], error: null };
	membershipResult = {
		data: { memberships: [membership], deliveries: [delivery], contact, offers: [offer] },
		error: null
	};
	profileResult = { data: { id: profileId }, error: null };
	writeResult = { data: { intent_id: intentId, checkout_url: checkoutUrl }, error: null };
	for (const method of ['select', 'eq', 'abortSignal'])
		profileQuery[method] = vi.fn(() => profileQuery);
	profileQuery.maybeSingle = vi.fn(async () => profileResult);
	from.mockReturnValue(profileQuery);
	rpc.mockImplementation((name: string) => ({
		abortSignal: vi.fn(async () =>
			name === 'atv_plus_public_offers'
				? publicResult
				: name === 'atv_plus_membership_state'
					? membershipResult
					: writeResult
		)
	}));
});

describe('ATV+ commercial account state', () => {
	it('requires both provider and ATV+ commercial runtime flags to be exactly true', () => {
		expect(commercialCheckoutEnabled()).toBe(false);
		expect(commercialCheckoutEnabled({ env: { FEATURE_HOTMART_LIVE: 'true' } } as never)).toBe(
			false
		);
		expect(
			commercialCheckoutEnabled({ env: { FEATURE_ATV_PLUS_COMMERCIAL: 'true' } } as never)
		).toBe(false);
		expect(
			commercialCheckoutEnabled({
				env: { FEATURE_HOTMART_LIVE: true, FEATURE_ATV_PLUS_COMMERCIAL: 'true' }
			} as never)
		).toBe(false);
		expect(
			commercialCheckoutEnabled({
				env: { FEATURE_HOTMART_LIVE: 'true', FEATURE_ATV_PLUS_COMMERCIAL: 'true' }
			} as never)
		).toBe(true);
	});
	it('distinguishes missing infrastructure from an empty subscription', async () => {
		const state = await commercialPageState({} as never);
		expect(state).toMatchObject({
			authenticated: false,
			unavailable: true,
			memberships: [],
			offers: []
		});
		expect(rpc).not.toHaveBeenCalled();
	});
	it('does not read private state for a visitor and never exposes checkout while disabled', async () => {
		getClaims.mockResolvedValue({ data: { claims: null }, error: null });
		const state = await commercialPageState(locals());
		expect(state).toMatchObject({
			authenticated: false,
			unavailable: false,
			memberships: [],
			deliveries: [],
			contact: null,
			offers: []
		});
		expect(rpc.mock.calls.map(([name]) => name)).not.toContain('atv_plus_membership_state');
		expect(from).not.toHaveBeenCalled();
	});
	it('retains account visibility while hiding every offer with checkout disabled', async () => {
		const state = await commercialPageState(locals(), false);
		expect(state).toMatchObject({
			authenticated: true,
			unavailable: false,
			memberships: [membership],
			offers: []
		});
	});
	it('treats a missing auth session as an anonymous visitor without an infrastructure warning', async () => {
		getClaims.mockResolvedValue({ data: { claims: null }, error: new AuthSessionMissingError() });
		const state = await commercialPageState(locals(), true);
		expect(state).toMatchObject({
			authenticated: false,
			unavailable: false,
			memberships: [],
			deliveries: [],
			contact: null,
			offers: [offer]
		});
		expect(from).not.toHaveBeenCalled();
		expect(rpc.mock.calls.map(([name]) => name)).not.toContain('atv_plus_membership_state');
	});
	it('does not trust claims returned alongside an authentication error', async () => {
		getClaims.mockResolvedValue({
			data: { claims: { sub: owner } },
			error: { message: 'invalid JWT' }
		});
		const state = await commercialPageState(locals(), true);
		expect(state.authenticated).toBe(false);
		expect(state.unavailable).toBe(true);
		expect(from).not.toHaveBeenCalled();
		expect(rpc.mock.calls.map(([name]) => name)).not.toContain('atv_plus_membership_state');
	});
	it('limits the natal profile query to the authenticated account and current revision', async () => {
		const state = await commercialPageState(locals(), true);
		expect(from).toHaveBeenCalledWith('natal_profiles');
		expect(profileQuery.select).toHaveBeenCalledWith('id');
		expect(profileQuery.eq).toHaveBeenCalledWith('user_id', owner);
		expect(profileQuery.eq).toHaveBeenCalledWith('is_current', true);
		expect(state.profileId).toBe(profileId);
	});
	it('projects private RPC records to the fields needed by the page', async () => {
		membershipResult.data = {
			memberships: [
				{ ...membership, owner_id: owner, provider_payload: { buyer: 'private-buyer' } }
			],
			deliveries: [{ ...delivery, bodyBase64: 'private-body', recipient: '+5511900000000' }],
			contact: {
				...contact,
				whatsapp: '+5511900000000',
				verification_reference: 'private-reference'
			},
			offers: [
				{
					...offer,
					checkout_url: 'https://pay.hotmart.com/P01TEST?off=test',
					provider_secret: 'private-secret'
				}
			]
		};
		const state = await commercialPageState(locals(), true);
		expect(state.memberships).toEqual([membership]);
		expect(state.deliveries).toEqual([delivery]);
		expect(state.contact).toEqual(contact);
		expect(state.offers).toEqual([offer]);
		expect(JSON.stringify(state)).not.toContain('private-');
		expect(state.offers[0]).not.toHaveProperty('checkout_url');
	});
	it('lists approved terms without returning an unbound provider checkout URL', async () => {
		getClaims.mockResolvedValue({ data: { claims: null }, error: null });
		publicResult.data = [{ ...offer, checkout_url: 'https://pay.hotmart.com/P01TEST?off=test' }];
		const state = await commercialPageState(locals(), true);
		expect(state.offers).toEqual([offer]);
		expect(JSON.stringify(state)).not.toContain('pay.hotmart.com');
	});
	it.each(['membership', 'profile'])(
		'marks %s lookup failures as unavailable without exposing provider diagnostics',
		async (kind) => {
			if (kind === 'membership')
				membershipResult = { data: null, error: { message: 'private-provider-diagnostic' } };
			else profileResult = { data: null, error: { message: 'private-provider-diagnostic' } };
			const state = await commercialPageState(locals());
			expect(state).toMatchObject({
				authenticated: true,
				unavailable: true,
				memberships: [],
				deliveries: [],
				contact: null
			});
			expect(JSON.stringify(state)).not.toContain('private-provider-diagnostic');
		}
	);
	it('rejects unapproved, malformed or credential-bearing public offers', async () => {
		getClaims.mockResolvedValue({ data: { claims: null }, error: null });
		publicResult.data = [
			offer,
			{ ...offer, id: 'invented-offer' },
			{ ...offer, commercial_enabled: false },
			{ ...offer, total_minor: 0 },
			{ ...offer, total_minor: 10.5 },
			{ ...offer, checkout_url: 'http://pay.hotmart.com/P01TEST' },
			{ ...offer, checkout_url: 'https://pay.hotmart.com.attacker.test/P01TEST' },
			{ ...offer, checkout_url: 'https://user:password@pay.hotmart.com/P01TEST' },
			{ ...offer, checkout_url: 'https://pay.hotmart.com:444/P01TEST' }
		];
		expect((await commercialPageState(locals(), true)).offers).toEqual([offer]);
	});
});

describe('ATV+ commercial checkout binding', () => {
	it('refuses disabled checkout before authentication or creating an intent', async () => {
		expect(await startCommercialCheckout(locals(), offerId, false)).toMatchObject({ status: 409 });
		expect(getClaims).not.toHaveBeenCalled();
		expect(rpc).not.toHaveBeenCalled();
	});
	it('refuses unknown plan/term pairs before creating an intent', async () => {
		expect(await startCommercialCheckout(locals(), 'atv-plus-premium-1m', true)).toMatchObject({
			status: 400
		});
		expect(rpc).not.toHaveBeenCalled();
	});
	it('requires authentication before creating an intent', async () => {
		getClaims.mockResolvedValue({ data: { claims: null }, error: null });
		expect(await startCommercialCheckout(locals(), offerId, true)).toMatchObject({ status: 401 });
		expect(rpc).not.toHaveBeenCalled();
	});
	it('refuses authenticated claims carrying an error before creating an intent', async () => {
		getClaims.mockResolvedValue({
			data: { claims: { sub: owner } },
			error: { message: 'invalid JWT' }
		});
		expect(await startCommercialCheckout(locals(), offerId, true)).toMatchObject({ status: 401 });
		expect(rpc).not.toHaveBeenCalled();
	});
	it('uses the account-bound intent returned by the database', async () => {
		expect(await startCommercialCheckout(locals(), offerId, true)).toEqual({
			status: 200,
			checkoutUrl
		});
		expect(rpc).toHaveBeenCalledExactlyOnceWith('atv_plus_start_checkout', { p_offer_id: offerId });
	});
	it.each([
		'https://attacker.test/checkout',
		`http://pay.hotmart.com/P01TEST?sck=${intentId}`,
		`https://pay.hotmart.com.attacker.test/P01TEST?sck=${intentId}`,
		`https://user:password@pay.hotmart.com/P01TEST?sck=${intentId}`,
		`https://pay.hotmart.com:444/P01TEST?sck=${intentId}`,
		'https://pay.hotmart.com/P01TEST',
		'https://pay.hotmart.com/P01TEST?sck=not-a-valid-intent',
		`https://pay.hotmart.com/P01TEST?sck=${membershipId}`,
		`https://pay.hotmart.com/P01TEST?sck=${intentId}&sck=${membershipId}`
	])('refuses an unsafe or unbound provider redirect: %s', async (url) => {
		writeResult.data = { intent_id: intentId, checkout_url: url };
		const result = await startCommercialCheckout(locals(), offerId, true);
		expect(result).toMatchObject({ status: 503 });
		expect(result).not.toHaveProperty('checkoutUrl');
	});
	it('does not reveal RPC errors in a failed checkout', async () => {
		writeResult = { data: null, error: { message: 'private-provider-token', code: 'P0001' } };
		const result = await startCommercialCheckout(locals(), offerId, true);
		expect(result).toMatchObject({ status: 503 });
		expect(JSON.stringify(result)).not.toContain('private-provider-token');
	});
});

describe('ATV+ commercial onboarding', () => {
	it('sends the selected IDs and normalized consented number to the account-scoped RPC', async () => {
		writeResult.data = { secret: 'must-not-return' };
		const result = await completeCommercialOnboarding(locals(), fields());
		expect(rpc).toHaveBeenCalledExactlyOnceWith('atv_plus_complete_onboarding', {
			p_membership_id: membershipId,
			p_profile_id: profileId,
			p_whatsapp: '+5511900000000',
			p_whatsapp_consent: true,
			p_solar_return_location: location
		});
		expect(result).toMatchObject({ status: 200 });
		expect(JSON.stringify(result)).not.toContain('must-not-return');
		expect(JSON.stringify(result)).not.toContain('+5511900000000');
	});
	it.each([
		['membershipId', 'invalid'],
		['profileId', 'invalid'],
		['whatsapp', '11900000000'],
		['whatsappConsent', 'no'],
		['solarLocation', 'null'],
		['solarLocation', '[]']
	])('rejects invalid %s before RPC', async (key, value) => {
		const form = fields();
		form.set(key, value);
		expect(await completeCommercialOnboarding(locals(), form)).toMatchObject({ status: 400 });
		expect(rpc).not.toHaveBeenCalled();
	});
	it.each([
		['42501', 403],
		['22023', 400],
		['P0001', 409],
		['08006', 503]
	])(
		'maps SQL %s to a safe status without leaking foreign-profile details',
		async (code, status) => {
			writeResult = { data: null, error: { code, message: 'private-foreign-profile-diagnostic' } };
			const result = await completeCommercialOnboarding(locals(), fields());
			expect(result).toMatchObject({ status });
			expect(JSON.stringify(result)).not.toContain('private-foreign-profile-diagnostic');
		}
	);
	it('requires an authenticated account and available infrastructure', async () => {
		expect(await completeCommercialOnboarding({} as never, fields())).toMatchObject({
			status: 503
		});
		getClaims.mockResolvedValue({ data: { claims: null }, error: null });
		expect(await completeCommercialOnboarding(locals(), fields())).toMatchObject({ status: 401 });
		expect(rpc).not.toHaveBeenCalled();
	});
	it('refuses authenticated claims carrying an error before saving contact data', async () => {
		getClaims.mockResolvedValue({
			data: { claims: { sub: owner } },
			error: { message: 'invalid JWT' }
		});
		expect(await completeCommercialOnboarding(locals(), fields())).toMatchObject({ status: 401 });
		expect(rpc).not.toHaveBeenCalled();
	});
});

describe('ATV+ commercial actions', () => {
	it.each(['checkout', 'onboard'] as const)(
		'rejects cross-origin %s before reading the body or account',
		async (action) => {
			const formData = vi.fn();
			const event = {
				url: new URL('https://example.test/atv-mais'),
				locals: locals(),
				request: { headers: new Headers({ origin: 'https://attacker.test' }), formData }
			};
			await expect(actions[action]!(event as never)).rejects.toMatchObject({ status: 403 });
			expect(formData).not.toHaveBeenCalled();
			expect(getClaims).not.toHaveBeenCalled();
			expect(rpc).not.toHaveBeenCalled();
		}
	);
	it('redirects a same-origin checkout only to the validated bound intent', async () => {
		const form = new FormData();
		form.set('offerId', offerId);
		const event = {
			url: new URL('https://example.test/atv-mais'),
			locals: locals(),
			platform: { env: { FEATURE_HOTMART_LIVE: 'true', FEATURE_ATV_PLUS_COMMERCIAL: 'true' } },
			request: new Request('https://example.test/atv-mais?/checkout', {
				method: 'POST',
				headers: { origin: 'https://example.test' },
				body: form
			})
		};
		await expect(actions.checkout!(event as never)).rejects.toMatchObject({
			status: 303,
			location: checkoutUrl
		});
	});
});
