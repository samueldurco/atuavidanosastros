import { workflowFor } from '@atv/domain';
import { isUuid, type LibraryItemSummary } from './library-result';
import { parseProductCartography, type ProductCartography } from './product-cartography';

export const runStates = [
	'QUEUED',
	'CALCULATED',
	'AWAITING_EDITORIAL',
	'READY',
	'FAILED',
	'CANCELLED'
] as const;
export type RunState = (typeof runStates)[number];
export interface ProductRunView {
	id: string;
	productId: string;
	state: RunState;
	revision: number;
	parentId: string | null;
	createdAt: string;
	updatedAt: string;
	released: boolean;
	canReprocess: boolean;
	cartography?: ProductCartography | null;
	libraryItemId: string | null;
	history: { revision: number; state: RunState; at: string }[];
	calculation: {
		version: string;
		facts: { id: string; kind: string; display: string; source: string }[];
		limits: string[];
	} | null;
	editorial: {
		version: string;
		promotionId: string;
		reviewDigest: string;
		title: string;
		sections: { title: string; text: string; evidence: string[] }[];
		limits: string[];
	} | null;
}
export interface WorkflowReaderData {
	state: 'workflow';
	item: LibraryItemSummary;
	run: ProductRunView;
	synthetic?: boolean;
}
export const runLabels: Record<RunState, string> = {
	QUEUED: 'Na fila de processamento',
	CALCULATED: 'Cálculo registrado',
	AWAITING_EDITORIAL: 'Aguardando revisão editorial',
	READY: 'Leitura concluída',
	FAILED: 'Processamento interrompido',
	CANCELLED: 'Processamento cancelado'
};
const record = (v: unknown): v is Record<string, unknown> =>
	!!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown, max: number): v is string =>
	typeof v === 'string' && v.trim().length > 0 && v.length <= max;
const strings = (v: unknown, count: number, max: number): v is string[] =>
	Array.isArray(v) && v.length <= count && v.every((x) => text(x, max));
const state = (v: unknown): v is RunState => runStates.includes(v as RunState);
const date = (v: unknown): v is string =>
	typeof v === 'string' && v.length <= 40 && Number.isFinite(Date.parse(v));
const uuid = (v: unknown): v is string => typeof v === 'string' && isUuid(v);

/** Explicit projection: never spread database/provider payloads into browser data. */
export function parseProductRun(v: unknown): ProductRunView | null {
	if (
		!record(v) ||
		!uuid(v.id) ||
		!text(v.productId, 80) ||
		!workflowFor(v.productId) ||
		!state(v.state) ||
		!Number.isInteger(v.revision) ||
		(v.revision as number) < 1 ||
		!date(v.createdAt) ||
		!date(v.updatedAt) ||
		Date.parse(v.updatedAt) < Date.parse(v.createdAt) ||
		(v.parentId !== null && !uuid(v.parentId)) ||
		(v.libraryItemId !== null && !uuid(v.libraryItemId)) ||
		typeof v.released !== 'boolean' ||
		typeof v.canReprocess !== 'boolean' ||
		!Array.isArray(v.history) ||
		v.history.length < 1 ||
		v.history.length > 8
	)
		return null;
	const history: ProductRunView['history'] = [];
	for (const event of v.history) {
		if (
			!record(event) ||
			event.revision !== history.length + 1 ||
			!state(event.state) ||
			!date(event.at)
		)
			return null;
		history.push({ revision: event.revision as number, state: event.state, at: event.at });
	}
	if (history.at(-1)?.revision !== v.revision || history.at(-1)?.state !== v.state) return null;
	let calculation: ProductRunView['calculation'] = null;
	let editorial: ProductRunView['editorial'] = null;
	if (v.released) {
		const c = v.calculation,
			e = v.editorial;
		if (
			v.state !== 'READY' ||
			!record(c) ||
			!record(e) ||
			!text(c.version, 100) ||
			!strings(c.limits, 32, 1200) ||
			!Array.isArray(c.facts) ||
			c.facts.length < 1 ||
			c.facts.length > 400 ||
			!text(e.version, 100) ||
			!text(e.promotionId, 160) ||
			typeof e.reviewDigest !== 'string' ||
			!/^[a-f0-9]{64}$/.test(e.reviewDigest) ||
			!text(e.title, 240) ||
			!strings(e.limits, 32, 1200) ||
			!Array.isArray(e.sections) ||
			e.sections.length < 1 ||
			e.sections.length > 40
		)
			return null;
		const facts: NonNullable<ProductRunView['calculation']>['facts'] = [];
		for (const fact of c.facts) {
			if (
				!record(fact) ||
				!text(fact.id, 160) ||
				!text(fact.kind, 30) ||
				!['calculated', 'reported', 'drawn'].includes(fact.kind) ||
				!text(fact.display, 2000) ||
				!text(fact.source, 200) ||
				facts.some((f) => f.id === fact.id)
			)
				return null;
			facts.push({ id: fact.id, kind: fact.kind, display: fact.display, source: fact.source });
		}
		const sections: NonNullable<ProductRunView['editorial']>['sections'] = [];
		for (const section of e.sections) {
			if (
				!record(section) ||
				!text(section.title, 240) ||
				!text(section.text, 20000) ||
				!strings(section.evidence, 100, 160) ||
				section.evidence.length === 0 ||
				section.evidence.some((id) => !facts.some((f) => f.id === id))
			)
				return null;
			sections.push({ title: section.title, text: section.text, evidence: [...section.evidence] });
		}
		calculation = { version: c.version, facts, limits: [...c.limits] };
		editorial = {
			version: e.version,
			promotionId: e.promotionId,
			reviewDigest: e.reviewDigest,
			title: e.title,
			sections,
			limits: [...e.limits]
		};
	}
	return {
		id: v.id,
		productId: v.productId,
		state: v.state,
		revision: v.revision as number,
		parentId: v.parentId,
		createdAt: v.createdAt,
		updatedAt: v.updatedAt,
		released: v.released,
		canReprocess: v.canReprocess,
		libraryItemId: v.libraryItemId,
		history,
		cartography:
			v.released && calculation
				? parseProductCartography(v.cartography, v.productId, calculation.version)
				: null,
		calculation,
		editorial
	};
}
