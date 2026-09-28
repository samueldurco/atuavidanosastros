import {
	emailUuid,
	parseProductEmailHistory,
	parseProductEmailReceipt,
	type ProductEmailReceipt
} from './product-email';

export interface ProductEmailHistoryState {
	mode: 'idle' | 'ready' | 'unavailable' | 'blocked';
	message: string;
	receipts: ProductEmailReceipt[];
}

const envelope = (value: unknown, key: string): value is Record<string, unknown> =>
	!!value &&
	typeof value === 'object' &&
	!Array.isArray(value) &&
	Object.keys(value).length === 1 &&
	Object.hasOwn(value, key);
const sameIdentity = (a: ProductEmailReceipt, b: ProductEmailReceipt) =>
	a.id.toLowerCase() === b.id.toLowerCase() &&
	a.runId.toLowerCase() === b.runId.toLowerCase() &&
	a.revision === b.revision &&
	a.reviewDigest === b.reviewDigest &&
	Date.parse(a.createdAt) === Date.parse(b.createdAt);

/** Explicit owner/run discovery. No storage, auto-fetch, creation or delivery capability. */
export function createProductEmailHistory(options: {
	ownerId: string;
	runId: string;
	fetch: typeof fetch;
}) {
	const { ownerId, runId, fetch: fetcher } = options;
	const valid = emailUuid(ownerId) && emailUuid(runId);
	const known = new Map<number, ProductEmailReceipt>();
	let busy = false;
	let state: ProductEmailHistoryState = {
		mode: valid ? 'idle' : 'blocked',
		message: valid ? '' : 'Abra sua Biblioteca autenticada para consultar os pedidos.',
		receipts: []
	};
	const inspect = (): ProductEmailHistoryState => ({
		...state,
		receipts: state.receipts.map((receipt) => ({ ...receipt }))
	});
	function unavailable(cancelling: boolean, status?: number) {
		state = {
			mode: 'unavailable',
			receipts: [],
			message:
				status === 401
					? 'Entre novamente e consulte os pedidos para confirmar seu estado.'
					: cancelling
						? 'O cancelamento não foi confirmado. Consulte os pedidos novamente antes de outra ação.'
						: 'Não foi possível confirmar o histórico. Consulte novamente; nenhum novo pedido será criado.'
		};
		return inspect();
	}
	function consistent(receipt: ProductEmailReceipt) {
		const prior = known.get(receipt.revision);
		return (
			!prior ||
			(sameIdentity(prior, receipt) &&
				(prior.state !== 'CANCELLED' ||
					(receipt.state === 'CANCELLED' &&
						Date.parse(prior.cancelledAt!) === Date.parse(receipt.cancelledAt!))))
		);
	}
	function post(action: 'history' | 'cancel', body: unknown) {
		return fetcher(`/api/product-email/${action}`, {
			method: 'POST',
			credentials: 'same-origin',
			cache: 'no-store',
			redirect: 'error',
			signal: AbortSignal.timeout(15000),
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body)
		});
	}
	async function list(): Promise<ProductEmailHistoryState> {
		if (!valid || busy) return inspect();
		busy = true;
		state = { mode: 'idle', message: '', receipts: [] };
		try {
			const response = await post('history', { runId });
			if (response.status !== 200) return unavailable(false, response.status);
			const payload: unknown = await response.json();
			const receipts = envelope(payload, 'receipts')
				? parseProductEmailHistory(payload.receipts, runId)
				: null;
			if (!receipts || !receipts.every(consistent)) return unavailable(false);
			for (const receipt of receipts) known.set(receipt.revision, receipt);
			state = {
				mode: 'ready',
				receipts,
				message: receipts.length
					? 'Pedidos consultados. Um registro não confirma envio nem entrega de e-mail.'
					: 'Nenhum pedido de e-mail foi localizado para esta leitura.'
			};
			return inspect();
		} catch {
			return unavailable(false);
		} finally {
			busy = false;
		}
	}
	async function cancel(receiptId: string): Promise<ProductEmailHistoryState> {
		if (!valid || busy) return inspect();
		const target =
			state.mode === 'ready' && emailUuid(receiptId)
				? state.receipts.find((receipt) => receipt.id.toLowerCase() === receiptId.toLowerCase())
				: undefined;
		if (!target || target.state !== 'REQUESTED') return inspect();
		busy = true;
		const previous = state.receipts;
		// An ambiguous acknowledgement must never leave actionable stale receipts.
		state = { mode: 'idle', message: '', receipts: [] };
		try {
			const response = await post('cancel', { receiptId: target.id });
			if (response.status !== 200) return unavailable(true, response.status);
			const payload: unknown = await response.json();
			const receipt = envelope(payload, 'receipt')
				? parseProductEmailReceipt(payload.receipt)
				: null;
			if (
				!receipt ||
				receipt.state !== 'CANCELLED' ||
				!sameIdentity(target, receipt) ||
				!consistent(receipt)
			)
				return unavailable(true);
			known.set(receipt.revision, receipt);
			state = {
				mode: 'ready',
				receipts: previous.map((item) => (item.revision === receipt.revision ? receipt : item)),
				message: `Pedido da revisão ${receipt.revision} cancelado. Ele não será reativado por esta consulta.`
			};
			return inspect();
		} catch {
			return unavailable(true);
		} finally {
			busy = false;
		}
	}
	return { inspect, list, cancel };
}
