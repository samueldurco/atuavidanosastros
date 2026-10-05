import { parseWorkflowInput, workflowFor } from '@atv/domain';
import { isUuid } from './library-result';
import { parseProductRun } from './product-run';
import { natalProducts, parseNatalRequestInput, type NatalProduct } from './natal-request';
import { parseDateRequestInput } from './date-request';
import { parseHoroscopeRequestInput } from './horoscope-request';
import { parseWeekRequestInput } from './week-request';
import { parseSolarReturnRequestInput } from './solar-return-request';
import { parsePersonalCalendarRequestInput } from './personal-calendar-request';
import { parsePairRequestInput } from './pair-request';

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
		'Esta aba não conseguiu guardar o acompanhamento do pedido. Confira sua Biblioteca antes de tentar novamente.'
});
const refused: Record<string, { status: number; message: string }> = {
	workflow_unreleased: { status: 409, message: 'Este produto está em preparação.' },
	entitlement_required: { status: 403, message: 'Seu acesso não permite este pedido agora.' },
	request_limit: {
		status: 429,
		message: 'O limite de tentativas foi atingido. Aguarde para tentar novamente.'
	},
	parent_not_reprocessable: {
		status: 409,
		message: 'Uma nova versão desta leitura está indisponível agora.'
	},
	parent_not_found: { status: 404, message: 'A versão original não está disponível.' },
	invalid_input: { status: 400, message: 'Confira os campos do formulário antes de enviar.' },
	auth_required: { status: 401, message: 'Entre novamente para continuar.' },
	same_origin_required: { status: 403, message: 'Abra esta página novamente para continuar.' }
};

const natalRefused: Record<string, { status: number; message: string }> = {
	revision_conflict: {
		status: 409,
		message: 'Seus dados de nascimento mudaram. Confira a versão atual antes de enviar.'
	},
	natal_profile_required: {
		status: 409,
		message: 'Complete seus dados de nascimento antes de solicitar esta leitura.'
	},
	exact_time_required: { status: 409, message: 'Este pedido exige horário de nascimento exato.' },
	profile_unavailable: { status: 409, message: 'Seu perfil não está disponível. Entre novamente.' }
};
type Operation =
	| { kind: 'create'; ownerId: string }
	| { kind: 'create-natal'; ownerId: string }
	| { kind: 'create-date'; ownerId: string }
	| { kind: 'create-horoscope'; ownerId: string }
	| { kind: 'create-week'; ownerId: string }
	| { kind: 'create-solar-return'; ownerId: string }
	| { kind: 'create-personal-calendar'; ownerId: string }
	| { kind: 'create-pair'; ownerId: string }
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
				(operation.kind === 'create-date' && productId !== 'date-reading') ||
				(operation.kind === 'create-horoscope' && productId !== 'horoscope') ||
				(operation.kind === 'create-week' && productId !== 'week-reading') ||
				(operation.kind === 'create-solar-return' && productId !== 'solar-return') ||
				(operation.kind === 'create-personal-calendar' && productId !== 'personal-calendar') ||
				(operation.kind === 'create-pair' &&
					!['pair-preview', 'synastry', 'couple-dossier'].includes(productId))
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
	/** Bound headers and body together; late transport completion cannot mutate request state. */
	async function exchange(
		path: string,
		init: RequestInit,
		readBody: (response: Response) => boolean
	): Promise<{ response: Response; payload: unknown }> {
		const controller = new AbortController();
		let timer: ReturnType<typeof setTimeout> | undefined;
		const deadline = new Promise<never>((_, reject) => {
			timer = setTimeout(() => {
				// Settle the deadline first even if the transport resolves on abort.
				reject(new Error('workflow_request_deadline'));
				controller.abort();
			}, 15000);
		});
		try {
			return await Promise.race([
				(async () => {
					const response = await options.fetch(path, {
						...init,
						credentials: 'same-origin',
						cache: 'no-store',
						signal: controller.signal
					});
					if (controller.signal.aborted) throw new Error('workflow_request_deadline');
					const payload: unknown = readBody(response) ? await response.json() : undefined;
					return { response, payload };
				})(),
				deadline
			]);
		} finally {
			clearTimeout(timer);
		}
	}
	async function post(
		path: string,
		body: string,
		readBody: (response: Response) => boolean = () => true
	) {
		return exchange(
			path,
			{
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body
			},
			readBody
		);
	}
	async function recover(key: string, acknowledgedId?: string): Promise<WorkflowRequestState> {
		const { response, payload } = await post(
			'/api/workflows/recover',
			JSON.stringify({ requestKey: key }),
			(response) => response.status === 200
		);
		if (response.status === 401)
			return { mode: 'recover', message: 'Entre novamente para consultar o pedido original.' };
		if (response.status !== 200) return uncertain();
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
		const { response: reader, payload: body } = await exchange(
			`/api/workflows/${request.runId}`,
			{},
			(response) => response.ok
		);
		if (!reader.ok) return uncertain();
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
						: operation.kind === 'create-week'
							? parseWeekRequestInput(rawInput)
							: operation.kind === 'create-solar-return'
								? parseSolarReturnRequestInput(rawInput)
								: operation.kind === 'create-personal-calendar'
									? parsePersonalCalendarRequestInput(rawInput)
									: operation.kind === 'create-horoscope'
										? parseHoroscopeRequestInput(rawInput)
										: operation.kind === 'create-pair'
											? parsePairRequestInput(rawInput)
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
			const { response, payload } = await post(
				operation.kind === 'create-natal'
					? '/api/workflows/natal'
					: operation.kind === 'create-date'
						? '/api/workflows/date'
						: operation.kind === 'create-week'
							? '/api/workflows/week'
							: operation.kind === 'create-solar-return'
								? '/api/workflows/solar-return'
								: operation.kind === 'create-personal-calendar'
									? '/api/workflows/personal-calendar'
									: operation.kind === 'create-horoscope'
										? '/api/workflows/horoscope'
										: operation.kind === 'create-pair'
											? '/api/workflows/pair'
											: operation.kind === 'create'
												? '/api/workflows'
												: `/api/workflows/${operation.runId}/reprocess`,
				body
			);
			if (
				object(payload) &&
				Object.keys(payload).length === 1 &&
				typeof payload.error === 'string'
			) {
				const refusal = Object.hasOwn(refused, payload.error)
					? refused[payload.error]
					: (operation.kind === 'create-natal' ||
								operation.kind === 'create-date' ||
								operation.kind === 'create-horoscope' ||
								operation.kind === 'create-week' ||
								operation.kind === 'create-solar-return' ||
								operation.kind === 'create-personal-calendar' ||
								operation.kind === 'create-pair') &&
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
