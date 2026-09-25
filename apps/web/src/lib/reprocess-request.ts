import { isUuid } from './library-result';
import { parseProductRun } from './product-run';

export type ReprocessState = {
	mode: 'new' | 'recover' | 'blocked';
	message: string;
	href?: string;
};
type StoragePort = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
const object = (v: unknown): v is Record<string, unknown> =>
	!!v && typeof v === 'object' && !Array.isArray(v);
const uuid = (v: unknown): v is string => typeof v === 'string' && isUuid(v);
const uncertain = (): ReprocessState => ({
	mode: 'recover',
	message:
		'Não foi possível confirmar a nova versão. Consulte o pedido original; nenhum novo envio será feito.'
});
const storageBlocked = (): ReprocessState => ({
	mode: 'blocked',
	message:
		'Não foi possível preservar a chave de recuperação nesta aba. Nenhum novo pedido foi enviado. Consulte sua Biblioteca antes de tentar em outra aba.'
});
const refused: Record<string, { status: number; message: string }> = {
	workflow_unreleased: { status: 409, message: 'O reprocessamento ainda não está liberado.' },
	entitlement_required: { status: 403, message: 'Seu acesso não permite reprocessar agora.' },
	request_limit: {
		status: 429,
		message: 'O limite de tentativas foi atingido. Aguarde para tentar novamente.'
	},
	parent_not_reprocessable: {
		status: 409,
		message: 'Esta versão não pode ser reprocessada agora.'
	},
	parent_not_found: { status: 404, message: 'A versão original não está disponível.' },
	invalid_input: { status: 400, message: 'O pedido não passou pela validação.' },
	auth_required: { status: 401, message: 'Entre novamente para continuar.' },
	same_origin_required: { status: 403, message: 'Abra esta página novamente para continuar.' }
};

/** One key per source version. Existing/legacy keys only permit reads, never replay. */
export function createReprocessRequest(options: {
	runId: string;
	productId: string;
	storage: StoragePort;
	fetch: typeof fetch;
	randomUUID: () => string;
}) {
	const { runId, productId, storage } = options;
	const name = `atv-reprocess:${runId}`;
	let busy = false;
	let remembered: string | null = null;
	function inspect(): ReprocessState {
		try {
			if (!isUuid(runId)) return storageBlocked();
			const key = storage.getItem(name);
			if (remembered !== null && key !== remembered) return storageBlocked();
			if (key === null) return { mode: 'new', message: '' };
			if (uuid(key)) remembered = key;
			return uuid(key) ? uncertain() : storageBlocked();
		} catch {
			return storageBlocked();
		}
	}
	async function post(path: string, key: string) {
		return options.fetch(path, {
			method: 'POST',
			credentials: 'same-origin',
			cache: 'no-store',
			signal: AbortSignal.timeout(15000),
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ requestKey: key })
		});
	}
	async function recover(key: string, acknowledgedId?: string): Promise<ReprocessState> {
		const response = await post('/api/workflows/recover', key);
		if (response.status === 401)
			return { mode: 'recover', message: 'Entre novamente para consultar o pedido original.' };
		if (response.status !== 200) return uncertain();
		const payload: unknown = await response.json();
		if (!object(payload) || Object.keys(payload).length !== 1) return uncertain();
		if (payload.request === null)
			return {
				mode: 'recover',
				message:
					'O pedido ainda não foi localizado. Ele pode estar em andamento. Consulte novamente mais tarde ou verifique a Biblioteca; não faremos outro envio.'
			};
		const request = payload.request;
		if (
			!object(request) ||
			Object.keys(request).length !== 3 ||
			!uuid(request.runId) ||
			request.productId !== productId ||
			!(request.libraryItemId === null || uuid(request.libraryItemId)) ||
			(acknowledgedId && request.runId !== acknowledgedId)
		)
			return uncertain();
		if (request.libraryItemId === null)
			return {
				mode: 'recover',
				message:
					'O pedido foi localizado, mas não há referência ativa na Biblioteca. Nenhuma nova versão será criada por esta consulta.'
			};
		const reader = await options.fetch(`/api/workflows/${request.runId}`, {
			credentials: 'same-origin',
			cache: 'no-store',
			signal: AbortSignal.timeout(15000)
		});
		if (!reader.ok) return uncertain();
		const body: unknown = await reader.json();
		const run = object(body) ? parseProductRun(body.run) : null;
		if (
			!run ||
			run.id !== request.runId ||
			run.productId !== productId ||
			run.parentId !== runId ||
			run.libraryItemId !== request.libraryItemId
		)
			return uncertain();
		return {
			mode: 'recover',
			message: 'Pedido localizado. Isso não significa que a leitura já esteja pronta.',
			href: `/biblioteca/${run.libraryItemId}`
		};
	}
	async function perform(allowNew: boolean): Promise<ReprocessState> {
		if (busy) return uncertain();
		busy = true;
		try {
			const state = inspect();
			if (state.mode === 'blocked') return state;
			const previous = storage.getItem(name);
			if (remembered !== null && previous !== remembered) return storageBlocked();
			if (previous !== null) return uuid(previous) ? await recover(previous) : storageBlocked();
			if (!allowNew)
				return { mode: 'new', message: 'O reprocessamento não está disponível agora.' };
			const key = options.randomUUID();
			if (!uuid(key)) return storageBlocked();
			try {
				storage.setItem(name, key);
				if (storage.getItem(name) !== key) return storageBlocked();
				remembered = key;
			} catch {
				return storageBlocked();
			}
			const response = await post(`/api/workflows/${runId}/reprocess`, key);
			const payload: unknown = await response.json();
			if (
				object(payload) &&
				Object.keys(payload).length === 1 &&
				typeof payload.error === 'string'
			) {
				const refusal = Object.hasOwn(refused, payload.error) ? refused[payload.error] : null;
				if (refusal?.status === response.status) {
					// Only exact pre-write rejections authorize forgetting a freshly generated key.
					try {
						storage.removeItem(name);
						if (storage.getItem(name) !== null) return uncertain();
						remembered = null;
					} catch {
						return uncertain();
					}
					return {
						mode: 'new',
						message: `${refusal.message} A versão original permanece intacta.`
					};
				}
			}
			if (
				response.status !== 202 ||
				!object(payload) ||
				Object.keys(payload).length !== 1 ||
				!uuid(payload.runId)
			)
				return uncertain();
			return await recover(key, payload.runId);
		} catch {
			return uncertain();
		} finally {
			busy = false;
		}
	}
	return { inspect, perform };
}
