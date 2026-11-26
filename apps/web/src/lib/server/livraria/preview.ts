import { catalog, clubEditions } from './catalog';
import {
	calculateQuote,
	initialShipments,
	key,
	parseQuoteInput,
	PreviewError,
	record,
	transitionShipment,
	type Order,
	type Quote
} from './domain';
import { mutatePreview, type PreviewDocument, type PreviewStore } from './store';

export const previewNotice =
	'Simulação privada com valores e frete fictícios. Não há compra, cobrança, impressão ou envio real. Os manuscritos estão em reescrita.';
const id = () => `p03_${crypto.randomUUID().replaceAll('-', '')}`;
const iso = (now: number) => new Date(now).toISOString();
const fingerprint = async (value: unknown) =>
	Array.from(
		new Uint8Array(
			await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(value)))
		)
	)
		.map((byte) => byte.toString(16).padStart(2, '0'))
		.join('');

export async function previewSnapshot(store: PreviewStore, ownerId: string, now = Date.now()) {
	const { data } = await store.load(ownerId);
	return {
		mode: 'simulation' as const,
		notice: previewNotice,
		catalog,
		club: {
			editions: clubEditions.map((edition) => ({
				...edition,
				note: 'Pauta e exclusividade propostas; edição ainda não produzida.'
			})),
			quarterlyCents: 18000,
			annualCents: 60000
		},
		account: {
			orders: data.orders.map((order) => ({
				...order,
				effectiveStatus:
					order.kind === 'club' && order.status === 'paid' && Date.parse(order.endsAt) <= now
						? 'expired'
						: order.status
			})),
			shipments: data.shipments
		},
		paymentMethods: ['pix', 'card'] as const,
		providerStatus: 'SIMULATED_ONLY' as const,
		commercialEnabled: false as const
	};
}

function requireOrder(data: PreviewDocument, orderId: unknown) {
	const value = key(orderId, 'Pedido');
	const order = data.orders.find((item) => item.id === value);
	if (!order) throw new PreviewError(404, 'Pedido de teste não encontrado nesta conta.');
	return order;
}
function shipmentGuard(order: Order, now: number) {
	if (order.status !== 'paid')
		throw new PreviewError(409, 'O pagamento simulado precisa estar aprovado.');
	if (order.kind === 'club' && Date.parse(order.endsAt) <= now)
		throw new PreviewError(410, 'O ciclo simulado expirou. Nenhuma nova remessa foi autorizada.');
}

