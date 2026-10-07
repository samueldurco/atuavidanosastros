import { env as privateEnv } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { createClient } from '@supabase/supabase-js';
import { reconcileP06Inbox, P06ReconciliationError } from '@atv/integrations';

/** Private worker entry point. Caller supplies a current, rotated Hotmart API token.
 * No public endpoint or scheduler activates this unit; no supplier order is submitted.
 */
export async function reconcileStoredP06Payment(inboxId: string, sku: string, accessToken: string) {
	if (
		privateEnv.FEATURE_PHYSICAL_CHECKOUT !== 'true' ||
		privateEnv.FEATURE_HOTMART_LIVE !== 'true' ||
		!publicEnv.PUBLIC_SUPABASE_URL ||
		!privateEnv.SUPABASE_SERVICE_ROLE_KEY
	)
		throw new P06ReconciliationError('integration_disabled');
	const db = createClient(publicEnv.PUBLIC_SUPABASE_URL, privateEnv.SUPABASE_SERVICE_ROLE_KEY, {
		auth: { persistSession: false, autoRefreshToken: false }
	});
	return reconcileP06Inbox(inboxId, sku, accessToken, {
		async loadInbox(id) {
			const { data, error } = await db
				.from('webhook_inbox')
				.select('id,provider,event_type,signature_verified,payload')
				.eq('id', id)
				.single();
			if (error) throw new P06ReconciliationError('inbox_unavailable');
			return data;
		},
		async findOffer(productId) {
			const { data, error } = await db
				.from('offers')
				.select('hotmart_product_id,hotmart_offer_code')
				.eq('product_id', productId)
				.eq('code', `${productId}-BRL-V1`)
				.single();
			if (error || !data?.hotmart_product_id || !data.hotmart_offer_code)
				throw new P06ReconciliationError('offer_unavailable');
			return {
				hotmartProductId: data.hotmart_product_id,
				hotmartOfferCode: data.hotmart_offer_code
			};
		},
		async commit(id, productId, sale) {
			const { data, error } = await db.rpc('reconcile_p06_payment', {
				p_inbox_id: id,
				p_product_id: productId,
				p_sale: sale
			});
			if (error) throw new P06ReconciliationError('reconciliation_not_committed');
			return data;
		}
	});
}
