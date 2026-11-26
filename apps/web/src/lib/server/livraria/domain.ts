import { resolveMemberPrice, simulateMemberPrice } from '@atv/domain';
import { catalog, editionFor } from './catalog';

export class PreviewError extends Error {
	constructor(
		public status: 400 | 404 | 409 | 410 | 429 | 503,
		message: string
	) {
		super(message);
	}
}
export type Tier = 'none' | 'essencial' | 'ampliado' | 'premium';
export type QuoteInput = {
	kind: 'book' | 'club';
	bookId?: string;
	quantity: 1;
	cycle?: 'quarterly' | 'annual';
	cep: string;
	tier: Tier;
	condition: 'none' | 'promotion15' | 'coupon12';
};
export type Quote = ReturnType<typeof calculateQuote> & { id: string; expiresAt: string };
export type Order = {
	id: string;
	kind: 'book' | 'club';
	itemId: string;
	itemTitle: string;
	quote: Quote;
	paymentMethod: 'pix' | 'card';
	status: 'pending' | 'paid' | 'failed';
	renewalAuthorized: boolean;
	renewalEnabled: boolean;
	startsAt: string;
	endsAt: string;
	createdAt: string;
	cycleMonths: number;
};
export type Shipment = {
	id: string;
	orderId: string;
	competence: string;
	editionId: string;
	editionTitle: string;
	status: 'scheduled' | 'address_invalid' | 'edition_missing' | 'ready' | 'shipped' | 'delivered';
	attempts: number;
	tracking: string | null;
	replacementCount: number;
	replacementTracking: string | null;
	cutoffAt: string;
};

export function record(value: unknown): Record<string, unknown> {
	if (!value || typeof value !== 'object' || Array.isArray(value))
		throw new PreviewError(400, 'Envie um objeto JSON válido.');
	return value as Record<string, unknown>;
}
export function key(value: unknown, label = 'Identificador') {
	if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{8,100}$/.test(value))
		throw new PreviewError(400, `${label} inválido.`);
	return value;
}
export function parseQuoteInput(raw: unknown): QuoteInput {
	const value = record(raw);
	if (value.kind !== 'book' && value.kind !== 'club')
		throw new PreviewError(400, 'Escolha um livro ou o clube.');
	if (value.quantity !== undefined && value.quantity !== 1)
		throw new PreviewError(400, 'A prévia aceita uma unidade por pedido.');
	const cep = typeof value.cep === 'string' ? value.cep.replace(/\D/g, '') : '';
	if (!/^\d{8}$/.test(cep) || /^0{8}$/.test(cep))
		throw new PreviewError(400, 'Informe um CEP com oito dígitos.');
	if (cep === '99999999') throw new PreviewError(400, 'CEP sem cobertura na tabela simulada.');
	const tier = value.tier ?? 'none';
	if (!['none', 'essencial', 'ampliado', 'premium'].includes(String(tier)))
		throw new PreviewError(400, 'Nível ATV+ inválido.');
	const condition = value.condition ?? 'none';
	if (!['none', 'promotion15', 'coupon12'].includes(String(condition)))
		throw new PreviewError(400, 'Condição de teste inválida.');
	if (value.kind === 'book' && !catalog.some((book) => book.id === value.bookId))
		throw new PreviewError(404, 'Livro não encontrado.');
	if (value.kind === 'club' && value.cycle !== 'quarterly' && value.cycle !== 'annual')
		throw new PreviewError(400, 'Escolha o ciclo trimestral ou anual.');
	return {
		kind: value.kind,
		bookId: value.kind === 'book' ? String(value.bookId) : undefined,
		quantity: 1,
		cycle: value.kind === 'club' ? (value.cycle as QuoteInput['cycle']) : undefined,
		cep,
		tier: tier as Tier,
		condition: condition as QuoteInput['condition']
	};
}

