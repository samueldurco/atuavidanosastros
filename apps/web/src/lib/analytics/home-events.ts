import { offeredProductIds, atvPlusPlans } from '@atv/domain';
import { freeTools } from '$lib/data/free-tools';
import { interestNavigation } from '$lib/data/public-navigation';

/** Public funnel events only. Purchase confirmation belongs to the authoritative commerce pipeline. */
export const homeEventNames = [
	'home_path_select',
	'tool_select',
	'tool_submit',
	'tool_result',
	'tool_error',
	'tool_product_click',
	'product_click',
	'product_view',
	'checkout_start',
	'pdf_request',
	'pdf_identity_result',
	'pdf_download',
	'showcase_select'
] as const;
export type HomeEventName = (typeof homeEventNames)[number];
export interface HomeEventPayload {
	tool_id?: string;
	product_id?: string;
	universe_id?: string;
	context?: string;
	cta?: string;
	item_id?: string;
	position?: number;
	state?: string;
	error_code?: string;
}

const events = new Set<string>(homeEventNames);
const clickEvents = new Set([
	'home_path_select',
	'tool_select',
	'tool_product_click',
	'product_click',
	'showcase_select'
]);
const toolIds = new Set(freeTools.map((tool) => tool.id));
const productIds = new Set<string>([...offeredProductIds, 'atv-plus']);
const universeIds = new Set<string>(
	interestNavigation.flatMap((topic) => [topic.id, topic.slug, topic.productUniverse])
);
const itemIds = new Set<string>([...offeredProductIds, ...atvPlusPlans.map((plan) => plan.id)]);
const contexts = new Set([
	'home',
	'hero',
	'menu',
	'universe',
	'alias',
	'result',
	'catalog',
	'banner',
	'direct',
	'landing',
	'products',
	'subscription',
	'shop',
	'tools',
	'avulsos',
	'atv-plus',
	'loja'
]);
const ctas = new Set([
	'tools',
	'products',
	'select',
	'open',
	'offer',
	'catalog',
	'previous',
	'next',
	'tab',
	'play',
	'pause'
]);
const states = new Set([
	'new',
	'restored',
	'retry',
	'initial',
	'correction',
	'anonymous',
	'identified',
	'success',
	'error'
]);
const errorCodes = new Set([
	'invalid_input',
	'invalid_tool',
	'invalid_code',
	'expired_code',
	'session_expired',
	'identity_conflict',
	'limit_reached',
	'service_unavailable',
	'network_error',
	'ascendant_unavailable',
	'houses_unavailable'
]);
const receipts = new Set<string>();
const receiptStorageKey = 'atv-home-event-receipts-v1';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function cleanPayload(input: HomeEventPayload): HomeEventPayload {
	const result: HomeEventPayload = {};
	const fields = [
		['tool_id', toolIds],
		['product_id', productIds],
		['universe_id', universeIds],
		['context', contexts],
		['cta', ctas],
		['item_id', itemIds],
		['state', states],
		['error_code', errorCodes]
	] as const;
	for (const [key, allowed] of fields) {
		const value = input[key];
		if (typeof value === 'string' && allowed.has(value)) result[key] = value;
	}
	if (Number.isInteger(input.position) && input.position! >= 0 && input.position! <= 20)
		result.position = input.position;
	return result;
}

/** No queue before consent, no URL/referrer, form content or identity is copied into dataLayer. */
export function trackHomeEvent(
	name: HomeEventName,
	input: HomeEventPayload = {},
	options: { operationId?: string } = {}
): boolean {
	if (typeof window === 'undefined' || !events.has(name)) return false;
	try {
		if (window.localStorage.getItem('atv-analytics-consent') !== 'granted') return false;
	} catch {
		return false;
	}
	let receipt: string | undefined;
	if (name === 'tool_result' || name === 'pdf_download') {
		// The existing operation ID is used only for deduplication and is never emitted.
		if (!options.operationId || !uuid.test(options.operationId)) return false;
		receipt = `${name}:${options.operationId}`;
		try {
			const stored: unknown = JSON.parse(window.sessionStorage.getItem(receiptStorageKey) ?? '[]');
			if (Array.isArray(stored))
				for (const entry of stored) {
					if (
						typeof entry === 'string' &&
						/^(tool_result|pdf_download):/.test(entry) &&
						uuid.test(entry.split(':')[1] ?? '')
					)
						receipts.add(entry);
				}
		} catch {
			/* In-memory deduplication still applies when storage is unavailable. */
		}
		if (receipts.has(receipt)) return false;
	}
	const analyticsWindow = window as Window & { dataLayer?: Record<string, unknown>[] };
	if (analyticsWindow.dataLayer && !Array.isArray(analyticsWindow.dataLayer)) return false;
	analyticsWindow.dataLayer ??= [];
	analyticsWindow.dataLayer.push({ event: `atv_${name}`, ...cleanPayload(input) });
	if (receipt) {
		receipts.add(receipt);
		try {
			window.sessionStorage.setItem(receiptStorageKey, JSON.stringify([...receipts].slice(-200)));
		} catch {
			/* Consent does not require persistent storage. */
		}
	}
	return true;
}

/** One listener for current and future SPA content; returns cleanup for PublicShell unmount. */
export function bindHomeEventClicks(root: Document = document): () => void {
	const listener = (event: MouseEvent) => {
		const target = event.target;
		if (!(target instanceof Element)) return;
		const element = target.closest<HTMLElement>('[data-atv-event]');
		const name = element?.dataset.atvEvent;
		if (
			!element ||
			!name ||
			!clickEvents.has(name) ||
			element.closest('[inert], [hidden], [aria-hidden="true"]') ||
			element.matches(':disabled, [aria-disabled="true"]')
		)
			return;
		trackHomeEvent(name as HomeEventName, {
			tool_id: element.dataset.atvTool,
			product_id: element.dataset.atvProduct,
			universe_id: element.dataset.atvUniverse,
			context: element.dataset.atvContext,
			cta: element.dataset.atvCta,
			item_id: element.dataset.atvItem,
			position:
				element.dataset.atvPosition === undefined ? undefined : Number(element.dataset.atvPosition)
		});
	};
	root.addEventListener('click', listener);
	return () => root.removeEventListener('click', listener);
}
