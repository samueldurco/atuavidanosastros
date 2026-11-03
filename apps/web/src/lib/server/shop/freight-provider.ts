import { ShopHttpError } from './shop-http';
import { supplierText } from './supplier-response';

export type PrivateEnv = Record<string, string | undefined>;
export const fail = (code: string, status = 422): never => {
	throw new ShopHttpError(code, status);
};
export const record = (v: unknown): Record<string, unknown> =>
	v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
export const zip = (v: unknown): string =>
	typeof v === 'string' && /^\d{5}-?\d{3}$/.test(v.trim()) ? v.trim().replace('-', '') : '';
export async function provider(
	fetcher: typeof fetch,
	url: string,
	init: RequestInit = {},
	timeoutMs = 7000,
	observeHeaders?: (headers: Headers) => void
) {
	return JSON.parse(
		await supplierText(fetcher, url, init, 128 * 1024, 'utf-8', timeoutMs, observeHeaders)
	) as unknown;
}
