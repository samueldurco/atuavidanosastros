import {
	atvPlusCommercialOfferFor,
	atvPlusCommercialPlanFor,
	type AtvPlusPlanId
} from '@atv/domain';
import { validTrialId } from './private-trials';
import { env } from '$env/dynamic/private';

export function commercialCheckoutEnabled(platform?: App.Platform) {
	const bindings = platform?.env as unknown as Record<string, unknown> | undefined;
	const runtime = env as Record<string, string | undefined>;
	return (
		(bindings?.FEATURE_HOTMART_LIVE ?? runtime.FEATURE_HOTMART_LIVE) === 'true' &&
		(bindings?.FEATURE_ATV_PLUS_COMMERCIAL ?? runtime.FEATURE_ATV_PLUS_COMMERCIAL) === 'true'
	);
}

export interface CommercialMembership {
	id: string;
	profile_id: string | null;
	plan_id: AtvPlusPlanId;
	term_months: number;
	status: string;
	starts_at: string;
	ends_at: string;
	onboarded_at: string | null;
}
export interface CommercialDelivery {
	id: string;
	membership_id: string;
	kind: string;
	due_at: string;
	period_start: string;
	period_end: string;
	state: string;
	gate_code: string | null;
	delivered_at: string | null;
}
export interface CommercialOffer {
	id: string;
	commercial_enabled: boolean;
	total_minor: number | null;
}
export interface CommercialPageState {
	authenticated: boolean;
	unavailable: boolean;
	memberships: CommercialMembership[];
	deliveries: CommercialDelivery[];
	contact: { whatsapp_masked: string; consented: boolean; verified: boolean } | null;
	offers: CommercialOffer[];
	profileId: string | null;
}

const emptyState = (): CommercialPageState => ({
	authenticated: false,
	unavailable: false,
	memberships: [],
	deliveries: [],
	contact: null,
	offers: [],
	profileId: null
});

function safeOffers(rows: unknown): CommercialOffer[] {
	if (!Array.isArray(rows)) return [];
	return rows.flatMap((row) => {
		if (!row || typeof row !== 'object' || !atvPlusCommercialOfferFor(row.id)) return [];
		if (row.checkout_url !== undefined && row.checkout_url !== null) {
			try {
				if (!safeCheckoutUrl(new URL(row.checkout_url))) return [];
			} catch {
				return [];
			}
		}
		if (
			row.commercial_enabled !== true ||
			!Number.isSafeInteger(row.total_minor) ||
			row.total_minor <= 0
		)
			return [];
		return [
			{
				id: row.id,
				commercial_enabled: true,
				total_minor: row.total_minor
			}
		];
	});
}

function safeCheckoutUrl(url: URL) {
	return (
		url.protocol === 'https:' &&
		url.hostname === 'pay.hotmart.com' &&
		!url.username &&
		!url.password &&
		(!url.port || url.port === '443')
	);
}

const record = (value: unknown): Record<string, unknown> =>
	value && typeof value === 'object' && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
const timestamp = (value: unknown): value is string =>
	typeof value === 'string' && Number.isFinite(Date.parse(value));

function privateState(payload: unknown) {
	const source = record(payload);
	if (!Array.isArray(source.memberships) || !Array.isArray(source.deliveries))
		throw new Error('Invalid membership state');
	const memberships = source.memberships.map((value): CommercialMembership => {
		const row = record(value);
		if (
			!validTrialId(row.id) ||
			(row.profile_id !== null && !validTrialId(row.profile_id)) ||
			typeof row.plan_id !== 'string' ||
			!atvPlusCommercialPlanFor(row.plan_id) ||
			![3, 6, 12].includes(Number(row.term_months)) ||
			!['PENDING', 'ACTIVE', 'CANCELLED', 'SUSPENDED', 'EXPIRED'].includes(String(row.status)) ||
			!timestamp(row.starts_at) ||
			!timestamp(row.ends_at) ||
			(row.onboarded_at !== null && !timestamp(row.onboarded_at))
		) {
			throw new Error('Invalid membership');
		}
		return {
			id: String(row.id),
			profile_id: row.profile_id as string | null,
			plan_id: row.plan_id as AtvPlusPlanId,
			term_months: Number(row.term_months),
			status: String(row.status),
			starts_at: row.starts_at,
			ends_at: row.ends_at,
			onboarded_at: row.onboarded_at as string | null
		};
	});
	const deliveries = source.deliveries.map((value): CommercialDelivery => {
		const row = record(value);
		if (
			!validTrialId(row.id) ||
			!memberships.some((membership) => membership.id === row.membership_id) ||
			typeof row.kind !== 'string' ||
			typeof row.state !== 'string' ||
			!timestamp(row.due_at) ||
			!timestamp(row.period_start) ||
			!timestamp(row.period_end) ||
			(row.delivered_at !== null && !timestamp(row.delivered_at))
		)
			throw new Error('Invalid delivery');
		return {
			id: String(row.id),
			membership_id: String(row.membership_id),
			kind: row.kind,
			due_at: row.due_at,
			period_start: row.period_start,
			period_end: row.period_end,
			state: row.state,
			gate_code: typeof row.gate_code === 'string' ? row.gate_code : null,
			delivered_at: row.delivered_at as string | null
		};
	});
	const contact = record(source.contact);
	return {
		memberships,
		deliveries,
		contact:
			typeof contact.whatsapp_masked === 'string'
				? {
						whatsapp_masked: contact.whatsapp_masked,
						consented: contact.consented === true,
						verified: contact.verified === true
					}
				: null
	};
}

