import { parseWorkflowInput, workflowFor } from '@atv/domain';
import { isUuid } from './library-result';
import { parseProductRun } from './product-run';
import { natalProducts, parseNatalRequestInput, type NatalProduct } from './natal-request';
import { parseDateRequestInput } from './date-request';

export type WorkflowRequestState = {
	mode: 'new' | 'recover' | 'blocked';
	message: string;
	href?: string;
};
type StoragePort = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
const object = (v: unknown): v is Record<string, unknown> =>
	!!v && typeof v === 'object' && !Array.isArray(v);
const uuid = (v: unknown): v is string => typeof v === 'string' && isUuid(v);
const uncertain = (): WorkflowRequestState => ({
	mode: 'recover',
	message:
		'Não foi possível confirmar o pedido. Consulte o pedido original; nenhum novo envio será feito.'
});
const storageBlocked = (): WorkflowRequestState => ({
	mode: 'blocked',
	message:
		'Não foi possível preservar a chave de recuperação nesta aba. Nenhum novo pedido foi enviado. Consulte sua Biblioteca antes de tentar em outra aba.'
});
const refused: Record<string, { status: number; message: string }> = {
	workflow_unreleased: { status: 409, message: 'Este produto ainda não está liberado.' },
	entitlement_required: { status: 403, message: 'Seu acesso não permite este pedido agora.' },
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

const natalRefused: Record<string, { status: number; message: string }> = {
	revision_conflict: {
		status: 409,
		message: 'Seu perfil mudou. Atualize os dados e revise o consentimento.'
	},
	natal_profile_required: {
		status: 409,
		message: 'Complete seu perfil natal antes de criar este pedido.'
	},
	exact_time_required: { status: 409, message: 'Este pedido exige horário de nascimento exato.' },
	profile_unavailable: { status: 409, message: 'Seu perfil não está disponível. Entre novamente.' }
};
type Operation =
	| { kind: 'create'; ownerId: string }
	| { kind: 'create-natal'; ownerId: string }
	| { kind: 'create-date'; ownerId: string }
	| { kind: 'reprocess'; runId: string };

/** A pending slot holds only a UUID. Existing keys permit reads, never replay. */
export function createWorkflowRequest(options: {
	operation: Operation;
	productId: string;
	storage: StoragePort;
	fetch: typeof fetch;
	randomUUID: () => string;
}) {
	const { operation, productId, storage } = options;
	const parentId = operation.kind === 'reprocess' ? operation.runId : null;
	const name =
		operation.kind === 'reprocess'
			? `atv-reprocess:${operation.runId}`
			: `atv-create:${operation.ownerId}:${productId}`;
	let busy = false;
	let remembered: string | null = null;
	let located: string | null = null;
	function inspect(): WorkflowRequestState {
		try {
			if (
				!workflowFor(productId) ||
				!isUuid(operation.kind === 'reprocess' ? operation.runId : operation.ownerId) ||
				(operation.kind === 'create-natal' && !natalProducts.includes(productId as NatalProduct)) ||
				(operation.kind === 'create-date' && productId !== 'date-reading')
			)
				return storageBlocked();
			const key = storage.getItem(name);
			if (remembered !== null && key !== remembered) return storageBlocked();
			if (key === null) return { mode: 'new', message: '' };
			if (uuid(key)) remembered = key;
			return uuid(key) ? uncertain() : storageBlocked();
		} catch {
			return storageBlocked();
		}
	}
	async function post(path: string, body: string) {
		return options.fetch(path, {
			method: 'POST',
			credentials: 'same-origin',
			cache: 'no-store',
			signal: AbortSignal.timeout(15000),
			headers: { 'content-type': 'application/json' },
			body
		});
	}
	async function recover(key: string, acknowledgedId?: string): Promise<WorkflowRequestState> {
		const response = await post('/api/workflows/recover', JSON.stringify({ requestKey: key }));
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
			run.parentId !== parentId ||
			run.libraryItemId !== request.libraryItemId
		)
			return uncertain();
		if (storage.getItem(name) !== key) return storageBlocked();
		located = key;
		return {
			mode: 'recover',
			message: 'Pedido localizado. Isso não significa que a leitura já esteja pronta.',
			href: `/biblioteca/${run.libraryItemId}`
		};
	}
	async function perform(allowNew: boolean, rawInput?: unknown): Promise<WorkflowRequestState> {
		if (busy) return uncertain();
		busy = true;
		located = null;
		try {
			const state = inspect();
			if (state.mode === 'blocked') return state;
			const previous = storage.getItem(name);
			if (remembered !== null && previous !== remembered) return storageBlocked();
			if (previous !== null) return uuid(previous) ? await recover(previous) : storageBlocked();
			if (!allowNew) return { mode: 'new', message: 'Um novo pedido não está disponível agora.' };
			const input =
				operation.kind === 'create-natal'
					? parseNatalRequestInput(rawInput)
					: operation.kind === 'create-date'
						? parseDateRequestInput(rawInput)
						: operation.kind === 'create'
							? parseWorkflowInput(rawInput)
							: null;
			if (operation.kind !== 'reprocess' && (!input || input.productId !== productId))
				return { mode: 'new', message: 'Revise os dados e o consentimento antes de enviar.' };
			const key = options.randomUUID();
			if (!uuid(key)) return storageBlocked();
			const body = JSON.stringify(
				operation.kind !== 'reprocess' ? { requestKey: key, input } : { requestKey: key }
			);
			if (new TextEncoder().encode(body).byteLength > 20000)
				return {
					mode: 'new',
					message: 'O texto excedeu o limite de envio. Reduza o conteúdo e tente novamente.'
				};
			try {
				storage.setItem(name, key);
				if (storage.getItem(name) !== key) return storageBlocked();
				remembered = key;
			} catch {
				return storageBlocked();
			}
			const response = await post(
				operation.kind === 'create-natal'
					? '/api/workflows/natal'
					: operation.kind === 'create-date'
						? '/api/workflows/date'
						: operation.kind === 'create'
							? '/api/workflows'
							: `/api/workflows/${operation.runId}/reprocess`,
				body
			);
			const payload: unknown = await response.json();
			if (
				object(payload) &&
				Object.keys(payload).length === 1 &&
				typeof payload.error === 'string'
			) {
				const refusal = Object.hasOwn(refused, payload.error)
					? refused[payload.error]
					: (operation.kind === 'create-natal' || operation.kind === 'create-date') &&
						  Object.hasOwn(natalRefused, payload.error)
						? natalRefused[payload.error]
						: null;
				if (
					refusal?.status === response.status &&
					(operation.kind === 'reprocess' || !payload.error.startsWith('parent_'))
				) {
					// Only exact pre-write rejections authorize forgetting a freshly generated key.
					try {
						if (storage.getItem(name) !== key) return storageBlocked();
						storage.removeItem(name);
						if (storage.getItem(name) !== null) return uncertain();
						remembered = null;
					} catch {
						return uncertain();
					}
					return {
						mode: 'new',
						message:
							operation.kind === 'reprocess'
								? `${refusal.message} A versão original permanece intacta.`
								: refusal.message
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
	/** Explicit UI action only, after verified recovery. Never retries or discards an uncertain key. */
	function startAnother(): WorkflowRequestState {
		if (busy || operation.kind === 'reprocess' || !located || located !== remembered)
			return uncertain();
		try {
			if (storage.getItem(name) !== located) return storageBlocked();
			storage.removeItem(name);
			if (storage.getItem(name) !== null) return uncertain();
			remembered = null;
			located = null;
			return {
				mode: 'new',
				message: 'Preencha um novo pedido. O anterior permanece na Biblioteca.'
			};
		} catch {
			return uncertain();
		}
	}
	return { inspect, perform, startAnother };
}
