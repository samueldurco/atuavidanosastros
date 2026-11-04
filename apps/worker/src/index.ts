export {
  processNextProductRun,
  createWorkflowRepository,
} from "./product-processing.ts";
export { createSymbolicCalculators } from "./symbolic-calculators.ts";
export { createNatalCalculators } from "./natal-calculators.ts";
export { createContextCalculators } from "./context-calculators.ts";
export {
  createSynastryCalculators,
  synastryProductContract,
} from "./synastry-calculators.ts";
export { createCoupleDossierCalculators } from "./couple-dossier-calculators.ts";
export {
  createProductCalculators,
  createProductProcessor,
  productCalculationCoverage,
} from "./product-runtime.ts";
export {
  prepareProductFacts,
  evaluateProductDraft,
} from "./product-editorial.ts";
export {
  CAREER_COMPASS_CANDIDATE_VERSION,
  composeCareerCompassCandidate,
  prepareCareerCompassCandidate,
} from "./career-compass-candidate.ts";
export { processNextCareerCompassCandidate } from "./career-compass-persistence.ts";
export { processAtvPlusDelivery, dispatchAtvPlusDue, selectAtvPlusNextSolarReturn } from './atv-plus-delivery.ts';
import { processAtvPlusDelivery, type AtvPlusDeliveryRuntime } from './atv-plus-delivery.ts';

export type WorkerJobName =
  "hotmart.reconcile" | "delivery.render" | "email.dispatch" | "account.erase" | "atv_plus.generate";

export interface WorkerJob<T = unknown> {
  id: string;
  name: WorkerJobName;
  payload: T;
  attempt: number;
  correlationId: string;
}

export async function handleJob(job: WorkerJob, atvPlus?: AtvPlusDeliveryRuntime): Promise<void> {
  if (job.attempt < 0)
    throw new Error("A tentativa do job não pode ser negativa.");
  if (job.name === 'atv_plus.generate' && atvPlus) {
    const payload = job.payload as { deliveryId?: unknown } | null;
    if (!payload || typeof payload.deliveryId !== 'string') throw new Error('delivery_input_invalid');
    const outcome = await processAtvPlusDelivery(payload.deliveryId, atvPlus);
    if (outcome === 'unavailable' || outcome === 'retry') throw new Error('delivery_processing_unavailable');
    return;
  }
  throw new Error(`Handler ainda não registrado para ${job.name}.`);
}