export async function commercialPageState(
	locals: App.Locals,
	checkoutEnabled = false
): Promise<CommercialPageState> {
	const state = emptyState();
	const db = locals.supabase;
	if (!db) return { ...state, unavailable: true };
	try {
		const publicOffers = await db
			.rpc('atv_plus_public_offers')
			.abortSignal(AbortSignal.timeout(10000));
		state.offers = !checkoutEnabled || publicOffers.error ? [] : safeOffers(publicOffers.data);
		const claims = await db.auth.getClaims();
		if (claims.error)
			return claims.error.name === 'AuthSessionMissingError'
				? state
				: { ...state, unavailable: true };
		if (!claims.data?.claims?.sub) return state;
		state.authenticated = true;
		const [membership, profile] = await Promise.all([
			db.rpc('atv_plus_membership_state').abortSignal(AbortSignal.timeout(10000)),
			db
				.from('natal_profiles')
				.select('id')
				.eq('user_id', claims.data.claims.sub)
				.eq('is_current', true)
				.abortSignal(AbortSignal.timeout(10000))
				.maybeSingle()
		]);
		if (
			membership.error ||
			profile.error ||
			!membership.data ||
			!Array.isArray(membership.data.memberships)
		) {
			state.unavailable = true;
			return state;
		}
		Object.assign(state, privateState(membership.data));
		state.offers = checkoutEnabled ? safeOffers(membership.data.offers) : [];
		state.profileId = profile.data?.id ?? null;
		return state;
	} catch {
		state.unavailable = true;
		return state;
	}
}

export async function completeCommercialOnboarding(locals: App.Locals, fields: FormData) {
	const db = locals.supabase;
	if (!db)
		return {
			status: 503 as const,
			message: 'O cadastro está indisponível. Tente novamente em alguns instantes.'
		};
	const claims = await db.auth.getClaims().catch(() => null);
	if (claims?.error || !claims?.data?.claims?.sub)
		return { status: 401 as const, message: 'Entre na sua conta para completar o cadastro.' };
	const membershipId = String(fields.get('membershipId') ?? '');
	const profileId = String(fields.get('profileId') ?? '');
	const whatsapp = String(fields.get('whatsapp') ?? '').replace(/[\s()-]/g, '');
	let location: unknown;
	try {
		location = JSON.parse(String(fields.get('solarLocation') ?? ''));
	} catch {
		/* invalid form */
	}
	if (
		!validTrialId(membershipId) ||
		!validTrialId(profileId) ||
		!/^\+[1-9]\d{7,14}$/.test(whatsapp) ||
		fields.get('whatsappConsent') !== 'yes' ||
		!location ||
		typeof location !== 'object' ||
		Array.isArray(location)
	) {
		return {
			status: 400 as const,
			message:
				'Confira o perfil natal, o WhatsApp com código do país, o consentimento e a cidade da próxima Revolução Solar.'
		};
	}
	const result = await Promise.resolve(
		db
			.rpc('atv_plus_complete_onboarding', {
				p_membership_id: membershipId,
				p_profile_id: profileId,
				p_whatsapp: whatsapp,
				p_whatsapp_consent: true,
				p_solar_return_location: location
			})
			.abortSignal(AbortSignal.timeout(10000))
	).catch(() => null);
	if (!result || result.error) {
		const code = result?.error?.code;
		return {
			status:
				code === '42501'
					? (403 as const)
					: code === '22023'
						? (400 as const)
						: code === 'P0001'
							? (409 as const)
							: (503 as const),
			message:
				'Não foi possível concluir o cadastro. Confira se sua assinatura está ativa e se o perfil natal está completo e autorizado.'
		};
	}
	return {
		status: 200 as const,
		message: 'Dados salvos. Confira a confirmação do WhatsApp e o calendário de entregas abaixo.'
	};
}

export async function startCommercialCheckout(
	locals: App.Locals,
	offerId: string,
	enabled: boolean
) {
	if (!enabled)
		return { status: 409 as const, message: 'A contratação deste plano ainda está em preparação.' };
	if (!atvPlusCommercialOfferFor(offerId))
		return { status: 400 as const, message: 'Escolha um plano e uma duração válidos.' };
	const db = locals.supabase;
	const claims = await db?.auth.getClaims().catch(() => null);
	if (!db || claims?.error || !claims?.data?.claims?.sub)
		return { status: 401 as const, message: 'Entre na sua conta antes de contratar o plano.' };
	const result = await Promise.resolve(
		db
			.rpc('atv_plus_start_checkout', { p_offer_id: offerId })
			.abortSignal(AbortSignal.timeout(10000))
	).catch(() => null);
	let checkout: URL | undefined;
	try {
		checkout = new URL(result?.data?.checkout_url);
	} catch {
		/* invalid provider URL */
	}
	if (
		!result ||
		result.error ||
		!checkout ||
		!safeCheckoutUrl(checkout) ||
		checkout.searchParams.getAll('sck').length !== 1 ||
		!validTrialId(checkout.searchParams.get('sck')) ||
		checkout.searchParams.get('sck') !== result.data.intent_id
	) {
		return {
			status: 503 as const,
			message: 'Não foi possível abrir a contratação. Tente novamente em alguns instantes.'
		};
	}
	return { status: 200 as const, checkoutUrl: checkout.href };
}
