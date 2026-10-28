import { afterEach, describe, expect, it, vi } from 'vitest';
import { bindHomeEventClicks, trackHomeEvent, type HomeEventPayload } from './home-events';

function browser(consent: string | null = 'granted') {
	const values = new Map<string, string>();
	const stub = {
		localStorage: { getItem: vi.fn(() => consent) },
		sessionStorage: {
			getItem: vi.fn((key: string) => values.get(key) ?? null),
			setItem: vi.fn((key: string, value: string) => values.set(key, value))
		},
		dataLayer: [] as Record<string, unknown>[]
	};
	vi.stubGlobal('window', stub);
	return stub;
}

afterEach(() => vi.unstubAllGlobals());

describe('consented public funnel analytics', () => {
	it('does not emit or retain events before consent, after refusal, or when storage is blocked', () => {
		for (const consent of [null, 'denied', 'rejected', 'false']) {
			const stub = browser(consent);
			expect(trackHomeEvent('tool_select', { tool_id: 'ascendente' })).toBe(false);
			expect(stub.dataLayer).toEqual([]);
			expect(stub.sessionStorage.setItem).not.toHaveBeenCalled();
		}
		const stub = browser();
		stub.localStorage.getItem.mockImplementation(() => {
			throw new Error('blocked');
		});
		expect(trackHomeEvent('product_view', { product_id: 'birth-chart' })).toBe(false);
		expect(stub.dataLayer).toEqual([]);
	});

	it('copies only known public dimensions and never arbitrary text, URL or personal data', () => {
		const stub = browser();
		expect(
			trackHomeEvent('tool_product_click', {
				tool_id: 'ascendente',
				product_id: 'three-pillars',
				universe_id: 'meu-ceu',
				context: 'result',
				cta: 'offer',
				position: 1,
				email: 'synthetic@example.invalid',
				narrative: 'Private dream text',
				birthDate: '2000-01-01',
				url: '/produtos/test?token=private',
				token: 'private',
				event: 'purchase_complete'
			} as HomeEventPayload)
		).toBe(true);
		expect(stub.dataLayer).toEqual([
			{
				event: 'atv_tool_product_click',
				tool_id: 'ascendente',
				product_id: 'three-pillars',
				universe_id: 'meu-ceu',
				context: 'result',
				cta: 'offer',
				position: 1
			}
		]);
	});

	it('rejects user-supplied strings masquerading as public identifiers', () => {
		const stub = browser();
		trackHomeEvent('tool_error', {
			tool_id: 'name@example.invalid',
			product_id: '2000-01-01',
			context: 'my dream',
			cta: 'private',
			error_code: 'Internal error with email',
			position: 999
		});
		expect(stub.dataLayer).toEqual([{ event: 'atv_tool_error' }]);
	});

	it('retains the public subscription identifier alongside its public plan', () => {
		const stub = browser();
		trackHomeEvent('product_click', {
			product_id: 'atv-plus',
			item_id: 'essencial',
			context: 'subscription',
			cta: 'offer'
		});
		expect(stub.dataLayer).toEqual([
			{
				event: 'atv_product_click',
				product_id: 'atv-plus',
				item_id: 'essencial',
				context: 'subscription',
				cta: 'offer'
			}
		]);
	});

	it('checks consent on every event and does not replay earlier gestures when consent changes', () => {
		const stub = browser('denied');
		expect(trackHomeEvent('home_path_select', { cta: 'tools' })).toBe(false);
		stub.localStorage.getItem.mockReturnValue('granted');
		expect(trackHomeEvent('home_path_select', { cta: 'products' })).toBe(true);
		stub.localStorage.getItem.mockReturnValue('denied');
		expect(trackHomeEvent('tool_select', { tool_id: 'ascendente' })).toBe(false);
		expect(stub.dataLayer).toEqual([{ event: 'atv_home_path_select', cta: 'products' }]);
	});

	it('deduplicates actual result/download operations without emitting operation identifiers', () => {
		const stub = browser();
		const operationId = '12345678-1234-4234-8234-123456789abc';
		expect(
			trackHomeEvent('tool_result', { tool_id: 'ascendente', state: 'new' }, { operationId })
		).toBe(true);
		expect(
			trackHomeEvent('tool_result', { tool_id: 'ascendente', state: 'restored' }, { operationId })
		).toBe(false);
		expect(trackHomeEvent('pdf_download', { tool_id: 'ascendente' }, { operationId })).toBe(true);
		expect(trackHomeEvent('pdf_download', { tool_id: 'ascendente' }, { operationId })).toBe(false);
		expect(stub.dataLayer).toHaveLength(2);
		expect(JSON.stringify(stub.dataLayer)).not.toContain(operationId);
		expect(stub.sessionStorage.setItem).toHaveBeenCalledTimes(2);
	});

	it('honors stored completion receipts and refuses completion without a valid operation', () => {
		const stub = browser();
		const operationId = '22345678-1234-4234-8234-123456789abc';
		stub.sessionStorage.setItem(
			'atv-home-event-receipts-v1',
			JSON.stringify([`pdf_download:${operationId}`])
		);
		expect(trackHomeEvent('pdf_download', {}, { operationId })).toBe(false);
		expect(trackHomeEvent('tool_result')).toBe(false);
		expect(trackHomeEvent('pdf_download', {}, { operationId: 'person@example.invalid' })).toBe(
			false
		);
		expect(stub.dataLayer).toEqual([]);
	});

	it('delegates one deliberate gesture and cannot synthesize conversion from a click attribute', () => {
		const stub = browser();
		let listener: ((event: { target: unknown }) => void) | undefined;
		const root = {
			addEventListener: vi.fn((_name, callback) => {
				listener = callback;
			}),
			removeEventListener: vi.fn()
		};
		class Target {
			dataset: Record<string, string> = {
				atvEvent: 'tool_select',
				atvTool: 'ascendente',
				atvContext: 'home'
			};
			closest(selector: string) {
				return selector === '[data-atv-event]' ? this : null;
			}
			matches() {
				return false;
			}
		}
		vi.stubGlobal('Element', Target);
		const cleanup = bindHomeEventClicks(root as unknown as Document);
		const target = new Target();
		listener!({ target });
		for (const name of ['tool_result', 'checkout_start', 'purchase_complete', 'pdf_download']) {
			target.dataset.atvEvent = name;
			listener!({ target });
		}
		cleanup();
		expect(stub.dataLayer).toEqual([
			{ event: 'atv_tool_select', tool_id: 'ascendente', context: 'home' }
		]);
		expect(root.removeEventListener).toHaveBeenCalledWith('click', listener);
	});

	it('returns safely during SSR and never invents a purchase confirmation event', () => {
		vi.stubGlobal('window', undefined);
		expect(trackHomeEvent('product_view')).toBe(false);
		const stub = browser();
		expect(trackHomeEvent('purchase_complete' as never)).toBe(false);
		expect(stub.dataLayer).toEqual([]);
	});
});
