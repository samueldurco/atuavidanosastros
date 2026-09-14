import { calculateTarot, calculateDreamRecord } from '@atv/domain';
import type { ProductCalculator } from './product-processing.ts';

/** Explicit capabilities. Does not enable releases, call a model or register a hosted scheduler. */
export function createSymbolicCalculators(): Readonly<Record<string, ProductCalculator>> {
  const tarot:ProductCalculator=async(input,{runId,signal})=>calculateTarot(input,runId,signal);
  const dream:ProductCalculator=async(input,{signal})=>{signal.throwIfAborted();return calculateDreamRecord(input);};
  return Object.freeze({'daily-card':tarot,'three-questions':tarot,'dream-reading':dream,'dream-journal':dream});
}
