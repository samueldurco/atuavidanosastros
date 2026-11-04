import {
	atvPlusCommercialOfferFor,
	atvPlusCommercialOffers,
	atvPlusCommercialPlanFor
} from '@atv/domain';
import {
	createConsultationCatalogue,
	type ConsultationCatalogue,
	type ConsultationOffer
} from './whatsapp-consultation';

interface CatalogueRpcClient {
	rpc(name: 'atv_plus_public_offers'): {
		abortSignal(signal: AbortSignal): PromiseLike<{ data: unknown; error: unknown }>;
	};
}

interface PublicOffer {
	id: string;
	totalMinor: number;
}

function publicOffers(value: unknown): PublicOffer[] | null {
	if (!Array.isArray(value) || value.length > atvPlusCommercialOffers.length) return null;
	const offers: PublicOffer[] = [];
	for (const row of value) {
		if (!row || typeof row !== 'object' || Array.isArray(row)) return null;
		const definition = typeof row.id === 'string' ? atvPlusCommercialOfferFor(row.id) : undefined;
		if (
			!definition ||
			row.plan_id !== definition.planId ||
			row.term_months !== definition.termMonths ||
			row.commercial_enabled !== true ||
			row.currency !== 'BRL' ||
			!Number.isSafeInteger(row.total_minor) ||
			row.total_minor <= 0 ||
			// The authoritative RPC reads a PostgreSQL integer, not an arbitrary JS number.
			row.total_minor > 2_147_483_647 ||
			offers.some((offer) => offer.id === row.id)
		)
			return null;
		offers.push({ id: definition.id, totalMinor: row.total_minor });
	}
	return offers;
}

function atvPlusOffer(offers: readonly PublicOffer[]): ConsultationOffer | null {
	if (!offers.length) return null;
	const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
	// One product contains every authorized variant in canonical order; no arbitrary cheapest/default offer.
	const prices = atvPlusCommercialOffers.flatMap((definition) => {
		const offer = offers.find((item) => item.id === definition.id);
		if (!offer) return [];
		const plan = atvPlusCommercialPlanFor(definition.planId)!;
		return `${plan.name.replace(/^ATV\+ /, '')} · ${definition.termMonths} meses: ${money.format(offer.totalMinor / 100)}`;
	});
	return {
		productId: 'atv-plus',
		href: '/atv-mais',
		available: true,
		checkoutAvailable: true,
		priceText: `Pagamento único por período:\n${prices.join('\n')}`,
		timingText:
			'A próxima Revolução Solar é preparada após a contratação e o cadastro; as previsões futuras seguem a programação do plano.',
		deliveryText: 'Leituras digitais em PDF pelo WhatsApp, conforme o plano contratado.'
	};
}

/** Public commercial projection only: no account lookup, checkout intent, provider call or private data. */
export async function loadConsultationCatalogue({
	client,
	checkoutEnabled,
	verifiedFreeToolIds = []
}: {
	client: CatalogueRpcClient;
	checkoutEnabled: boolean;
	verifiedFreeToolIds?: readonly string[];
}): Promise<ConsultationCatalogue> {
	const freeCatalogue = () => createConsultationCatalogue({ verifiedFreeToolIds });
	if (!checkoutEnabled) return freeCatalogue();
	try {
		const result = await client
			.rpc('atv_plus_public_offers')
			.abortSignal(AbortSignal.timeout(10_000));
		if (result.error) return freeCatalogue();
		const offers = publicOffers(result.data);
		const offer = offers && atvPlusOffer(offers);
		if (!offer) return freeCatalogue();
		// Individual readings remain closed until P02 supplies a verified commercial contract.
		return createConsultationCatalogue({ verifiedFreeToolIds, offers: [offer] });
	} catch {
		return freeCatalogue();
	}
}
