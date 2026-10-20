import type { EditorialDocument } from '../../apps/web/src/lib/server/editorial.ts';
import type {
	HoroscopeClaims,
	HoroscopeScope
} from '../../apps/web/src/lib/server/dated-horoscope-automation.ts';
import type { PublicHoroscopeSnapshot } from '../../apps/web/src/lib/server/public-horoscope-facts.ts';

export const ALGORITHM_VERSION: string;
export const REVIEW_MODE: 'reviewed-corpus-and-runtime-verification';
export function corpusDigest(): string;
export function contentDigest(value: unknown): string;
export function sector(longitude: number, sign: string): number;
export function factorObservationTimes(
	factor: PublicHoroscopeSnapshot['candidates'][number],
	facts: PublicHoroscopeSnapshot
): string[];
export function compositionFactors(
	facts: PublicHoroscopeSnapshot
): PublicHoroscopeSnapshot['candidates'];
export function composeDocumentAndClaims(
	facts: PublicHoroscopeSnapshot,
	sign: string,
	frozenAt: string
): { document: EditorialDocument; claims: HoroscopeClaims };
export function assertRuntimeComposition(input: {
	document: EditorialDocument;
	claims: HoroscopeClaims;
	facts: PublicHoroscopeSnapshot;
	scope: HoroscopeScope;
}): Record<'facts' | 'claims' | 'composition' | 'coverage' | 'disclosure' | 'differentiation', 'PASS'>;
