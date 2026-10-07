import type { SavedTrial } from './reading';
export const canShareReading = (product: string) =>
	['synastry', 'pair-preview', 'couple-dossier'].includes(product);
export const validShareToken = (token: string) => /^[a-f0-9]{64}$/.test(token);
export async function shareTokenHash(token: string) {
	const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
	return Array.from(new Uint8Array(bytes), (v) => v.toString(16).padStart(2, '0')).join('');
}
/** Deliberate projection: no account, input, calculation, notes, feedback or fact IDs. */
export function sharedReading(saved: SavedTrial) {
	if (
		!canShareReading(saved.product_id) ||
		saved.approval.status !== 'approved' ||
		saved.approval.scope !== 'private-free-test'
	)
		return null;
	return {
		title: saved.reading.title,
		names: [saved.input.presentation?.name, saved.input.presentation?.partnerName]
			.filter(Boolean)
			.join(' e '),
		opening: saved.reading.opening,
		sections: saved.reading.sections
			.filter((s) => s.title !== 'Referências desta leitura')
			.map(({ title, text }) => ({ title, text })),
		questions: saved.reading.questions,
		practice: saved.reading.practice
	};
}
