import type { WorkflowInput } from '@atv/domain';
import type { TrialReading } from './reading';

export const OFFER_NAME_REVISION = 'atv-offer-name/2026-10-15' as const;

/** Immutable presentation snapshot. A later rename requires a new revision, never an edit here. */
export const offerNames20261015 = Object.freeze({
	'birth-chart': 'Mapa Astral Completo',
	'three-pillars': 'Sol, Lua e Ascendente',
	'life-atlas': 'Mapa Astral por Temas',
	'week-reading': 'Horóscopo Semanal Pessoal',
	'personal-calendar': 'Calendário de Previsões — Próximos 30 Dias',
	'date-reading': 'Horóscopo para uma Data Especial',
	'solar-return': 'Mapa do Seu Ano — Revolução Solar',
	synastry: 'Análise Astral do Casal',
	'couple-dossier': 'Aprofundamento Astral do Casal',
	'purpose-career': 'Mapa Astral de Dinheiro e Carreira',
	'career-forecast-30d': 'Previsões de Dinheiro e Carreira — Próximos 30 Dias',
	'tarot-situation-challenge-advice': 'Tarot — 3 Cartas (Situação, Desafio e Conselho)',
	'tarot-peladan-cross': 'Tarot — 5 Cartas (Cruz Péladan)',
	'tarot-celtic-cross': 'Tarot — 10 Cartas (Cruz Celta)',
	'tarot-aphrodite-temple': 'Tarot Relacionamentos — 7 Cartas (Templo de Afrodite)',
	'tarot-astrological-mandala': 'Tarot — 12 Áreas da Vida (Mandala Astrológica)',
	'dream-reading': 'Interpretação do Sonho',
	'dream-dossier': 'Interpretação Aprofundada do Sonho',
	'dream-atlas': 'Diário de Sonhos — 30 Dias'
});

/** Apply only when composing a new delivery, never when opening a saved reading. */
export function nameCurrentOffer(input: WorkflowInput, reading: TrialReading): TrialReading {
	// A civil month can contain 28–31 days and must not be labeled as a rolling 30-day period.
	if (input.productId === 'personal-calendar' && input.forecastPeriod !== 'rolling-30-days')
		return reading;
	// The legacy dream collection is not the new, completed 30-day diary.
	if (
		input.productId === 'dream-atlas' &&
		reading.version !== 'atv-private-dream-atlas-reading/2.0.0' &&
		reading.version !== 'atv-current-reading/1.0.0'
	)
		return reading;
	const title = offerNames20261015[input.productId as keyof typeof offerNames20261015];
	return title ? { ...reading, title, nameRevision: OFFER_NAME_REVISION } : reading;
}
