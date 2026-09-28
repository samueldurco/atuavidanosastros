import {
	emailUuid,
	parseProductEmailCommand,
	parseProductEmailReceipt,
	type ProductEmailReceipt
} from './product-email';

export type ProductEmailRequestState = {
	mode: 'new' | 'recover' | 'requested' | 'cancelled' | 'blocked';
	message: string;
	receipt?: ProductEmailReceipt;
};
type StoragePort = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
const object = (value: unknown): value is Record<string, unknown> =>
	!!value && typeof value === 'object' && !Array.isArray(value);
const uncertain = (): ProductEmailRequestState => ({
	mode: 'recover',
	message: 'Consulte o pedido original para confirmar o estado. Nenhum novo pedido será enviado.'
});
const blocked = (): ProductEmailRequestState => ({
	mode: 'blocked',
	message:
		'Não foi possível preservar a chave de recuperação nesta aba. Nenhuma alteração foi enviada. Consulte sua Biblioteca.'
});
const refusals: Record<string, { status: number; message: string }> = {
	auth_required: { status: 401, message: 'Entre novamente para continuar.' },
	profile_unavailable: {
		status: 403,
		message: 'Sua conta não está disponível para novos pedidos.'
	},
	invalid_input: { status: 400, message: 'Revise esta leitura e o consentimento antes de tentar.' },
	same_origin_required: { status: 403, message: 'Abra esta página novamente para continuar.' },
	email_disabled: { status: 409, message: 'Pedidos de e-mail ainda não estão habilitados.' },
	email_unavailable: {
		status: 409,
		message: 'Esta versão não está disponível para um novo pedido.'
	},
	request_limit: { status: 429, message: 'O limite de pedidos foi atingido. Aguarde para tentar.' }
};

/** Only a UUID is retained in tab storage. No address, consent, reading or receipt is persisted here. */
export function createProductEmailRequest(options: {
	ownerId: string;
	runId: string;
	revision: number;
	reviewDigest: string;
	storage: StoragePort;
	fetch: typeof fetch;
	randomUUID: () => string;
}) {
	const { storage, fetch: fetcher, randomUUID } = options;
	const owner = options.ownerId;
	const command = parseProductEmailCommand({
		version: 'atv-email-request/1',
		runId: options.runId,
		expectedRevision: options.revision,
		reviewDigest: options.reviewDigest,
		consent: {
			transactional: true,
			policyVersion: 'atv-email-delivery/1',
			recipient: 'account-owner'
		}
	});
	const name = `atv-email:${owner.toLowerCase()}:${options.runId.toLowerCase()}:${options.revision}`;
	let remembered: string | null = null;
	let receipt: ProductEmailReceipt | null = null;
	let receiptId: string | null = null;
	let cancelled = false;
	let busy = false;

	function confirmed(value: ProductEmailReceipt): ProductEmailRequestState {
		return {
			mode: value.state === 'CANCELLED' ? 'cancelled' : 'requested',
			message:
				value.state === 'CANCELLED'
					? 'Pedido cancelado. Ele não será reativado por esta consulta.'
					: 'Solicitação registrada. Isso não confirma envio nem entrega de e-mail.',
			receipt: { ...value }
		};
	}
	function inspect(): ProductEmailRequestState {
		try {
			if (!emailUuid(owner) || !command) return blocked();
			const key = storage.getItem(name);
			if (remembered !== null && key !== remembered) return blocked();
			if (key === null) return { mode: 'new', message: '' };
			if (!emailUuid(key)) return blocked();
			remembered = key;
			return receipt ? confirmed(receipt) : uncertain();
		} catch {
			return blocked();
		}
	}
	function post(action: 'request' | 'recover' | 'cancel', body: unknown) {
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
	async function accept(
		response: Response,
		key: string,
		action: 'request' | 'recover' | 'cancel'
	): Promise<ProductEmailRequestState> {
		if (response.status !== (action === 'request' ? 202 : 200)) return uncertain();
		const payload: unknown = await response.json();
		if (!object(payload) || Object.keys(payload).length !== 1 || !Object.hasOwn(payload, 'receipt'))
			return uncertain();
		if (payload.receipt === null)
			return {
				mode: 'recover',
				message: 'O pedido não foi localizado. Consulte novamente mais tarde; não criaremos outro.'
			};
		const parsed = parseProductEmailReceipt(payload.receipt);
		if (
			!command ||
			!parsed ||
			parsed.runId.toLowerCase() !== command.runId.toLowerCase() ||
			parsed.revision !== command.expectedRevision ||
			(receiptId !== null && parsed.id.toLowerCase() !== receiptId) ||
			(cancelled && parsed.state !== 'CANCELLED') ||
			(action === 'request' && parsed.reviewDigest !== command.reviewDigest) ||
			(action === 'cancel' && parsed.state !== 'CANCELLED')
		)
			return uncertain();
		if (storage.getItem(name) !== key) return blocked();
		receipt = parsed;
		receiptId = parsed.id.toLowerCase();
		cancelled = parsed.state === 'CANCELLED';
		return confirmed(parsed);
	}
	async function recoverKey(key: string) {
		receipt = null;
		return accept(await post('recover', { requestKey: key }), key, 'recover');
	}
	/** Existing keys always take the read-only path, irrespective of new-request availability/consent. */
	async function perform(allowNew: boolean, consent: boolean): Promise<ProductEmailRequestState> {
		if (busy) return uncertain();
		busy = true;
		try {
			const state = inspect();
			if (state.mode === 'blocked') return state;
			if (remembered !== null) return await recoverKey(remembered);
			if (allowNew !== true)
				return { mode: 'new', message: 'Pedidos de e-mail ainda não estão habilitados.' };
			if (consent !== true)
				return { mode: 'new', message: 'Confirme o pedido de e-mail para sua própria conta.' };
			const key = randomUUID();
			if (!emailUuid(key)) return blocked();
			try {
				storage.setItem(name, key);
				if (storage.getItem(name) !== key) return blocked();
				remembered = key;
			} catch {
				return blocked();
			}
			const response = await post('request', { requestKey: key, command });
			if (response.status !== 202) {
				const payload: unknown = await response.json();
				if (
					object(payload) &&
					Object.keys(payload).length === 1 &&
					typeof payload.error === 'string' &&
					Object.hasOwn(refusals, payload.error)
				) {
					const refusal = refusals[payload.error];
					if (refusal.status === response.status) {
						// Only a definitive pre-write rejection of our freshly generated key permits removal.
						if (storage.getItem(name) !== key) return blocked();
						storage.removeItem(name);
						if (storage.getItem(name) !== null) return uncertain();
						remembered = null;
						return { mode: 'new', message: refusal.message };
					}
				}
				return uncertain();
			}
			return await accept(response, key, 'request');
		} catch {
			return uncertain();
		} finally {
			busy = false;
		}
	}
	/** Cancellation needs a validated receipt in this instance; uncertain outcomes require recovery. */
	async function cancel(): Promise<ProductEmailRequestState> {
		if (busy) return uncertain();
		busy = true;
		try {
			const state = inspect();
			if (state.mode === 'blocked') return state;
			if (!remembered || !receipt) return uncertain();
			if (receipt.state === 'CANCELLED') return confirmed(receipt);
			const id = receipt.id;
			receipt = null;
			return await accept(await post('cancel', { receiptId: id }), remembered, 'cancel');
		} catch {
			return uncertain();
		} finally {
			busy = false;
		}
	}
	return { inspect, perform, recover: () => perform(false, false), cancel };
}
