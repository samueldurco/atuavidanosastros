import type { SupabaseClient } from '@supabase/supabase-js';
import { symbolicProduct, type IntakeAccess } from '$lib/symbolic-intake';

/** Called only after verified server authentication. Never exposes entitlement or release rows. */
export async function readIntakeAccess(
	client: SupabaseClient | undefined,
	productId: string
): Promise<IntakeAccess> {
	if (!client || !symbolicProduct(productId)) return 'UNAVAILABLE';
	try {
		const { data, error } = await client
			.rpc('read_product_request_access', { p_product_id: productId })
			.abortSignal(AbortSignal.timeout(10000));
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