export function calculateQuote(input: QuoteInput, now = Date.now()) {
	const book = input.kind === 'book' ? catalog.find((item) => item.id === input.bookId)! : null;
	const cycleMonths = input.kind === 'club' ? (input.cycle === 'annual' ? 12 : 3) : 0;
	// Fixtures for exercising the journey only. No provider prices/costs were approved.
	const regularUnitCents = book ? 7900 : cycleMonths === 12 ? 5000 : 6000;
	const item = {
		id: book?.id ?? `club-${input.cycle}`,
		kind: book ? ('physical-single' as const) : ('subscription' as const),
		regularPriceCents: regularUnitCents
	};
	const conditions =
		input.condition === 'none'
			? []
			: [
					{
						id: `fixture-${input.condition}`,
						itemId: item.id,
						kind: input.condition === 'coupon12' ? ('coupon' as const) : ('promotion' as const),
						priceCents: Math.round(
							regularUnitCents * (input.condition === 'coupon12' ? 0.88 : 0.85)
						),
						startsAt: '2020-01-01T00:00:00.000Z',
						endsAt: '2100-01-01T00:00:00.000Z',
						eligible: true
					}
				];
	const membership =
		input.tier === 'none'
			? null
			: {
					id: 'synthetic-scenario',
					planId: input.tier,
					status: 'active' as const,
					startsAt: '2020-01-01T00:00:00.000Z',
					endsAt: '2100-01-01T00:00:00.000Z'
				};
	const resolved = resolveMemberPrice({ item, conditions, membership, now });
	const simulated = input.tier === 'none' ? null : simulateMemberPrice(item, input.tier);
	// Reuse P01's simulation without fabricating the cost approval required by its live resolver.
	const memberWins = book && simulated && simulated.priceCents < resolved.priceCents;
	const unitCents = memberWins ? simulated.priceCents : resolved.priceCents;
	const prefix = Number(input.cep.slice(0, 2));
	const shippingPerDeliveryCents =
		prefix < 20 ? 1990 : prefix < 40 ? 2490 : prefix < 80 ? 2990 : 3490;
	const shippingDeliveries = book ? 1 : cycleMonths;
	const itemsCents = unitCents * (book ? 1 : cycleMonths);
	const shippingCents = shippingPerDeliveryCents * shippingDeliveries;
	return {
		kind: input.kind,
		itemId: item.id,
		itemTitle: book?.title ?? 'Céu de Papel',
		quantity: 1,
		cycleMonths,
		regularUnitCents,
		unitCents,
		itemsCents,
		shippingPerDeliveryCents,
		shippingCents,
		totalCents: itemsCents + shippingCents,
		shippingDeliveries,
		shippingSource: 'SIMULATED_FIXTURE' as const,
		deliveryBusinessDays: prefix < 20 ? '5–8' : '8–15',
		priceSource: memberWins ? 'member' : resolved.source,
		memberGate: resolved.memberGate,
		cep: input.cep,
		tier: input.tier,
		mode: 'simulation' as const,
		commercialEnabled: false as const
	};
}

export function initialShipments(order: Order): Shipment[] {
	if (order.status !== 'paid') return [];
	const start = new Date(order.startsAt);
	return Array.from({ length: order.kind === 'book' ? 1 : order.cycleMonths }, (_, index) => {
		const date = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + index, 1));
		const competence = date.toISOString().slice(0, 7);
		const edition =
			order.kind === 'club' ? editionFor(index) : { id: order.itemId, title: order.itemTitle };
		return {
			id: `${order.id}-${competence}`,
			orderId: order.id,
			competence,
			editionId: edition.id,
			editionTitle: edition.title,
			status: 'scheduled',
			attempts: 0,
			tracking: null,
			replacementCount: 0,
			replacementTracking: null,
			cutoffAt: date.toISOString()
		};
	});
}

export function transitionShipment(
	shipment: Shipment,
	operation: string,
	input: Record<string, unknown>
): Shipment {
	const next = { ...shipment };
	if (operation === 'cutoff') {
		if (['shipped', 'delivered'].includes(next.status))
			throw new PreviewError(409, 'Remessa já expedida.');
		if (typeof input.addressValid !== 'boolean' || typeof input.editionReady !== 'boolean')
			throw new PreviewError(400, 'Confirme endereço e edição no corte simulado.');
		next.attempts++;
		next.status = !input.addressValid
			? 'address_invalid'
			: !input.editionReady
				? 'edition_missing'
				: 'ready';
	} else if (operation === 'ship') {
		if (next.status !== 'ready')
			throw new PreviewError(409, 'Endereço e edição precisam estar válidos no corte.');
		next.status = 'shipped';
		next.tracking = `SIM-${next.id}`;
	} else if (operation === 'deliver') {
		if (next.status !== 'shipped')
			throw new PreviewError(409, 'Expedição simulada ainda não registrada.');
		next.status = 'delivered';
	} else if (operation === 'replace') {
		if (!['shipped', 'delivered'].includes(next.status))
			throw new PreviewError(409, 'Reposição exige uma expedição anterior.');
		if (next.replacementCount >= 1)
			throw new PreviewError(409, 'A reposição de teste já foi registrada.');
		next.replacementCount++;
		next.replacementTracking = `SIM-REP-${next.id}`;
	} else throw new PreviewError(400, 'Operação de remessa inválida.');
	return next;
}
