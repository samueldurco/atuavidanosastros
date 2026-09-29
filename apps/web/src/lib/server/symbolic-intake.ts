import type { SupabaseClient } from '@supabase/supabase-js';
import { symbolicProduct, type IntakeAccess } from '$lib/symbolic-intake';
import { natalProducts, type NatalProduct } from '$lib/natal-request';
import { withRpcDeadline } from './rpc-deadline';

/** Called only after verified server authentication. Never exposes entitlement or release rows. */
export async function readIntakeAccess(
	client: SupabaseClient | undefined,
	productId: string
): Promise<IntakeAccess> {
	if (
		!client ||
		(!symbolicProduct(productId) &&
			!natalProducts.includes(productId as NatalProduct) &&
			productId !== 'date-reading' &&
			productId !== 'week-reading' &&
			productId !== 'solar-return' &&
			productId !== 'pair-preview' &&
			productId !== 'synastry' &&
			productId !== 'couple-dossier')
	)
		return 'UNAVAILABLE';
	try {
		const { data, error } = await withRpcDeadline((signal) =>
			client.rpc('read_product_request_access', { p_product_id: productId }).abortSignal(signal)
		);
		if (
			error ||
			!data ||
			typeof data !== 'object' ||
			Array.isArray(data) ||
			Object.keys(data).length !== 1 ||
			!['AVAILABLE', 'UNRELEASED', 'ACCESS_REQUIRED'].includes(data.state)
		)
			return 'UNAVAILABLE';
		return data.state;
	} catch {
		return 'UNAVAILABLE';
	}
}
