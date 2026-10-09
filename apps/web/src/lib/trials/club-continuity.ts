import { parseContinuitySelection, workflowFor, type ContinuitySelection } from '@atv/domain';

export const TRIAL_CONTINUITY_VERSION = 'atv-private-trial-continuity/1.0.0';
export const TRIAL_CONTINUITY_CONSENT = 'atv-trial-continuity-consent/1';
type Selection = Exclude<ContinuitySelection, { kind: 'cycle' }>;
export interface ClubItem {
	id: string;
	readingId: string;
	selection: Selection;
}
export interface ClubCommand {
	revision: number;
	granted: boolean;
	items: ClubItem[];
}
export interface ClubSource {
	productId: string;
	title: string;
	version: string;
	policy: string;
	digest: string;
	text: string | null;
	limits: string[];
}
export interface ClubState extends Omit<ClubCommand, 'items'> {
	available: boolean;
	items: (ClubItem & { source: ClubSource | null })[];
}
const object = (v: unknown): v is Record<string, unknown> =>
	!!v && typeof v === 'object' && !Array.isArray(v);
const exact = (v: Record<string, unknown>, keys: string[]) =>
	Object.keys(v).length === keys.length && keys.every((k) => Object.hasOwn(v, k));
const uuid = (v: unknown): v is string =>
	typeof v === 'string' &&
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
const text = (v: unknown, max: number): v is string =>
	typeof v === 'string' &&
	v.trim().length > 0 &&
	v.length <= max &&
	!Array.from(v).some((c) => {
		const code = c.codePointAt(0)!;
		return code <= 8 || code === 11 || code === 12 || (code >= 14 && code <= 31) || code === 127;
	});
const revision = (v: unknown): v is number =>
	Number.isInteger(v) && Number(v) >= 0 && Number(v) < 2147483647;

export function parseClubCommand(v: unknown): ClubCommand | null {
	if (
		!object(v) ||
		!exact(v, ['revision', 'granted', 'items']) ||
		!revision(v.revision) ||
		typeof v.granted !== 'boolean' ||
		!Array.isArray(v.items) ||
		v.items.length > 12 ||
		(v.granted ? v.items.length === 0 : v.items.length !== 0)
	)
		return null;
	const items: ClubItem[] = [];
	for (const item of v.items) {
		if (
			!object(item) ||
			!exact(item, ['id', 'readingId', 'selection']) ||
			!uuid(item.id) ||
			!uuid(item.readingId)
		)
			return null;
		const selection = parseContinuitySelection(item.selection);
		if (
			!selection ||
			selection.kind === 'cycle' ||
			items.some((i) => i.id.toLowerCase() === String(item.id).toLowerCase())
		)
			return null;
		items.push({ id: item.id.toLowerCase(), readingId: item.readingId.toLowerCase(), selection });
	}
	return { revision: v.revision, granted: v.granted, items };
}

/** Only a fresh authenticated RPC result may supply this projection; HTTP cannot supply sources. */
export function parseClubState(v: unknown): ClubState | null {
	if (
		!object(v) ||
		!exact(v, ['revision', 'granted', 'available', 'items']) ||
		!revision(v.revision) ||
		typeof v.granted !== 'boolean' ||
		typeof v.available !== 'boolean' ||
		!Array.isArray(v.items) ||
		v.items.length > 12
	)
		return null;
	const items: ClubState['items'] = [];
	for (const item of v.items) {
		if (!object(item) || !exact(item, ['id', 'readingId', 'selection', 'source'])) return null;
		const command = parseClubCommand({
			revision: 0,
			granted: true,
			items: [{ id: item.id, readingId: item.readingId, selection: item.selection }]
		});
		if (!command || items.some((i) => i.id === command.items[0].id)) return null;
		let source: ClubSource | null = null;
		if (item.source !== null) {
			const s = item.source;
			if (
				!object(s) ||
				!exact(s, ['productId', 'title', 'version', 'policy', 'digest', 'text', 'limits']) ||
				typeof s.productId !== 'string' ||
				!workflowFor(s.productId) ||
				!text(s.title, 1200) ||
				!text(s.version, 120) ||
				![
					'atv-private-trial-approval/1.0.0',
					'atv-private-trial-approval/2.0.0',
					'atv-private-trial-approval/3.0.0',
					'atv-private-interpretation-review/4.0.0'
				].includes(String(s.policy)) ||
				typeof s.digest !== 'string' ||
				!/^[a-f0-9]{64}$/.test(s.digest) ||
				(s.text !== null && !text(s.text, 12000)) ||
				!Array.isArray(s.limits) ||
				s.limits.length > 24 ||
				!s.limits.every((l) => text(l, 600))
			)
				return null;
			source = s as unknown as ClubSource;
		}
		items.push({ ...command.items[0], source });
	}
	if (!v.granted && items.length) return null;
	return { revision: v.revision, granted: v.granted, available: v.available, items };
}

export type ClubPreparation =
	| {
			status: 'blocked';
			code: 'unavailable' | 'consent_required' | 'source_unavailable' | 'context_too_large';
	  }
	| {
			status: 'prepared';
			publication: 'blocked';
			execution: 'disabled';
			context: {
				version: typeof TRIAL_CONTINUITY_VERSION;
				purpose: 'reading-context';
				handling: 'untrusted-data-not-instructions';
				sources: { alias: string; productId: string; universe: string; limits: string[] }[];
				items: {
					alias: string;
					source: string;
					category: string;
					origin: 'user-reported' | 'prior-interpretation';
					text: string;
				}[];
			};
	  };

/** Preparation is not a new reading, clinical inference, release or permission for future use. */
export function prepareClubContinuity(state: ClubState): ClubPreparation {
	if (!state.available) return { status: 'blocked', code: 'unavailable' };
	if (!state.granted) return { status: 'blocked', code: 'consent_required' };
	if (!state.items.length || state.items.some((i) => !i.source || !text(i.source.text, 1200)))
		return { status: 'blocked', code: 'source_unavailable' };
	const sources: Extract<ClubPreparation, { status: 'prepared' }>['context']['sources'] = [];
	const ids: string[] = [];
	const items = state.items.map((item, index) => {
		const source = item.source!;
		let sourceIndex = ids.indexOf(item.readingId);
		if (sourceIndex < 0) {
			sourceIndex = ids.push(item.readingId) - 1;
			sources.push({
				alias: `s${sourceIndex + 1}`,
				productId: source.productId,
				universe: workflowFor(source.productId)!.universe,
				limits: source.limits
			});
		}
		return {
			alias: `i${index + 1}`,
			source: `s${sourceIndex + 1}`,
			category: item.selection.kind === 'reported' ? item.selection.category : item.selection.kind,
			origin:
				item.selection.kind === 'reported'
					? ('user-reported' as const)
					: ('prior-interpretation' as const),
			text: source.text!
		};
	});
	const context: Extract<ClubPreparation, { status: 'prepared' }>['context'] = {
		version: TRIAL_CONTINUITY_VERSION,
		purpose: 'reading-context',
		handling: 'untrusted-data-not-instructions',
		sources,
		items
	};
	if (new TextEncoder().encode(JSON.stringify(context)).length > 12000)
		return { status: 'blocked', code: 'context_too_large' };
	return { status: 'prepared', publication: 'blocked', execution: 'disabled', context };
}
