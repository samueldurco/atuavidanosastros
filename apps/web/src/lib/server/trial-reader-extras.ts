import type { SupabaseClient } from '@supabase/supabase-js';
import { parseReaderState } from '$lib/trials/reader-state';
import { withRpcDeadline } from './rpc-deadline';

/** Optional workspaces must never make an authorized reading unavailable or masquerade as empty. */
export async function readTrialReaderExtras(
	client: SupabaseClient,
	owner: string,
	reading: { id: string; product_id: string; reading: { sections: unknown[] } }
) {
	const optional = async <T>(
		run: (signal: AbortSignal) => PromiseLike<{ data: T; error: unknown }>
	) => {
		try {
			const result = await withRpcDeadline(run);
			return result.error
				? { data: null, unavailable: true }
				: { data: result.data, unavailable: false };
		} catch {
			return { data: null, unavailable: true };
		}
	};
	const [feedback, notes, position] = await Promise.all([
		optional((signal) =>
			client
				.from('atv_trial_feedback')
				.select('decision,comment,reading_id')
				.eq('owner_id', owner)
				.eq('product_id', reading.product_id)
				.abortSignal(signal)
				.maybeSingle()
		),
		optional((signal) =>
			client
				.from('atv_trial_notes')
				.select('step,text,updated_at')
				.eq('owner_id', owner)
				.eq('reading_id', reading.id)
				.order('step')
				.abortSignal(signal)
		),
		optional((signal) =>
			client
				.from('atv_trial_reader_state')
				.select('chapter,bookmarks')
				.eq('owner_id', owner)
				.eq('reading_id', reading.id)
				.abortSignal(signal)
				.maybeSingle()
		)
	]);
	const parsed =
		position.data === null
			? null
			: parseReaderState(position.data, reading.reading.sections.length);
	return {
		feedback: feedback.data,
		notes: notes.data ?? [],
		readerState: parsed ?? { chapter: 0, bookmarks: [] },
		optionalUnavailable: {
			feedback: feedback.unavailable,
			notes: notes.unavailable,
			readerState: position.unavailable || (position.data !== null && !parsed)
		}
	};
}
