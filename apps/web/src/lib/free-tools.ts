/** Public, stateless calculations. These IDs are independent of paid product workflows. */
export type FreeToolId =
	| 'ascendente'
	| 'mapa-astral'
	| 'carta-do-dia'
	| 'tarot-sim-ou-nao'
	| 'combinacao-do-casal'
	| 'registro-de-sonho';

export class FreeToolInputError extends Error {
	constructor(public readonly code: 'invalid_tool' | 'invalid_input' | 'ascendant_unavailable') {
		super(code);
	}
}
export function isFreeToolId(value: string): value is FreeToolId {
	return [
		'ascendente',
		'mapa-astral',
		'carta-do-dia',
		'tarot-sim-ou-nao',
		'combinacao-do-casal',
		'registro-de-sonho'
	].includes(value);
}

export interface FreeToolNatalInput {
	utcInstant: string;
	localDateTime: string;
	timezone: string;
	latitude: number;
	longitude: number;
	locationSource: string;
}
export interface FreeToolPairInput {
	first: FreeToolNatalInput;
	second: FreeToolNatalInput;
	/** Permission declaration for this calculation; never a storage or sharing grant. */
	consent: true;
}
export interface FreeToolTarotInput {
	focus?: string;
}
export interface FreeToolDreamInput {
	date: string;
	narrative: string;
	emotions: string[];
	associations: string[];
}
export interface FreeToolFact {
	id: string;
	label: string;
	value: string;
	kind: 'calculated' | 'drawn' | 'reported';
	source: string;
}
export interface FreeToolSection {
	id: string;
	title: string;
	body: string;
}
export interface FreeToolChart {
	svg: string;
	positions: { body: string; name: string; longitude: number }[];
	ascendant: number | null;
	midheaven: number | null;
	cusps: number[];
	status: 'ok' | 'not-applicable';
}
export interface FreeToolResult {
	version: 'atv-free-tool-result/1.0.0';
	id: string;
	tool: FreeToolId;
	createdAt: string;
	title: string;
	summary: string;
	facts: FreeToolFact[];
	sections: FreeToolSection[];
	limits: string[];
	chart?: FreeToolChart;
	draw?: {
		cardId: string;
		name: string;
		orientation: 'upright';
		deckVersion: string;
		algorithmVersion: string;
	};
}
export interface FreeToolResponse {
	result: FreeToolResult;
	receipt: string | null;
}