export async function previewAction(
	store: PreviewStore,
	ownerId: string,
	raw: unknown,
	now = Date.now()
) {
	const body = record(raw);
	if (body.action === 'quote') {
		const input = parseQuoteInput(body.input);
		const quote: Quote = {
			...calculateQuote(input, now),
			id: id(),
			expiresAt: iso(now + 15 * 60_000)
		};
		return mutatePreview(store, ownerId, (data) => {
			data.quotes = data.quotes.filter((entry) => Date.parse(entry.quote.expiresAt) > now);
			if (data.quotes.length >= 50)
				throw new PreviewError(
					429,
					'Limite de cotações de teste atingido. Aguarde quinze minutos.'
				);
			data.quotes.push({ input, quote });
			return { quote };
		});
	}
	if (body.action === 'checkout') {
		const requestKey = key(body.requestKey, 'Chave de confirmação');
		const quoteId = key(body.quoteId, 'Cotação');
		if (body.method !== 'pix' && body.method !== 'card')
			throw new PreviewError(400, 'Forma de pagamento inválida.');
		if (!['approved', 'failed', 'pending'].includes(String(body.paymentOutcome)))
			throw new PreviewError(400, 'Resultado de pagamento inválido.');
		if (typeof body.renewalAuthorized !== 'boolean')
			throw new PreviewError(400, 'Informe expressamente a autorização de renovação.');
		const normalized = {
			quoteId,
			method: body.method,
			paymentOutcome: body.paymentOutcome,
			renewalAuthorized: body.renewalAuthorized
		};
		const hash = await fingerprint(normalized);
		const orderId = id();
		return mutatePreview(store, ownerId, (data) => {
			const previous = data.events.find((event) => event.key === requestKey);
			if (previous) {
				if (previous.hash !== hash || previous.type !== 'checkout')
					throw new PreviewError(409, 'Esta chave já foi usada com outra confirmação.');
				return { order: requireOrder(data, previous.orderId), duplicate: true };
			}
			if (data.orders.length >= 50 || data.events.length >= 1000)
				throw new PreviewError(429, 'Limite de pedidos de teste atingido.');
			const saved = data.quotes.find((entry) => entry.quote.id === quoteId);
			if (!saved) throw new PreviewError(404, 'Cotação não encontrada nesta conta.');
			if (Date.parse(saved.quote.expiresAt) <= now)
				throw new PreviewError(410, 'Cotação expirada. Calcule novamente.');
			if (data.orders.some((order) => order.quote.id === quoteId))
				throw new PreviewError(409, 'Esta cotação já gerou um pedido.');
			if (saved.quote.kind === 'club' && body.method !== 'card')
				throw new PreviewError(
					400,
					'No clube, a simulação usa cartão à vista pelo valor do ciclo.'
				);
			if (saved.quote.kind === 'book' && body.renewalAuthorized)
				throw new PreviewError(400, 'Compra avulsa não autoriza renovação.');
			// Recalculate from trusted server input. Browser totals and scenario prices are never accepted.
			const quote = {
				...calculateQuote(saved.input, now),
				id: saved.quote.id,
				expiresAt: saved.quote.expiresAt
			};
			const date = new Date(now);
			const starts = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
			const ends = new Date(
				Date.UTC(starts.getUTCFullYear(), starts.getUTCMonth() + (quote.cycleMonths || 1), 1)
			);
			const order: Order = {
				id: orderId,
				kind: quote.kind,
				itemId: quote.itemId,
				itemTitle: quote.itemTitle,
				quote,
				paymentMethod: body.method as Order['paymentMethod'],
				status:
					body.paymentOutcome === 'approved'
						? 'paid'
						: body.paymentOutcome === 'failed'
							? 'failed'
							: 'pending',
				renewalAuthorized: body.renewalAuthorized as boolean,
				renewalEnabled: quote.kind === 'club' && (body.renewalAuthorized as boolean),
				startsAt: starts.toISOString(),
				endsAt: ends.toISOString(),
				createdAt: iso(now),
				cycleMonths: quote.cycleMonths
			};
			data.orders.push(order);
			data.shipments.push(...initialShipments(order));
			data.events.push({
				key: requestKey,
				hash,
				orderId: order.id,
				type: 'checkout',
				createdAt: iso(now)
			});
			return { order, duplicate: false };
		});
	}
	if (!['payment', 'renewal', 'fulfillment'].includes(String(body.action)))
		throw new PreviewError(400, 'Ação de teste inválida.');
	const eventKey = key(body.eventKey, 'Chave do evento');
	const orderId = key(body.orderId, 'Pedido');
	let normalized: Record<string, unknown>;
	if (body.action === 'payment') {
		if (body.outcome !== 'approved' && body.outcome !== 'failed')
			throw new PreviewError(400, 'Resultado de pagamento inválido.');
		normalized = { action: body.action, orderId, outcome: body.outcome };
	} else if (body.action === 'renewal') {
		if (typeof body.enabled !== 'boolean')
			throw new PreviewError(400, 'Informe o estado da renovação.');
		normalized = { action: body.action, orderId, enabled: body.enabled };
	} else {
		if (typeof body.competence !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(body.competence))
			throw new PreviewError(400, 'Competência inválida.');
		if (!['cutoff', 'ship', 'deliver', 'replace'].includes(String(body.operation)))
			throw new PreviewError(400, 'Operação de remessa inválida.');
		normalized = {
			action: body.action,
			orderId,
			competence: body.competence,
			operation: body.operation,
			addressValid: body.operation === 'cutoff' ? body.addressValid : undefined,
			editionReady: body.operation === 'cutoff' ? body.editionReady : undefined
		};
	}
	const hash = await fingerprint(normalized);
	return mutatePreview(store, ownerId, (data) => {
		const order = requireOrder(data, orderId);
		const previous = data.events.find((event) => event.key === eventKey);
		if (previous) {
			if (previous.hash !== hash || previous.orderId !== orderId)
				throw new PreviewError(409, 'Esta chave já foi usada com outro evento.');
			return { order, duplicate: true };
		}
		if (data.events.length >= 1000)
			throw new PreviewError(429, 'Limite de eventos de teste atingido.');
		if (body.action === 'payment') {
			if (order.kind === 'club' && Date.parse(order.endsAt) <= now)
				throw new PreviewError(410, 'O ciclo deste pedido expirou.');
			if (order.status !== 'paid') order.status = body.outcome === 'approved' ? 'paid' : 'failed';
			for (const shipment of initialShipments(order))
				if (
					!data.shipments.some(
						(entry) => entry.orderId === order.id && entry.competence === shipment.competence
					)
				)
					data.shipments.push(shipment);
		} else if (body.action === 'renewal') {
			if (order.kind !== 'club') throw new PreviewError(400, 'Pedido avulso não possui renovação.');
			if (body.enabled) {
				shipmentGuard(order, now);
				if (!order.renewalAuthorized)
					throw new PreviewError(409, 'Renovação não foi autorizada na contratação simulada.');
			}
			order.renewalEnabled = body.enabled as boolean;
		} else {
			shipmentGuard(order, now);
			const index = data.shipments.findIndex(
				(entry) => entry.orderId === order.id && entry.competence === body.competence
			);
			if (index < 0) throw new PreviewError(404, 'Remessa não pertence a este ciclo.');
			data.shipments[index] = transitionShipment(
				data.shipments[index],
				String(body.operation),
				normalized
			);
		}
		data.events.push({
			key: eventKey,
			hash,
			orderId: order.id,
			type: String(body.action),
			createdAt: iso(now)
		});
		return { order, duplicate: false };
	});
}
