import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { RequestEvent } from '@sveltejs/kit';
import { trialServiceBindings } from '$lib/server/runtime-bindings';
import type { Order, Quote, QuoteInput, Shipment } from './domain';
import { PreviewError } from './domain';

export type PreviewEvent = {
	key: string;
	hash: string;
	orderId: string;
	type: string;
	createdAt: string;
};
export type PreviewDocument = {
	quotes: { input: QuoteInput; quote: Quote }[];
	orders: Order[];
	shipments: Shipment[];
	events: PreviewEvent[];
};
export type StoredPreview = { version: number | null; data: PreviewDocument };
export interface PreviewStore {
	load(ownerId: string): Promise<StoredPreview>;
	compareAndSet(ownerId: string, expected: number | null, data: PreviewDocument): Promise<boolean>;
}
export const emptyPreview = (): PreviewDocument => ({
	quotes: [],
	orders: [],
	shipments: [],
	events: []
});

// Call only after requireLivrariaPreview. Browser clients have no table grants.
export function previewStoreForEvent(event: Pick<RequestEvent, 'platform'>): PreviewStore {
	const { url, serviceRoleKey } = trialServiceBindings(event);
	let configured = false;
	try {
		const target = new URL(url ?? '');
		configured =
			target.protocol === 'https:' ||
			(target.protocol === 'http:' &&
				['127.0.0.1', 'localhost', '[::1]'].includes(target.hostname));
	} catch {
		/* Missing or malformed configuration fails closed. */
	}
	if (!url || !configured || !serviceRoleKey?.trim())
		throw new PreviewError(503, 'Armazenamento da prévia ainda não configurado.');
	return supabasePreviewStore(
		createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
	);
}
// Every query is owner-scoped, including with the private server credential.
export function supabasePreviewStore(client: SupabaseClient): PreviewStore {
	return {
		async load(ownerId) {
			const { data, error } = await client
				.from('p03_preview_accounts')
				.select('version,data_json')
				.eq('owner_id', ownerId)
				.maybeSingle();
			if (error) throw new PreviewError(503, 'O armazenamento da prévia está indisponível.');
			return data
				? { version: Number(data.version), data: data.data_json as PreviewDocument }
				: { version: null, data: emptyPreview() };
		},
		async compareAndSet(ownerId, expected, data) {
			if (expected === null) {
				const result = await client
					.from('p03_preview_accounts')
					.insert({ owner_id: ownerId, version: 0, data_json: data });
				if (result.error?.code === '23505') return false;
				if (result.error) throw new PreviewError(503, 'Não foi possível salvar a simulação.');
				return true;
			}
			const result = await client
				.from('p03_preview_accounts')
				.update({ version: expected + 1, data_json: data, updated_at: new Date().toISOString() })
				.eq('owner_id', ownerId)
				.eq('version', expected)
				.select('version');
			if (result.error) throw new PreviewError(503, 'Não foi possível salvar a simulação.');
			return result.data?.length === 1;
		}
	};
}

export async function mutatePreview<T>(
	store: PreviewStore,
	ownerId: string,
	operation: (data: PreviewDocument) => T
): Promise<T> {
	for (let attempt = 0; attempt < 8; attempt++) {
		const current = await store.load(ownerId);
		const next = structuredClone(current.data);
		const result = operation(next);
		if (await store.compareAndSet(ownerId, current.version, next)) return result;
	}
	throw new PreviewError(
		409,
		'Outra simulação atualizou a conta. Tente novamente com o mesmo identificador.'
	);
}
